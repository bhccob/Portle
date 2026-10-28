import { describe, expect, it } from "vitest";
import { d, ZERO } from "./money";
import { decideOrder, paperPositions, type AccountState, type PaperConfig } from "./paper";

const config: PaperConfig = { currency: "USD", feeFlat: "1", feeBps: "5", slippageBps: "10" };
const now = new Date("2024-06-03T15:00:00Z");
const quote = { price: "100", asOf: "2024-06-03T14:59:00Z", source: "test", isDemo: false };
const state = (cash: string, held = "0", reservedForSale = "0", reservedCash = "0"): AccountState => ({
  cash: d(cash),
  held: d(held),
  reservedForSale: d(reservedForSale),
  reservedCash: d(reservedCash),
});

describe("decideOrder", () => {
  it("fills market buys at quote plus slippage with fees", () => {
    const r = decideOrder({ side: "buy", type: "market", quantity: "10" }, state("10000"), quote, config, now);
    expect(r.kind).toBe("fill");
    if (r.kind !== "fill") return;
    expect(r.price.toFixed()).toBe("100.1");
    // fee = 1 + 1001 * 0.0005 = 1.5005 -> 1.50
    expect(r.fee.toFixed()).toBe("1.5");
    expect(r.cashDelta.toFixed()).toBe("-1002.5");
  });

  it("fills market sells below the quote", () => {
    const r = decideOrder({ side: "sell", type: "market", quantity: "5" }, state("0", "5"), quote, config, now);
    expect(r.kind === "fill" && r.price.toFixed()).toBe("99.9");
  });

  it("rejects insufficient virtual cash", () => {
    const r = decideOrder({ side: "buy", type: "market", quantity: "100" }, state("500"), quote, config, now);
    expect(r.kind).toBe("reject");
  });

  it("counts cash reserved by open limit orders", () => {
    const r = decideOrder({ side: "buy", type: "market", quantity: "5" }, state("1000", "0", "0", "800"), quote, config, now);
    expect(r.kind).toBe("reject");
  });

  it("rejects selling more than is held or already reserved", () => {
    expect(decideOrder({ side: "sell", type: "market", quantity: "6" }, state("0", "5"), quote, config, now).kind).toBe("reject");
    expect(decideOrder({ side: "sell", type: "market", quantity: "3" }, state("0", "5", "3"), quote, config, now).kind).toBe(
      "reject",
    );
  });

  it("rejects invalid quantities", () => {
    for (const q of ["0", "-1", "abc", "1.1234567"]) {
      expect(decideOrder({ side: "buy", type: "market", quantity: q }, state("1000"), quote, config, now).kind).toBe("reject");
    }
  });

  it("never fills without a quote", () => {
    const r = decideOrder({ side: "buy", type: "market", quantity: "1" }, state("1000"), null, config, now);
    expect(r.kind === "reject" && r.reason).toMatch(/No quote/);
  });

  it("refuses stale live quotes", () => {
    const stale = { ...quote, asOf: "2024-06-01T10:00:00Z" };
    expect(decideOrder({ side: "buy", type: "market", quantity: "1" }, state("1000"), stale, config, now).kind).toBe("reject");
  });

  it("rests limit buys above market and fills marketable ones at no worse than the limit", () => {
    expect(
      decideOrder({ side: "buy", type: "limit", quantity: "1", limitPrice: "95" }, state("1000"), quote, config, now).kind,
    ).toBe("rest");
    const r = decideOrder({ side: "buy", type: "limit", quantity: "1", limitPrice: "100.05" }, state("1000"), quote, config, now);
    expect(r.kind === "fill" && r.price.toFixed()).toBe("100.05");
  });

  it("rests limit sells below the limit", () => {
    const r = decideOrder({ side: "sell", type: "limit", quantity: "1", limitPrice: "105" }, state("0", "1"), quote, config, now);
    expect(r.kind).toBe("rest");
  });
});

describe("paperPositions", () => {
  it("tracks average cost and realized P/L", () => {
    const pos = paperPositions([
      { instrumentId: "X", side: "buy", quantity: "10", price: "10", fee: "1" },
      { instrumentId: "X", side: "sell", quantity: "5", price: "12", fee: "1" },
    ]).get("X")!;
    expect(pos.quantity.toFixed()).toBe("5");
    expect(pos.costBasis.toFixed()).toBe("50.5");
    expect(pos.realized.toFixed()).toBe("8.5");
    expect(ZERO.toFixed()).toBe("0");
  });
});
