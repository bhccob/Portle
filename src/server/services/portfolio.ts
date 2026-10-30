import { createHash, randomUUID } from "node:crypto";
import { and, asc, desc, eq, inArray, isNull, sql } from "drizzle-orm";
import { z } from "zod";
import { buildLedger, type LedgerTransaction } from "@/domain/accounting";
import { dedupeKey, normalizeRows, parseCsv, type ColumnMapping, type DateFormat } from "@/domain/csv-import";
import { buildValueSeries } from "@/domain/history";
import { d, isCurrency } from "@/domain/money";
import { timeWeightedReturn } from "@/domain/returns";
import { valuePortfolio, type InstrumentInfo, type PortfolioValuation } from "@/domain/valuation";
import { getMarketDataProvider } from "@/integrations/market-data";
import { audit } from "../audit";
import { getDb } from "../db";
import { accounts, importBatches, instruments, memberPrices, portfolios, transactions } from "../db/schema";
import { notFound, UserFacingError } from "../errors";
import { getAccess, hasFullAccess } from "./access";
import { getBars, getFx, getPrices, ownListing, rangeStart, type Range } from "./market";

/** Holdings at what was paid for them, for members without real prices. Nothing here depends on a price. */
function paidView(v: PortfolioValuation) {
  const rows = v.holdings.filter((h) => h.costBasisBase?.gt(0)).map((h) => ({ holding: h, paid: h.costBasisBase! }));
  const total = rows.reduce((s, r) => s.plus(r.paid), v.totals.cash.gt(0) ? v.totals.cash : d(0));
  return {
    total,
    cash: v.totals.cash,
    rows: rows.map((r) => ({ ...r, share: total.gt(0) ? r.paid.div(total) : null })).sort((a, b) => b.paid.cmp(a.paid)),
  };
}

export async function ensurePortfolio(userId: string, baseCurrency = "EUR") {
  const db = getDb();
  const [existing] = await db.select().from(portfolios).where(eq(portfolios.userId, userId)).orderBy(asc(portfolios.createdAt)).limit(1);
  if (existing) return existing;
  const [created] = await db.insert(portfolios).values({ userId, name: "My portfolio", baseCurrency }).returning();
  return created;
}

export async function setBaseCurrency(userId: string, currency: string) {
  if (!isCurrency(currency)) throw new UserFacingError("Unsupported currency.");
  const p = await ensurePortfolio(userId);
  await getDb().update(portfolios).set({ baseCurrency: currency, updatedAt: new Date() }).where(eq(portfolios.id, p.id));
}

export async function listAccounts(userId: string, includeArchived = false) {
  return getDb()
    .select()
    .from(accounts)
    .where(includeArchived ? eq(accounts.userId, userId) : and(eq(accounts.userId, userId), isNull(accounts.archivedAt)))
    .orderBy(asc(accounts.createdAt));
}

export const accountInput = z.object({
  name: z.string().trim().min(1, "Name the account.").max(60),
  institution: z.string().trim().max(60).default(""),
  kind: z.enum(["brokerage", "retirement", "crypto", "savings", "other"]).default("brokerage"),
  currency: z.string().refine(isCurrency, "Choose a supported currency."),
});

export async function createAccount(userId: string, raw: z.input<typeof accountInput>) {
  const input = accountInput.parse(raw);
  const portfolio = await ensurePortfolio(userId);
  const [row] = await getDb()
    .insert(accounts)
    .values({ ...input, userId, portfolioId: portfolio.id, source: "manual" })
    .returning();
  return row;
}

async function ownedAccount(userId: string, accountId: string) {
  const [acc] = await getDb().select().from(accounts).where(and(eq(accounts.id, accountId), eq(accounts.userId, userId)));
  if (!acc) throw notFound("Account");
  return acc;
}

export async function archiveAccount(userId: string, accountId: string) {
  await ownedAccount(userId, accountId);
  await getDb().update(accounts).set({ archivedAt: new Date() }).where(eq(accounts.id, accountId));
}

