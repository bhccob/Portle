import type { FxRate } from "@/domain/fx";

export type FxProvider = {
  id: string;
  isDemo: boolean;
  /** Latest rates with `base` as the quote base. */
  latest(base: string): Promise<FxRate[]>;
};

const DEMO_EUR: Record<string, string> = {
  USD: "1.08",
  GBP: "0.85",
  CHF: "0.95",
  DKK: "7.46",
  SEK: "11.40",
  NOK: "11.70",
  JPY: "162.0",
  CAD: "1.47",
  AUD: "1.63",
};

/** Fixed, clearly labelled rates for offline development and deterministic tests. */
export const demoFx: FxProvider = {
  id: "demo",
  isDemo: true,
  async latest() {
    return Object.entries(DEMO_EUR).map(([quote, rate]) => ({
      base: "EUR",
      quote,
      rate,
      asOf: "demo",
      source: "Demo FX · fixed rates",
    }));
  },
};

/**
 * European Central Bank reference rates via the Frankfurter API (no key needed).
 * Published once per working day around 16:00 CET.
 */
export function frankfurterFx(fetchImpl: typeof fetch = fetch): FxProvider {
  return {
    id: "frankfurter",
    isDemo: false,
    async latest(base: string) {
      const res = await fetchImpl(`https://api.frankfurter.app/latest?from=${encodeURIComponent(base)}`, {
        signal: AbortSignal.timeout(6000),
      });
      if (!res.ok) throw new Error(`fx_provider_error_${res.status}`);
      const body = (await res.json()) as { base: string; date: string; rates: Record<string, number> };
      return Object.entries(body.rates).map(([quote, rate]) => ({
        base: body.base,
        quote,
        rate: String(rate),
        asOf: body.date,
        source: "ECB via Frankfurter",
      }));
    },
  };
}

export function getFxProvider(): FxProvider {
  return process.env.FX_PROVIDER === "frankfurter" ? frankfurterFx() : demoFx;
}
