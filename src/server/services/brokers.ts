import { randomUUID } from "node:crypto";
import { and, asc, eq, inArray, isNotNull, isNull, ne, sql } from "drizzle-orm";
import { buildLedger } from "@/domain/accounting";
import { reconcileHoldings } from "@/domain/broker-sync";
import { isCurrency } from "@/domain/money";
import { getBrokerProvider, NotConfiguredError, type BrokerAccount, type BrokerSecurity, type BrokerUser } from "@/integrations/brokers";
import { audit } from "../audit";
import { decryptSecret, encryptionReady, encryptSecret } from "../crypto";
import { getDb } from "../db";
import { accounts, brokerConnections, brokerUsers, instruments, transactions } from "../db/schema";
import { notFound, UserFacingError } from "../errors";
import { assertRateLimit } from "../rate-limit";
import { assertFullAccess, hasFullAccess } from "./access";
import { ensurePortfolio, ledgerRows } from "./portfolio";

/**
 * Broker sync. A member links a broker on the provider's own page; Portle then
 * copies the account's history into the ledger (source "broker") and, each
 * sync, settles any remaining difference against the broker's current holdings
 * (see domain/broker-sync). Everything is read-only, and re-running a sync
 * never adds a row twice.
 */

const RECONNECT = "Your broker signed Portle out. Reconnect to keep it up to date.";
const UNREACHABLE = "Your broker didn't answer just now. Portle will try again later.";
const FULL =
  "During early access Portle can link only a few brokers, and those spots are taken right now. Until one frees up, a CSV export from your broker works just as well.";
const MAYBE_FULL =
  "SnapTrade couldn't open a new connection. During early access Portle can link only a few brokers, so the spots may be taken. A CSV export from your broker works just as well.";
const START_FAILED = "SnapTrade didn't answer just now. Try again in a minute, or import a CSV instead.";
const SETUP = "Broker linking isn't set up correctly on this Portle yet, so nothing was sent to SnapTrade. A CSV export from your broker works in the meantime.";
const FIRST_HISTORY_YEARS = 5;
const OVERLAP_DAYS = 30;

const isoDay = (date: Date) => date.toISOString().slice(0, 10);
const daysAgo = (from: Date, days: number) => new Date(from.getTime() - days * 86400_000);

export function brokerStatus() {
  return getBrokerProvider().status();
}

function logProviderError(e: unknown) {
  // The SDK redacts ids and secrets from the URL; the body is the provider's own error message.
  const { status, method, url, responseBody } = (e ?? {}) as { status?: number; method?: string; url?: string; responseBody?: unknown };
  console.error(
    "[brokers] provider call failed:",
    e instanceof Error
      ? `${e.name} ${status ?? ""} ${method ?? ""} ${url?.split("?")[0] ?? ""} ${JSON.stringify(responseBody ?? e.message).slice(0, 300)}`
      : "unknown",
  );
}

/** Plain words for whatever went wrong talking to the provider. */
function describe(e: unknown) {
  if (e instanceof NotConfiguredError || e instanceof UserFacingError) return e.message;
  const status = (e as { status?: number })?.status;
  if (status === 401 || status === 402 || status === 403) return RECONNECT;
  logProviderError(e);
  return UNREACHABLE;
}

/** Free broker links left on the provider's plan, across every member; null when the plan has no cap. */
export async function brokerSpotsLeft() {
  const provider = getBrokerProvider();
  const limit = provider.status().connectionLimit;
  if (!limit) return null;
  const [row] = await getDb()
    .select({ n: sql<number>`count(*)::int` })
    .from(brokerConnections)
    .where(and(eq(brokerConnections.provider, provider.id), ne(brokerConnections.status, "disconnected")));
  return Math.max(0, limit - (row?.n ?? 0));
}

/** True when this Portle already holds as many broker links as the provider's plan allows. */
export async function brokerSpotsFull() {
  return (await brokerSpotsLeft()) === 0;
}

/** The member's identity at the provider, created the first time they connect. */
async function brokerUser(userId: string, create: true): Promise<BrokerUser>;
async function brokerUser(userId: string, create: false): Promise<BrokerUser | null>;
async function brokerUser(userId: string, create: boolean) {
  const provider = getBrokerProvider();
  const db = getDb();
  const [row] = await db
    .select()
    .from(brokerUsers)
    .where(and(eq(brokerUsers.userId, userId), eq(brokerUsers.provider, provider.id)));
  if (row) return { userId: row.externalUserId, userSecret: decryptSecret(row.encryptedSecret) };
  if (!create) return null;
  // Check the secret can be stored before signing anyone up at the provider, so a bad key leaves nothing behind.
  if (!encryptionReady()) {
    console.error("[brokers] PORTLE_ENCRYPTION_KEY is missing or doesn't decode to 32 bytes; broker linking is off until it's fixed.");
    throw new UserFacingError(SETUP);
  }
  // A random reference, so the provider never learns who the member is.
  const created = await provider.registerUser(`portle-${randomUUID()}`);
  await db.insert(brokerUsers).values({ userId, provider: provider.id, externalUserId: created.userId, encryptedSecret: encryptSecret(created.userSecret) });
  await audit(db, { userId, action: "broker.registered", metadata: { provider: provider.id } });
  return created;
}

