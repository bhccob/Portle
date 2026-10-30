import { sql } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { user } from "./auth";

const ts = () => timestamp({ withTimezone: true });

/** Who may see a piece of content. Enforced server-side in src/domain/permissions.ts. */
export const audience = pgEnum("audience", ["private", "friends", "guild", "public"]);

export const profiles = pgTable(
  "profiles",
  {
    userId: text()
      .primaryKey()
      .references(() => user.id, { onDelete: "cascade" }),
    handle: text().notNull(),
    displayName: text().notNull(),
    bio: text().notNull().default(""),
    avatarHue: text().notNull().default("262"),
    baseCurrency: text().notNull().default("EUR"),
    interests: text()
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    /** How long they have invested, if they said (see domain/topics EXPERIENCE). Only they see it. */
    experience: text(),
    /** The LinkedIn-style parts of a profile (see domain/profile-layout). Shown to whoever may see the profile. */
    headline: text().notNull().default(""),
    location: text().notNull().default(""),
    bannerStyle: text().notNull().default("dial"),
    links: jsonb().$type<Partial<Record<"website" | "linkedin" | "github" | "x", string>>>().notNull().default({}),
    investingSince: integer(),
    approach: text(),
    horizon: text(),
    /** Section order and which are switched off; null means the default order, all shown. */
    sections: jsonb().$type<{ key: string; visible: boolean }[]>(),
    /** Up to three of their own theses to pin at the top, still subject to each thesis's audience. */
    featuredThesisIds: uuid()
      .array()
      .notNull()
      .default(sql`'{}'::uuid[]`),
    theme: text().notNull().default("system"),
    onboardedAt: ts(),
    createdAt: ts().notNull().defaultNow(),
    updatedAt: ts().notNull().defaultNow(),
  },
  (t) => [uniqueIndex("profiles_handle_lower_idx").on(sql`lower(${t.handle})`)],
);

/**
 * Granular privacy controls. Every value defaults to the most private option.
 * `shareAllocation` exposes percentages only; exact values are never shared.
 */
export const privacySettings = pgTable("privacy_settings", {
  userId: text()
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),
  profileVisibility: audience().notNull().default("friends"),
  allocationVisibility: audience().notNull().default("private"),
  holdingsVisibility: audience().notNull().default("private"),
  activityVisibility: audience().notNull().default("private"),
  thesesDefaultVisibility: audience().notNull().default("private"),
  journalDefaultVisibility: audience().notNull().default("private"),
  guildsVisibility: audience().notNull().default("friends"),
  relicsVisibility: audience().notNull().default("friends"),
  discoverable: boolean().notNull().default(true),
  updatedAt: ts().notNull().defaultNow(),
});

/** Append-only consent record (GDPR). The latest row per kind wins. */
export const consents = pgTable(
  "consents",
  {
    id: uuid().primaryKey().defaultRandom(),
    userId: text()
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    kind: text().notNull(),
    granted: boolean().notNull(),
    version: text().notNull(),
    createdAt: ts().notNull().defaultNow(),
  },
  (t) => [index().on(t.userId, t.kind)],
);

/** Minimal audit trail for sensitive actions. Never stores values, tokens or balances. */
export const auditEvents = pgTable(
  "audit_events",
  {
    id: uuid().primaryKey().defaultRandom(),
    userId: text().references(() => user.id, { onDelete: "set null" }),
    action: text().notNull(),
    entityType: text(),
    entityId: text(),
    metadata: jsonb().$type<Record<string, string | number | boolean>>().notNull().default({}),
    createdAt: ts().notNull().defaultNow(),
  },
  (t) => [index().on(t.userId, t.createdAt)],
);

export const notifications = pgTable(
  "notifications",
  {
    id: uuid().primaryKey().defaultRandom(),
    userId: text()
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    kind: text().notNull(),
    actorId: text().references(() => user.id, { onDelete: "cascade" }),
    entityType: text(),
    entityId: text(),
    title: text().notNull(),
    body: text().notNull().default(""),
    href: text(),
    readAt: ts(),
    createdAt: ts().notNull().defaultNow(),
  },
  (t) => [index().on(t.userId, t.createdAt)],
);

/** Development mailbox: outgoing mail is stored here when no mail provider is configured. */
export const emailOutbox = pgTable("email_outbox", {
  id: uuid().primaryKey().defaultRandom(),
  to: text().notNull(),
  subject: text().notNull(),
  text: text().notNull(),
  createdAt: ts().notNull().defaultNow(),
});

export const userBlocks = pgTable(
  "user_blocks",
  {
    blockerId: text()
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    blockedId: text()
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    createdAt: ts().notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.blockerId, t.blockedId] }), index().on(t.blockedId)],
);

export const accessStatus = pgEnum("access_status", ["requested", "granted", "declined"]);

/**
 * Full access: real prices and broker linking, the two things that cost Portle money per person.
 * The owner (OWNER_EMAILS) lets members in; a subscription can later set the same row.
 */
export const fullAccess = pgTable("full_access", {
  userId: text()
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),
  status: accessStatus().notNull(),
  /** What the member wrote to the owner when asking. */
  note: text().notNull().default(""),
  requestedAt: ts(),
  decidedAt: ts(),
  createdAt: ts().notNull().defaultNow(),
});

/** Emails the owner let in before they had an account. Turned into full access on first use, then removed. */
export const accessInvites = pgTable("access_invites", {
  email: text().primaryKey(),
  createdAt: ts().notNull().defaultNow(),
});

/** Work or study on a profile, like LinkedIn's Experience. Shown to whoever may see the profile. */
export const profileExperience = pgTable(
  "profile_experience",
  {
    id: uuid().primaryKey().defaultRandom(),
    userId: text()
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    title: text().notNull(),
    organisation: text().notNull().default(""),
    startYear: integer().notNull(),
    /** Null while it's still going. */
    endYear: integer(),
    description: text().notNull().default(""),
    createdAt: ts().notNull().defaultNow(),
  },
  (t) => [index().on(t.userId)],
);
