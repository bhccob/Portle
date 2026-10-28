import { boolean, index, pgEnum, pgTable, primaryKey, text, timestamp, unique, uuid } from "drizzle-orm/pg-core";
import { user } from "./auth";

const ts = () => timestamp({ withTimezone: true });

export const guildVisibility = pgEnum("guild_visibility", ["discoverable", "private"]);
export const guildJoinPolicy = pgEnum("guild_join_policy", ["open", "request", "invite"]);
export const guildRole = pgEnum("guild_role", ["owner", "admin", "member"]);

export const guilds = pgTable("guilds", {
  id: uuid().primaryKey().defaultRandom(),
  slug: text().notNull().unique(),
  name: text().notNull(),
  description: text().notNull().default(""),
  topic: text().notNull().default(""),
  visibility: guildVisibility().notNull().default("discoverable"),
  joinPolicy: guildJoinPolicy().notNull().default("request"),
  ownerId: text()
    .notNull()
    .references(() => user.id, { onDelete: "restrict" }),
  createdAt: ts().notNull().defaultNow(),
});

export const guildMembers = pgTable(
  "guild_members",
  {
    guildId: uuid()
      .notNull()
      .references(() => guilds.id, { onDelete: "cascade" }),
    userId: text()
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    role: guildRole().notNull().default("member"),
    /** Explicit consent to include this member's allocation percentages in Guild analytics. */
    shareAllocation: boolean().notNull().default(false),
    joinedAt: ts().notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.guildId, t.userId] }), index().on(t.userId)],
);

export const guildInviteKind = pgEnum("guild_invite_kind", ["request", "invite"]);
export const guildInviteStatus = pgEnum("guild_invite_status", ["pending", "accepted", "declined"]);

export const guildInvites = pgTable(
  "guild_invites",
  {
    id: uuid().primaryKey().defaultRandom(),
    guildId: uuid()
      .notNull()
      .references(() => guilds.id, { onDelete: "cascade" }),
    userId: text()
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    invitedBy: text().references(() => user.id, { onDelete: "set null" }),
    kind: guildInviteKind().notNull(),
    status: guildInviteStatus().notNull().default("pending"),
    createdAt: ts().notNull().defaultNow(),
    resolvedAt: ts(),
  },
  (t) => [unique().on(t.guildId, t.userId, t.kind), index().on(t.userId)],
);

export const guildModerationActions = pgTable(
  "guild_moderation_actions",
  {
    id: uuid().primaryKey().defaultRandom(),
    guildId: uuid()
      .notNull()
      .references(() => guilds.id, { onDelete: "cascade" }),
    actorId: text()
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    targetUserId: text().references(() => user.id, { onDelete: "set null" }),
    targetPostId: uuid(),
    action: text().notNull(),
    reason: text().notNull().default(""),
    createdAt: ts().notNull().defaultNow(),
  },
  (t) => [index().on(t.guildId, t.createdAt)],
);
