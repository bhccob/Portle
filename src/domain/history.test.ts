import { describe, expect, it } from "vitest";
import type { LedgerTransaction } from "./accounting";
import { buildValueSeries } from "./history";
import { d } from "./money";
import { timeWeightedReturn } from "./returns";

const t = (p: Partial<LedgerTransaction>): LedgerTransaction => ({
  id: Math.random().toString(),
  accountId: "a",
  instrumentId: "X",
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

const closes: Record<string, number> = { "2024-01-01": 10, "2024-01-02": 11, "2024-01-03": 11, "2024-01-04": 12.1 };

describe("buildValueSeries", () => {
  const series = buildValueSeries({
    transactions: [
      t({ tradeDate: "2023-12-20", quantity: "10", price: "9" }),
      t({ tradeDate: "2024-01-03", quantity: "10", price: "11" }),
    ],
    dates: Object.keys(closes),
    closeOn: (_id, date) => d(closes[date]),
    toBase: (v) => v,
    currencyOf: () => "EUR",
  });

  it("values positions opened before the range", () => {
    expect(series[0].value.toFixed()).toBe("100");
    expect(series[0].flow.toFixed()).toBe("0");
  });

  it("records purchases as flows on their trade date", () => {
    expect(series[2].flow.toFixed()).toBe("110");
    expect(series[2].value.toFixed()).toBe("220");
  });

  it("yields a time-weighted return equal to the price return", () => {
    // 10 -> 12.1 is +21% regardless of the extra purchase on day 3.
    expect(timeWeightedReturn(series).total.toDecimalPlaces(8).toFixed()).toBe("0.21");
  });

  it("applies splits to quantity", () => {
    const s = buildValueSeries({
      transactions: [t({ tradeDate: "2024-01-01", quantity: "1", price: "100" }), t({ type: "split", tradeDate: "2024-01-02", splitRatio: "4" })],
      dates: ["2024-01-01", "2024-01-02"],
      closeOn: (_id, date) => d(date === "2024-01-01" ? 100 : 25),
      toBase: (v) => v,
      currencyOf: () => "EUR",
    });
    expect(s.map((p) => p.value.toFixed())).toEqual(["100", "100"]);
  });
});