async function ownedConnection(userId: string, connectionId: string) {
  const [c] = await getDb()
    .select()
    .from(brokerConnections)
    .where(and(eq(brokerConnections.id, connectionId), eq(brokerConnections.userId, userId)));
  if (!c) throw notFound("Connection");
  return c;
}

/** The provider's sign-in page, to link a new broker or repair one that was signed out. */
export async function startBrokerConnection(userId: string, returnUrl: string, reconnectConnectionId?: string) {
  await assertFullAccess(userId, "Linking a broker");
  assertRateLimit(`broker-connect:${userId}`, 10, 3600_000);
  const reconnect = reconnectConnectionId ? ((await ownedConnection(userId, reconnectConnectionId)).externalId ?? undefined) : undefined;
  // Repairing a link doesn't take a new spot.
  if (!reconnect && (await brokerSpotsFull())) throw new UserFacingError(FULL);
  try {
    return await getBrokerProvider().connectUrl(await brokerUser(userId, true), returnUrl, reconnect);
  } catch (e) {
    if (reconnect || e instanceof NotConfiguredError || e instanceof UserFacingError) throw new UserFacingError(describe(e));
    // A new link has no broker session to lose, so a refusal here most likely means the plan's spots are taken.
    logProviderError(e);
    const status = (e as { status?: number })?.status ?? 0;
    throw new UserFacingError([400, 402, 403].includes(status) ? MAYBE_FULL : START_FAILED);
  }
}

/** The member's linked brokers, with how many Portle accounts each one fills. */
export async function listBrokerConnections(userId: string) {
  const db = getDb();
  const rows = await db
    .select()
    .from(brokerConnections)
    .where(and(eq(brokerConnections.userId, userId), ne(brokerConnections.status, "disconnected")))
    .orderBy(asc(brokerConnections.createdAt));
  const counts = await db
    .select({ id: accounts.brokerConnectionId, n: sql<number>`count(*)::int` })
    .from(accounts)
    .where(and(eq(accounts.userId, userId), isNotNull(accounts.brokerConnectionId), isNull(accounts.archivedAt)))
    .groupBy(accounts.brokerConnectionId);
  return rows.map((c) => ({ ...c, encryptedSecret: undefined, accounts: counts.find((x) => x.id === c.id)?.n ?? 0 }));
}

/** Brings the list of linked brokers in line with the provider (new links, signed-out links, removed links). */
export async function refreshBrokerConnections(userId: string) {
  const user = await brokerUser(userId, false);
  if (!user) return listBrokerConnections(userId);
  const provider = getBrokerProvider();
  const remote = await provider.listConnections(user);
  const db = getDb();
  for (const c of remote) {
    const values = {
      institution: c.institution.slice(0, 80),
      status: c.disabled ? ("error" as const) : ("active" as const),
      lastError: c.disabled ? RECONNECT : null,
    };
    await db
      .insert(brokerConnections)
      .values({ userId, provider: provider.id, externalId: c.externalId, ...values })
      .onConflictDoUpdate({
        target: [brokerConnections.userId, brokerConnections.provider, brokerConnections.externalId],
        set: { ...values, revokedAt: null },
      });
  }
  const live = remote.map((c) => c.externalId);
  await db
    .update(brokerConnections)
    .set({ status: "disconnected", revokedAt: new Date() })
    .where(
      and(
        eq(brokerConnections.userId, userId),
        eq(brokerConnections.provider, provider.id),
        ne(brokerConnections.status, "disconnected"),
        live.length
          ? sql`${brokerConnections.externalId} not in (${sql.join(
              live.map((id) => sql`${id}`),
              sql`, `,
            )})`
          : undefined,
      ),
    );
  return listBrokerConnections(userId);
}

/** Broker accounts the member hasn't added to Portle yet, to choose from after connecting. */
export async function listUnlinkedBrokerAccounts(userId: string): Promise<BrokerAccount[]> {
  const user = await brokerUser(userId, false);
  if (!user) return [];
  const remote = await getBrokerProvider().listAccounts(user);
  const linked = await getDb()
    .select({ externalId: accounts.externalId })
    .from(accounts)
    .where(and(eq(accounts.userId, userId), isNotNull(accounts.externalId)));
  const taken = new Set(linked.map((a) => a.externalId));
  return remote.filter((a) => !taken.has(a.externalId));
}

