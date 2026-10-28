import { describe, expect, it } from "vitest";
import { buildLedger, type LedgerTransaction } from "./accounting";

let n = 0;
const tx = (p: Partial<LedgerTransaction> & Pick<LedgerTransaction, "type" | "tradeDate">): LedgerTransaction => ({
  id: `t${++n}`,
  accountId: "acc",
  instrumentId: "ASML",
  quantity: null,
  price: null,
  amount: null,
  fee: "0",
  currency: "EUR",
  splitRatio: null,
  ...p,
});

describe("buildLedger", () => {
  it("accumulates average cost including fees", () => {
    const { positions } = buildLedger([
      tx({ type: "buy", tradeDate: "2024-01-02", quantity: "10", price: "100", fee: "2" }),
      tx({ type: "buy", tradeDate: "2024-02-02", quantity: "10", price: "120", fee: "2" }),
    ]);
    expect(positions[0].quantity.toFixed()).toBe("20");
    expect(positions[0].costBasis.toFixed()).toBe("2204");
  });

  it("realizes P/L on sells at average cost and keeps the remaining basis", () => {
    const { positions, cash } = buildLedger([
      tx({ type: "buy", tradeDate: "2024-01-02", quantity: "10", price: "100" }),
      tx({ type: "buy", tradeDate: "2024-01-03", quantity: "10", price: "200" }),
      tx({ type: "sell", tradeDate: "2024-03-01", quantity: "5", price: "180", fee: "1" }),
    ]);
    const p = positions[0];
    expect(p.quantity.toFixed()).toBe("15");
    // avg cost 150; proceeds 900 - 1 fee - 750 cost = 149
    expect(p.realizedPL.toFixed()).toBe("149");
    expect(p.costBasis.toFixed()).toBe("2250");
    expect(cash[0].balance.toFixed()).toBe("-2101");
  });

  it("processes by trade date, not entry order", () => {
    const { positions, issues } = buildLedger([
      tx({ type: "sell", tradeDate: "2024-05-01", quantity: "5", price: "10" }),
      tx({ type: "buy", tradeDate: "2024-01-01", quantity: "5", price: "8" }),
    ]);
    expect(issues).toHaveLength(0);
    expect(positions[0].quantity.isZero()).toBe(true);
    expect(positions[0].realizedPL.toFixed()).toBe("10");
  });

  it("flags oversells instead of going negative", () => {
    const { positions, issues } = buildLedger([
      tx({ type: "buy", tradeDate: "2024-01-01", quantity: "3", price: "10" }),
      tx({ type: "sell", tradeDate: "2024-01-02", quantity: "5", price: "10" }),
    ]);
    expect(issues[0].kind).toBe("oversell");
    expect(positions[0].quantity.toFixed()).toBe("0");
  });

  it("applies splits to quantity without changing cost", () => {
    const { positions } = buildLedger([
      tx({ type: "buy", tradeDate: "2024-01-01", quantity: "10", price: "400" }),
      tx({ type: "split", tradeDate: "2024-06-10", splitRatio: "10" }),
    ]);
    expect(positions[0].quantity.toFixed()).toBe("100");
    expect(positions[0].costBasis.toFixed()).toBe("4000");
  });

  it("marks cost basis unknown for transfers without a price", () => {
    const { positions } = buildLedger([tx({ type: "transfer_in", tradeDate: "2024-01-01", quantity: "4" })]);
    expect(positions[0].costBasisKnown).toBe(false);
  });

  it("tracks dividends as income and deposits as contributions", () => {
    const { positions, cash } = buildLedger([
      tx({ type: "deposit", tradeDate: "2024-01-01", instrumentId: null, amount: "1000" }),
      tx({ type: "buy", tradeDate: "2024-01-02", quantity: "5", price: "100" }),
      tx({ type: "dividend", tradeDate: "2024-04-01", amount: "12.5", fee: "1.88" }),
      tx({ type: "withdrawal", tradeDate: "2024-05-01", instrumentId: null, amount: "100" }),
    ]);
    expect(positions[0].income.toFixed()).toBe("10.62");
    expect(cash[0].netContributions.toFixed()).toBe("900");
    expect(cash[0].balance.toFixed()).toBe("410.62");
  });

  it("rejects malformed rows as issues", () => {
    const { issues } = buildLedger([tx({ type: "buy", tradeDate: "2024-01-01", quantity: "0", price: "1" })]);
    expect(issues[0].kind).toBe("invalid");
  });

  it("uses exact decimal arithmetic", () => {
    const { positions } = buildLedger([
      tx({ type: "buy", tradeDate: "2024-01-01", quantity: "0.1", price: "0.2" }),
      tx({ type: "buy", tradeDate: "2024-01-01", quantity: "0.2", price: "0.1" }),
    ]);
    expect(positions[0].costBasis.toFixed()).toBe("0.04");
  });
});
