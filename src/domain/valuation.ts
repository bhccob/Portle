import type { CashBalance, Position } from "./accounting";
import type { FxConverter } from "./fx";
import { d, sum, ZERO, type Dec } from "./money";

export type InstrumentInfo = {
  id: string;
  symbol: string;
  /** Where it is listed; "OWN:…" for something a member priced by hand. */
  exchange?: string;
  name: string;
  assetClass: string;
  currency: string;
  sector: string | null;
  region: string | null;
};

export type PriceInfo = {
  price: string;
  previousClose: string | null;
  currency: string;
  asOf: string;
  source: string;
  isDemo: boolean;
  delayMinutes: number;
};

export type HoldingView = {
  instrument: InstrumentInfo;
  accountIds: string[];
  quantity: Dec;
  costBasis: Dec | null;
  averageCost: Dec | null;
  marketValue: Dec | null;
  marketValueBase: Dec | null;
  costBasisBase: Dec | null;
  unrealizedBase: Dec | null;
  unrealizedPct: Dec | null;
  dayChangeBase: Dec | null;
  dayChangePct: Dec | null;
  weight: Dec | null;
  realizedBase: Dec | null;
  incomeBase: Dec | null;
  price: PriceInfo | null;
  missing: ("price" | "fx" | "cost")[];
};

export type AllocationSlice = { label: string; value: Dec; percent: Dec };

export type PortfolioValuation = {
  baseCurrency: string;
  holdings: HoldingView[];
  totals: {
    marketValue: Dec;
    costBasis: Dec;
    unrealized: Dec;
    unrealizedPct: Dec | null;
    realized: Dec;
    income: Dec;
    cash: Dec;
    netContributions: Dec;
    dayChange: Dec;
    dayChangePct: Dec | null;
  };
  allocation: Record<"assetClass" | "sector" | "region" | "currency", AllocationSlice[]>;
  /** Holdings left out of totals, with the reason. */
  excluded: { symbol: string; reason: string }[];
  usesDemoPrices: boolean;
  /** Where the real (not demo) prices came from, e.g. "DEGIRO via SnapTrade". */
  priceSources: string[];
  oldestPriceAsOf: string | null;
};

const ASSET_CLASS_LABEL: Record<string, string> = {
  equity: "Stocks",
  etf: "ETFs",
  fund: "Funds",
  bond: "Bonds",
  crypto: "Crypto",
  cash: "Cash",
  other: "Other",
};

/**
 * Values positions in the base currency. Anything that cannot be valued honestly
 * (no price, no FX path) is excluded from totals and reported, never estimated.
 * Cost basis is converted at the current FX rate, so unrealized P/L in the base
 * currency includes currency movements (documented in docs/DATA_MODEL.md).
 */
