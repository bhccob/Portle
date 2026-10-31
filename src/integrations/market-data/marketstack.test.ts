import { describe, expect, it, vi } from "vitest";
import { MarketstackMarketDataProvider, marketstackSymbol } from "./marketstack";

const row = (symbol: string, date: string, close: number | null, price_currency = "USD") => ({ symbol, date: `${date}T00:00:00+0000`, close, price_currency });

function answer(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

function provider(respond: (url: URL) => Response) {
  const calls: URL[] = [];
  const fetchImpl = vi.fn(async (input: string | URL | Request) => {
    const url = new URL(String(input));
    calls.push(url);
    return respond(url);
  }) as unknown as typeof fetch;
  const p = new MarketstackMarketDataProvider("secret-key", fetchImpl, "https://api.example/v2", () => new Date("2026-10-30T12:00:00Z"));
  return { p, calls };
}

describe("marketstack", () => {
  // Endings checked against marketstack's own ticker list (2026-10-31).
  it("names US listings by their ticker and other listings with their Yahoo-style ending", () => {
    expect(marketstackSymbol({ symbol: "AAPL", exchange: "XNAS" })).toBe("AAPL");
    expect(marketstackSymbol({ symbol: "VOO", exchange: "ARCX" })).toBe("VOO");
    expect(marketstackSymbol({ symbol: "ZETA", exchange: "" })).toBe("ZETA");
    expect(marketstackSymbol({ symbol: "ASML", exchange: "XAMS" })).toBe("ASML.AS");
    expect(marketstackSymbol({ symbol: "VWCE", exchange: "XETR" })).toBe("VWCE.DE");
    expect(marketstackSymbol({ symbol: "NOVO-B", exchange: "XCSE" })).toBe("NOVO-B.CO");
    expect(marketstackSymbol({ symbol: "VUSA", exchange: "XLON" })).toBe("VUSA.L");
    // An exchange without a known ending is skipped rather than risk a US company with the same ticker.
    expect(marketstackSymbol({ symbol: "CDR", exchange: "XWAR" })).toBeNull();
  });

  it("turns the last two closes into a price and the day before", async () => {
    const { p, calls } = provider(() =>
      answer({
        pagination: { total: 5 },
        data: [
          row("AAPL", "2026-10-28", 230),
          row("AAPL", "2026-10-29", 233.5),
          row("ASML.AS", "2026-10-29", 690, "EUR"),
          row("VUSA.L", "2026-10-29", 8650, "GBX"),
        ],
      }),
    );
    const quotes = await p.getQuotes([
      { symbol: "AAPL", exchange: "XNAS" },
      { symbol: "ASML", exchange: "XAMS" },
      { symbol: "VUSA", exchange: "XLON" },
      { symbol: "NOPE", exchange: "XNYS" },
      { symbol: "CDR", exchange: "XWAR" },
    ]);
    expect(calls).toHaveLength(1);
    expect(calls[0].pathname).toBe("/v2/eod");
    expect(calls[0].searchParams.get("symbols")).toBe("AAPL,ASML.AS,VUSA.L,NOPE");
    expect(calls[0].searchParams.get("date_from")).toBe("2026-10-20");
    expect(quotes.get("AAPL:XNAS")).toMatchObject({ price: "233.5", previousClose: "230", currency: "USD", asOf: "2026-10-29T00:00:00.000Z", isDemo: false });
    expect(quotes.get("ASML:XAMS")).toMatchObject({ price: "690", previousClose: null, currency: "EUR" });
    // London quotes in pence; Portle keeps pounds.
    expect(quotes.get("VUSA:XLON")).toMatchObject({ price: "86.5", currency: "GBP" });
    expect(quotes.has("NOPE:XNYS")).toBe(false);
    expect(quotes.has("CDR:XWAR")).toBe(false);
  });

  it("doesn't spend a request on history for an exchange it can't name", async () => {
    const { p, calls } = provider(() => answer({ data: [] }));
    expect(await p.getHistory({ symbol: "CDR", exchange: "XWAR" }, "2026-01-01", "2026-10-30")).toEqual([]);
    expect(calls).toHaveLength(0);
  });

  it("asks for at most 100 symbols at a time", async () => {
    const { p, calls } = provider(() => answer({ data: [] }));
    await p.getQuotes(Array.from({ length: 150 }, (_, i) => ({ symbol: `S${i}`, exchange: "XNYS" })));
    expect(calls.map((c) => c.searchParams.get("symbols")!.split(",").length)).toEqual([100, 50]);
  });

  it("stops quietly when the monthly allowance is used up, without leaking the key", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { p, calls } = provider(() => answer({ error: { code: "usage_limit_reached", message: "Limit reached" } }, 429));
    const quotes = await p.getQuotes(Array.from({ length: 150 }, (_, i) => ({ symbol: `S${i}`, exchange: "XNYS" })));
    expect(quotes.size).toBe(0);
    expect(calls).toHaveLength(1);
    expect(warn.mock.calls.flat().join(" ")).not.toContain("secret-key");
    warn.mockRestore();
    await expect(p.getHistory({ symbol: "AAPL", exchange: "XNAS" }, "2026-01-01", "2026-10-30")).rejects.toThrow("marketstack_usage_limit_reached");
  });

  it("returns history oldest first and pages past 1,000 days", async () => {
    const days = Array.from({ length: 1200 }, (_, i) => row("AAPL", new Date(Date.UTC(2022, 0, 1) + i * 86400_000).toISOString().slice(0, 10), 100 + i));
    const { p, calls } = provider((url) => {
      const offset = Number(url.searchParams.get("offset"));
      return answer({ pagination: { total: days.length }, data: days.slice(offset, offset + 1000) });
    });
    const bars = await p.getHistory({ symbol: "AAPL", exchange: "XNAS" }, "2022-01-01", "2026-10-30");
    expect(calls.map((c) => c.searchParams.get("offset"))).toEqual(["0", "1000"]);
    expect(bars).toHaveLength(1200);
    expect(bars[0]).toEqual({ date: "2022-01-01", close: "100" });
    expect(bars.every((b, i) => i === 0 || b.date > bars[i - 1].date)).toBe(true);
  });
});
