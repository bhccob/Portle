import { boolean, pgTable, primaryKey, text, timestamp } from "drizzle-orm/pg-core";
import { user } from "./auth";

/**
 * Earned Relics. The catalog and its eligibility rules live in code
 * (src/domain/relics.ts) so they are reviewable; the composite primary key
 * makes a duplicate award impossible.
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
  },
  (t) => [primaryKey({ columns: [t.userId, t.relicKey] })],
);
