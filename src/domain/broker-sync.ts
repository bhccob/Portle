import { d, type Dec, ZERO } from "./money";

/** What Portle's ledger says an account holds of one security. */
export type LedgerHolding = { instrumentId: string; quantity: Dec; currency: string };

/** What the broker says the account holds, already matched to a Portle security. */
export type BrokerHolding = { instrumentId: string; quantity: string; averagePrice: string | null; price: string | null; currency: string };

/** A transfer that brings Portle's records in line with the broker. */
export type HoldingAdjustment = { instrumentId: string; type: "transfer_in" | "transfer_out"; quantity: string; price: string | null; currency: string };

/** Differences smaller than this are rounding, not a real holding. */
const DUST = d("0.000001");

/**
 * The broker's current holdings are the truth for a synced account. After its
 * history is copied in, whatever still differs (history the broker no longer
 * keeps, corporate actions, a broker that gives no history at all) is settled
 * with a transfer in or out, at the broker's average price when it has one.
 */
export function reconcileHoldings(ledger: LedgerHolding[], broker: BrokerHolding[]): HoldingAdjustment[] {
  const held = new Map(ledger.map((h) => [h.instrumentId, h]));
  const reported = new Map<string, { quantity: Dec; cost: Dec; costKnown: boolean; price: string | null; currency: string }>();
  for (const b of broker) {
    const r = reported.get(b.instrumentId) ?? { quantity: ZERO, cost: ZERO, costKnown: true, price: b.price, currency: b.currency };
    r.quantity = r.quantity.plus(b.quantity);
    if (b.averagePrice) r.cost = r.cost.plus(d(b.quantity).times(b.averagePrice));
    else r.costKnown = false;
    reported.set(b.instrumentId, r);
  }

  const out: HoldingAdjustment[] = [];
  for (const [instrumentId, r] of reported) {
    const diff = r.quantity.minus(held.get(instrumentId)?.quantity ?? ZERO);
    if (diff.abs().lt(DUST)) continue;
    if (diff.gt(0)) {
      const average = r.costKnown && r.quantity.gt(0) ? r.cost.div(r.quantity).toString() : r.price;
      out.push({ instrumentId, type: "transfer_in", quantity: diff.toString(), price: average, currency: r.currency });
    } else {
      out.push({ instrumentId, type: "transfer_out", quantity: diff.abs().toString(), price: null, currency: r.currency });
    }
  }
  for (const h of ledger) {
    if (!reported.has(h.instrumentId) && h.quantity.gt(DUST)) {
      out.push({ instrumentId: h.instrumentId, type: "transfer_out", quantity: h.quantity.toString(), price: null, currency: h.currency });
    }
  }
  return out;
}
