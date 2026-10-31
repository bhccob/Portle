import { and, desc, eq, inArray, isNull, lt, or, sql } from "drizzle-orm";
import { z } from "zod";
import { canView, guildCan, type Audience, type GuildRole, type Viewer } from "@/domain/permissions";
import { audit } from "../audit";
import { getDb } from "../db";
import {
  bookmarks,
  brokerConnections,
  comments,
  friendships,
  guildMembers,
  guildModerationActions,
  posts,
  profiles,
  reactions,
  reports,
  theses,
  userBlocks,
  type InsightPayload,
} from "../db/schema";
import { forbidden, notFound, UserFacingError } from "../errors";
import { assertRateLimit } from "../rate-limit";
import { notify } from "./notifications";
import { personColumns, pictureLookup, withAuthorPictures } from "./pictures";
import { getValuation } from "./portfolio";

const pair = (a: string, b: string) => (a < b ? [a, b] : [b, a]) as [string, string];

async function profileName(userId: string) {
  const [p] = await getDb().select({ displayName: profiles.displayName, handle: profiles.handle }).from(profiles).where(eq(profiles.userId, userId));
  return p ?? { displayName: "A member", handle: "" };
}

// ---------- Friends & blocks ----------

export async function sendFriendRequest(userId: string, targetId: string) {
  if (userId === targetId) throw new UserFacingError("You can't befriend yourself.");
  assertRateLimit(`friend:${userId}`, 30, 3600_000);
  const db = getDb();
  const blocked = await db
    .select()
    .from(userBlocks)
    .where(or(and(eq(userBlocks.blockerId, userId), eq(userBlocks.blockedId, targetId)), and(eq(userBlocks.blockerId, targetId), eq(userBlocks.blockedId, userId))));
  if (blocked.length) throw notFound("Member");
  const [target] = await db.select().from(profiles).where(eq(profiles.userId, targetId));
  if (!target?.onboardedAt) throw notFound("Member");
  const [low, high] = pair(userId, targetId);
  const [existing] = await db.select().from(friendships).where(and(eq(friendships.userLow, low), eq(friendships.userHigh, high)));
  if (existing) {
    // A crossing request from the other side becomes an acceptance.
    if (existing.status === "pending" && existing.requestedBy === targetId) return respondFriendRequest(userId, targetId, true);
    return existing;
  }
  const [row] = await db.insert(friendships).values({ userLow: low, userHigh: high, requestedBy: userId }).returning();
  const me = await profileName(userId);
  await notify(db, { userId: targetId, actorId: userId, kind: "friend_request", title: `${me.displayName} sent you a friend request`, href: `/u/${me.handle}` });
  return row;
}

export async function respondFriendRequest(userId: string, requesterId: string, accept: boolean) {
  const db = getDb();
  const [low, high] = pair(userId, requesterId);
  const [f] = await db.select().from(friendships).where(and(eq(friendships.userLow, low), eq(friendships.userHigh, high)));
  if (!f || f.status !== "pending" || f.requestedBy === userId) throw notFound("Friend request");
  if (!accept) {
    await db.delete(friendships).where(and(eq(friendships.userLow, low), eq(friendships.userHigh, high)));
    return null;
  }
  const [row] = await db
    .update(friendships)
    .set({ status: "accepted", acceptedAt: new Date() })
    .where(and(eq(friendships.userLow, low), eq(friendships.userHigh, high)))
    .returning();
  const me = await profileName(userId);
  await notify(db, { userId: requesterId, actorId: userId, kind: "friend_accepted", title: `${me.displayName} accepted your friend request`, href: `/u/${me.handle}` });
  return row;
}

export async function removeFriend(userId: string, otherId: string) {
  const [low, high] = pair(userId, otherId);
  await getDb().delete(friendships).where(and(eq(friendships.userLow, low), eq(friendships.userHigh, high)));
}

