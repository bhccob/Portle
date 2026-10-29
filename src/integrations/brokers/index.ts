import type { BrokerProvider } from "./types";
import { SnapTradeProvider } from "./snaptrade";

export * from "./types";

let override: BrokerProvider | null = null;

/** The provider in use: SnapTrade, unless a test put a stand-in in its place. */
export function getBrokerProvider(): BrokerProvider {
  return override ?? new SnapTradeProvider();
}

export function getBrokerProviders(): BrokerProvider[] {
  return [getBrokerProvider()];
}

/** Tests only: swap in a stand-in provider (or pass null to go back to SnapTrade). */
export function setBrokerProviderForTests(p: BrokerProvider | null) {
  override = p;
}
