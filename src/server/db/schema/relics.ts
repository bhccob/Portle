import { boolean, integer, pgTable, primaryKey, text, timestamp } from "drizzle-orm/pg-core";
import { user } from "./auth";

/**
 * Earned badges (they began as Relics, hence the table name). The catalog and its
 * rules live in code (src/domain/badges.ts) so they are reviewable; the composite
 * primary key makes a duplicate award impossible.
 */
export const userRelics = pgTable(
  "user_relics",
  {
    userId: text()
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    relicKey: text().notNull(),
    awardedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    /** Snapshot of the metric values that satisfied the rule, for auditability. */
    evidence: text().notNull().default(""),
    displayed: boolean().notNull().default(true),
    /** The highest level reached, 1 to 5. Levels never go back down. */
    level: integer().notNull().default(1),
    levelAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.relicKey] })],
);