export async function listFriends(userId: string) {
  const db = getDb();
  const rows = await db.select().from(friendships).where(or(eq(friendships.userLow, userId), eq(friendships.userHigh, userId)));
  const otherIds = rows.map((r) => (r.userLow === userId ? r.userHigh : r.userLow));
  const people = otherIds.length ? await db.select().from(profiles).where(inArray(profiles.userId, otherIds)) : [];
  const byId = new Map(people.map((p) => [p.userId, p]));
  const face = await pictureLookup(userId, people);
  const shape = (r: (typeof rows)[number]) => {
    const other = r.userLow === userId ? r.userHigh : r.userLow;
    const p = byId.get(other);
    const person = { userId: other, handle: p?.handle ?? "", displayName: p?.displayName ?? "Member", avatarHue: p?.avatarHue ?? "262", picture: p?.picture ?? null };
    return { ...face(person), since: r.acceptedAt ?? r.createdAt };
  };
  return {
    friends: rows.filter((r) => r.status === "accepted").map(shape),
    incoming: rows.filter((r) => r.status === "pending" && r.requestedBy !== userId).map(shape),
    outgoing: rows.filter((r) => r.status === "pending" && r.requestedBy === userId).map(shape),
  };
}

export async function blockUser(userId: string, targetId: string) {
  if (userId === targetId) throw new UserFacingError("You can't block yourself.");
  const db = getDb();
  await db.insert(userBlocks).values({ blockerId: userId, blockedId: targetId }).onConflictDoNothing();
  await removeFriend(userId, targetId);
  await audit(db, { userId, action: "social.block", entityType: "user", entityId: targetId });
}

export async function unblockUser(userId: string, targetId: string) {
  await getDb().delete(userBlocks).where(and(eq(userBlocks.blockerId, userId), eq(userBlocks.blockedId, targetId)));
}

export async function listBlocked(userId: string) {
  return getDb()
    .select({ userId: profiles.userId, handle: profiles.handle, displayName: profiles.displayName })
    .from(userBlocks)
    .innerJoin(profiles, eq(profiles.userId, userBlocks.blockedId))
    .where(eq(userBlocks.blockerId, userId));
}

// ---------- Posts ----------

export const postInput = z
  .object({
    body: z.string().trim().min(1, "Write something to share.").max(2000),
    audience: z.enum(["friends", "guild", "public"]).default("friends"),
    guildId: z.uuid().optional().nullable(),
    thesisId: z.uuid().optional().nullable(),
    insightDimension: z.enum(["assetClass", "sector", "region", "currency"]).optional().nullable(),
  })
  .superRefine((v, ctx) => {
    if (v.audience === "guild" && !v.guildId) ctx.addIssue({ code: "custom", path: ["guildId"], message: "Choose a Guild." });
  });

/** Sharing a thesis in a post must never widen who can read the thesis itself. */
export function canShareThesis(t: { visibility: string; guildId: string | null }, audience: "friends" | "guild" | "public", guildId: string | null) {
  switch (t.visibility) {
    case "public":
      return true;
    case "friends":
      return audience === "friends";
    case "guild":
      return audience === "guild" && guildId === t.guildId;
    default:
      return false;
  }
}

async function membership(userId: string, guildId: string) {
  const [m] = await getDb()
    .select()
    .from(guildMembers)
    .where(and(eq(guildMembers.guildId, guildId), eq(guildMembers.userId, userId)));
  return m ?? null;
}

