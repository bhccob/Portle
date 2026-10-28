import { and, eq, isNotNull, sql } from "drizzle-orm";
import { eligibleRelics, longestStreak, relicProgress, RELICS, type RelicMetrics } from "@/domain/relics";
import { getDb } from "../db";
import {
  accounts,
  auditEvents,
  comments,
  guildMembers,
  importBatches,
  journalEntries,
  paperOrders,
  theses,
  thesisRevisions,
  transactions,
  userRelics,
  watchlistItems,
  watchlists,
} from "../db/schema";
import { notFound } from "../errors";
import { notify } from "./notifications";

const count = sql<number>`count(*)::int`;

/** Every metric is a count over the user's own records, so awards can be re-derived and audited. */
export async function computeMetrics(userId: string): Promise<RelicMetrics> {
  const db = getDb();
  const one = async (q: Promise<{ n: number }[]>) => (await q)[0]?.n ?? 0;
  const journalDates = await db.select({ d: journalEntries.entryDate }).from(journalEntries).where(eq(journalEntries.userId, userId));
  const [
    thesesCreated,
    thesesWithInvalidation,
    thesisRevisionCount,
    closedWithReview,
    invalidatedWithReview,
    paperReflections,
    thesisLinkedPaperOrders,
    accountsTracked,
    cleanImports,
    watchlistSize,
    guildMemberships,
    commentsOnOthersTheses,
    privacyPreviewed,
  ] = await Promise.all([
    one(db.select({ n: count }).from(theses).where(eq(theses.userId, userId))),
    one(
      db
        .select({ n: sql<number>`count(distinct ${thesisRevisions.thesisId})::int` })
        .from(thesisRevisions)
        .innerJoin(theses, eq(theses.id, thesisRevisions.thesisId))
        .where(and(eq(theses.userId, userId), sql`length(trim(${thesisRevisions.invalidationCriteria})) >= 20`)),
    ),
    one(
      db
        .select({ n: count })
        .from(thesisRevisions)
        .innerJoin(theses, eq(theses.id, thesisRevisions.thesisId))
        .where(and(eq(theses.userId, userId), sql`${thesisRevisions.revision} > 1`)),
    ),
    one(
      db
        .select({ n: sql<number>`count(distinct ${thesisRevisions.thesisId})::int` })
        .from(thesisRevisions)
        .innerJoin(theses, eq(theses.id, thesisRevisions.thesisId))
        .where(and(eq(theses.userId, userId), sql`${thesisRevisions.status} in ('validated','invalidated') and length(trim(${thesisRevisions.changeNote})) >= 20`)),
    ),
    one(
      db
        .select({ n: sql<number>`count(distinct ${thesisRevisions.thesisId})::int` })
        .from(thesisRevisions)
        .innerJoin(theses, eq(theses.id, thesisRevisions.thesisId))
        .where(and(eq(theses.userId, userId), sql`${thesisRevisions.status} = 'invalidated' and length(trim(${thesisRevisions.changeNote})) >= 20`)),
    ),
    one(db.select({ n: count }).from(journalEntries).where(and(eq(journalEntries.userId, userId), isNotNull(journalEntries.paperOrderId)))),
    one(db.select({ n: count }).from(paperOrders).where(and(eq(paperOrders.userId, userId), isNotNull(paperOrders.thesisId), sql`${paperOrders.status} <> 'rejected'`))),
    one(
      db
        .select({ n: sql<number>`count(distinct ${transactions.accountId})::int` })
        .from(transactions)
        .innerJoin(accounts, eq(accounts.id, transactions.accountId))
        .where(and(eq(transactions.userId, userId), sql`${transactions.instrumentId} is not null`)),
    ),
    one(db.select({ n: count }).from(importBatches).where(and(eq(importBatches.userId, userId), eq(importBatches.errorCount, 0), sql`${importBatches.importedCount} > 0`))),
    one(
      db
        .select({ n: sql<number>`coalesce(max(c), 0)::int` })
        .from(
          db
            .select({ c: sql<number>`count(*)`.as("c") })
            .from(watchlistItems)
            .innerJoin(watchlists, eq(watchlists.id, watchlistItems.watchlistId))
            .where(eq(watchlists.userId, userId))
            .groupBy(watchlistItems.watchlistId)
            .as("w"),
        ),
    ),
    one(db.select({ n: count }).from(guildMembers).where(eq(guildMembers.userId, userId))),
    one(
      db
        .select({ n: count })
        .from(comments)
        .innerJoin(theses, sql`${theses.id} = ${comments.targetId}`)
        .where(and(eq(comments.userId, userId), eq(comments.targetType, "thesis"), sql`${theses.userId} <> ${userId}`, sql`${comments.deletedAt} is null`)),
    ),
    one(db.select({ n: count }).from(auditEvents).where(and(eq(auditEvents.userId, userId), eq(auditEvents.action, "privacy.previewed")))),
  ]);
  return {
    thesesCreated,
    thesesWithInvalidation,
    thesisRevisions: thesisRevisionCount,
    thesesClosedWithReview: closedWithReview,
    invalidatedWithReview,
    journalDays: new Set(journalDates.map((r) => r.d)).size,
    journalLongestStreak: longestStreak(journalDates.map((r) => r.d)),
    paperReflections,
    thesisLinkedPaperOrders,
    accountsTracked,
    cleanImports,
    watchlistSize,
    guildMemberships,
    commentsOnOthersTheses,
    privacyPreviewed,
  };
}

/**
 * Awards any newly earned Relics. The primary key makes awarding idempotent,
 * so this is safe to call after any action, concurrently or repeatedly.
 */
export async function evaluateRelics(userId: string) {
  const metrics = await computeMetrics(userId);
  const db = getDb();
  const awarded: string[] = [];
  for (const def of eligibleRelics(metrics)) {
    const rows = await db
      .insert(userRelics)
      .values({ userId, relicKey: def.key, evidence: `${def.metric}=${metrics[def.metric]}` })
      .onConflictDoNothing()
      .returning({ key: userRelics.relicKey });
    if (rows.length) {
      awarded.push(def.key);
      await notify(db, { userId, kind: "relic", title: `Relic earned: ${def.name}`, body: def.description, href: "/relics" });
    }
  }
  return awarded;
}

/** Best-effort wrapper for use after user actions: an evaluation failure must never fail the action. */
export async function evaluateRelicsQuietly(userId: string) {
  try {
    return await evaluateRelics(userId);
  } catch {
    return [];
  }
}

export async function listRelics(userId: string) {
  const [metrics, earned] = await Promise.all([computeMetrics(userId), getDb().select().from(userRelics).where(eq(userRelics.userId, userId))]);
  const byKey = new Map(earned.map((e) => [e.relicKey, e]));
  return RELICS.map((def) => ({ ...def, earned: byKey.get(def.key) ?? null, progress: relicProgress(def, metrics) }));
}

export async function setRelicDisplayed(userId: string, key: string, displayed: boolean) {
  const res = await getDb()
    .update(userRelics)
    .set({ displayed })
    .where(and(eq(userRelics.userId, userId), eq(userRelics.relicKey, key)))
    .returning({ key: userRelics.relicKey });
  if (!res.length) throw notFound("Relic");
}
