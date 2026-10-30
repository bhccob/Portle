import { eq } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { setMarketDataProvider, type Bar, type InstrumentRef, type MarketDataProvider, type Quote } from "@/integrations/market-data";
import { createTestDb, createTestUser, grantFullAccess } from "@/test/db";
import type { Db } from "../db";
import { instruments, priceChecks } from "../db/schema";
import { getBars, getPrices, lastSettle } from "./market";

/** A stand-in for a licensed end-of-day provider that counts what it's asked. */
class FakeDaily implements MarketDataProvider {
  quoteCalls: string[][] = [];
  historyCalls: { symbol: string; from: string; to: string }[] = [];
  known = new Set(["AAPL"]);
  failHistory = false;
  status() {
    return { id: "fake", label: "Fake", isDemo: false, configured: true, note: "", dailyCloses: true };
  }
  async getQuotes(refs: InstrumentRef[]) {
    this.quoteCalls.push(refs.map((r) => r.symbol));
    const out = new Map<string, Quote>();
    for (const r of refs.filter((x) => this.known.has(x.symbol))) {
      out.set(`${r.symbol}:${r.exchange}`, {
        symbol: r.symbol,
        exchange: r.exchange,
        price: "233.5",
        previousClose: "230",
        currency: "USD",
        asOf: "2026-10-29T00:00:00.000Z",
        source: "Fake",
        isDemo: false,
        delayMinutes: 1440,
      });
    }
    return out;
  }
  async getHistory(ref: InstrumentRef, from: string, to: string): Promise<Bar[]> {
    this.historyCalls.push({ symbol: ref.symbol, from, to });
    if (this.failHistory) throw new Error("marketstack_usage_limit_reached");
    const bars: Bar[] = [];
    for (let t = Date.parse(from); t <= Date.parse(to); t += 86400_000) bars.push({ date: new Date(t).toISOString().slice(0, 10), close: "100" });
    return bars;
  }
  async getIndices() {
    return [];
  }
}

let db: Db;
let fake: FakeDaily;
let aapl: typeof instruments.$inferSelect;
let msft: typeof instruments.$inferSelect;
let viewer: { userId: string };

beforeAll(async () => {
  db = await createTestDb();
  [aapl] = await db.select().from(instruments).where(eq(instruments.symbol, "AAPL"));
  [msft] = await db.select().from(instruments).where(eq(instruments.symbol, "MSFT"));
  const u = await createTestUser(db, "Priced");
  await grantFullAccess(db, u.id);
  viewer = { userId: u.id };
});
beforeEach(async () => {
  vi.useRealTimers();
  await db.delete(priceChecks);
  fake = new FakeDaily();
  setMarketDataProvider(fake);
});
afterAll(() => setMarketDataProvider(undefined));

describe("end-of-day prices", () => {
  it("settles once per weekday at 23:00 UTC", () => {
    expect(lastSettle(new Date("2026-10-29T23:30:00Z")).toISOString()).toBe("2026-10-29T23:00:00.000Z");
    expect(lastSettle(new Date("2026-10-30T12:00:00Z")).toISOString()).toBe("2026-10-29T23:00:00.000Z");
    // Saturday and Monday morning both still show Friday's close.
    expect(lastSettle(new Date("2026-10-31T23:30:00Z")).toISOString()).toBe("2026-10-30T23:00:00.000Z");
    expect(lastSettle(new Date("2026-11-02T08:00:00Z")).toISOString()).toBe("2026-10-30T23:00:00.000Z");
  });

  it("asks the provider once per close, including about securities it didn't know", async () => {
    const first = await getPrices([aapl, msft], viewer);
    expect(first.get(aapl.id)).toMatchObject({ price: "233.5", asOf: "2026-10-29" });
    expect(first.has(msft.id)).toBe(false);
    await getPrices([aapl, msft], viewer);
    expect(fake.quoteCalls).toEqual([["AAPL", "MSFT"]]);

    // After the next close, both are asked about again.
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(lastSettle().getTime() + 3 * 86400_000 + 3600_000));
    await getPrices([aapl, msft], viewer);
    expect(fake.quoteCalls).toHaveLength(2);
  });

  it("keeps daily closes, asking only for a longer range or the days since", async () => {
    const year = await getBars(aapl, "2025-10-30", "2026-10-30");
    expect(year).toHaveLength(366);
    await getBars(aapl, "2026-07-30", "2026-10-30");
    expect(fake.historyCalls).toHaveLength(1);

    // A longer range than what's kept asks for the whole range once.
    await getBars(aapl, "2023-10-30", "2026-10-30");
    expect(fake.historyCalls[1]).toMatchObject({ from: "2023-10-30" });

    // After the next close, only the newest days are asked for.
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(lastSettle().getTime() + 3 * 86400_000 + 3600_000));
    await getBars(aapl, "2025-10-30", "2026-10-30");
    expect(fake.historyCalls[2]).toMatchObject({ from: "2026-10-30" });
  });

  it("shows what's kept when the provider refuses, and asks again next time", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    fake.failHistory = true;
    expect(await getBars(msft, "2026-10-01", "2026-10-30")).toEqual([]);
    expect(await getBars(msft, "2026-10-01", "2026-10-30")).toEqual([]);
    expect(fake.historyCalls).toHaveLength(2);
    warn.mockRestore();
  });
});
