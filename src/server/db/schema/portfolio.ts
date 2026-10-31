import {
  boolean,
  date,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";
import { user } from "./auth";
import { audience } from "./core";

const ts = () => timestamp({ withTimezone: true });
/** Exact decimal storage for money, prices and quantities. Drizzle returns strings. */
export const dec = () => numeric({ precision: 28, scale: 10 });

export const assetClass = pgEnum("asset_class", ["equity", "etf", "fund", "bond", "crypto", "cash", "other"]);
export const dataSource = pgEnum("data_source", ["manual", "csv", "broker", "demo"]);
export const transactionType = pgEnum("transaction_type", [
  "buy",
  "sell",
  "dividend",
  "interest",
  "fee",
  "deposit",
  "withdrawal",
  "split",
  "transfer_in",
  "transfer_out",
  // A synced broker's cash brought in line with what it reports (its currency exchanges and fees come unlabelled). Signed amount.
  "cash_match",
]);

/** Normalized securities. Shared reference data, not user-owned. */
export const instruments = pgTable(
  "instruments",
  {
    id: uuid().primaryKey().defaultRandom(),
    symbol: text().notNull(),
    exchange: text().notNull().default(""),
    name: text().notNull(),
    assetClass: assetClass().notNull().default("equity"),
    currency: text().notNull(),
    sector: text(),
    region: text(),
    country: text(),
    isin: text(),
    createdAt: ts().notNull().defaultNow(),
  },
  (t) => [unique().on(t.symbol, t.exchange), index().on(t.isin)],
);

export const portfolios = pgTable(
  "portfolios",
  {
    id: uuid().primaryKey().defaultRandom(),
    userId: text()
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    name: text().notNull(),
    baseCurrency: text().notNull().default("EUR"),
    createdAt: ts().notNull().defaultNow(),
    updatedAt: ts().notNull().defaultNow(),
  },
  (t) => [index().on(t.userId)],
);

export const accountKind = pgEnum("account_kind", ["brokerage", "retirement", "crypto", "savings", "other"]);

export const accounts = pgTable(
  "accounts",
  {
    id: uuid().primaryKey().defaultRandom(),
    portfolioId: uuid()
      .notNull()
      .references(() => portfolios.id, { onDelete: "cascade" }),
    userId: text()
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    name: text().notNull(),
    institution: text().notNull().default(""),
    kind: accountKind().notNull().default("brokerage"),
    currency: text().notNull(),
    source: dataSource().notNull().default("manual"),
    brokerConnectionId: uuid(),
    /** The broker's own id for this account, for accounts that sync from a broker. */
    externalId: text(),
    archivedAt: ts(),
    createdAt: ts().notNull().defaultNow(),
  },
  (t) => [index().on(t.userId), index().on(t.portfolioId), unique().on(t.userId, t.externalId)],
);

export const importBatches = pgTable(
  "import_batches",
  {
    id: uuid().primaryKey().defaultRandom(),
    userId: text()
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accountId: uuid()
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),
    filename: text().notNull(),
    rowCount: integer().notNull(),
    importedCount: integer().notNull(),
    duplicateCount: integer().notNull(),
    errorCount: integer().notNull(),
    errors: jsonb().$type<{ row: number; message: string }[]>().notNull().default([]),
    createdAt: ts().notNull().defaultNow(),
  },
  (t) => [index().on(t.userId)],
);

/**
 * The ledger of real (non-simulated) activity. Positions are always reconstructed
 * from these rows (see src/domain/accounting.ts); there is no mutable holdings table.
 * An opening position without history is stored as `transfer_in`.
 */
export const transactions = pgTable(
  "transactions",
  {
    id: uuid().primaryKey().defaultRandom(),
    userId: text()
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accountId: uuid()
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),
    instrumentId: uuid().references(() => instruments.id, { onDelete: "restrict" }),
    type: transactionType().notNull(),
    tradeDate: date({ mode: "string" }).notNull(),
    quantity: dec(),
    price: dec(),
    /** Cash amount for dividends, interest, fees, deposits and withdrawals. */
    amount: dec(),
    fee: dec().notNull().default("0"),
    currency: text().notNull(),
    /** For splits: new shares per old share (e.g. "4" for a 4:1 split). */
    splitRatio: dec(),
    source: dataSource().notNull().default("manual"),
    externalId: text(),
    importBatchId: uuid().references(() => importBatches.id, { onDelete: "set null" }),
    dedupeHash: text().notNull(),
    note: text().notNull().default(""),
    createdAt: ts().notNull().defaultNow(),
  },
  (t) => [
    unique().on(t.accountId, t.dedupeHash),
    index().on(t.userId, t.tradeDate),
    index().on(t.accountId, t.instrumentId),
  ],
);

