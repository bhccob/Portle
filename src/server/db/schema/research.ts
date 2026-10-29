import { sql } from "drizzle-orm";
import { date, index, integer, jsonb, pgEnum, pgTable, text, timestamp, unique, uuid } from "drizzle-orm/pg-core";
import { user } from "./auth";
import { audience } from "./core";
import { instruments, transactions } from "./portfolio";

const ts = () => timestamp({ withTimezone: true });

export const thesisStatus = pgEnum("thesis_status", [
  "researching",
  "active",
  "under_review",
  "validated",
  "invalidated",
  "archived",
]);

export type ThesisSource = { label: string; url: string };

export const theses = pgTable(
  "theses",
  {
    id: uuid().primaryKey().defaultRandom(),
    userId: text()
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    instrumentId: uuid().references(() => instruments.id, { onDelete: "set null" }),
    title: text().notNull(),
    summary: text().notNull().default(""),
    status: thesisStatus().notNull().default("researching"),
    visibility: audience().notNull().default("private"),
    guildId: uuid(),
    timeHorizon: text().notNull().default(""),
    tags: text()
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    currentRevision: integer().notNull().default(1),
    /** The day the owner plans to look at this thesis again. Private to the owner; not part of a revision. */
    reviewOn: date({ mode: "string" }),
    /** The reviewOn a reminder was last sent for, so each date reminds once. */
    reviewRemindedOn: date({ mode: "string" }),
    createdAt: ts().notNull().defaultNow(),
    updatedAt: ts().notNull().defaultNow(),
  },
  (t) => [index().on(t.userId, t.updatedAt), index().on(t.instrumentId), index().on(t.guildId), index().on(t.userId, t.reviewOn)],
);

/** Immutable snapshots. Every edit to a thesis appends a revision; nothing is overwritten. */
export const thesisRevisions = pgTable(
  "thesis_revisions",
  {
    id: uuid().primaryKey().defaultRandom(),
    thesisId: uuid()
      .notNull()
      .references(() => theses.id, { onDelete: "cascade" }),
    revision: integer().notNull(),
    title: text().notNull(),
    summary: text().notNull().default(""),
    status: thesisStatus().notNull(),
    rationale: text().notNull().default(""),
    bullCase: text().notNull().default(""),
    bearCase: text().notNull().default(""),
    assumptions: text().notNull().default(""),
    catalysts: text().notNull().default(""),
    risks: text().notNull().default(""),
    valuation: text().notNull().default(""),
    invalidationCriteria: text().notNull().default(""),
    timeHorizon: text().notNull().default(""),
    sources: jsonb().$type<ThesisSource[]>().notNull().default([]),
    changeNote: text().notNull().default(""),
    createdAt: ts().notNull().defaultNow(),
  },
  (t) => [unique().on(t.thesisId, t.revision)],
);

/** Private notes on a thesis. Never shared, even when the thesis is. */
export const thesisNotes = pgTable(
  "thesis_notes",
  {
    id: uuid().primaryKey().defaultRandom(),
    thesisId: uuid()
      .notNull()
      .references(() => theses.id, { onDelete: "cascade" }),
    userId: text()
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    body: text().notNull(),
    createdAt: ts().notNull().defaultNow(),
  },
  (t) => [index().on(t.thesisId)],
);

export const thesisTransactionLinks = pgTable(
  "thesis_transaction_links",
  {
    thesisId: uuid()
      .notNull()
      .references(() => theses.id, { onDelete: "cascade" }),
    transactionId: uuid()
      .notNull()
      .references(() => transactions.id, { onDelete: "cascade" }),
    createdAt: ts().notNull().defaultNow(),
  },
  (t) => [unique().on(t.thesisId, t.transactionId)],
);

export const journalEntries = pgTable(
  "journal_entries",
  {
    id: uuid().primaryKey().defaultRandom(),
    userId: text()
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    entryDate: date({ mode: "string" }).notNull(),
    title: text().notNull(),
    body: text().notNull().default(""),
    prompt: text(),
    visibility: audience().notNull().default("private"),
    thesisId: uuid().references(() => theses.id, { onDelete: "set null" }),
    instrumentId: uuid().references(() => instruments.id, { onDelete: "set null" }),
    paperOrderId: uuid(),
    transactionId: uuid().references(() => transactions.id, { onDelete: "set null" }),
    tags: text()
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    createdAt: ts().notNull().defaultNow(),
    updatedAt: ts().notNull().defaultNow(),
  },
  (t) => [index().on(t.userId, t.entryDate)],
);

export const collections = pgTable(
  "collections",
  {
    id: uuid().primaryKey().defaultRandom(),
    userId: text()
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    title: text().notNull(),
    description: text().notNull().default(""),
    visibility: audience().notNull().default("private"),
    createdAt: ts().notNull().defaultNow(),
    updatedAt: ts().notNull().defaultNow(),
  },
  (t) => [index().on(t.userId)],
);

export const collectionItemType = pgEnum("collection_item_type", ["thesis", "post", "instrument", "link", "journal", "guide"]);

export const collectionItems = pgTable(
  "collection_items",
  {
    id: uuid().primaryKey().defaultRandom(),
    collectionId: uuid()
      .notNull()
      .references(() => collections.id, { onDelete: "cascade" }),
    itemType: collectionItemType().notNull(),
    itemId: text(),
    url: text(),
    title: text().notNull(),
    note: text().notNull().default(""),
    sourceName: text().notNull().default(""),
    addedAt: ts().notNull().defaultNow(),
  },
  (t) => [index().on(t.collectionId)],
);
