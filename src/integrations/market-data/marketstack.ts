import { refKey, type Bar, type IndexQuote, type InstrumentRef, type MarketDataProvider, type Quote } from "./types";

type EodRow = { symbol: string; date: string; close: number | string | null; price_currency?: string | null };
type EodPage = { data?: EodRow[]; pagination?: { total?: number }; error?: { code?: string; message?: string } };

const PAGE = 1000;
const BATCH = 100;
/** Listings marketstack knows by their bare ticker. Broker-only securities with no known listing ("") try the same. */
const BARE = new Set(["", "XNAS", "XNYS", "ARCX", "BATS", "XASE"]);

/** marketstack's name for a listing: AAPL for US listings, ASML.XAMS elsewhere. */
export const marketstackSymbol = (ref: InstrumentRef) => (BARE.has(ref.exchange) ? ref.symbol : `${ref.symbol}.${ref.exchange}`);

const day = (iso: string) => iso.slice(0, 10);

/** London prices come in pence; Portle keeps every price in a whole currency. */
function money(close: number | string, currency: string | null | undefined) {
  const c = (currency ?? "").trim();
  if (c === "GBX" || c === "GBp") return { price: String(Number(close) / 100), currency: "GBP" };
  return { price: String(close), currency: c.toUpperCase() };
}

/**
 * marketstack adapter (https://marketstack.com, API v2), end-of-day prices. Needs MARKETSTACK_API_KEY.
 * Every symbol in a request counts against the plan, so the market service caches what comes back
 * until the next close. Not exercised against the live API in CI.
 */
export class MarketstackMarketDataProvider implements MarketDataProvider {
  constructor(
    private readonly apiKey: string | undefined,
    private readonly fetchImpl: typeof fetch = fetch,
    private readonly baseUrl = "https://api.marketstack.com/v2",
    private readonly clock: () => Date = () => new Date(),
  ) {}

  status() {
    return {
      id: "marketstack",
      label: "marketstack",
      isDemo: false,
      configured: !!this.apiKey,
      dailyCloses: true,
      note: this.apiKey
        ? "Closing prices from marketstack. They update once a day after the markets close, so they aren't live."
        : "marketstack is selected but MARKETSTACK_API_KEY is not set.",
    };
  }

  /** Daily closes for up to 100 symbols, oldest first. Errors carry marketstack's code, never the key. */
  private async eod(symbols: string[], from: string, to: string): Promise<EodRow[]> {
    if (!this.apiKey) throw new Error("not_configured");
    const rows: EodRow[] = [];
    for (let offset = 0; ; offset += PAGE) {
      const params = new URLSearchParams({
        access_key: this.apiKey,
        symbols: symbols.join(","),
        date_from: from,
        date_to: to,
        sort: "ASC",
        limit: String(PAGE),
        offset: String(offset),
      });
      const res = await this.fetchImpl(`${this.baseUrl}/eod?${params}`, { signal: AbortSignal.timeout(10_000) });
      const body = (await res.json().catch(() => ({}))) as EodPage;
      if (!res.ok || body.error) throw new Error(`marketstack_${body.error?.code ?? res.status}`);
      const page = body.data ?? [];
      rows.push(...page);
      if (page.length < PAGE || rows.length >= (body.pagination?.total ?? 0)) return rows;
    }
  }

  async getQuotes(refs: InstrumentRef[]) {
    const out = new Map<string, Quote>();
    const now = this.clock();
    const to = day(now.toISOString());
    // Ten days back always holds the last two trading days, even across holidays.
    const from = day(new Date(now.getTime() - 10 * 86400_000).toISOString());
    const bySymbol = new Map(refs.map((r) => [marketstackSymbol(r).toUpperCase(), r]));
    const symbols = [...bySymbol.keys()];
    for (let i = 0; i < symbols.length; i += BATCH) {
      let rows: EodRow[];
      try {
        rows = await this.eod(symbols.slice(i, i + BATCH), from, to);
      } catch (e) {
        console.warn("[market] marketstack quotes failed:", (e as Error).message);
        if (/limit/.test((e as Error).message)) break;
        continue;
      }
      const closes = new Map<string, EodRow[]>();
      for (const row of rows) {
        if (row.close === null || row.close === "" || !Number.isFinite(Number(row.close))) continue;
        const key = row.symbol.toUpperCase();
        closes.set(key, [...(closes.get(key) ?? []), row]);
      }
      for (const [symbol, list] of closes) {
        const ref = bySymbol.get(symbol);
        if (!ref) continue;
        list.sort((a, b) => a.date.localeCompare(b.date));
        const last = list[list.length - 1];
        const prev = list[list.length - 2];
        const latest = money(last.close!, last.price_currency ?? (BARE.has(ref.exchange) ? "USD" : null));
        if (!latest.currency) continue;
        out.set(refKey(ref), {
          symbol: ref.symbol,
          exchange: ref.exchange,
          price: latest.price,
          previousClose: prev ? money(prev.close!, prev.price_currency ?? latest.currency).price : null,
          currency: latest.currency,
          asOf: `${day(last.date)}T00:00:00.000Z`,
          source: "marketstack",
          isDemo: false,
          delayMinutes: 24 * 60,
        });
      }
    }
    return out;
  }

  /** Throws when marketstack refuses, so the caller can tell "no history" from "couldn't ask". */
  async getHistory(ref: InstrumentRef, from: string, to: string): Promise<Bar[]> {
    const rows = await this.eod([marketstackSymbol(ref)], from, to);
    return rows
      .filter((r) => r.close !== null && r.close !== "" && Number.isFinite(Number(r.close)))
      .map((r) => ({ date: day(r.date), close: money(r.close!, r.price_currency).price }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  async getIndices(): Promise<IndexQuote[]> {
    return [];
  }
}
