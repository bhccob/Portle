export type InstrumentRef = { symbol: string; exchange: string };

export type Quote = {
  symbol: string;
  exchange: string;
  price: string;
  previousClose: string | null;
  currency: string;
  asOf: string;
  source: string;
  isDemo: boolean;
  delayMinutes: number;
};

export type Bar = { date: string; close: string };

export type IndexQuote = {
  key: string;
  name: string;
  value: string;
  previousClose: string;
  currency: string;
  asOf: string;
  isDemo: boolean;
  history: Bar[];
};

export type ProviderStatus = {
  id: string;
  label: string;
  isDemo: boolean;
  configured: boolean;
  /** Plain-language explanation shown wherever this provider's numbers appear. */
  note: string;
  /** Closing prices that change once per trading day, so Portle keeps them until the next close instead of asking again. */
  dailyCloses?: boolean;
};

/**
 * Market data adapter. The UI and services depend only on this interface, so a
 * licensed provider can replace the demo one without touching portfolio code.
 */
export interface MarketDataProvider {
  status(): ProviderStatus;
  getQuotes(refs: InstrumentRef[]): Promise<Map<string, Quote>>;
  /** Daily closes, oldest first. Empty when the provider has no history for the security. */
  getHistory(ref: InstrumentRef, from: string, to: string): Promise<Bar[]>;
  getIndices(days: number): Promise<IndexQuote[]>;
}

export const refKey = (r: InstrumentRef) => `${r.symbol}:${r.exchange}`;