/** Cached quotes. `source` and `asOf` are always displayed next to the price. */
export const quotes = pgTable("quotes", {
  instrumentId: uuid()
    .primaryKey()
    .references(() => instruments.id, { onDelete: "cascade" }),
  price: dec().notNull(),
  previousClose: dec(),
  currency: text().notNull(),
  asOf: ts().notNull(),
  source: text().notNull(),
  delayMinutes: integer().notNull().default(0),
  fetchedAt: ts().notNull().defaultNow(),
});

/**
 * Prices that belong to one member rather than to the market: their own broker's latest price
 * for a holding, or a price they set themselves for something without a ticker (`own`).
 * Kept apart from `quotes` so a broker's price is only ever shown to the member it came from.
 */
export const memberPrices = pgTable(
  "member_prices",
  {
    userId: text()
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    instrumentId: uuid()
      .notNull()
      .references(() => instruments.id, { onDelete: "cascade" }),
    price: dec().notNull(),
    currency: text().notNull(),
    asOf: ts().notNull(),
    source: text().notNull(),
    own: boolean().notNull().default(false),
  },
  (t) => [primaryKey({ columns: [t.userId, t.instrumentId] })],
);

/**
 * Company logos, fetched once by ticker and served from Portle so the logo service never learns who owns what.
 * `tile` is the colour behind the logo, worked out from the logo itself; `data` is empty when none was found.
 */
export const logos = pgTable("logos", {
  symbol: text().primaryKey(),
  data: text(),
  contentType: text(),
  tile: text().notNull().default("#ffffff"),
  ownBackground: boolean().notNull().default(false),
  fetchedAt: ts().notNull().defaultNow(),
});

/** Daily closes from a licensed provider, kept so charts don't spend the plan's requests twice. */
export const priceBars = pgTable(
  "price_bars",
  {
    instrumentId: uuid()
      .notNull()
      .references(() => instruments.id, { onDelete: "cascade" }),
    date: date({ mode: "string" }).notNull(),
    close: dec().notNull(),
    source: text().notNull(),
  },
  (t) => [primaryKey({ columns: [t.instrumentId, t.date] })],
);

/** When Portle last asked the provider about a security, including asks that found nothing. */
export const priceChecks = pgTable("price_checks", {
  instrumentId: uuid()
    .primaryKey()
    .references(() => instruments.id, { onDelete: "cascade" }),
  quoteCheckedAt: ts(),
  /** The earliest day the cached closes in price_bars cover. */
  historyFrom: date({ mode: "string" }),
  historyCheckedAt: ts(),
});

export const fxRates = pgTable(
  "fx_rates",
  {
    base: text().notNull(),
    quote: text().notNull(),
    rateDate: date({ mode: "string" }).notNull(),
    rate: dec().notNull(),
    source: text().notNull(),
    fetchedAt: ts().notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.base, t.quote, t.rateDate] })],
);

export const watchlists = pgTable(
  "watchlists",
  {
    id: uuid().primaryKey().defaultRandom(),
    userId: text()
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    name: text().notNull(),
    visibility: audience().notNull().default("private"),
    guildId: uuid(),
    createdAt: ts().notNull().defaultNow(),
  },
  (t) => [index().on(t.userId), index().on(t.guildId)],
);

export const watchlistItems = pgTable(
  "watchlist_items",
  {
    watchlistId: uuid()
      .notNull()
      .references(() => watchlists.id, { onDelete: "cascade" }),
    instrumentId: uuid()
      .notNull()
      .references(() => instruments.id, { onDelete: "cascade" }),
    note: text().notNull().default(""),
    addedAt: ts().notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.watchlistId, t.instrumentId] })],
);

export const brokerConnectionStatus = pgEnum("broker_connection_status", [
  "pending",
  "active",
  "error",
  "disconnected",
]);

/**
 * A member's identity at a brokerage-data provider (one per provider). The
 * provider's secret for them is encrypted at rest (src/server/crypto.ts) and
 * never leaves the server.
 */
export const brokerUsers = pgTable(
  "broker_users",
  {
    userId: text()
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    provider: text().notNull(),
    externalUserId: text().notNull(),
    encryptedSecret: text().notNull(),
    createdAt: ts().notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.provider] })],
);

/**
 * One broker a member linked through a provider (e.g. their DEGIRO login).
 * `externalId` is the provider's id for that link.
 */
export const brokerConnections = pgTable(
  "broker_connections",
  {
    id: uuid().primaryKey().defaultRandom(),
    userId: text()
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    provider: text().notNull(),
    externalId: text(),
    institution: text().notNull().default(""),
    status: brokerConnectionStatus().notNull().default("pending"),
    encryptedSecret: text(),
    lastSyncAt: ts(),
    lastError: text(),
    createdAt: ts().notNull().defaultNow(),
    revokedAt: ts(),
  },
  (t) => [index().on(t.userId), unique().on(t.userId, t.provider, t.externalId)],
);
