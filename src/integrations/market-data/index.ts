import { DemoMarketDataProvider } from "./demo";
import { FinnhubMarketDataProvider } from "./finnhub";
import type { MarketDataProvider } from "./types";

declare global {
  var __portleMarket: MarketDataProvider | undefined;
}

export function getMarketDataProvider(): MarketDataProvider {
  if (!globalThis.__portleMarket) {
    globalThis.__portleMarket =
      process.env.MARKET_DATA_PROVIDER === "finnhub"
        ? new FinnhubMarketDataProvider(process.env.FINNHUB_API_KEY)
        : new DemoMarketDataProvider();
  }
  return globalThis.__portleMarket;
}

/** Test hook. */
export function setMarketDataProvider(p: MarketDataProvider | undefined) {
  globalThis.__portleMarket = p;
}

export * from "./types";
