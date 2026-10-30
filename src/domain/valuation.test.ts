import { describe, expect, it } from "vitest";
import { buildLedger, type LedgerTransaction } from "./accounting";
import { createFxConverter } from "./fx";
import { d } from "./money";
import { valuePortfolio, type InstrumentInfo, type PriceInfo } from "./valuation";

const fx = createFxConverter([
  { base: "EUR", quote: "USD", rate: "1.25", asOf: "2024-06-01", source: "test" },
  { base: "EUR", quote: "GBP", rate: "0.8", asOf: "2024-06-01", source: "test" },
]);

const inst = (id: string, currency: string, assetClass = "equity", sector = "Technology"): InstrumentInfo => ({
  id,
  symbol: id,
  name: id,
  assetClass,
  currency,
  sector,
  region: currency === "USD" ? "North America" : "Europe",
});

const price = (p: string, currency: string, prev?: string): PriceInfo => ({
  price: p,
  previousClose: prev ?? null,
  currency,
  asOf: "2024-06-01T16:00:00Z",
  source: "test",
  isDemo: false,
  delayMinutes: 0,
});

const t = (p: Partial<LedgerTransaction>): LedgerTransaction => ({
  id: Math.random().toString(),
  accountId: "a",
  instrumentId: null,
  type: "buy",
  tradeDate: "2024-01-01",
  quantity: null,
  price: null,
  amount: null,
  fee: "0",
  currency: "EUR",
  splitRatio: null,
  ...p,
});

describe("FX", () => {
  it("handles direct, inverse and cross rates", () => {
    expect(fx.rate("EUR", "USD")!.toFixed()).toBe("1.25");
    expect(fx.rate("USD", "EUR")!.toFixed()).toBe("0.8");
    expect(fx.rate("USD", "GBP")!.toFixed()).toBe("0.64");
    expect(fx.rate("EUR", "JPY")).toBeNull();
  });
});

describe("dividends in another currency", () => {
  // A EUR-listed ETF that pays its dividends in USD, as DEGIRO reports VUSA.
  const ledger = buildLedger([
    t({ instrumentId: "VUSA", quantity: "4", price: "110" }),
    t({ instrumentId: "VUSA", type: "dividend", tradeDate: "2024-04-01", amount: "5", fee: "0", currency: "USD" }),
    t({ instrumentId: "VUSA", type: "dividend", tradeDate: "2024-07-01", amount: "2", currency: "EUR" }),
  ]);

  it("are normal, not a mismatch, and stay in the currency they were paid in", () => {
    expect(ledger.issues).toEqual([]);
    expect(ledger.positions[0].income.toFixed()).toBe("2");
    expect(ledger.positions[0].foreignIncome.USD.toFixed()).toBe("5");
  });

  it("count toward income at current rates", () => {
    const v = valuePortfolio({
      positions: ledger.positions,
      cash: [],
      instruments: new Map([["VUSA", inst("VUSA", "EUR", "etf")]]),
      prices: new Map([["VUSA", price("120", "EUR")]]),
      fx,
      baseCurrency: "EUR",
    });
    // 2 EUR + 5 USD at 1.25 = 6 EUR
    expect(v.totals.income.toFixed()).toBe("6");
  });
});

describe("valuePortfolio", () => {
  const ledger = buildLedger([
    t({ instrumentId: "ASML", quantity: "10", price: "500" }),
    t({ instrumentId: "MSFT", quantity: "10", price: "300", currency: "USD" }),
    t({ instrumentId: "NOPRICE", quantity: "1", price: "10" }),
  ]);
  const v = valuePortfolio({
    positions: ledger.positions,
    cash: [],
    instruments: new Map([
      ["ASML", inst("ASML", "EUR")],
      ["MSFT", inst("MSFT", "USD")],
      ["NOPRICE", inst("NOPRICE", "EUR", "other")],
    ]),
    prices: new Map([
      ["ASML", price("600", "EUR", "500")],
      ["MSFT", price("400", "USD")],
    ]),
    fx,
    baseCurrency: "EUR",
  });

  it("converts to the base currency", () => {
    // ASML 6000 EUR + MSFT 4000 USD = 3200 EUR
    expect(v.totals.marketValue.toFixed()).toBe("9200");
    expect(v.totals.costBasis.toFixed()).toBe("7400");
    expect(v.totals.unrealized.toFixed()).toBe("1800");
  });

  it("excludes holdings without a price rather than guessing", () => {
    expect(v.excluded).toEqual([{ symbol: "NOPRICE", reason: "No price available" }]);
    expect(v.holdings.find((h) => h.instrument.id === "NOPRICE")!.marketValueBase).toBeNull();
  });

  it("computes weights and allocation that sum to 100%", () => {
    const total = v.allocation.region.reduce((acc, s) => acc.plus(s.percent), d(0));
    expect(total.toFixed()).toBe("1");
    expect(v.holdings[0].instrument.id).toBe("ASML");
    expect(v.holdings[0].weight!.toDecimalPlaces(4).toFixed()).toBe("0.6522");
  });

  it("derives day change from previous close", () => {
    expect(v.totals.dayChange.toFixed()).toBe("1000");
  });
});

describe("where prices came from", () => {
  const ledger = buildLedger([t({ instrumentId: "ASML", quantity: "2", price: "500" }), t({ instrumentId: "DEMO", quantity: "1", price: "10" })]);
  const value = (prices: Map<string, PriceInfo>) =>
    valuePortfolio({
      positions: ledger.positions,
      cash: [],
      instruments: new Map([
        ["ASML", inst("ASML", "EUR")],
        ["DEMO", inst("DEMO", "EUR")],
      ]),
      prices,
      fx,
      baseCurrency: "EUR",
    });

  it("names the real sources and says when demo prices are mixed in", () => {
    const v = value(
      new Map([
        ["ASML", { ...price("600", "EUR"), source: "DEGIRO via SnapTrade" }],
        ["DEMO", { ...price("12", "EUR"), isDemo: true }],
      ]),
    );
    expect(v.priceSources).toEqual(["DEGIRO via SnapTrade"]);
    expect(v.usesDemoPrices).toBe(true);
  });

  it("leaves today's change unknown, not 0%, when no price has a previous close", () => {
    expect(value(new Map([["ASML", price("600", "EUR")]])).totals.dayChangePct).toBeNull();
    expect(value(new Map([["ASML", price("600", "EUR", "600")]])).totals.dayChangePct!.toFixed()).toBe("0");
  });
});