export function valuePortfolio(input: {
  positions: Position[];
  cash: CashBalance[];
  instruments: Map<string, InstrumentInfo>;
  prices: Map<string, PriceInfo>;
  fx: FxConverter;
  baseCurrency: string;
}): PortfolioValuation {
  const { fx, baseCurrency } = input;
  const byInstrument = new Map<string, Position[]>();
  for (const p of input.positions) {
    if (p.quantity.isZero() && p.realizedPL.isZero() && p.income.isZero() && !Object.keys(p.foreignIncome).length) continue;
    const list = byInstrument.get(p.instrumentId) ?? [];
    list.push(p);
    byInstrument.set(p.instrumentId, list);
  }

  const toBase = (v: Dec, ccy: string) => fx.convert(v, ccy, baseCurrency);
  const holdings: HoldingView[] = [];
  const excluded: { symbol: string; reason: string }[] = [];
  let realized = ZERO;
  let income = ZERO;
  let usesDemoPrices = false;
  const sources = new Set<string>();
  let oldest: string | null = null;

  for (const [instrumentId, list] of byInstrument) {
    const instrument = input.instruments.get(instrumentId);
    if (!instrument) continue;
    const ccy = list[0].currency;
    const quantity = sum(list.map((p) => p.quantity));
    const costKnown = list.every((p) => p.costBasisKnown);
    const costBasis = costKnown ? sum(list.map((p) => p.costBasis)) : null;
    const price = input.prices.get(instrumentId) ?? null;
    const missing: HoldingView["missing"] = [];

    const realizedNative = sum(list.map((p) => p.realizedPL));
    const incomeNative = sum(list.map((p) => p.income));
    const realizedBase = toBase(realizedNative, ccy);
    let incomeBase = toBase(incomeNative, ccy);
    // Dividends paid in another currency convert straight to the base currency, at the same current rates.
    for (const [currency, amount] of list.flatMap((p) => Object.entries(p.foreignIncome))) {
      const converted = toBase(amount, currency);
      if (converted) incomeBase = (incomeBase ?? ZERO).plus(converted);
    }
    if (realizedBase) realized = realized.plus(realizedBase);
    if (incomeBase) income = income.plus(incomeBase);

    if (quantity.isZero()) continue; // closed position: contributes realized/income only

    let marketValue: Dec | null = null;
    let marketValueBase: Dec | null = null;
    let dayChangeBase: Dec | null = null;
    let dayChangePct: Dec | null = null;

    if (!price) {
      missing.push("price");
      excluded.push({ symbol: instrument.symbol, reason: "No price available" });
    } else {
      if (price.isDemo) usesDemoPrices = true;
      else sources.add(price.source);
      if (!oldest || price.asOf < oldest) oldest = price.asOf;
      marketValue = quantity.times(d(price.price));
      // Quotes may arrive in a different currency than the position (e.g. ADRs); convert first.
      const mvInPositionCcy = price.currency === ccy ? marketValue : fx.convert(marketValue, price.currency, ccy);
      marketValueBase = mvInPositionCcy ? toBase(mvInPositionCcy, ccy) : null;
      if (!marketValueBase) {
        missing.push("fx");
        excluded.push({ symbol: instrument.symbol, reason: `No exchange rate ${ccy}→${baseCurrency}` });
      }
      if (price.previousClose && marketValueBase) {
        const prev = d(price.previousClose);
        if (prev.gt(0)) {
          const pct = d(price.price).minus(prev).div(prev);
          dayChangePct = pct;
          dayChangeBase = marketValueBase.minus(marketValueBase.div(pct.plus(1)));
        }
      }
    }
    if (!costKnown) missing.push("cost");

    const costBasisBase = costBasis ? toBase(costBasis, ccy) : null;
    const unrealizedBase = marketValueBase && costBasisBase ? marketValueBase.minus(costBasisBase) : null;
    const unrealizedPct =
      unrealizedBase && costBasisBase && costBasisBase.gt(0) ? unrealizedBase.div(costBasisBase) : null;

    holdings.push({
      instrument,
      accountIds: list.map((p) => p.accountId),
      quantity,
      costBasis,
      averageCost: costBasis && quantity.gt(0) ? costBasis.div(quantity) : null,
      marketValue,
      marketValueBase,
      costBasisBase,
      unrealizedBase,
      unrealizedPct,
      dayChangeBase,
      dayChangePct,
      weight: null,
      realizedBase,
      incomeBase,
      price,
      missing,
    });
  }

  const valued = holdings.filter((h) => h.marketValueBase);
  const marketValue = sum(valued.map((h) => h.marketValueBase!));
  const withCost = valued.filter((h) => h.costBasisBase);
  const costBasis = sum(withCost.map((h) => h.costBasisBase!));
  const unrealized = sum(withCost.map((h) => h.unrealizedBase!));
  const dayChange = sum(valued.map((h) => h.dayChangeBase ?? ZERO));
  for (const h of valued) h.weight = marketValue.gt(0) ? h.marketValueBase!.div(marketValue) : null;

  let cashBase = ZERO;
  let contributions = ZERO;
  for (const c of input.cash) {
    const b = toBase(c.balance, c.currency);
    const n = toBase(c.netContributions, c.currency);
    if (b) cashBase = cashBase.plus(b);
    if (n) contributions = contributions.plus(n);
  }

  const slice = (labelOf: (h: HoldingView) => string): AllocationSlice[] => {
    const groups = new Map<string, Dec>();
    for (const h of valued) groups.set(labelOf(h), (groups.get(labelOf(h)) ?? ZERO).plus(h.marketValueBase!));
    return [...groups.entries()]
      .map(([label, value]) => ({ label, value, percent: marketValue.gt(0) ? value.div(marketValue) : ZERO }))
      .sort((a, b) => b.value.cmp(a.value));
  };

  holdings.sort((a, b) => (b.marketValueBase ?? ZERO).cmp(a.marketValueBase ?? ZERO));

  return {
    baseCurrency,
    holdings,
    totals: {
      marketValue,
      costBasis,
      unrealized,
      unrealizedPct: costBasis.gt(0) ? unrealized.div(costBasis) : null,
      realized,
      income,
      cash: cashBase,
      netContributions: contributions,
      dayChange,
      // Unknown, not 0%, when no holding has yesterday's price to compare with.
      dayChangePct: valued.some((h) => h.dayChangeBase) && marketValue.minus(dayChange).gt(0) ? dayChange.div(marketValue.minus(dayChange)) : null,
    },
    allocation: {
      assetClass: slice((h) => ASSET_CLASS_LABEL[h.instrument.assetClass] ?? "Other"),
      sector: slice((h) => h.instrument.sector || "Unclassified"),
      region: slice((h) => h.instrument.region || "Unclassified"),
      currency: slice((h) => h.instrument.currency),
    },
    excluded,
    usesDemoPrices,
    priceSources: [...sources].sort(),
    oldestPriceAsOf: oldest,
  };
}