const decimalString = z
  .string()
  .trim()
  .regex(/^\d{1,18}(\.\d{1,10})?$/, "Enter a positive number (use . for decimals).");

export const transactionInput = z
  .object({
    accountId: z.uuid(),
    type: z.enum(["buy", "sell", "dividend", "interest", "fee", "deposit", "withdrawal", "split", "transfer_in", "transfer_out"]),
    instrumentId: z.uuid().optional().nullable(),
    tradeDate: z.iso.date("Choose a valid date."),
    quantity: decimalString.optional().nullable(),
    price: decimalString.optional().nullable(),
    amount: decimalString.optional().nullable(),
    fee: decimalString.default("0"),
    note: z.string().trim().max(500).default(""),
  })
  .superRefine((v, ctx) => {
    const security = ["buy", "sell", "split", "transfer_in", "transfer_out"].includes(v.type);
    if (security && !v.instrumentId) ctx.addIssue({ code: "custom", path: ["instrumentId"], message: "Choose a security." });
    if ((v.type === "buy" || v.type === "sell") && (!v.quantity || d(v.quantity).isZero()))
      ctx.addIssue({ code: "custom", path: ["quantity"], message: "Enter the quantity." });
    if ((v.type === "buy" || v.type === "sell") && !v.price) ctx.addIssue({ code: "custom", path: ["price"], message: "Enter the price per unit." });
    if ((v.type === "transfer_in" || v.type === "transfer_out") && (!v.quantity || d(v.quantity).isZero()))
      ctx.addIssue({ code: "custom", path: ["quantity"], message: "Enter the quantity." });
    if (v.type === "split" && (!v.quantity || d(v.quantity).isZero()))
      ctx.addIssue({ code: "custom", path: ["quantity"], message: "Enter the split ratio (new shares per old share)." });
    if (["dividend", "interest", "fee", "deposit", "withdrawal"].includes(v.type) && (!v.amount || d(v.amount).isZero()))
      ctx.addIssue({ code: "custom", path: ["amount"], message: "Enter the amount." });
    if (v.tradeDate > new Date().toISOString().slice(0, 10)) ctx.addIssue({ code: "custom", path: ["tradeDate"], message: "The date cannot be in the future." });
  });

export async function addTransaction(userId: string, raw: z.input<typeof transactionInput>) {
  const input = transactionInput.parse(raw);
  const acc = await ownedAccount(userId, input.accountId);
  let currency = acc.currency;
  if (input.instrumentId) {
    const [inst] = await getDb().select().from(instruments).where(eq(instruments.id, input.instrumentId));
    if (!inst) throw notFound("Security");
    currency = inst.currency;
  }
  const isSplit = input.type === "split";
  const [row] = await getDb()
    .insert(transactions)
    .values({
      userId,
      accountId: acc.id,
      instrumentId: input.instrumentId ?? null,
      type: input.type,
      tradeDate: input.tradeDate,
      quantity: isSplit ? null : (input.quantity ?? null),
      splitRatio: isSplit ? input.quantity! : null,
      price: input.price ?? null,
      amount: input.amount ?? null,
      fee: input.fee,
      currency,
      source: "manual",
      // Manual entries may legitimately repeat (two identical fills), so they never dedupe.
      dedupeHash: `manual:${randomUUID()}`,
      note: input.note,
    })
    .returning();
  return row;
}

export async function deleteTransaction(userId: string, transactionId: string) {
  const res = await getDb()
    .delete(transactions)
    .where(and(eq(transactions.id, transactionId), eq(transactions.userId, userId)))
    .returning({ id: transactions.id });
  if (!res.length) throw notFound("Transaction");
}

