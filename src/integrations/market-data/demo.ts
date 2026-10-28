import { CATALOG, DEMO_INDICES } from "./catalog";
import { refKey, type Bar, type IndexQuote, type InstrumentRef, type MarketDataProvider, type Quote } from "./types";

/** Prices are anchored to this date so the synthetic history never shifts as time passes. */
const ANCHOR_DAY = Date.UTC(2026, 9, 1) / 86400_000;
const EPOCH_DAY = Date.UTC(2021, 0, 4) / 86400_000;

function fnv1a(s: string) {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type Params = { anchor: number; vol: number; drift: number; weekends: boolean };

/** Cumulative log-returns from EPOCH_DAY, cached per series. */
const cache = new Map<string, number[]>();

function cumulative(key: string, p: Params, uptoDay: number): number[] {
  let arr = cache.get(key);
  if (!arr) {
    arr = [0];
    cache.set(key, arr);
  }
  if (arr.length > uptoDay - EPOCH_DAY) return arr;
  const rand = mulberry32(fnv1a(key));
  // Re-generate deterministically from the start so values never depend on call order.
  const out = [0];
  for (let day = EPOCH_DAY + 1; day <= uptoDay + 1; day++) {
    const u1 = Math.max(rand(), 1e-12);
    const u2 = rand();
    const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    const weekday = new Date(day * 86400_000).getUTCDay();
    const trading = p.weekends || (weekday !== 0 && weekday !== 6);
    out.push(out[out.length - 1] + (trading ? p.drift + p.vol * z : 0));
  }
  cache.set(key, out);
  return out;
}

function priceOn(key: string, p: Params, day: number): number {
  const top = Math.max(day, ANCHOR_DAY);
  const c = cumulative(key, p, top);
  const value = p.anchor * Math.exp(c[day - EPOCH_DAY] - c[ANCHOR_DAY - EPOCH_DAY]);
  return value;
}

const round = (v: number, dp: number) => v.toFixed(dp);
const dpFor = (price: number) => (price >= 1000 ? 2 : price >= 1 ? 2 : 4);
const isoDay = (day: number) => new Date(day * 86400_000).toISOString().slice(0, 10);

function lastTradingDay(day: number, weekends: boolean) {
  let d = day;
  while (!weekends && [0, 6].includes(new Date(d * 86400_000).getUTCDay())) d -= 1;
  return d;
}

/**
 * Deterministic synthetic market data. Every value it returns is marked
 * isDemo and must be labelled "Demo · synthetic" wherever it is displayed.
 */
export class DemoMarketDataProvider implements MarketDataProvider {
  constructor(private readonly clock: () => Date = () => new Date()) {}

  status() {
    return {
      id: "demo",
      label: "Demo data",
      isDemo: true,
      configured: true,
      note: "Synthetic prices generated for demonstration. Not real market data.",
    };
  }

  private params(ref: InstrumentRef): Params | null {
    const c = CATALOG.find((i) => i.symbol === ref.symbol && i.exchange === ref.exchange);
    return c ? { ...c.demo, weekends: c.assetClass === "crypto" } : null;
  }

  async getQuotes(refs: InstrumentRef[]) {
    const now = this.clock();
    const today = Math.floor(now.getTime() / 86400_000);
    const out = new Map<string, Quote>();
    for (const ref of refs) {
      const p = this.params(ref);
      if (!p) continue;
      const c = CATALOG.find((i) => i.symbol === ref.symbol && i.exchange === ref.exchange)!;
      const day = lastTradingDay(today, p.weekends);
      const prev = lastTradingDay(day - 1, p.weekends);
      const price = priceOn(refKey(ref), p, day);
      out.set(refKey(ref), {
        symbol: ref.symbol,
        exchange: ref.exchange,
        price: round(price, dpFor(price)),
        previousClose: round(priceOn(refKey(ref), p, prev), dpFor(price)),
        currency: c.currency,
        asOf: now.toISOString(),
        source: "Demo · synthetic",
        isDemo: true,
        delayMinutes: 0,
      });
    }
    return out;
  }

  async getHistory(ref: InstrumentRef, from: string, to: string): Promise<Bar[]> {
    const p = this.params(ref);
    if (!p) return [];
    return this.series(refKey(ref), p, from, to);
  }

  private series(key: string, p: Params, from: string, to: string): Bar[] {
    const start = Math.max(Math.floor(Date.parse(from) / 86400_000), EPOCH_DAY + 1);
    const end = Math.min(Math.floor(Date.parse(to) / 86400_000), Math.floor(this.clock().getTime() / 86400_000));
    const bars: Bar[] = [];
    for (let day = start; day <= end; day++) {
      if (!p.weekends && [0, 6].includes(new Date(day * 86400_000).getUTCDay())) continue;
      const v = priceOn(key, p, day);
      bars.push({ date: isoDay(day), close: round(v, dpFor(v)) });
    }
    return bars;
  }

  async getIndices(days: number): Promise<IndexQuote[]> {
    const now = this.clock();
    const to = now.toISOString().slice(0, 10);
    const from = new Date(now.getTime() - days * 86400_000).toISOString().slice(0, 10);
    return DEMO_INDICES.map((idx) => {
      const p = { ...idx.demo, weekends: false };
      const history = this.series(`index:${idx.key}`, p, from, to);
      const last = history[history.length - 1];
      const prev = history[history.length - 2] ?? last;
      return {
        key: idx.key,
        name: idx.name,
        value: last?.close ?? "0",
        previousClose: prev?.close ?? "0",
        currency: idx.currency,
        asOf: now.toISOString(),
        isDemo: true,
        history,
      };
    });
  }
}
