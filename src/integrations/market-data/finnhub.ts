import { refKey, type Bar, type IndexQuote, type InstrumentRef, type MarketDataProvider, type Quote } from "./types";

type FinnhubQuote = { c: number; pc: number; t: number };

/**
 * Finnhub adapter (https://finnhub.io). Requires FINNHUB_API_KEY and is subject
 * to Finnhub's plan limits and terms (free tier: 60 calls/minute, US listings).
 * Not exercised against the live API in CI; see docs/ARCHITECTURE.md.
 */
export class FinnhubMarketDataProvider implements MarketDataProvider {
  private calls: number[] = [];

  constructor(
    private readonly apiKey: string | undefined,
    private readonly fetchImpl: typeof fetch = fetch,
    private readonly baseUrl = "https://finnhub.io/api/v1",
  ) {}

  status() {
    return {
      id: "finnhub",
      label: "Finnhub",
      isDemo: false,
      configured: !!this.apiKey,
      note: this.apiKey
        ? "Quotes from Finnhub; may be delayed depending on exchange and plan."
        : "Finnhub is selected but FINNHUB_API_KEY is not set.",
    };
  }

  /** Client-side guard so a burst of page loads cannot exceed the plan's per-minute budget. */
  private async throttle() {
    const now = Date.now();
    this.calls = this.calls.filter((t) => now - t < 60_000);
    if (this.calls.length >= 55) throw new Error("rate_limited");
    this.calls.push(now);
  }

  private async get<T>(path: string): Promise<T> {
    if (!this.apiKey) throw new Error("not_configured");
    await this.throttle();
    const res = await this.fetchImpl(`${this.baseUrl}${path}`, {
      headers: { "X-Finnhub-Token": this.apiKey },
      signal: AbortSignal.timeout(8000),
    });
    if (res.status === 429) throw new Error("rate_limited");
    if (!res.ok) throw new Error(`provider_error_${res.status}`);
    return (await res.json()) as T;
  }

  async getQuotes(refs: InstrumentRef[]) {
    const out = new Map<string, Quote>();
    for (const ref of refs) {
      try {
        const q = await this.get<FinnhubQuote>(`/quote?symbol=${encodeURIComponent(ref.symbol)}`);
        // Finnhub answers unknown symbols with zeros rather than an error.
        if (!q || !q.c || !q.t) continue;
        out.set(refKey(ref), {
          symbol: ref.symbol,
          exchange: ref.exchange,
          price: String(q.c),
          previousClose: q.pc ? String(q.pc) : null,
          currency: "USD",
          asOf: new Date(q.t * 1000).toISOString(),
          source: "Finnhub",
          isDemo: false,
          delayMinutes: 15,
        });
      } catch (e) {
        if ((e as Error).message === "rate_limited") break;
      }
    }
    return out;
  }

  async getHistory(): Promise<Bar[]> {
    // Daily candles are not part of Finnhub's free plan; history stays empty rather than invented.
    return [];
  }

  async getIndices(): Promise<IndexQuote[]> {
    return [];
  }
}