export async function listTransactions(userId: string, opts: { accountId?: string; instrumentId?: string; limit?: number; offset?: number } = {}) {
  const conds = [eq(transactions.userId, userId)];
  if (opts.accountId) conds.push(eq(transactions.accountId, opts.accountId));
  if (opts.instrumentId) conds.push(eq(transactions.instrumentId, opts.instrumentId));
  const rows = await getDb()
    .select({ tx: transactions, instrument: instruments, account: { id: accounts.id, name: accounts.name } })
    .from(transactions)
    .leftJoin(instruments, eq(instruments.id, transactions.instrumentId))
    .innerJoin(accounts, eq(accounts.id, transactions.accountId))
    .where(and(...conds))
    .orderBy(desc(transactions.tradeDate), desc(transactions.createdAt))
    .limit(opts.limit ?? 50)
    .offset(opts.offset ?? 0);
  const [{ count }] = await getDb().select({ count: sql<number>`count(*)::int` }).from(transactions).where(and(...conds));
  return { rows, total: count };
}

/** The ledger rows for a member (optionally some accounts), in trade order. */
export async function ledgerRows(userId: string, accountIds?: string[]): Promise<LedgerTransaction[]> {
  const conds = [eq(transactions.userId, userId)];
  if (accountIds?.length) conds.push(inArray(transactions.accountId, accountIds));
  const rows = await getDb().select().from(transactions).where(and(...conds)).orderBy(asc(transactions.tradeDate), asc(transactions.createdAt));
  return rows.map((r) => ({
    id: r.id,
    accountId: r.accountId,
    instrumentId: r.instrumentId,
    type: r.type,
    tradeDate: r.tradeDate,
    quantity: r.quantity,
    price: r.price,
    amount: r.amount,
    fee: r.fee,
    currency: r.currency,
    splitRatio: r.splitRatio,
  }));
}

async function instrumentMap(ids: string[]) {
  if (!ids.length) return new Map<string, typeof instruments.$inferSelect>();
  const rows = await getDb().select().from(instruments).where(inArray(instruments.id, ids));
  return new Map(rows.map((r) => [r.id, r]));
}

const toInfo = (r: typeof instruments.$inferSelect): InstrumentInfo => ({
  id: r.id,
  symbol: r.symbol,
  exchange: r.exchange,
  name: r.name,
  assetClass: r.assetClass,
  currency: r.currency,
  sector: r.sector,
  region: r.region,
});

/** The full, private valuation of a user's portfolio. Only ever called for the owner. */
export async function getValuation(userId: string, opts: { accountId?: string } = {}) {
  const portfolio = await ensurePortfolio(userId);
  const accountList = await listAccounts(userId);
  const ids = opts.accountId ? accountList.filter((a) => a.id === opts.accountId).map((a) => a.id) : accountList.map((a) => a.id);
  if (opts.accountId && !ids.length) throw notFound("Account");
  const ledger = buildLedger(ids.length ? await ledgerRows(userId, ids) : []);
  const instIds = [...new Set(ledger.positions.map((p) => p.instrumentId))];
  const insts = await instrumentMap(instIds);
  const open = ledger.positions.filter((p) => p.quantity.gt(0)).map((p) => insts.get(p.instrumentId)!).filter(Boolean);
  const [prices, fxCtx] = await Promise.all([getPrices(open, { userId }), getFx()]);
  const valuation = valuePortfolio({
    positions: ledger.positions,
    cash: ledger.cash,
    instruments: new Map([...insts.values()].map((r) => [r.id, toInfo(r)])),
    prices,
    fx: fxCtx.fx,
    baseCurrency: portfolio.baseCurrency,
  });
  return {
    portfolio,
    accounts: accountList,
    valuation,
    access: await getAccess(userId),
    paid: paidView(valuation),
    issues: ledger.issues,
    fx: { label: fxCtx.label, asOf: fxCtx.asOf, isDemo: fxCtx.isDemo },
    market: getMarketDataProvider().status(),
    transactionCount: ledger.positions.length + ledger.cash.length,
  };
}

