import type { LedgerTransaction } from "./accounting";
import { d, ZERO, type Dec } from "./money";
import type { ValuePoint } from "./returns";

/**
 * Replays the ledger day by day to produce the holdings value series used for
 * time-weighted returns. Flows are the money moved into the securities sleeve
 * (buys add, sells subtract, transfers move at market value), so deposits sitting
 * in cash never count as performance.
 */
export function buildValueSeries(input: {
  transactions: LedgerTransaction[];
  dates: string[];
  closeOn: (instrumentId: string, date: string) => Dec | null;
  toBase: (amount: Dec, currency: string) => Dec | null;
  currencyOf: (instrumentId: string) => string;
}): ValuePoint[] {
  const txns = [...input.transactions].sort((a, b) => (a.tradeDate < b.tradeDate ? -1 : a.tradeDate > b.tradeDate ? 1 : 0));
  const qty = new Map<string, Dec>();
  let i = 0;

  const apply = (t: LedgerTransaction, date: string | null) => {
    let flow = ZERO;
    let income = ZERO;
    const base = (v: Dec) => input.toBase(v, t.currency) ?? ZERO;
    const id = t.instrumentId;
    const q = d(t.quantity);
    const held = id ? (qty.get(id) ?? ZERO) : ZERO;
    switch (t.type) {
      case "buy":
        if (!id) break;
        qty.set(id, held.plus(q));
        flow = base(q.times(d(t.price)).plus(d(t.fee)));
        break;
      case "sell": {
        if (!id) break;
        const sold = q.gt(held) ? held : q;
        qty.set(id, held.minus(sold));
        flow = base(sold.times(d(t.price)).minus(d(t.fee))).neg();
        break;
      }
      case "transfer_in":
      case "transfer_out": {
        if (!id) break;
        const sign = t.type === "transfer_in" ? 1 : -1;
        const moved = sign < 0 && q.gt(held) ? held : q;
        qty.set(id, held.plus(moved.times(sign)));
        const close = date ? input.closeOn(id, date) : null;
        const mv = close ? input.toBase(moved.times(close), input.currencyOf(id)) : null;
        flow = (mv ?? ZERO).times(sign);
        break;
      }
      case "split":
        if (id && t.splitRatio) qty.set(id, held.times(d(t.splitRatio)));
        break;
      case "dividend":
        income = base(d(t.amount).minus(d(t.fee)));
        break;
    }
    return { flow, income };
  };

  const first = input.dates[0];
  while (i < txns.length && first && txns[i].tradeDate < first) apply(txns[i++], null);

  const points: ValuePoint[] = [];
  for (const date of input.dates) {
    let flow = ZERO;
    let income = ZERO;
    while (i < txns.length && txns[i].tradeDate <= date) {
      const r = apply(txns[i++], date);
      flow = flow.plus(r.flow);
      income = income.plus(r.income);
    }
    let value = ZERO;
    for (const [id, q] of qty) {
      if (q.isZero()) continue;
      const close = input.closeOn(id, date);
      if (!close) continue;
      const v = input.toBase(q.times(close), input.currencyOf(id));
      if (v) value = value.plus(v);
    }
    points.push({ date, value, flow, income });
  }
  return points;
}