export async function createPost(userId: string, raw: z.input<typeof postInput>) {
  const v = postInput.parse(raw);
  assertRateLimit(`post:${userId}`, 20, 3600_000);
  const db = getDb();
  if (v.audience === "guild" && !(await membership(userId, v.guildId!))) throw forbidden("You can only post in Guilds you belong to.");

  let kind: "text" | "thesis" | "insight" = "text";
  if (v.thesisId) {
    const [t] = await db.select().from(theses).where(and(eq(theses.id, v.thesisId), eq(theses.userId, userId)));
    if (!t) throw notFound("Thesis");
    if (!canShareThesis(t, v.audience, v.guildId ?? null)) {
      throw new UserFacingError("This thesis is visible to fewer people than this post would reach. Change the thesis visibility first.");
    }
    kind = "thesis";
  }

  let insight: InsightPayload | null = null;
  if (v.insightDimension) {
    // Computed here from the owner's own data; the client never supplies the numbers.
    const { valuation } = await getValuation(userId);
    const slices = valuation.allocation[v.insightDimension].map((s) => ({ label: s.label, percent: s.percent.toDecimalPlaces(3).toFixed() }));
    if (!slices.length) throw new UserFacingError("Add holdings with prices before sharing an allocation.");
    const brokers = await db
      .select()
      .from(brokerConnections)
      .where(and(eq(brokerConnections.userId, userId), eq(brokerConnections.status, "active")));
    insight = { kind: "allocation", dimension: v.insightDimension, slices, verified: brokers.length > 0, asOf: new Date().toISOString() };
    kind = "insight";
  }

  const [post] = await db
    .insert(posts)
    .values({ userId, kind, body: v.body, thesisId: v.thesisId ?? null, insight, audience: v.audience, guildId: v.audience === "guild" ? v.guildId! : null })
    .returning();
  return post;
}

export type FeedFilter = "all" | "friends" | "guilds" | "mine";

/** The viewer's feed. Visibility is filtered in SQL and re-checked in code. */
export async function listFeed(viewer: Viewer, opts: { filter?: FeedFilter; guildId?: string; before?: string; limit?: number } = {}) {
  const db = getDb();
  const friendIds = [...viewer.friendIds];
  const guildIds = [...viewer.guildIds];
  const blocked = [...viewer.blockedIds];
  const filter = opts.filter ?? "all";
  const conds = [isNull(posts.deletedAt)];
  if (blocked.length) conds.push(sql`${posts.userId} not in (${sql.join(blocked.map((b) => sql`${b}`), sql`, `)})`);
  const own = eq(posts.userId, viewer.userId);
  const friends = and(eq(posts.audience, "friends"), friendIds.length ? inArray(posts.userId, friendIds) : sql`false`)!;
  const pub = and(eq(posts.audience, "public"), friendIds.length ? inArray(posts.userId, [...friendIds, viewer.userId]) : own)!;
  const guild = and(eq(posts.audience, "guild"), guildIds.length ? inArray(posts.guildId, guildIds) : sql`false`)!;
  if (opts.guildId) conds.push(and(eq(posts.audience, "guild"), eq(posts.guildId, opts.guildId))!);
  else if (filter === "friends") conds.push(or(own, friends, pub)!);
  else if (filter === "guilds") conds.push(guild);
  else if (filter === "mine") conds.push(own);
  // "Public" posts reach friends in the home feed; strangers find them on profiles, not in a global stream.
  else conds.push(or(own, friends, pub, guild)!);
  if (opts.before) conds.push(lt(posts.createdAt, new Date(opts.before)));

  const rows = await db
    .select({ post: posts, author: personColumns })
    .from(posts)
    .innerJoin(profiles, eq(profiles.userId, posts.userId))
    .where(and(...conds))
    .orderBy(desc(posts.createdAt))
    .limit(opts.limit ?? 30);
  const visible = rows.filter((r) => canView(viewer, { ownerId: r.post.userId, audience: r.post.audience as Audience, guildId: r.post.guildId }));
  return decorate(viewer, visible);
}