/** Holdings-sleeve value series and time-weighted return over a range. */
export async function getPerformance(userId: string, range: Range, opts: { accountId?: string } = {}) {
  if (!(await hasFullAccess(userId))) return { available: false as const, reason: "Value over time needs market prices, which come with Portle Plus." };
  const portfolio = await ensurePortfolio(userId);
  const txns = await ledgerRows(userId, opts.accountId ? [opts.accountId] : undefined);
  const instIds = [...new Set(txns.map((t) => t.instrumentId).filter((x): x is string => !!x))];
  const insts = await instrumentMap(instIds);
  const provider = getMarketDataProvider();
  const now = new Date();
  const from = rangeStart(range, now);
  const to = now.toISOString().slice(0, 10);
  const histories = new Map<string, { date: string; close: string }[]>();
  await Promise.all(
    [...insts.values()].map(async (i) => {
      // Fetch a little earlier so the first day in range has a prior close to carry forward.
      const start = new Date(Date.parse(from) - 10 * 86400_000).toISOString().slice(0, 10);
      histories.set(i.id, await getBars(i, start, to));
    }),
  );
  const dates = [...new Set([...histories.values()].flatMap((h) => h.map((b) => b.date)))].filter((x) => x >= from).sort();
  if (!dates.length) return { available: false as const, reason: "No price history is available for these holdings from the current data provider." };

  const lastClose = (id: string, date: string) => {
    const h = histories.get(id);
    if (!h?.length) return null;
    let lo = 0;
    let hi = h.length - 1;
    let found: string | null = null;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      if (h[mid].date <= date) {
        found = h[mid].close;
        lo = mid + 1;
      } else hi = mid - 1;
    }
    return found ? d(found) : null;
  };
  const fxCtx = await getFx();
  const points = buildValueSeries({
    transactions: txns,
    dates,
    closeOn: lastClose,
    toBase: (v, ccy) => fxCtx.fx.convert(v, ccy, portfolio.baseCurrency),
    currencyOf: (id) => insts.get(id)?.currency ?? portfolio.baseCurrency,
  });
  const twr = timeWeightedReturn(points);
  return {
    available: true as const,
    baseCurrency: portfolio.baseCurrency,
    points: points.map((p, i) => ({ date: p.date, value: p.value.toFixed(2), cumulative: twr.series[i].cumulative.toFixed(6) })),
    twr: twr.total.toFixed(6),
    isDemo: provider.status().isDemo,
    fxLabel: fxCtx.label,
  };
}

