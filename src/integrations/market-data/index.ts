import { DemoMarketDataProvider } from "./demo";
import { FinnhubMarketDataProvider } from "./finnhub";
import type { MarketDataProvider } from "./types";

declare global {
  var __porfaelMarket: MarketDataProvider | undefined;
}

export function getMarketDataProvider(): MarketDataProvider {
  if (!globalThis.__porfaelMarket) {
    globalThis.__porfaelMarket =
      process.env.MARKET_DATA_PROVIDER === "finnhub"
        ? new FinnhubMarketDataProvider(process.env.FINNHUB_API_KEY)
        : new DemoMarketDataProvider();
  }
  return globalThis.__porfaelMarket;
}

/** Test hook. */
export function setMarketDataProvider(p: MarketDataProvider | undefined) {
  globalThis.__porfaelMarket = p;
}

export * from "./types";
