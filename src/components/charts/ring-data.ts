import type { Dec } from "@/domain/money";
import type { RingSlice } from "./ring-geometry";

/** Real holdings as ring slices: each priced position's share of the portfolio, largest first. */
export function holdingSlices(holdings: { instrument: { symbol: string }; weight: Dec | null }[]): RingSlice[] {
  return holdings
    .filter((h) => h.weight && h.weight.gt(0))
    .map((h) => ({ label: h.instrument.symbol, percent: Number(h.weight) }))
    .sort((a, b) => b.percent - a.percent);
}

/** Practice positions plus the pretend cash still unspent, as shares of pretend equity. */
export function practiceSlices(lab: { equity: Dec; cash: Dec; positions: { instrument: { symbol: string }; marketValue: Dec | null }[] }): RingSlice[] {
  if (!lab.equity.gt(0)) return [];
  const positions = lab.positions
    .filter((p) => p.marketValue && p.marketValue.gt(0))
    .map((p) => ({ label: p.instrument.symbol, percent: Number(p.marketValue!.div(lab.equity)) }))
    .sort((a, b) => b.percent - a.percent);
  const cash = Number(lab.cash.div(lab.equity));
  return cash > 0 ? [...positions, { label: "Pretend cash", percent: cash }] : positions;
}