/** Imports a CSV into one account. Duplicate rows (same content, or same broker id) are skipped. */
export async function importCsv(
  userId: string,
  input: { accountId: string; filename: string; text: string; mapping: ColumnMapping; dateFormat: DateFormat },
) {
  const acc = await ownedAccount(userId, input.accountId);
  const parsed = parseCsv(input.text);
  if (!parsed.rows.length) throw new UserFacingError("The file has no data rows.");
  const { valid, errors } = normalizeRows(parsed.rows, input.mapping, { dateFormat: input.dateFormat, defaultCurrency: acc.currency });

  const db = getDb();
  const result = await db.transaction(async (tx) => {
    const [batch] = await tx
      .insert(importBatches)
      .values({
        userId,
        accountId: acc.id,
        filename: input.filename.slice(0, 120),
        rowCount: parsed.rows.length,
        importedCount: 0,
        duplicateCount: 0,
        errorCount: errors.length,
        errors: errors.slice(0, 200),
      })
      .returning();

    const unresolved = new Set<string>();
    const resolved = new Map<string, typeof instruments.$inferSelect>();
    const resolve = async (symbol: string, currency: string) => {
      const k = symbol.toUpperCase();
      if (resolved.has(k)) return resolved.get(k)!;
      const [match] = await tx
        .select()
        .from(instruments)
        .where(sql`upper(${instruments.symbol}) = ${k} or upper(${instruments.isin}) = ${k} or upper(${instruments.name}) = ${k}`)
        .orderBy(sql`case when ${instruments.exchange} = '' then 1 else 0 end`)
        .limit(1);
      let inst = match;
      if (!inst) {
        // Unknown securities are kept, flagged, and left unpriced rather than guessed.
        [inst] = await tx
          .insert(instruments)
          .values({ symbol: k.slice(0, 32), exchange: "", name: symbol.slice(0, 120), assetClass: "other", currency })
          .onConflictDoUpdate({ target: [instruments.symbol, instruments.exchange], set: { symbol: k.slice(0, 32) } })
          .returning();
        unresolved.add(k);
      }
      resolved.set(k, inst);
      return inst;
    };

    let imported = 0;
    let duplicates = 0;
    const seen = new Map<string, number>();
    for (const row of valid) {
      const inst = row.symbol ? await resolve(row.symbol, row.currency) : null;
      const base = dedupeKey(row);
      const n = (seen.get(base) ?? 0) + 1;
      seen.set(base, n);
      const hash = createHash("sha256").update(`${base}#${n}`).digest("hex");
      const inserted = await tx
        .insert(transactions)
        .values({
          userId,
          accountId: acc.id,
          instrumentId: inst?.id ?? null,
          type: row.type,
          tradeDate: row.tradeDate,
          quantity: row.quantity,
          price: row.price,
          amount: row.amount,
          fee: row.fee,
          currency: inst?.currency && inst.exchange ? inst.currency : row.currency,
          splitRatio: row.splitRatio,
          source: "csv",
          externalId: row.externalId,
          importBatchId: batch.id,
          dedupeHash: hash,
          note: row.note,
        })
        .onConflictDoNothing()
        .returning({ id: transactions.id });
      if (inserted.length) imported++;
      else duplicates++;
    }
    await tx.update(importBatches).set({ importedCount: imported, duplicateCount: duplicates }).where(eq(importBatches.id, batch.id));
    await audit(tx, { userId, action: "portfolio.csv_import", entityType: "account", entityId: acc.id, metadata: { imported, duplicates, errors: errors.length } });
    return { batchId: batch.id, imported, duplicates, errors, unresolved: [...unresolved], rowCount: parsed.rows.length };
  });
  if (acc.source === "manual" && result.imported > 0) await db.update(accounts).set({ source: "csv" }).where(eq(accounts.id, acc.id));
  return result;
}

export async function listImports(userId: string) {
  return getDb().select().from(importBatches).where(eq(importBatches.userId, userId)).orderBy(desc(importBatches.createdAt)).limit(20);
}

const SAMPLE: { symbol: string; type: "buy" | "sell" | "dividend"; date: string; qty?: string; price?: string; amount?: string; fee?: string }[] = [
  { symbol: "VWCE", type: "buy", date: "2024-02-05", qty: "40", price: "108.20", fee: "2" },
  { symbol: "ASML", type: "buy", date: "2024-03-12", qty: "4", price: "880.00", fee: "2" },
  { symbol: "MSFT", type: "buy", date: "2024-04-08", qty: "6", price: "420.10", fee: "1" },
  { symbol: "NOVO-B", type: "buy", date: "2024-06-17", qty: "10", price: "960.00", fee: "3" },
  { symbol: "VWCE", type: "buy", date: "2024-09-02", qty: "25", price: "117.40", fee: "2" },
  { symbol: "MSFT", type: "dividend", date: "2024-12-12", amount: "4.98" },
  { symbol: "ASML", type: "sell", date: "2025-01-20", qty: "1", price: "710.00", fee: "2" },
  { symbol: "AGG", type: "buy", date: "2025-02-10", qty: "20", price: "97.80", fee: "1" },
  { symbol: "EIMI", type: "buy", date: "2025-05-06", qty: "60", price: "30.10", fee: "2" },
];

/**
 * Creates a clearly labelled demo account with sample transactions so a new
 * member can explore before entering real data. Archive it to remove it from totals.
 */
