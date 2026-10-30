import { and, eq, isNotNull, sql } from "drizzle-orm";
import {
  BADGE_BY_KEY,
  BADGES,
  badgeLevel,
  badgeProgress,
  LEVEL_NAMES,
  LEVEL_RARITY,
  levelLabel,
  longestStreak,
  memberFor,
  SPECIAL_BADGES,
  SPECIAL_BY_KEY,
  type BadgeMetrics,
} from "@/domain/badges";
import { getDb } from "../db";
import {
  accounts,
  auditEvents,
  brokerConnections,
  comments,
  costs,
  friendships,
  guildMembers,
  importBatches,
  journalEntries,
  paperOrders,
  theses,
  thesisRevisions,
  transactions,
  user,
  userRelics,
  watchlistItems,
  watchlists,
} from "../db/schema";
import { notFound } from "../errors";
import { notify } from "./notifications";

const count = sql<number>`count(*)::int`;

/** Every metric is a count over the user's own records, so awards can be re-derived and audited. */
export async function computeMetrics(userId: string): Promise<BadgeMetrics> {
  const db = getDb();
  const one = async (q: Promise<{ n: number }[]>) => (await q)[0]?.n ?? 0;
  const journalDates = await db.select({ d: journalEntries.entryDate }).from(journalEntries).where(eq(journalEntries.userId, userId));
  const [member] = await db.select({ createdAt: user.createdAt }).from(user).where(eq(user.id, userId));
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
        .where(
          and(eq(theses.userId, userId), sql`${thesisRevisions.status} in ('validated','invalidated') and length(trim(${thesisRevisions.changeNote})) >= 20`),
        ),
    ),
    one(
      db
        .select({ n: sql<number>`count(distinct ${thesisRevisions.thesisId})::int` })
        .from(thesisRevisions)
        .innerJoin(theses, eq(theses.id, thesisRevisions.thesisId))
        .where(and(eq(theses.userId, userId), sql`${thesisRevisions.status} = 'invalidated' and length(trim(${thesisRevisions.changeNote})) >= 20`)),
    ),
    one(
      db
        .select({ n: count })
        .from(journalEntries)
        .where(and(eq(journalEntries.userId, userId), isNotNull(journalEntries.paperOrderId))),
    ),
    one(
      db
        .select({ n: count })
        .from(paperOrders)
        .where(and(eq(paperOrders.userId, userId), isNotNull(paperOrders.thesisId), sql`${paperOrders.status} <> 'rejected'`)),
    ),
    one(
      db
        .select({ n: sql<number>`count(distinct ${transactions.accountId})::int` })
        .from(transactions)
        .innerJoin(accounts, eq(accounts.id, transactions.accountId))
        .where(and(eq(transactions.userId, userId), sql`${transactions.instrumentId} is not null`)),
    ),
    one(
      db
        .select({ n: count })
        .from(importBatches)
        .where(and(eq(importBatches.userId, userId), eq(importBatches.errorCount, 0), sql`${importBatches.importedCount} > 0`)),
    ),
    one(
      db.select({ n: sql<number>`coalesce(max(c), 0)::int` }).from(
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
    one(
      db
        .select({ n: count })
        .from(auditEvents)
        .where(and(eq(auditEvents.userId, userId), eq(auditEvents.action, "privacy.previewed"))),
    ),
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
    memberDays: member ? Math.floor((Date.now() - member.createdAt.getTime()) / 86400_000) : 0,
    ...(await milestoneMetrics(userId)),
  };
}