async function decorate(viewer: Viewer, rows: { post: typeof posts.$inferSelect; author: { userId: string; handle: string; displayName: string; avatarHue: string; picture: string | null } }[]) {
  const db = getDb();
  const ids = rows.map((r) => r.post.id);
  if (!ids.length) return [];
  const thesisIds = rows.map((r) => r.post.thesisId).filter((x): x is string => !!x);
  const [commentCounts, reactionRows, bookmarkRows, thesisRows, face] = await Promise.all([
    db
      .select({ targetId: comments.targetId, n: sql<number>`count(*)::int` })
      .from(comments)
      .where(and(eq(comments.targetType, "post"), inArray(comments.targetId, ids), isNull(comments.deletedAt)))
      .groupBy(comments.targetId),
    db.select().from(reactions).where(and(eq(reactions.targetType, "post"), inArray(reactions.targetId, ids))),
    db.select().from(bookmarks).where(and(eq(bookmarks.userId, viewer.userId), eq(bookmarks.targetType, "post"), inArray(bookmarks.targetId, ids))),
    thesisIds.length ? db.select().from(theses).where(inArray(theses.id, thesisIds)) : Promise.resolve([]),
    pictureLookup(viewer, rows.map((r) => r.author)),
  ]);
  const thesisById = new Map(thesisRows.map((t) => [t.id, t]));
  return rows.map((r) => {
    const t = r.post.thesisId ? thesisById.get(r.post.thesisId) : undefined;
    // The attached thesis is shown only if the viewer may read the thesis itself.
    const thesis = t && canView(viewer, { ownerId: t.userId, audience: t.visibility as Audience, guildId: t.guildId }) ? { id: t.id, title: t.title, summary: t.summary, status: t.status } : null;
    const mine = reactionRows.filter((x) => x.targetId === r.post.id);
    const counts: Record<string, number> = {};
    for (const x of mine) counts[x.kind] = (counts[x.kind] ?? 0) + 1;
    return {
      ...r,
      author: face(r.author),
      thesis,
      comments: commentCounts.find((c) => c.targetId === r.post.id)?.n ?? 0,
      reactions: counts,
      myReactions: mine.filter((x) => x.userId === viewer.userId).map((x) => x.kind),
      bookmarked: bookmarkRows.some((b) => b.targetId === r.post.id),
    };
  });
}

export async function getPost(viewer: Viewer, postId: string) {
  const db = getDb();
  const [row] = await db
    .select({ post: posts, author: personColumns })
    .from(posts)
    .innerJoin(profiles, eq(profiles.userId, posts.userId))
    .where(and(eq(posts.id, postId), isNull(posts.deletedAt)));
  if (!row || !canView(viewer, { ownerId: row.post.userId, audience: row.post.audience as Audience, guildId: row.post.guildId })) throw notFound("Post");
  return (await decorate(viewer, [row]))[0];
}

export async function deletePost(userId: string, postId: string) {
  const db = getDb();
  const [p] = await db.select().from(posts).where(eq(posts.id, postId));
  if (!p || p.deletedAt) throw notFound("Post");
  if (p.userId !== userId) {
    const m = p.guildId ? await membership(userId, p.guildId) : null;
    if (!m || !guildCan(m.role as GuildRole, "remove_post")) throw forbidden();
    await db.insert(guildModerationActions).values({ guildId: p.guildId!, actorId: userId, targetUserId: p.userId, targetPostId: p.id, action: "remove_post" });
  }
  await db.update(posts).set({ deletedAt: new Date() }).where(eq(posts.id, postId));
}

// ---------- Comments, reactions, bookmarks ----------

type Target = { type: "post" | "thesis"; id: string };

/** Resolves a target and checks the viewer may see it. Returns its owner. */
async function resolveTarget(viewer: Viewer, target: Target) {
  const db = getDb();
  if (target.type === "post") {
    const [p] = await db.select().from(posts).where(and(eq(posts.id, target.id), isNull(posts.deletedAt)));
    if (!p || !canView(viewer, { ownerId: p.userId, audience: p.audience as Audience, guildId: p.guildId })) throw notFound("Post");
    return { ownerId: p.userId, href: `/feed/${p.id}`, label: "your post" };
  }
  const [t] = await db.select().from(theses).where(eq(theses.id, target.id));
  if (!t || !canView(viewer, { ownerId: t.userId, audience: t.visibility as Audience, guildId: t.guildId })) throw notFound("Thesis");
  return { ownerId: t.userId, href: `/theses/${t.id}`, label: `your thesis “${t.title}”` };
}

