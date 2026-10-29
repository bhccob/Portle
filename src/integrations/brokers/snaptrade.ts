import "server-only";
import { Snaptrade, SnaptradeAuth, type UniversalSymbol } from "snaptrade-typescript-sdk";
import { NotConfiguredError, type BrokerActivity, type BrokerProvider, type BrokerSecurity, type BrokerUser, type ProviderStatus } from "./types";

/** SnapTrade's activity kinds that Portle's ledger can hold. Anything else is left out; holdings still match through the daily check. */
const ACTIVITY: Record<string, BrokerActivity["type"]> = {
  BUY: "buy",
  REI: "buy",
  SELL: "sell",
  DIVIDEND: "dividend",
  SUBSTITUTE_DIVIDEND: "dividend",
  INTEREST: "interest",
  FEE: "fee",
  TAX: "fee",
  CONTRIBUTION: "deposit",
  DEPOSIT: "deposit",
  WITHDRAWAL: "withdrawal",
};

const KIND: Record<string, BrokerSecurity["kind"]> = {
  cs: "equity",
  ad: "equity",
  ps: "equity",
  et: "etf",
  oef: "fund",
  cef: "fund",
  bnd: "bond",
  crypto: "crypto",
};

const num = (n: number | null | undefined) => (n === null || n === undefined || !Number.isFinite(n) ? null : String(Math.abs(n)));

function security(s: Partial<UniversalSymbol> | null | undefined, fallbackCurrency: string): BrokerSecurity | null {
  const symbol = (s?.raw_symbol || s?.symbol || "").trim();
  if (!symbol) return null;
  return {
    symbol,
    name: (s?.description || symbol).slice(0, 120),
    currency: s?.currency?.code || fallbackCurrency,
    kind: KIND[s?.type?.code ?? ""] ?? "other",
  };
}

/**
 * SnapTrade (https://snaptrade.com), as a commercial app: Portle registers each
 * member with SnapTrade, and the member signs in to their broker on SnapTrade's
 * own page. Connections are requested read-only. Until SNAPTRADE_CLIENT_ID and
 * SNAPTRADE_CONSUMER_KEY are set, every call fails with NotConfiguredError.
 */
export class SnapTradeProvider implements BrokerProvider {
  readonly id = "snaptrade";

  constructor(
    private readonly clientId = process.env.SNAPTRADE_CLIENT_ID,
    private readonly consumerKey = process.env.SNAPTRADE_CONSUMER_KEY,
  ) {}

  status(): ProviderStatus {
    const configured = !!(this.clientId && this.consumerKey);
    return {
      id: this.id,
      label: "SnapTrade",
      configured,
      note: configured
        ? "Connect DEGIRO, Interactive Brokers, Trading 212 and more. You sign in on SnapTrade's page; Portle only reads."
        : "Not switched on for this Portle yet. Use CSV import for now.",
      docsUrl: "https://snaptrade.com",
    };
  }

  private client() {
    if (!this.clientId || !this.consumerKey) throw new NotConfiguredError();
    return new Snaptrade({ auth: SnaptradeAuth.commercialApiKey({ clientId: this.clientId, consumerKey: this.consumerKey }) });
  }

  async registerUser(ref: string): Promise<BrokerUser> {
    const { data } = await this.client().authentication.registerSnapTradeUser({ userId: ref });
    if (!data.userId || !data.userSecret) throw new Error("SnapTrade did not return a user secret.");
    return { userId: data.userId, userSecret: data.userSecret };
  }

  async connectUrl(user: BrokerUser, returnUrl: string, reconnectExternalId?: string) {
    const { data } = await this.client().authentication.loginSnapTradeUser({
      ...user,
      customRedirect: returnUrl,
      immediateRedirect: true,
      connectionType: "read",
      ...(reconnectExternalId ? { reconnect: reconnectExternalId } : {}),
    });
    if (!("redirectURI" in data) || !data.redirectURI) throw new Error("SnapTrade did not return a sign-in page.");
    return data.redirectURI;
  }

  async listConnections(user: BrokerUser) {
    const { data } = await this.client().connections.listBrokerageAuthorizations(user);
    return data
      .filter((a) => a.id)
      .map((a) => ({ externalId: a.id!, institution: a.brokerage?.display_name || a.brokerage?.name || a.name || "Broker", disabled: !!a.disabled }));
  }

  async listAccounts(user: BrokerUser) {
    const { data } = await this.client().accountInformation.listUserAccounts(user);
    return data
      .filter((a) => !a.meta?.is_paper)
      .map((a) => ({
        externalId: a.id,
        connectionExternalId: a.brokerage_authorization,
        name: (a.name || a.number || "Account").slice(0, 80),
        institution: a.institution_name,
        currency: a.balance?.total?.currency || "EUR",
      }));
  }

  async listPositions(user: BrokerUser, accountExternalId: string) {
    const { data } = await this.client().accountInformation.getUserHoldings({ ...user, accountId: accountExternalId });
    const currency = data.account?.balance?.total?.currency || "EUR";
    return (data.positions ?? []).flatMap((p) => {
      const sec = p.cash_equivalent ? null : security(p.symbol?.symbol, p.currency?.code || currency);
      const quantity = num(p.units ?? p.fractional_units);
      return sec && quantity
        ? [{ ...sec, currency: p.currency?.code || sec.currency, quantity, averagePrice: num(p.average_purchase_price), price: num(p.price) }]
        : [];
    });
  }

  async listActivities(user: BrokerUser, accountExternalId: string, since: string) {
    const out: BrokerActivity[] = [];
    const endDate = new Date().toISOString().slice(0, 10);
    for (let offset = 0; offset < 20_000;) {
      const { data } = await this.client().accountInformation.getAccountActivities({
        ...user,
        accountId: accountExternalId,
        startDate: since,
        endDate,
        offset,
        limit: 1000,
      });
      const page = data.data ?? [];
      for (const a of page) {
        const type = ACTIVITY[(a.type ?? "").toUpperCase()];
        const day = (a.trade_date || a.settlement_date || "").slice(0, 10);
        if (!type || !a.id || !/^\d{4}-\d{2}-\d{2}$/.test(day)) continue;
        const currency = a.currency?.code || a.symbol?.currency?.code || "EUR";
        out.push({
          externalId: a.id,
          type,
          tradeDate: day,
          security: security(a.symbol, currency),
          quantity: num(a.units),
          price: num(a.price),
          amount: num(a.amount),
          fee: num(a.fee) ?? "0",
          currency,
        });
      }
      offset += page.length;
      if (!page.length || offset >= (data.pagination?.total ?? 0)) break;
    }
    return out;
  }

  async removeConnection(user: BrokerUser, externalId: string) {
    await this.client().connections.deleteConnection({ ...user, connectionId: externalId });
  }

  async deleteUser(user: BrokerUser) {
    await this.client().authentication.deleteSnapTradeUser({ userId: user.userId });
  }
}