/** Adds the chosen broker accounts to Portle as synced accounts, then copies them in. */
export async function addBrokerAccounts(userId: string, externalIds: string[]) {
  const user = await brokerUser(userId, false);
  if (!user) throw new UserFacingError("Connect a broker first.");
  const chosen = (await getBrokerProvider().listAccounts(user)).filter((a) => externalIds.includes(a.externalId));
  if (!chosen.length) throw new UserFacingError("Choose at least one account to add.");
  const connections = await refreshBrokerConnections(userId);
  const portfolio = await ensurePortfolio(userId);
  const db = getDb();
  const synced = new Set<string>();
  for (const a of chosen) {
    const conn = connections.find((c) => c.externalId === a.connectionExternalId);
    if (!conn) continue;
    await db
      .insert(accounts)
      .values({
        portfolioId: portfolio.id,
        userId,
        name: `${a.institution} · ${a.name}`.slice(0, 80),
        institution: a.institution.slice(0, 80),
        currency: isCurrency(a.currency) ? a.currency : portfolio.baseCurrency,
        source: "broker",
        brokerConnectionId: conn.id,
        externalId: a.externalId,
      })
      .onConflictDoNothing();
    synced.add(conn.id);
  }
  await audit(db, { userId, action: "broker.accounts_added", metadata: { count: chosen.length } });
  const results = [];
  for (const id of synced) results.push(await syncBrokerConnection(userId, id));
  return results;
}

/** Finds a security by its ticker, or records it (unpriced until market data knows it). */
async function securityId(s: BrokerSecurity, cache: Map<string, string>) {
  const key = `${s.symbol.toUpperCase()}::${s.currency}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const db = getDb();
  const symbol = s.symbol.toUpperCase().slice(0, 32);
  const [match] = await db
    .select({ id: instruments.id })
    .from(instruments)
    .where(sql`upper(${instruments.symbol}) = ${symbol} or upper(${instruments.isin}) = ${symbol}`)
    .orderBy(sql`case when ${instruments.currency} = ${s.currency} then 0 else 1 end`, sql`case when ${instruments.exchange} = '' then 1 else 0 end`)
    .limit(1);
  const id =
    match?.id ??
    (
      await db
        .insert(instruments)
        .values({ symbol, exchange: "", name: s.name, assetClass: s.kind, currency: s.currency })
        .onConflictDoUpdate({ target: [instruments.symbol, instruments.exchange], set: { symbol } })
        .returning({ id: instruments.id })
    )[0].id;
  cache.set(key, id);
  return id;
}

type SyncedAccount = { id: string; externalId: string | null; institution: string };

async function syncAccount(userId: string, user: BrokerUser, account: SyncedAccount, lastSyncAt: Date | null) {
  if (!account.externalId) return;
  const provider = getBrokerProvider();
  const now = new Date();
  const since = isoDay(lastSyncAt ? daysAgo(lastSyncAt, OVERLAP_DAYS) : daysAgo(now, FIRST_HISTORY_YEARS * 365));
  const [activities, positions] = await Promise.all([
    provider.listActivities(user, account.externalId, since),
    provider.listPositions(user, account.externalId),
  ]);
  const db = getDb();
  const ids = new Map<string, string>();

  // 1. History, once each: the broker's own id makes a repeat a no-op.
  for (const a of activities) {
    const instrumentId = a.security ? await securityId(a.security, ids) : null;
    const trade = a.type === "buy" || a.type === "sell";
    if (trade && (!instrumentId || !a.quantity || !a.price)) continue;
    if (!trade && !a.amount) continue;
    await db
      .insert(transactions)
      .values({
        userId,
        accountId: account.id,
        instrumentId: trade || a.type === "dividend" ? instrumentId : null,
        type: a.type,
        tradeDate: a.tradeDate,
        quantity: trade ? a.quantity : null,
        price: trade ? a.price : null,
        amount: trade ? null : a.amount,
        fee: a.fee,
        currency: a.currency,
        source: "broker",
        externalId: a.externalId,
        dedupeHash: `broker:${a.externalId}`,
      })
      .onConflictDoNothing();
  }

  // 2. Then whatever still differs from what the broker holds today.
  const ledger = buildLedger(await ledgerRows(userId, [account.id])).positions.map((p) => ({
    instrumentId: p.instrumentId,
    quantity: p.quantity,
    currency: p.currency,
  }));
  const held = [];
  for (const p of positions)
    held.push({ instrumentId: await securityId(p, ids), quantity: p.quantity, averagePrice: p.averagePrice, price: p.price, currency: p.currency });
  const today = isoDay(now);
  for (const adj of reconcileHoldings(ledger, held)) {
    await db
      .insert(transactions)
      .values({
        userId,
        accountId: account.id,
        instrumentId: adj.instrumentId,
        type: adj.type,
        tradeDate: today,
        quantity: adj.quantity,
        price: adj.price,
        currency: adj.currency,
        source: "broker",
        dedupeHash: `broker-match:${today}:${adj.instrumentId}:${adj.type}:${adj.quantity}`,
        note: `Matched to ${account.institution || "the broker"}'s holdings`,
      })
      .onConflictDoNothing();
  }
}

