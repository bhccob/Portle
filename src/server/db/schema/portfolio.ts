import {
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
    archivedAt: ts(),
    createdAt: ts().notNull().defaultNow(),
  },
  (t) => [index().on(t.userId), index().on(t.portfolioId)],
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
 * A link to an external brokerage-data provider. Provider secrets are encrypted
 * at rest (src/server/crypto.ts) and never leave the server.
 */
export const brokerConnections = pgTable(
  "broker_connections",
  {
    id: uuid().primaryKey().defaultRandom(),
    userId: text()
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    provider: text().notNull(),
    institution: text().notNull().default(""),
    status: brokerConnectionStatus().notNull().default("pending"),
    encryptedSecret: text(),
    lastSyncAt: ts(),
    lastError: text(),
    createdAt: ts().notNull().defaultNow(),
    revokedAt: ts(),
  },
  (t) => [index().on(t.userId)],
);
