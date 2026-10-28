import { Dec, ONE, ZERO, type Dec as DecT } from "./money";

export type ValuePoint = {
  date: string;
  /** Market value at the end of the day. */
  value: DecT;
  /** Net money moved into the measured sleeve on that day (buys minus sells), before valuation. */
  flow: DecT;
  /** Income paid out of the sleeve that day (dividends). Counts as return, not as a withdrawal. */
  income?: DecT;
};

/**
 * Time-weighted return: chains daily sub-period returns so deposits and
 * withdrawals do not distort performance. r_t = (V_t + I_t - F_t) / V_{t-1} - 1.
 * Days whose starting value is zero (nothing invested yet) are skipped.
 */
export function timeWeightedReturn(points: ValuePoint[]): { total: DecT; series: { date: string; cumulative: DecT }[] } {
  let growth = ONE;
  const series: { date: string; cumulative: DecT }[] = [];
  for (let i = 0; i < points.length; i++) {
    const p = points[i];
    if (i > 0) {
      const prev = points[i - 1].value;
      if (prev.gt(0)) {
        const r = p.value.plus(p.income ?? ZERO).minus(p.flow).div(prev);
        growth = growth.times(r);
      }
    }
    series.push({ date: p.date, cumulative: growth.minus(1) });
  }
  return { total: growth.minus(1), series };
}

export type CashFlow = { date: string; amount: DecT };

/**
 * Money-weighted return (annualised XIRR). Contributions are negative, the
 * ending value and withdrawals are positive. Returns null when it cannot converge.
 */
export function moneyWeightedReturn(flows: CashFlow[]): DecT | null {
  if (flows.length < 2) return null;
  const t0 = Date.parse(flows[0].date);
  const years = flows.map((f) => (Date.parse(f.date) - t0) / (365.25 * 86400_000));
  const amounts = flows.map((f) => f.amount.toNumber());
  if (!amounts.some((a) => a > 0) || !amounts.some((a) => a < 0)) return null;
  const npv = (r: number) => amounts.reduce((acc, a, i) => acc + a / Math.pow(1 + r, years[i]), 0);
  // Bisection is slower than Newton but cannot diverge.
  let lo = -0.9999;
  let hi = 10;
  let fLo = npv(lo);
  if (fLo * npv(hi) > 0) return null;
  for (let i = 0; i < 200; i++) {
    const mid = (lo + hi) / 2;
    const fMid = npv(mid);
    if (Math.abs(fMid) < 1e-9) return new Dec(mid.toFixed(8));
    if (fLo * fMid < 0) hi = mid;
    else {
      lo = mid;
      fLo = fMid;
    }
  }
  return new Dec(((lo + hi) / 2).toFixed(8));
}