/** Counts for the Portfolio and Community Relics: brokers ever linked, costs, friends and holdings recorded. */
async function milestoneMetrics(userId: string) {
  const db = getDb();
  const one = async (q: Promise<{ n: number }[]>) => (await q)[0]?.n ?? 0;
  const [brokersLinked, costsTracked, friends, holdingsRecorded] = await Promise.all([
    one(db.select({ n: count }).from(brokerConnections).where(eq(brokerConnections.userId, userId))),
    one(db.select({ n: count }).from(costs).where(eq(costs.userId, userId))),
    one(
      db
        .select({ n: count })
        .from(friendships)
        .where(and(eq(friendships.status, "accepted"), sql`${userId} in (${friendships.userLow}, ${friendships.userHigh})`)),
    ),
    one(
      db
        .select({ n: sql<number>`count(distinct ${transactions.instrumentId})::int` })
        .from(transactions)
        .where(and(eq(transactions.userId, userId), isNotNull(transactions.instrumentId))),
    ),
  ]);
  return { brokersLinked, costsTracked, friends, holdingsRecorded };
}

/** Early member goes to everyone who joins before EARLY_MEMBER_UNTIL (a date). Until that's set Portle isn't public, so everyone qualifies. */
function joinedEarly(createdAt: Date) {
  const until = Date.parse(process.env.EARLY_MEMBER_UNTIL ?? "");
  return Number.isNaN(until) || createdAt.getTime() < until;
}

/**
 * Brings a member's badges up to date: new badges, higher levels, and the special ones.
 * Levels only go up, and the upsert makes this safe to run after any action, even twice at once.
 */
export async function syncBadges(userId: string) {
  const db = getDb();
  const [metrics, rows, [member]] = await Promise.all([
    computeMetrics(userId),
    db.select().from(userRelics).where(eq(userRelics.userId, userId)),
    db.select({ createdAt: user.createdAt }).from(user).where(eq(user.id, userId)),
  ]);
  const byKey = new Map(rows.map((r) => [r.relicKey, r]));
  const now = new Date();

  for (const def of BADGES) {
    const level = badgeLevel(def, metrics);
    const before = byKey.get(def.key);
    if (!level || (before && before.level >= level)) continue;
    const evidence = `${def.metric}=${metrics[def.metric]}`;
    const [row] = await db
      .insert(userRelics)
      .values({ userId, relicKey: def.key, level, levelAt: now, evidence })
      .onConflictDoUpdate({
        target: [userRelics.userId, userRelics.relicKey],
        set: { level, levelAt: now, evidence },
        setWhere: sql`${userRelics.level} < ${level}`,
      })
      .returning();
    if (!row) continue;
    byKey.set(def.key, row);
    await notify(db, {
      userId,
      kind: "relic",
      title: before ? `${def.name} is now ${LEVEL_NAMES[level - 1]}` : `Relic earned: ${def.name}`,
      body: def.levels[level] ? `Next: ${def.rule(def.levels[level])}` : "That's the top level.",
      href: "/relics",
    });
  }

  // Owners wear titles beside their handle rather than a Founder Relic; clear the one an earlier version gave.
  if (byKey.has("founder")) {
    await db.delete(userRelics).where(and(eq(userRelics.userId, userId), eq(userRelics.relicKey, "founder")));
    byKey.delete("founder");
  }
  if (member && !byKey.has("early") && joinedEarly(member.createdAt)) {
    const [row] = await db.insert(userRelics).values({ userId, relicKey: "early", evidence: "joined early" }).onConflictDoNothing().returning();
    if (row) byKey.set("early", row);
  }
  return { metrics, rows: [...byKey.values()] };
}

/** Best-effort wrapper for use after user actions: a Relic failure must never fail the action. */
export async function syncBadgesQuietly(userId: string) {
  try {
    await syncBadges(userId);
  } catch {
    // Relics catch up the next time the member opens a page that syncs them.
  }
}

type Row = typeof userRelics.$inferSelect;