/** Copies a linked broker's latest data into its Portle accounts. Never throws: the outcome is stored and returned. */
export async function syncBrokerConnection(userId: string, connectionId: string): Promise<{ ok: boolean; error?: string }> {
  const conn = await ownedConnection(userId, connectionId);
  const user = await brokerUser(userId, false);
  if (!user || conn.status === "disconnected") return { ok: false, error: "This broker is no longer connected." };
  if (!(await hasFullAccess(userId))) return { ok: false, error: "Syncing a broker is part of full access." };
  const db = getDb();
  const linked = await db
    .select({ id: accounts.id, externalId: accounts.externalId, institution: accounts.institution })
    .from(accounts)
    .where(and(eq(accounts.userId, userId), eq(accounts.brokerConnectionId, conn.id), isNull(accounts.archivedAt)));
  try {
    for (const account of linked) await syncAccount(userId, user, account, conn.lastSyncAt);
    await db.update(brokerConnections).set({ status: "active", lastSyncAt: new Date(), lastError: null }).where(eq(brokerConnections.id, conn.id));
    return { ok: true };
  } catch (e) {
    const error = describe(e);
    await db
      .update(brokerConnections)
      .set({ status: error === RECONNECT ? "error" : conn.status, lastError: error })
      .where(eq(brokerConnections.id, conn.id));
    return { ok: false, error };
  }
}

/** Syncs every linked broker last synced more than `hours` ago. Used quietly when the member opens Portfolio. */
export async function syncStaleBrokerConnections(userId: string, hours = 6) {
  if (!(await hasFullAccess(userId))) return 0;
  const cutoff = new Date(Date.now() - hours * 3600_000);
  const due = (await listBrokerConnections(userId)).filter((c) => c.status === "active" && c.accounts > 0 && (!c.lastSyncAt || c.lastSyncAt < cutoff));
  for (const c of due) await syncBrokerConnection(userId, c.id);
  return due.length;
}

/**
 * Unlinks a broker at the provider. Its accounts either stay as a record that
 * no longer updates, or are removed together with everything synced into them.
 */
export async function disconnectBroker(userId: string, connectionId: string, removeRecords: boolean) {
  const conn = await ownedConnection(userId, connectionId);
  const user = await brokerUser(userId, false);
  if (user && conn.externalId) {
    try {
      await getBrokerProvider().removeConnection(user, conn.externalId);
    } catch (e) {
      // Already gone at the provider counts as disconnected; anything else is worth retrying.
      if ((e as { status?: number })?.status !== 404) throw new UserFacingError(describe(e));
    }
  }
  const db = getDb();
  if (removeRecords) await db.delete(accounts).where(and(eq(accounts.userId, userId), eq(accounts.brokerConnectionId, conn.id)));
  else
    await db
      .update(accounts)
      .set({ brokerConnectionId: null, externalId: null })
      .where(and(eq(accounts.userId, userId), eq(accounts.brokerConnectionId, conn.id)));
  await db.update(brokerConnections).set({ status: "disconnected", revokedAt: new Date(), lastError: null }).where(eq(brokerConnections.id, conn.id));
  await audit(db, { userId, action: "broker.disconnected", metadata: { removedRecords: removeRecords } });
}

/** On account deletion: removes the member at the provider too. Best effort; the local rows go with the account. */
export async function forgetBrokerUser(userId: string) {
  const user = await brokerUser(userId, false).catch(() => null);
  if (!user) return;
  try {
    await getBrokerProvider().deleteUser(user);
  } catch (e) {
    describe(e);
  }
}

/** Which of these accounts sync from a broker, for labelling them. */
export async function brokerAccountLabels(userId: string, accountIds: string[]) {
  if (!accountIds.length) return new Map<string, { institution: string; lastSyncAt: Date | null; status: string }>();
  const rows = await getDb()
    .select({ id: accounts.id, institution: brokerConnections.institution, lastSyncAt: brokerConnections.lastSyncAt, status: brokerConnections.status })
    .from(accounts)
    .innerJoin(brokerConnections, eq(brokerConnections.id, accounts.brokerConnectionId))
    .where(and(eq(accounts.userId, userId), inArray(accounts.id, accountIds)));
  return new Map(rows.map((r) => [r.id, r]));
}