export async function loadSamplePortfolio(userId: string) {
  const portfolio = await ensurePortfolio(userId);
  const db = getDb();
  const existing = await db.select().from(accounts).where(and(eq(accounts.userId, userId), eq(accounts.source, "demo"), isNull(accounts.archivedAt)));
  if (existing.length) throw new UserFacingError("The sample portfolio is already loaded.");
  await db.transaction(async (tx) => {
    const [acc] = await tx
      .insert(accounts)
      .values({ userId, portfolioId: portfolio.id, name: "Sample portfolio", institution: "Demo data", kind: "brokerage", currency: portfolio.baseCurrency, source: "demo" })
      .returning();
    for (const row of SAMPLE) {
      const [inst] = await tx.select().from(instruments).where(and(eq(instruments.symbol, row.symbol), sql`${instruments.exchange} <> ''`));
      if (!inst) continue;
      await tx.insert(transactions).values({
        userId,
        accountId: acc.id,
        instrumentId: inst.id,
        type: row.type,
        tradeDate: row.date,
        quantity: row.qty ?? null,
        price: row.price ?? null,
        amount: row.amount ?? null,
        fee: row.fee ?? "0",
        currency: inst.currency,
        source: "demo",
        dedupeHash: `demo:${randomUUID()}`,
        note: "Sample data",
      });
    }
  });
}

// ---------- Things without a ticker ----------

export const ownItemInput = z.object({
  accountId: z.uuid(),
  name: z.string().trim().min(1, "Give it a name.").max(40, "Keep the name under 40 characters."),
  quantity: decimalString,
  price: decimalString,
  cost: decimalString.optional().nullable(),
  currency: z.string().refine(isCurrency, "Choose a currency."),
  tradeDate: z.iso.date("Choose a valid date."),
});

/**
 * Gold coins, a watch, anything with no market price: Portle lists it for this member only
 * and values it at the price they set, labelled "Your own price".
 */
export async function addOwnItem(userId: string, raw: z.input<typeof ownItemInput>) {
  const input = ownItemInput.parse(raw);
  if (d(input.quantity).lte(0)) throw new UserFacingError("Enter how many you have.");
  if (d(input.price).lte(0)) throw new UserFacingError("Enter what one is worth today.");
  await ownedAccount(userId, input.accountId);
  const db = getDb();
  const [inst] = await db
    .insert(instruments)
    .values({ symbol: input.name, exchange: ownListing(userId), name: input.name, assetClass: "other", currency: input.currency })
    .onConflictDoUpdate({ target: [instruments.symbol, instruments.exchange], set: { currency: input.currency } })
    .returning();
  await addTransaction(userId, {
    accountId: input.accountId,
    type: "transfer_in",
    instrumentId: inst.id,
    tradeDate: input.tradeDate,
    quantity: input.quantity,
    price: input.cost || null,
  });
  await setOwnPrice(userId, inst.id, input.price, true);
  return inst;
}

/** A new price for something the member values themselves. */
export async function setOwnPrice(userId: string, instrumentId: string, price: string, adding = false) {
  if (!/^\d{1,15}(\.\d{1,10})?$/.test(price) || d(price).lte(0)) throw new UserFacingError("Enter what one is worth today.");
  const db = getDb();
  const [inst] = await db.select().from(instruments).where(eq(instruments.id, instrumentId));
  if (!inst || inst.exchange !== ownListing(userId)) throw notFound("Item");
  const row = { userId, instrumentId, price, currency: inst.currency, asOf: new Date(), source: "Your own price", own: true };
  if (adding) await db.insert(memberPrices).values(row).onConflictDoUpdate({ target: [memberPrices.userId, memberPrices.instrumentId], set: row });
  else await db.update(memberPrices).set({ price, asOf: row.asOf }).where(and(eq(memberPrices.userId, userId), eq(memberPrices.instrumentId, instrumentId)));
}

/** What the member values themselves, for "Update a price". */
export async function listOwnItems(userId: string) {
  return getDb()
    .select({ id: instruments.id, name: instruments.name, currency: instruments.currency, price: memberPrices.price, asOf: memberPrices.asOf })
    .from(memberPrices)
    .innerJoin(instruments, eq(instruments.id, memberPrices.instrumentId))
    .where(and(eq(memberPrices.userId, userId), eq(memberPrices.own, true)))
    .orderBy(asc(instruments.name));
}
