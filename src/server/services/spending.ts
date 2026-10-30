import { and, asc, eq } from "drizzle-orm";
import { z } from "zod";
import { parseDecimalInput, toDb, d } from "@/domain/money";
import { CATEGORIES, FREQUENCIES, summarizeCosts, type Per } from "@/domain/spending";
import { utcToday } from "@/domain/review";
import { getDb } from "../db";
import { costs, profiles } from "../db/schema";
import { notFound, UserFacingError } from "../errors";
import { getFx } from "./market";

const MAX_COSTS = 200;

export const costInput = z.object({
  name: z.string().trim().min(1, "Give it a name.").max(60, "Keep the name under 60 characters."),
  amount: z.string().transform((v, ctx) => {
    const parsed = parseDecimalInput(v);
    if (!parsed || !d(parsed).gt(0) || d(parsed).gte(1e9)) {
      ctx.addIssue({ code: "custom", message: "Enter an amount, like 45 or 13.99." });
      return z.NEVER;
    }
    return parsed;
  }),
  frequency: z.enum(FREQUENCIES, "Choose how often you pay it."),
  category: z.enum(CATEGORIES, "Choose a category."),
  nextDate: z
    .union([z.iso.date("Choose a date."), z.literal("")])
    .optional()
    .transform((v) => v || null),
});

async function baseCurrency(userId: string) {
  const [p] = await getDb().select({ c: profiles.baseCurrency }).from(profiles).where(eq(profiles.userId, userId));
  return p?.c ?? "EUR";
}

export async function listCosts(userId: string) {
  return getDb().select().from(costs).where(eq(costs.userId, userId)).orderBy(asc(costs.createdAt));
}

export async function addCost(userId: string, raw: unknown) {
  const input = costInput.parse(raw);
  const db = getDb();
  if ((await listCosts(userId)).length >= MAX_COSTS) throw new UserFacingError(`Spending holds up to ${MAX_COSTS} costs.`);
  const [row] = await db
    .insert(costs)
    .values({ userId, ...input, amount: toDb(d(input.amount)), currency: await baseCurrency(userId) })
    .returning();
  return row;
}

export async function updateCost(userId: string, id: string, raw: unknown) {
  const input = costInput.parse(raw);
  const [row] = await getDb()
    .update(costs)
    .set({ ...input, amount: toDb(d(input.amount)), updatedAt: new Date() })
    .where(and(eq(costs.id, id), eq(costs.userId, userId)))
    .returning();
  if (!row) throw notFound("Cost");
  return row;
}

export async function deleteCost(userId: string, id: string) {
  const [row] = await getDb()
    .delete(costs)
    .where(and(eq(costs.id, id), eq(costs.userId, userId)))
    .returning({ id: costs.id });
  if (!row) throw notFound("Cost");
}

/** Everything the Spending page shows, in the member's own currency. Only ever for the owner of the costs. */
export async function getSpending(userId: string, per: Per) {
  const [rows, currency, fxCtx] = await Promise.all([listCosts(userId), baseCurrency(userId), getFx()]);
  const summary = summarizeCosts(
    rows.map((r) => ({ id: r.id, name: r.name, amount: r.amount, currency: r.currency, frequency: r.frequency, category: r.category, nextDate: r.nextDate })),
    { per, currency, today: utcToday(), convert: (amount, from) => fxCtx.fx.convert(amount, from, currency) },
  );
  return { currency, per, ...summary };
}
