import { date, index, numeric, pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { user } from "./auth";

const ts = () => timestamp({ withTimezone: true });

export const costFrequency = pgEnum("cost_frequency", ["weekly", "monthly", "quarterly", "yearly"]);
export const costCategory = pgEnum("cost_category", ["housing", "groceries", "insurance", "bills", "subscriptions", "transport", "other"]);

/** Regular costs a member tracks on Spending (rent, groceries, insurance, subscriptions). Only the owner ever sees them. */
export const costs = pgTable(
  "costs",
  {
    id: uuid().primaryKey().defaultRandom(),
    userId: text()
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    name: text().notNull(),
    amount: numeric({ precision: 28, scale: 10 }).notNull(),
    currency: text().notNull(),
    frequency: costFrequency().notNull(),
    category: costCategory().notNull(),
    /** The next time it's paid, if the member said. Rolls forward by the frequency once it passes. */
    nextDate: date({ mode: "string" }),
    createdAt: ts().notNull().defaultNow(),
    updatedAt: ts().notNull().defaultNow(),
  },
  (t) => [index().on(t.userId)],
);
