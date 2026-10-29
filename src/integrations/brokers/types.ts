/**
 * Provider-independent brokerage aggregation. Portfolio accounting never calls
 * a provider directly; the sync service (src/server/services/brokers.ts) maps
 * provider data into the transaction ledger, so a provider can be swapped
 * without touching accounting. Everything here is read-only: no provider call
 * Portle makes can place a trade or move money.
 */

/** A member's identity at the provider. The secret is stored encrypted. */
export type BrokerUser = { userId: string; userSecret: string };

/** One broker login the member linked, such as their DEGIRO account. */
export type BrokerConnection = { externalId: string; institution: string; disabled: boolean };

export type BrokerAccount = {
  externalId: string;
  connectionExternalId: string;
  name: string;
  institution: string;
  currency: string;
};

export type BrokerSecurity = { symbol: string; name: string; currency: string; kind: "equity" | "etf" | "fund" | "bond" | "crypto" | "other" };

/** What the broker says the account holds right now. Quantities and prices are decimal strings. */
export type BrokerPosition = BrokerSecurity & { quantity: string; averagePrice: string | null; price: string | null };

export type BrokerActivity = {
  externalId: string;
  type: "buy" | "sell" | "dividend" | "interest" | "fee" | "deposit" | "withdrawal";
  tradeDate: string;
  security: BrokerSecurity | null;
  quantity: string | null;
  price: string | null;
  amount: string | null;
  fee: string;
  currency: string;
};

export type ProviderStatus = { id: string; label: string; configured: boolean; note: string; docsUrl: string };

export interface BrokerProvider {
  readonly id: string;
  status(): ProviderStatus;
  /** Creates the member's identity at the provider. */
  registerUser(ref: string): Promise<BrokerUser>;
  /** The provider's own sign-in page. Portle never sees broker passwords. Pass a connection to repair it. */
  connectUrl(user: BrokerUser, returnUrl: string, reconnectExternalId?: string): Promise<string>;
  listConnections(user: BrokerUser): Promise<BrokerConnection[]>;
  listAccounts(user: BrokerUser): Promise<BrokerAccount[]>;
  listPositions(user: BrokerUser, accountExternalId: string): Promise<BrokerPosition[]>;
  /** Activity from `since` (YYYY-MM-DD) to today. Kinds Portle can't represent are left out. */
  listActivities(user: BrokerUser, accountExternalId: string, since: string): Promise<BrokerActivity[]>;
  removeConnection(user: BrokerUser, externalId: string): Promise<void>;
  deleteUser(user: BrokerUser): Promise<void>;
}

export class NotConfiguredError extends Error {
  constructor() {
    super("Connecting a broker isn't switched on for this Portle yet.");
  }
}
