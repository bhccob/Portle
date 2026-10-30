import { check, index, jsonb, pgEnum, pgTable, primaryKey, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { user } from "./auth";
import { audience } from "./core";
import { theses } from "./research";

const ts = () => timestamp({ withTimezone: true });

export const friendshipStatus = pgEnum("friendship_status", ["pending", "accepted"]);

/**
 * One symmetric relationship model: friends. The pair is stored once with
 * userLow < userHigh; `requestedBy` records who asked.
 */
export const friendships = pgTable(
  "friendships",
  {
    userLow: text()
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    userHigh: text()
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    requestedBy: text()
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    status: friendshipStatus().notNull().default("pending"),
    createdAt: ts().notNull().defaultNow(),
    acceptedAt: ts(),
  },
  (t) => [
    primaryKey({ columns: [t.userLow, t.userHigh] }),
    index().on(t.userHigh),
    check("friendship_order", sql`${t.userLow} < ${t.userHigh}`),
  ],
);

export const postKind = pgEnum("post_kind", ["text", "thesis", "insight"]);

/** A shared allocation insight carries percentages only, never values or quantities. */
export type InsightPayload = {
  kind: "allocation";
  dimension: "assetClass" | "sector" | "region" | "currency";
  slices: { label: string; percent: string }[];
  verified: boolean;
  asOf: string;
};

export const posts = pgTable(
  "posts",
  {
    id: uuid().primaryKey().defaultRandom(),
    userId: text()
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    kind: postKind().notNull().default("text"),
    body: text().notNull(),
    thesisId: uuid().references(() => theses.id, { onDelete: "set null" }),
    insight: jsonb().$type<InsightPayload>(),
    audience: audience().notNull().default("friends"),
    guildId: uuid(),
    createdAt: ts().notNull().defaultNow(),
    editedAt: ts(),
    deletedAt: ts(),
  },
  (t) => [index().on(t.userId, t.createdAt), index().on(t.guildId, t.createdAt)],
);

export const targetType = pgEnum("target_type", ["post", "thesis", "comment", "user", "guild", "journal"]);

export const comments = pgTable(
  "comments",
  {
    id: uuid().primaryKey().defaultRandom(),
    userId: text()
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    targetType: targetType().notNull(),
    targetId: uuid().notNull(),
    body: text().notNull(),
    createdAt: ts().notNull().defaultNow(),
    deletedAt: ts(),
  },
  (t) => [index().on(t.targetType, t.targetId, t.createdAt)],
);

/**
 * Comments on a member's profile, like a guestbook. The profile's owner decides who may
 * write (profiles.comment_audience) and may delete any of them; authors may delete their own.
 */
export const profileComments = pgTable(
  "profile_comments",
  {
    id: uuid().primaryKey().defaultRandom(),
    profileUserId: text()
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    authorId: text()
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    body: text().notNull(),
    createdAt: ts().notNull().defaultNow(),
  },
  (t) => [index().on(t.profileUserId, t.createdAt), index().on(t.authorId)],
);

/** Reactions describe the reasoning, not popularity. There is no "like". */
export const reactionKind = pgEnum("reaction_kind", ["insightful", "agree", "challenge", "question"]);

export const reactions = pgTable(
  "reactions",
  {
    userId: text()
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    targetType: targetType().notNull(),
    targetId: uuid().notNull(),
    kind: reactionKind().notNull(),
    createdAt: ts().notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.targetType, t.targetId, t.kind] }), index().on(t.targetType, t.targetId)],
);

export const bookmarks = pgTable(
  "bookmarks",
  {
    userId: text()
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    targetType: targetType().notNull(),
    targetId: uuid().notNull(),
    createdAt: ts().notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.targetType, t.targetId] })],
);

export const reportStatus = pgEnum("report_status", ["open", "actioned", "dismissed"]);

export const reports = pgTable(
  "reports",
  {
    id: uuid().primaryKey().defaultRandom(),
    reporterId: text()
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    targetType: targetType().notNull(),
    targetId: text().notNull(),
    reason: text().notNull(),
    details: text().notNull().default(""),
    status: reportStatus().notNull().default("open"),
    createdAt: ts().notNull().defaultNow(),
  },
  (t) => [index().on(t.status, t.createdAt)],
);
