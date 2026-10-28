import { Dec, type Dec as DecT } from "./money";

export type FxRate = { base: string; quote: string; rate: string; asOf: string; source: string };

export type FxConverter = {
  convert(amount: DecT, from: string, to: string): DecT | null;
  rate(from: string, to: string): DecT | null;
  /** Sources used, for the "rates as of" footnote. */
  sources(): { source: string; asOf: string }[];
};

/**
 * Builds a converter from direct quotes. Supports inverse pairs and a single
 * cross through any pivot currency present in the table. Returns null (never a guess)
 * when no path exists.
 */
export function createFxConverter(rates: FxRate[]): FxConverter {
  const table = new Map<string, DecT>();
  const meta = new Map<string, { source: string; asOf: string }>();
  for (const r of rates) {
    const rate = new Dec(r.rate);
    if (rate.lte(0)) continue;
    table.set(`${r.base}/${r.quote}`, rate);
    table.set(`${r.quote}/${r.base}`, new Dec(1).div(rate));
    meta.set(`${r.source}@${r.asOf}`, { source: r.source, asOf: r.asOf });
  }
  const currencies = new Set(rates.flatMap((r) => [r.base, r.quote]));

  function rate(from: string, to: string): DecT | null {
    if (from === to) return new Dec(1);
    const direct = table.get(`${from}/${to}`);
    if (direct) return direct;
    for (const pivot of currencies) {
      const a = table.get(`${from}/${pivot}`);
      const b = table.get(`${pivot}/${to}`);
      if (a && b) return a.times(b);
    }
    return null;
  }

  return {
    rate,
    convert(amount, from, to) {
      const r = rate(from, to);
      return r ? amount.times(r) : null;
    },
    sources: () => [...meta.values()],
  };
}