/** One badge as every screen shows it. Locked badges have level 0. */
function view(key: string, row: Row | undefined, metrics?: BadgeMetrics) {
  const unlockedAt = row?.awardedAt ?? null;
  const special = SPECIAL_BY_KEY.get(key);
  if (special) {
    return {
      key,
      name: special.name,
      description: special.description,
      category: "Time on Portle" as string,
      special: true,
      milestone: false,
      level: 1,
      maxLevel: 1,
      levelName: special.name,
      rarity: "Rare",
      unlockedAt,
      levelAt: row?.levelAt ?? null,
      /** "1 year, 2 months" for time on Portle; nothing for the rest. */
      span: null as string | null,
      displayed: row?.displayed ?? true,
      progress: null as null | { toNext: string | null; fraction: number; nextName: string | null; nextRule: string | null },
      howTo: special.description,
      ladder: [] as { level: number; name: string; label: string; rule: string }[],
    };
  }
  const def = BADGE_BY_KEY.get(key)!;
  const progress = metrics ? badgeProgress(def, metrics, row?.level ?? 0) : null;
  const level = progress?.level ?? row?.level ?? 0;
  const milestone = def.levels.length === 1;
  return {
    key,
    name: def.name,
    description: def.description,
    category: def.category as string,
    special: false,
    milestone,
    level,
    maxLevel: def.levels.length,
    levelName: milestone ? (level ? "Unlocked" : "Not yet") : level ? LEVEL_NAMES[level - 1] : "Not yet",
    rarity: milestone ? "Uncommon" : LEVEL_RARITY[Math.max(level, 1) - 1],
    unlockedAt,
    levelAt: row?.levelAt ?? null,
    span: def.metric === "memberDays" && metrics ? memberFor(metrics.memberDays) : null,
    displayed: row?.displayed ?? true,
    progress: progress && {
      toNext: progress.toNext,
      fraction: progress.fraction,
      nextName: progress.next === null ? null : LEVEL_NAMES[progress.level],
      nextRule: progress.next === null ? null : def.rule(progress.next),
    },
    /** How to earn it, for milestones and Relics not unlocked yet. */
    howTo: def.rule(def.levels[0]),
    ladder: milestone ? [] : def.levels.map((n, i) => ({ level: i + 1, name: LEVEL_NAMES[i], label: levelLabel(def, n), rule: def.rule(n) })),
  };
}
export type BadgeView = ReturnType<typeof view>;

/** Strongest first: Early member, then the highest level, then the most recent. */
const order = (a: BadgeView, b: BadgeView) =>
  Number(b.special) - Number(a.special) || b.level - a.level || (b.levelAt?.getTime() ?? 0) - (a.levelAt?.getTime() ?? 0);

/** The member's own badges: what they've earned, and what they can still unlock. Syncs first. */
export async function listBadges(userId: string) {
  const { metrics, rows } = await syncBadges(userId);
  const byKey = new Map(rows.map((r) => [r.relicKey, r]));
  const specials = SPECIAL_BADGES.filter((s) => byKey.has(s.key)).map((s) => view(s.key, byKey.get(s.key)));
  const all = BADGES.map((def) => view(def.key, byKey.get(def.key), metrics));
  // Moved up a level in the last week: the badges page marks these with a dot. A first level is news enough on its own.
  const fresh = (b: BadgeView) => ({ ...b, fresh: b.level > 1 && !!b.levelAt && Date.now() - b.levelAt.getTime() < 7 * 86400_000 });
  return { earned: [...specials, ...all.filter((b) => b.level > 0)].sort(order).map(fresh), locked: all.filter((b) => b.level === 0) };
}

/** The Relics a member shows on their profile, with how far each is from its next level. */
export async function shownBadges(userId: string) {
  const [rows, metrics] = await Promise.all([
    getDb()
      .select()
      .from(userRelics)
      .where(and(eq(userRelics.userId, userId), eq(userRelics.displayed, true))),
    computeMetrics(userId),
  ]);
  return rows
    .filter((r) => BADGE_BY_KEY.has(r.relicKey) || SPECIAL_BY_KEY.has(r.relicKey))
    .map((r) => view(r.relicKey, r, metrics))
    .sort(order);
}

export async function setBadgeDisplayed(userId: string, key: string, displayed: boolean) {
  const res = await getDb()
    .update(userRelics)
    .set({ displayed })
    .where(and(eq(userRelics.userId, userId), eq(userRelics.relicKey, key)))
    .returning({ key: userRelics.relicKey });
  if (!res.length) throw notFound("Relic");
}
