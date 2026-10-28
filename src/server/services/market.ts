import { and, asc, desc, eq, ilike, inArray, or, sql } from "drizzle-orm";
import { createFxConverter, type FxConverter, type FxRate } from "@/domain/fx";
import type { PriceInfo } from "@/domain/valuation";
import { demoFx, getFxProvider } from "@/integrations/fx";
import { getMarketDataProvider, refKey, type Bar } from "@/integrations/market-data";
import { getDb } from "../db";
import { fxRates, guildMembers, instruments, quotes, watchlistItems, watchlists } from "../db/schema";
import { forbidden, notFound, UserFacingError } from "../errors";

export type InstrumentRow = typeof instruments.$inferSelect;

const QUOTE_TTL_MS = 15 * 60 * 1000;

/** Prices for instruments, keyed by instrument id. Missing entries mean "no price", never zero. */
export async function getPrices(rows: Pick<InstrumentRow, "id" | "symbol" | "exchange">[]): Promise<Map<string, PriceInfo>> {
  const out = new Map<string, PriceInfo>();
  if (!rows.length) return out;
  const provider = getMarketDataProvider();
  const status = provider.status();

  const toInfo = (q: { price: string; previousClose: string | null; currency: string; asOf: string; source: string; isDemo: boolean; delayMinutes: number }): PriceInfo => q;

  if (status.isDemo) {
    const qs = await provider.getQuotes(rows.map((r) => ({ symbol: r.symbol, exchange: r.exchange })));
    for (const r of rows) {
      const q = qs.get(refKey(r));
      if (q) out.set(r.id, toInfo(q));
    }
    return out;
  }

  const db = getDb();
  const cached = await db.select().from(quotes).where(inArray(quotes.instrumentId, rows.map((r) => r.id)));
  const byId = new Map(cached.map((c) => [c.instrumentId, c]));
  const stale = rows.filter((r) => {
    const c = byId.get(r.id);
    return !c || Date.now() - c.fetchedAt.getTime() > QUOTE_TTL_MS;
  });
  if (stale.length && status.configured) {
    const fresh = await provider.getQuotes(stale.map((r) => ({ symbol: r.symbol, exchange: r.exchange })));
    for (const r of stale) {
      const q = fresh.get(refKey(r));
      if (!q) continue;
      const values = {
        instrumentId: r.id,
        price: q.price,
        previousClose: q.previousClose,
        currency: q.currency,
        asOf: new Date(q.asOf),
        source: q.source,
        delayMinutes: q.delayMinutes,
        fetchedAt: new Date(),
      };
      await db.insert(quotes).values(values).onConflictDoUpdate({ target: quotes.instrumentId, set: values });
      byId.set(r.id, values);
    }
  }
  for (const r of rows) {
    const c = byId.get(r.id);
    if (c)
      out.set(r.id, {
        price: c.price,
        previousClose: c.previousClose,
        currency: c.currency,
        asOf: c.asOf.toISOString(),
        source: c.source,
        isDemo: false,
        delayMinutes: c.delayMinutes,
      });
  }
  return out;
}

export type FxContext = { fx: FxConverter; label: string; asOf: string; isDemo: boolean };

/** ECB reference rates (cached daily in fx_rates) or labelled demo rates. Never silently invented. */
export async function getFx(): Promise<FxContext> {
  const provider = getFxProvider();
  if (provider.isDemo) {
    const rates = await demoFx.latest("EUR");
    return { fx: createFxConverter(rates), label: "Demo FX · fixed rates", asOf: "demo", isDemo: true };
  }
  const db = getDb();
  const latest = await db.select().from(fxRates).where(eq(fxRates.base, "EUR")).orderBy(desc(fxRates.fetchedAt)).limit(1);
  const fresh = latest[0] && Date.now() - latest[0].fetchedAt.getTime() < 12 * 3600_000;
  if (!fresh) {
    try {
      const rates = await provider.latest("EUR");
      for (const r of rates) {
        await db
          .insert(fxRates)
          .values({ base: r.base, quote: r.quote, rateDate: r.asOf, rate: r.rate, source: r.source })
          .onConflictDoUpdate({
            target: [fxRates.base, fxRates.quote, fxRates.rateDate],
            set: { rate: r.rate, fetchedAt: new Date() },
          });
      }
    } catch {
      // Fall through to whatever is cached; reported via the label below.
    }
  }
  const [newest] = await db.select({ d: fxRates.rateDate }).from(fxRates).where(eq(fxRates.base, "EUR")).orderBy(desc(fxRates.rateDate)).limit(1);
  if (!newest) {
    const rates = await demoFx.latest("EUR");
    return { fx: createFxConverter(rates), label: "Demo FX · provider unavailable", asOf: "demo", isDemo: true };
  }
  const rows = await db.select().from(fxRates).where(and(eq(fxRates.base, "EUR"), eq(fxRates.rateDate, newest.d)));
  const rates: FxRate[] = rows.map((r) => ({ base: r.base, quote: r.quote, rate: r.rate, asOf: r.rateDate, source: r.source }));
  return { fx: createFxConverter(rates), label: "ECB reference rates", asOf: newest.d, isDemo: false };
}

export function marketStatus() {
  return getMarketDataProvider().status();
}

export const RANGES = { "1M": 31, "3M": 92, "6M": 183, "1Y": 366, "3Y": 1096 } as const;
export type Range = keyof typeof RANGES | "YTD";

export function rangeStart(range: Range, now = new Date()): string {
  if (range === "YTD") return `${now.getUTCFullYear()}-01-01`;
  return new Date(now.getTime() - RANGES[range] * 86400_000).toISOString().slice(0, 10);
}

