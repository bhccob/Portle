import { d, roundCash, ZERO, type Dec } from "./money";

export type PaperConfig = { currency: string; feeFlat: string; feeBps: string; slippageBps: string };

export type PaperQuote = { price: string; asOf: string; source: string; isDemo: boolean } | null;

export type OrderInput = {
  side: "buy" | "sell";
  type: "market" | "limit";
  quantity: string;
  limitPrice?: string | null;
};

export type AccountState = {
  cash: Dec;
  /** Quantity currently held of this instrument. */
  held: Dec;
  /** Quantity already committed to open sell orders of this instrument. */
  reservedForSale: Dec;
  /** Cash set aside for open limit buys (worst case at their limit prices). */
  reservedCash: Dec;
};

export type Decision =
  | { kind: "reject"; reason: string }
  | { kind: "rest"; reason: string }
  | { kind: "fill"; price: Dec; fee: Dec; cashDelta: Dec };

/** Quotes older than this are not executable (demo quotes are generated fresh). */
export const MAX_QUOTE_AGE_MS = 24 * 60 * 60 * 1000;
const MAX_QUANTITY = d("1000000000");

export function fee(config: PaperConfig, notional: Dec): Dec {
  return roundCash(d(config.feeFlat).plus(notional.times(d(config.feeBps)).div(10_000)), config.currency);
}

/**
 * Deterministic simulated execution. Market orders fill at the quote moved
 * against the trader by the slippage assumption; limit orders fill only when
 * marketable, at a price no worse than the limit. Without a usable quote the
 * order is rejected: the Lab never invents a fill price.
 */
export function decideOrder(input: OrderInput, state: AccountState, quote: PaperQuote, config: PaperConfig, now: Date): Decision {
  let qty: Dec;
  try {
    qty = d(input.quantity);
  } catch {
    return { kind: "reject", reason: "Quantity is not a number." };
  }
  if (!qty.isFinite() || qty.lte(0)) return { kind: "reject", reason: "Quantity must be greater than zero." };
  if (qty.gt(MAX_QUANTITY)) return { kind: "reject", reason: "Quantity is unrealistically large." };
  if (qty.decimalPlaces() > 6) return { kind: "reject", reason: "Use at most 6 decimal places for quantity." };

  let limit: Dec | null = null;
  if (input.type === "limit") {
    if (!input.limitPrice) return { kind: "reject", reason: "A limit order needs a limit price." };
    limit = d(input.limitPrice);
    if (!limit.isFinite() || limit.lte(0)) return { kind: "reject", reason: "Limit price must be greater than zero." };
  }

  if (input.side === "sell") {
    const available = state.held.minus(state.reservedForSale);
    if (qty.gt(available)) {
      return {
        kind: "reject",
        reason: `You can sell at most ${available.toFixed()} (held ${state.held.toFixed()}, ${state.reservedForSale.toFixed()} already in open orders).`,
      };
    }
  }

  if (!quote) return { kind: "reject", reason: "No quote is available for this security, so the Lab cannot fill the order." };
  const age = now.getTime() - Date.parse(quote.asOf);
  if (!quote.isDemo && age > MAX_QUOTE_AGE_MS) {
    return { kind: "reject", reason: "The latest quote is more than a day old; the Lab will not fill against stale prices." };
  }

  const mid = d(quote.price);
  const slip = d(config.slippageBps).div(10_000);
  const marketBuy = mid.times(slip.plus(1));
  const marketSell = mid.times(d(1).minus(slip));

  let price: Dec;
  // A limit order is marketable when the quote crosses it; slippage can then
  // worsen the fill only up to the limit itself.
  if (input.side === "buy") {
    if (limit && mid.gt(limit)) {
      return checkReserve(input, qty, limit, state, config);
    }
    price = limit ? Dec_min(limit, marketBuy) : marketBuy;
  } else {
    if (limit && mid.lt(limit)) {
      return { kind: "rest", reason: "Waiting for the price to reach your limit." };
    }
    price = limit ? Dec_max(limit, marketSell) : marketSell;
  }
  price = price.toDecimalPlaces(6);

  const notional = qty.times(price);
  const f = fee(config, notional);
  const cashDelta = roundCash(input.side === "buy" ? notional.plus(f).neg() : notional.minus(f), config.currency);
  const spendable = state.cash.minus(state.reservedCash);
  if (spendable.plus(cashDelta).lt(ZERO)) {
    return {
      kind: "reject",
      reason: `Not enough virtual cash: this order needs ${cashDelta.neg().toFixed(2)} and ${spendable.toFixed(2)} is available.`,
    };
  }
  return { kind: "fill", price, fee: f, cashDelta };
}

function checkReserve(input: OrderInput, qty: Dec, limit: Dec, state: AccountState, config: PaperConfig): Decision {
  const worstCase = qty.times(limit);
  if (state.cash.minus(state.reservedCash).lt(worstCase.plus(fee(config, worstCase)))) {
    return { kind: "reject", reason: "Not enough virtual cash to cover this limit order if it fills." };
  }
  return { kind: "rest", reason: "Waiting for the price to reach your limit." };
}

const Dec_min = (a: Dec, b: Dec) => (a.lt(b) ? a : b);
const Dec_max = (a: Dec, b: Dec) => (a.gt(b) ? a : b);

export type PaperFill = { instrumentId: string; side: "buy" | "sell"; quantity: string; price: string; fee: string };

export type PaperPosition = { instrumentId: string; quantity: Dec; costBasis: Dec; realized: Dec };

/** Average-cost positions from simulated fills. */
export function paperPositions(fills: PaperFill[]): Map<string, PaperPosition> {
  const out = new Map<string, PaperPosition>();
  for (const f of fills) {
    const p = out.get(f.instrumentId) ?? { instrumentId: f.instrumentId, quantity: ZERO, costBasis: ZERO, realized: ZERO };
    const q = d(f.quantity);
    const px = d(f.price);
    const fe = d(f.fee);
    if (f.side === "buy") {
      p.quantity = p.quantity.plus(q);
      p.costBasis = p.costBasis.plus(q.times(px)).plus(fe);
    } else if (p.quantity.gt(0)) {
      const avg = p.costBasis.div(p.quantity);
      p.realized = p.realized.plus(q.times(px).minus(fe).minus(avg.times(q)));
      p.costBasis = p.costBasis.minus(avg.times(q));
      p.quantity = p.quantity.minus(q);
      if (p.quantity.isZero()) p.costBasis = ZERO;
    }
    out.set(f.instrumentId, p);
  }
  return out;
}
