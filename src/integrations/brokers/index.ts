/**
 * Provider-independent brokerage aggregation. Portfolio accounting never calls
 * a provider directly; a sync job maps provider data into the transaction
 * ledger, so a provider can be swapped without touching accounting.
 */
export type BrokerAccount = { externalId: string; name: string; institution: string; currency: string };
export type BrokerActivity = {
  externalId: string;
  accountExternalId: string;
  type: "buy" | "sell" | "dividend" | "deposit" | "withdrawal" | "fee" | "interest" | "split";
  tradeDate: string;
  symbol: string | null;
  quantity: string | null;
  price: string | null;
  amount: string | null;
  fee: string;
  currency: string;
};

export type ProviderStatus = { id: string; label: string; configured: boolean; note: string; docsUrl: string };

export interface BrokerProvider {
  status(): ProviderStatus;
  /** Starts the provider's hosted connection flow. Portle never asks for broker passwords. */
  createConnectionUrl(userRef: string, redirectUrl: string): Promise<{ url: string }>;
  listAccounts(secret: string): Promise<BrokerAccount[]>;
  listActivities(secret: string, since: string): Promise<BrokerActivity[]>;
  revoke(secret: string): Promise<void>;
}

class NotConfiguredError extends Error {
  constructor() {
    super("This brokerage provider isn't configured on this Portle instance.");
  }
}

/**
 * SnapTrade (https://snaptrade.com) adapter. Coverage, pricing and commercial
 * terms must be verified before enabling; until SNAPTRADE_CLIENT_ID and
 * SNAPTRADE_CONSUMER_KEY are set, every call fails loudly and the UI says so.
 * The request signing and endpoint calls are intentionally not implemented
 * until credentials and a sandbox exist to test against.
 */
export class SnapTradeProvider implements BrokerProvider {
  constructor(
    private readonly clientId = process.env.SNAPTRADE_CLIENT_ID,
    private readonly consumerKey = process.env.SNAPTRADE_CONSUMER_KEY,
  ) {}

  status(): ProviderStatus {
    const configured = !!(this.clientId && this.consumerKey);
    return {
      id: "snaptrade",
      label: "SnapTrade",
      configured,
      note: configured
        ? "Credentials are present, but the sync adapter has not been verified against SnapTrade's sandbox yet."
        : "Not connected on this instance. Use CSV import for now; automatic sync needs a SnapTrade account and verified coverage for your broker.",
      docsUrl: "https://docs.snaptrade.com",
    };
  }

  async createConnectionUrl(): Promise<{ url: string }> {
    throw new NotConfiguredError();
  }
  async listAccounts(): Promise<BrokerAccount[]> {
    throw new NotConfiguredError();
  }
  async listActivities(): Promise<BrokerActivity[]> {
    throw new NotConfiguredError();
  }
  async revoke(): Promise<void> {
    throw new NotConfiguredError();
  }
}

export function getBrokerProviders(): BrokerProvider[] {
  return [new SnapTradeProvider()];
}
