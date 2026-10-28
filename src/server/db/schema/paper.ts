import { bigserial, index, integer, pgEnum, pgTable, text, timestamp, unique, uuid } from "drizzle-orm/pg-core";
import { user } from "./auth";
import { dec, instruments } from "./portfolio";
import { theses } from "./research";

const ts = () => timestamp({ withTimezone: true });

/**
 * The Paper Trading Lab. A fully separate ledger: nothing here references
 * real accounts or transactions, and nothing in the real ledger references these tables.
 */
export const paperAccounts = pgTable(
  "paper_accounts",
  {
    id: uuid().primaryKey().defaultRandom(),
    userId: text()
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    name: text().notNull().default("Paper Lab"),
    currency: text().notNull().default("USD"),
    startingCash: dec().notNull(),
    feeFlat: dec().notNull().default("1"),
    feeBps: dec().notNull().default("5"),
    slippageBps: dec().notNull().default("10"),
    /** Bumped on every reset so earlier fills stay auditable but out of the current ledger. */
    epoch: integer().notNull().default(1),
    createdAt: ts().notNull().defaultNow(),
  },
  (t) => [index().on(t.userId)],
);

export const paperOrderSide = pgEnum("paper_order_side", ["buy", "sell"]);
export const paperOrderType = pgEnum("paper_order_type", ["market", "limit"]);
export const paperOrderStatus = pgEnum("paper_order_status", ["open", "filled", "rejected", "cancelled"]);

export const paperOrders = pgTable(
  "paper_orders",
  {
    id: uuid().primaryKey().defaultRandom(),
    paperAccountId: uuid()
      .notNull()
      .references(() => paperAccounts.id, { onDelete: "cascade" }),
    userId: text()
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    epoch: integer().notNull(),
    instrumentId: uuid()
      .notNull()
      .references(() => instruments.id, { onDelete: "restrict" }),
    side: paperOrderSide().notNull(),
    type: paperOrderType().notNull(),
    quantity: dec().notNull(),
    limitPrice: dec(),
    status: paperOrderStatus().notNull(),
    rejectReason: text(),
    thesisId: uuid().references(() => theses.id, { onDelete: "set null" }),
    /** Client-generated key; a retried submit returns the original order instead of a duplicate. */
    idempotencyKey: text().notNull(),
    quotePrice: dec(),
    quoteAsOf: ts(),
    quoteSource: text(),
    note: text().notNull().default(""),
    createdAt: ts().notNull().defaultNow(),
    updatedAt: ts().notNull().defaultNow(),
  },
  (t) => [unique().on(t.paperAccountId, t.idempotencyKey), index().on(t.paperAccountId, t.status)],
);

export const paperFills = pgTable(
  "paper_fills",
  {
    id: uuid().primaryKey().defaultRandom(),
    orderId: uuid()
      .notNull()
      .references(() => paperOrders.id, { onDelete: "cascade" }),
    paperAccountId: uuid()
      .notNull()
      .references(() => paperAccounts.id, { onDelete: "cascade" }),
    epoch: integer().notNull(),
    instrumentId: uuid()
      .notNull()
      .references(() => instruments.id, { onDelete: "restrict" }),
    side: paperOrderSide().notNull(),
    quantity: dec().notNull(),
    price: dec().notNull(),
    fee: dec().notNull(),
    executedAt: ts().notNull().defaultNow(),
  },
  (t) => [unique().on(t.orderId), index().on(t.paperAccountId, t.epoch)],
);

export const paperLedgerKind = pgEnum("paper_ledger_kind", ["deposit", "buy", "sell", "fee", "reset"]);

/** Signed cash movements. The running balance after each entry is stored for auditability. */
export const paperLedger = pgTable(
  "paper_ledger",
  {
    id: uuid().primaryKey().defaultRandom(),
    /** Strict insertion order; createdAt alone ties within a transaction. */
    seq: bigserial({ mode: "number" }).notNull(),
    paperAccountId: uuid()
      .notNull()
      .references(() => paperAccounts.id, { onDelete: "cascade" }),
    epoch: integer().notNull(),
    orderId: uuid().references(() => paperOrders.id, { onDelete: "cascade" }),
    kind: paperLedgerKind().notNull(),
    amount: dec().notNull(),
    balanceAfter: dec().notNull(),
    createdAt: ts().notNull().defaultNow(),
  },
  (t) => [index().on(t.paperAccountId, t.epoch, t.createdAt)],
);
