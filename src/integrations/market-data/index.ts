import { DemoMarketDataProvider } from "./demo";
import { FinnhubMarketDataProvider } from "./finnhub";
import { MarketstackMarketDataProvider } from "./marketstack";
import type { MarketDataProvider } from "./types";

declare global {
  var __portleMarket: MarketDataProvider | undefined;
}

function fromEnv(): MarketDataProvider {
  switch (process.env.MARKET_DATA_PROVIDER) {
    case "finnhub":
      return new FinnhubMarketDataProvider(process.env.FINNHUB_API_KEY);
    case "marketstack":
      return new MarketstackMarketDataProvider(process.env.MARKETSTACK_API_KEY?.trim() || undefined);
    default:
      return new DemoMarketDataProvider();
  }
}

export function getMarketDataProvider(): MarketDataProvider {
  if (!globalThis.__portleMarket) globalThis.__portleMarket = fromEnv();
  return globalThis.__portleMarket;
}

/** Test hook. */
export function setMarketDataProvider(p: MarketDataProvider | undefined) {
  globalThis.__portleMarket = p;
}

export * from "./types";
