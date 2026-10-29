import { describe, expect, it, vi } from "vitest";
import { SnapTradeProvider } from "./snaptrade";

const user = { userId: "u", userSecret: "s" };

/** A provider whose SnapTrade client answers the positions call with `results`. */
function withPositions(results: unknown[]) {
  const provider = new SnapTradeProvider("client", "key");
  const getAllAccountPositions = vi.fn(async () => ({ data: { results } }));
  vi.spyOn(provider as unknown as { client: () => unknown }, "client").mockReturnValue({ accountInformation: { getAllAccountPositions } });
  return { provider, getAllAccountPositions };
}

describe("SnapTradeProvider.listPositions", () => {
  it("reads the positions call, which replaced the holdings call", async () => {
    const { provider, getAllAccountPositions } = withPositions([
      {
        instrument: { kind: "stock", symbol: "ASML", raw_symbol: "ASML", description: "ASML Holding", currency: "EUR" },
        units: "3",
        cost_basis: "612.5",
        price: "700.1",
        currency: "EUR",
      },
      { instrument: { kind: "etf", symbol: "VWRL", raw_symbol: "VWRL", currency: "EUR" }, units: "10.5", cost_basis: null, price: "120", currency: null },
    ]);
    expect(await provider.listPositions(user, "acc")).toEqual([
      { symbol: "ASML", name: "ASML Holding", currency: "EUR", kind: "equity", quantity: "3", averagePrice: "612.5", price: "700.1" },
      { symbol: "VWRL", name: "VWRL", currency: "EUR", kind: "etf", quantity: "10.5", averagePrice: null, price: "120" },
    ]);
    expect(getAllAccountPositions).toHaveBeenCalledWith({ ...user, accountId: "acc" });
  });

  it("leaves out options, cash sweeps and empty lines", async () => {
    const { provider } = withPositions([
      { instrument: { kind: "option", symbol: "AAPL 260116C00200000" }, units: "1", price: "4", currency: "USD" },
      { instrument: { kind: "mutualfund", symbol: "SWVXX", raw_symbol: "SWVXX" }, units: "50", price: "1", currency: "USD", cash_equivalent: true },
      { instrument: { kind: "stock", symbol: "MSFT", raw_symbol: "MSFT" }, units: null, price: "400", currency: "USD" },
    ]);
    expect(await provider.listPositions(user, "acc")).toEqual([]);
  });
});
