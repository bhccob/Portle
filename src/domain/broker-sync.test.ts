import { describe, expect, it } from "vitest";
import { reconcileHoldings } from "./broker-sync";
import { d } from "./money";

describe("reconcileHoldings", () => {
  it("adds what the broker holds that Portle has no record of, at the broker's average price", () => {
    expect(reconcileHoldings([], [{ instrumentId: "asml", quantity: "3", averagePrice: "612.5", price: "700", currency: "EUR" }])).toEqual([
      { instrumentId: "asml", type: "transfer_in", quantity: "3", price: "612.5", currency: "EUR" },
    ]);
  });

  it("falls back to today's price when the broker gives no average price", () => {
    const [a] = reconcileHoldings([], [{ instrumentId: "vwrl", quantity: "10", averagePrice: null, price: "120", currency: "EUR" }]);
    expect(a.price).toBe("120");
  });

  it("changes nothing when the records already match", () => {
    expect(
      reconcileHoldings(
        [{ instrumentId: "asml", quantity: d("3"), currency: "EUR" }],
        [{ instrumentId: "asml", quantity: "3.0", averagePrice: "600", price: null, currency: "EUR" }],
      ),
    ).toEqual([]);
  });

  it("tops up or trims to the broker's quantity", () => {
    const ledger = [
      { instrumentId: "asml", quantity: d("2"), currency: "EUR" },
      { instrumentId: "vwrl", quantity: d("10"), currency: "EUR" },
    ];
    const broker = [
      { instrumentId: "asml", quantity: "3", averagePrice: "600", price: null, currency: "EUR" },
      { instrumentId: "vwrl", quantity: "7.5", averagePrice: "100", price: null, currency: "EUR" },
    ];
    expect(reconcileHoldings(ledger, broker)).toEqual([
      { instrumentId: "asml", type: "transfer_in", quantity: "1", price: "600", currency: "EUR" },
      { instrumentId: "vwrl", type: "transfer_out", quantity: "2.5", price: null, currency: "EUR" },
    ]);
  });

  it("closes out a holding the broker no longer lists", () => {
    expect(reconcileHoldings([{ instrumentId: "old", quantity: d("4"), currency: "USD" }], [])).toEqual([
      { instrumentId: "old", type: "transfer_out", quantity: "4", price: null, currency: "USD" },
    ]);
  });

  it("adds up two broker lines for the same security", () => {
    const [a] = reconcileHoldings(
      [],
      [
        { instrumentId: "asml", quantity: "1", averagePrice: "600", price: null, currency: "EUR" },
        { instrumentId: "asml", quantity: "2", averagePrice: "630", price: null, currency: "EUR" },
      ],
    );
    expect(a).toEqual({ instrumentId: "asml", type: "transfer_in", quantity: "3", price: "620", currency: "EUR" });
  });

  it("ignores rounding dust", () => {
    expect(
      reconcileHoldings(
        [{ instrumentId: "a", quantity: d("1.0000000001"), currency: "EUR" }],
        [{ instrumentId: "a", quantity: "1", averagePrice: null, price: null, currency: "EUR" }],
      ),
    ).toEqual([]);
  });
});