export async function getHistory(inst: Pick<InstrumentRow, "symbol" | "exchange">, range: Range): Promise<Bar[]> {
  const now = new Date();
  return getMarketDataProvider().getHistory(inst, rangeStart(range, now), now.toISOString().slice(0, 10));
}

export async function getIndices(days = 92) {
  return getMarketDataProvider().getIndices(days);
}

export async function searchInstruments(q: string, limit = 20) {
  const term = q.trim().slice(0, 60);
  const db = getDb();
  if (!term) return db.select().from(instruments).where(sql`${instruments.exchange} <> ''`).orderBy(asc(instruments.symbol)).limit(limit);
  const like = `%${term.replace(/[%_\\]/g, "\\$&")}%`;
  return db
    .select()
    .from(instruments)
    .where(or(ilike(instruments.symbol, like), ilike(instruments.name, like), ilike(instruments.isin, like)))
    .orderBy(sql`case when upper(${instruments.symbol}) = upper(${term}) then 0 else 1 end`, asc(instruments.symbol))
    .limit(limit);
}

export async function getInstrument(id: string) {
  const [row] = await getDb().select().from(instruments).where(eq(instruments.id, id));
  return row ?? null;
}

export async function getInstrumentBySymbol(symbol: string, exchange?: string) {
  const db = getDb();
  const rows = await db
    .select()
    .from(instruments)
    .where(exchange !== undefined ? and(eq(instruments.symbol, symbol), eq(instruments.exchange, exchange)) : eq(sql`upper(${instruments.symbol})`, symbol.toUpperCase()));
  // Prefer listed instruments over user-defined placeholders.
  return rows.sort((a, b) => (a.exchange === "" ? 1 : 0) - (b.exchange === "" ? 1 : 0))[0] ?? null;
}

// ---------- Watchlists ----------

async function assertWatchlistAccess(userId: string, watchlistId: string, mode: "read" | "write") {
  const db = getDb();
  const [wl] = await db.select().from(watchlists).where(eq(watchlists.id, watchlistId));
  if (!wl) throw notFound("Watchlist");
  if (wl.userId === userId) return wl;
  if (wl.guildId) {
    const [m] = await db
      .select()
      .from(guildMembers)
      .where(and(eq(guildMembers.guildId, wl.guildId), eq(guildMembers.userId, userId)));
    if (m) return wl;
  }
  if (mode === "read") throw notFound("Watchlist");
  throw forbidden();
}

export async function listWatchlists(userId: string) {
  const db = getDb();
  const lists = await db.select().from(watchlists).where(and(eq(watchlists.userId, userId), sql`${watchlists.guildId} is null`)).orderBy(asc(watchlists.createdAt));
  return withItems(lists);
}

export async function listGuildWatchlists(guildId: string) {
  const lists = await getDb().select().from(watchlists).where(eq(watchlists.guildId, guildId)).orderBy(asc(watchlists.createdAt));
  return withItems(lists);
}

async function withItems(lists: (typeof watchlists.$inferSelect)[]) {
  if (!lists.length) return [];
  const items = await getDb()
    .select({ watchlistId: watchlistItems.watchlistId, note: watchlistItems.note, addedAt: watchlistItems.addedAt, instrument: instruments })
    .from(watchlistItems)
    .innerJoin(instruments, eq(instruments.id, watchlistItems.instrumentId))
    .where(inArray(watchlistItems.watchlistId, lists.map((l) => l.id)))
    .orderBy(asc(watchlistItems.addedAt));
  return lists.map((l) => ({ ...l, items: items.filter((i) => i.watchlistId === l.id) }));
}

export async function createWatchlist(userId: string, name: string, guildId?: string) {
  const clean = name.trim().slice(0, 60);
  if (!clean) throw new UserFacingError("Give the watchlist a name.");
  if (guildId) {
    const [m] = await getDb()
      .select()
      .from(guildMembers)
      .where(and(eq(guildMembers.guildId, guildId), eq(guildMembers.userId, userId)));
    if (!m) throw forbidden("Only Guild members can create shared watchlists.");
  }
  const [wl] = await getDb()
    .insert(watchlists)
    .values({ userId, name: clean, guildId: guildId ?? null, visibility: guildId ? "guild" : "private" })
    .returning();
  return wl;
}

export async function addToWatchlist(userId: string, watchlistId: string, instrumentId: string, note = "") {
  await assertWatchlistAccess(userId, watchlistId, "write");
  if (!(await getInstrument(instrumentId))) throw notFound("Security");
  await getDb().insert(watchlistItems).values({ watchlistId, instrumentId, note: note.slice(0, 280) }).onConflictDoNothing();
}

export async function removeFromWatchlist(userId: string, watchlistId: string, instrumentId: string) {
  await assertWatchlistAccess(userId, watchlistId, "write");
  await getDb().delete(watchlistItems).where(and(eq(watchlistItems.watchlistId, watchlistId), eq(watchlistItems.instrumentId, instrumentId)));
}

export async function deleteWatchlist(userId: string, watchlistId: string) {
  const wl = await assertWatchlistAccess(userId, watchlistId, "write");
  if (wl.userId !== userId) throw forbidden("Only the creator can delete this watchlist.");
  await getDb().delete(watchlists).where(eq(watchlists.id, watchlistId));
}

/** Ensures every user starts with one personal watchlist. */
export async function ensureDefaultWatchlist(userId: string) {
  const existing = await listWatchlists(userId);
  if (existing.length) return existing[0];
  return { ...(await createWatchlist(userId, "Studying")), items: [] };
}