export async function addComment(viewer: Viewer, target: Target, body: string) {
  const clean = body.trim();
  if (!clean) throw new UserFacingError("Write a comment first.");
  if (clean.length > 2000) throw new UserFacingError("Comments are limited to 2,000 characters.");
  assertRateLimit(`comment:${viewer.userId}`, 60, 3600_000);
  const owner = await resolveTarget(viewer, target);
  const db = getDb();
  const [c] = await db.insert(comments).values({ userId: viewer.userId, targetType: target.type, targetId: target.id, body: clean }).returning();
  const me = await profileName(viewer.userId);
  await notify(db, { userId: owner.ownerId, actorId: viewer.userId, kind: "comment", title: `${me.displayName} commented on ${owner.label}`, body: clean.slice(0, 140), href: owner.href });
  return c;
}

export async function listComments(viewer: Viewer, target: Target) {
  await resolveTarget(viewer, target);
  const rows = await getDb()
    .select({ comment: comments, author: personColumns })
    .from(comments)
    .innerJoin(profiles, eq(profiles.userId, comments.userId))
    .where(and(eq(comments.targetType, target.type), eq(comments.targetId, target.id), isNull(comments.deletedAt)))
    .orderBy(comments.createdAt);
  return withAuthorPictures(viewer, rows.filter((r) => !viewer.blockedIds.has(r.comment.userId)));
}

export async function deleteComment(userId: string, commentId: string) {
  const res = await getDb()
    .update(comments)
    .set({ deletedAt: new Date() })
    .where(and(eq(comments.id, commentId), eq(comments.userId, userId)))
    .returning({ id: comments.id });
  if (!res.length) throw notFound("Comment");
}

export const REACTIONS = ["insightful", "agree", "challenge", "question"] as const;

export async function toggleReaction(viewer: Viewer, target: Target, kind: (typeof REACTIONS)[number]) {
  await resolveTarget(viewer, target);
  const db = getDb();
  const where = and(eq(reactions.userId, viewer.userId), eq(reactions.targetType, target.type), eq(reactions.targetId, target.id), eq(reactions.kind, kind));
  const existing = await db.select().from(reactions).where(where);
  if (existing.length) {
    await db.delete(reactions).where(where);
    return false;
  }
  await db.insert(reactions).values({ userId: viewer.userId, targetType: target.type, targetId: target.id, kind }).onConflictDoNothing();
  return true;
}

export async function toggleBookmark(viewer: Viewer, target: Target) {
  await resolveTarget(viewer, target);
  const db = getDb();
  const where = and(eq(bookmarks.userId, viewer.userId), eq(bookmarks.targetType, target.type), eq(bookmarks.targetId, target.id));
  const existing = await db.select().from(bookmarks).where(where);
  if (existing.length) {
    await db.delete(bookmarks).where(where);
    return false;
  }
  await db.insert(bookmarks).values({ userId: viewer.userId, targetType: target.type, targetId: target.id });
  return true;
}

export const REPORT_REASONS = ["spam", "harassment", "misleading financial claim", "impersonation", "other"] as const;

export async function reportContent(viewer: Viewer, target: Target, reason: (typeof REPORT_REASONS)[number], details = "") {
  if (!REPORT_REASONS.includes(reason)) throw new UserFacingError("Choose a reason.");
  assertRateLimit(`report:${viewer.userId}`, 20, 3600_000);
  await resolveTarget(viewer, target);
  await getDb().insert(reports).values({ reporterId: viewer.userId, targetType: target.type, targetId: target.id, reason, details: details.slice(0, 1000) });
}
