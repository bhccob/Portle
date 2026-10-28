import { and, asc, desc, eq, gte, ilike, inArray, or, sql } from "drizzle-orm";
import { z } from "zod";
import { canRemoveMember, guildCan, type GuildRole, type Viewer } from "@/domain/permissions";
import { d, ZERO, type Dec } from "@/domain/money";
import { getDb, type DbOrTx } from "../db";
import { guildInvites, guildMembers, guildModerationActions, guilds, posts, profiles, theses } from "../db/schema";
import { forbidden, notFound, UserFacingError } from "../errors";
import { assertRateLimit } from "../rate-limit";
import { notify } from "./notifications";
import { getValuation } from "./portfolio";

export const guildInput = z.object({
  name: z.string().trim().min(3, "Name the Guild (3+ characters).").max(48),
  description: z.string().trim().max(500).default(""),
  topic: z.string().trim().max(48).default(""),
  visibility: z.enum(["discoverable", "private"]).default("discoverable"),
  joinPolicy: z.enum(["open", "request", "invite"]).default("request"),
});

const slugify = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 40) || "guild";

export async function roleIn(userId: string, guildId: string): Promise<GuildRole | null> {
  const [m] = await getDb()
    .select({ role: guildMembers.role })
    .from(guildMembers)
    .where(and(eq(guildMembers.guildId, guildId), eq(guildMembers.userId, userId)));
  return (m?.role as GuildRole) ?? null;
}

export async function createGuild(userId: string, raw: z.input<typeof guildInput>) {
  const v = guildInput.parse(raw);
  assertRateLimit(`guild-create:${userId}`, 5, 86400_000);
  const db = getDb();
  const base = slugify(v.name);
  let slug = base;
  for (let i = 2; (await db.select({ id: guilds.id }).from(guilds).where(eq(guilds.slug, slug))).length; i++) slug = `${base}-${i}`;
  return db.transaction(async (tx) => {
    const [g] = await tx.insert(guilds).values({ ...v, slug, ownerId: userId }).returning();
    await tx.insert(guildMembers).values({ guildId: g.id, userId, role: "owner" });
    return g;
  });
}

const memberCount = sql<number>`(select count(*)::int from ${guildMembers} where ${guildMembers.guildId} = ${guilds.id})`;

export async function discoverGuilds(viewer: Viewer, q = "") {
  const term = q.trim().slice(0, 40);
  const mine = [...viewer.guildIds];
  const conds = [or(eq(guilds.visibility, "discoverable"), mine.length ? inArray(guilds.id, mine) : sql`false`)!];
  if (term) conds.push(or(ilike(guilds.name, `%${term}%`), ilike(guilds.topic, `%${term}%`))!);
  const rows = await getDb()
    .select({ guild: guilds, members: memberCount })
    .from(guilds)
    .where(and(...conds))
    .orderBy(desc(memberCount), asc(guilds.name))
    .limit(60);
  return rows.map((r) => ({ ...r, isMember: viewer.guildIds.has(r.guild.id) }));
}

/** A private Guild is invisible to non-members, except to someone holding a pending invite. */
export async function getGuild(viewer: Viewer, slug: string) {
  const db = getDb();
  const [row] = await db.select({ guild: guilds, members: memberCount }).from(guilds).where(eq(guilds.slug, slug));
  if (!row) throw notFound("Guild");
  const role = await roleIn(viewer.userId, row.guild.id);
  const [pending] = await db
    .select()
    .from(guildInvites)
    .where(and(eq(guildInvites.guildId, row.guild.id), eq(guildInvites.userId, viewer.userId), eq(guildInvites.status, "pending")));
  if (row.guild.visibility === "private" && !role && !(pending?.kind === "invite")) throw notFound("Guild");
  return { ...row, role, pending: pending ?? null };
}

export async function joinGuild(userId: string, guildId: string) {
  const db = getDb();
  const [g] = await db.select().from(guilds).where(eq(guilds.id, guildId));
  if (!g) throw notFound("Guild");
  if (await roleIn(userId, guildId)) return { status: "member" as const };
  const [invite] = await db
    .select()
    .from(guildInvites)
    .where(and(eq(guildInvites.guildId, guildId), eq(guildInvites.userId, userId), eq(guildInvites.kind, "invite"), eq(guildInvites.status, "pending")));
  if (g.visibility === "private" && !invite) throw notFound("Guild");

  if (g.joinPolicy === "open" || invite) {
    await db.transaction(async (tx) => {
      await tx.insert(guildMembers).values({ guildId, userId, role: "member" }).onConflictDoNothing();
      if (invite) await tx.update(guildInvites).set({ status: "accepted", resolvedAt: new Date() }).where(eq(guildInvites.id, invite.id));
    });
    return { status: "member" as const };
  }
  if (g.joinPolicy === "invite") throw new UserFacingError("This Guild is invite-only.");

  assertRateLimit(`guild-request:${userId}`, 20, 86400_000);
  await db
    .insert(guildInvites)
    .values({ guildId, userId, kind: "request" })
    .onConflictDoUpdate({ target: [guildInvites.guildId, guildInvites.userId, guildInvites.kind], set: { status: "pending", createdAt: new Date(), resolvedAt: null } });
  const [p] = await db.select().from(profiles).where(eq(profiles.userId, userId));
  const admins = await db
    .select()
    .from(guildMembers)
    .where(and(eq(guildMembers.guildId, guildId), inArray(guildMembers.role, ["owner", "admin"])));
  for (const a of admins) {
    await notify(db, { userId: a.userId, actorId: userId, kind: "guild_request", title: `${p?.displayName ?? "A member"} asked to join ${g.name}`, href: `/guilds/${g.slug}/members` });
  }
  return { status: "requested" as const };
}

async function requireRole(actorId: string, guildId: string, action: Parameters<typeof guildCan>[1]) {
  const role = await roleIn(actorId, guildId);
  if (!guildCan(role, action)) throw forbidden();
  return role!;
}

export async function respondToRequest(actorId: string, inviteId: string, accept: boolean) {
  const db = getDb();
  const [req] = await db.select().from(guildInvites).where(and(eq(guildInvites.id, inviteId), eq(guildInvites.kind, "request"), eq(guildInvites.status, "pending")));
  if (!req) throw notFound("Request");
  await requireRole(actorId, req.guildId, "approve_request");
  await db.transaction(async (tx) => {
    await tx.update(guildInvites).set({ status: accept ? "accepted" : "declined", resolvedAt: new Date() }).where(eq(guildInvites.id, inviteId));
    if (accept) await tx.insert(guildMembers).values({ guildId: req.guildId, userId: req.userId }).onConflictDoNothing();
  });
  if (accept) {
    const [g] = await db.select().from(guilds).where(eq(guilds.id, req.guildId));
    await notify(db, { userId: req.userId, actorId, kind: "guild_joined", title: `You're now a member of ${g.name}`, href: `/guilds/${g.slug}` });
  }
}

export async function inviteToGuild(actorId: string, guildId: string, handle: string) {
  await requireRole(actorId, guildId, "invite");
  const db = getDb();
  const [target] = await db.select().from(profiles).where(sql`lower(${profiles.handle}) = ${handle.trim().toLowerCase()}`);
  if (!target) throw notFound("Member");
  if (await roleIn(target.userId, guildId)) throw new UserFacingError("They're already a member.");
  await db
    .insert(guildInvites)
    .values({ guildId, userId: target.userId, invitedBy: actorId, kind: "invite" })
    .onConflictDoUpdate({ target: [guildInvites.guildId, guildInvites.userId, guildInvites.kind], set: { status: "pending", invitedBy: actorId, createdAt: new Date(), resolvedAt: null } });
  const [g] = await db.select().from(guilds).where(eq(guilds.id, guildId));
  await notify(db, { userId: target.userId, actorId, kind: "guild_invite", title: `You're invited to join ${g.name}`, href: `/guilds/${g.slug}` });
}

export async function declineInvite(userId: string, guildId: string) {
  await getDb()
    .update(guildInvites)
    .set({ status: "declined", resolvedAt: new Date() })
    .where(and(eq(guildInvites.guildId, guildId), eq(guildInvites.userId, userId), eq(guildInvites.kind, "invite"), eq(guildInvites.status, "pending")));
}

export async function leaveGuild(userId: string, guildId: string) {
  const role = await roleIn(userId, guildId);
  if (!role) throw notFound("Membership");
  if (role === "owner") throw new UserFacingError("Transfer ownership to another member before leaving.");
  await getDb().delete(guildMembers).where(and(eq(guildMembers.guildId, guildId), eq(guildMembers.userId, userId)));
}

export async function removeMember(actorId: string, guildId: string, targetId: string, reason = "") {
  const actor = await roleIn(actorId, guildId);
  const target = await roleIn(targetId, guildId);
  if (!target) throw notFound("Member");
  if (!canRemoveMember(actor, target)) throw forbidden();
  const db = getDb();
  await db.delete(guildMembers).where(and(eq(guildMembers.guildId, guildId), eq(guildMembers.userId, targetId)));
  await db.insert(guildModerationActions).values({ guildId, actorId, targetUserId: targetId, action: "remove_member", reason: reason.slice(0, 280) });
}

export async function changeRole(actorId: string, guildId: string, targetId: string, role: "admin" | "member") {
  await requireRole(actorId, guildId, "change_role");
  const target = await roleIn(targetId, guildId);
  if (!target || target === "owner") throw notFound("Member");
  const db = getDb();
  await db.update(guildMembers).set({ role }).where(and(eq(guildMembers.guildId, guildId), eq(guildMembers.userId, targetId)));
  await db.insert(guildModerationActions).values({ guildId, actorId, targetUserId: targetId, action: `role_${role}` });
}

export async function transferOwnership(actorId: string, guildId: string, targetId: string) {
  await requireRole(actorId, guildId, "change_role");
  if (!(await roleIn(targetId, guildId))) throw notFound("Member");
  await getDb().transaction(async (tx) => {
    await tx.update(guildMembers).set({ role: "admin" }).where(and(eq(guildMembers.guildId, guildId), eq(guildMembers.userId, actorId)));
    await tx.update(guildMembers).set({ role: "owner" }).where(and(eq(guildMembers.guildId, guildId), eq(guildMembers.userId, targetId)));
    await tx.update(guilds).set({ ownerId: targetId }).where(eq(guilds.id, guildId));
    await tx.insert(guildModerationActions).values({ guildId, actorId, targetUserId: targetId, action: "transfer_ownership" });
  });
}

export async function updateGuild(actorId: string, guildId: string, raw: z.input<typeof guildInput>) {
  await requireRole(actorId, guildId, "edit_guild");
  const v = guildInput.parse(raw);
  await getDb().update(guilds).set(v).where(eq(guilds.id, guildId));
}

export async function deleteGuild(actorId: string, guildId: string) {
  await requireRole(actorId, guildId, "delete_guild");
  await getDb().delete(guilds).where(eq(guilds.id, guildId));
}

export async function setShareAllocation(userId: string, guildId: string, share: boolean) {
  const res = await getDb()
    .update(guildMembers)
    .set({ shareAllocation: share })
    .where(and(eq(guildMembers.guildId, guildId), eq(guildMembers.userId, userId)))
    .returning({ id: guildMembers.userId });
  if (!res.length) throw notFound("Membership");
}

export async function listMembers(viewerId: string, guildId: string) {
  if (!(await roleIn(viewerId, guildId))) throw notFound("Guild");
  const db = getDb();
  const since = new Date(Date.now() - 30 * 86400_000);
  const rows = await db
    .select({
      userId: guildMembers.userId,
      role: guildMembers.role,
      joinedAt: guildMembers.joinedAt,
      shareAllocation: guildMembers.shareAllocation,
      handle: profiles.handle,
      displayName: profiles.displayName,
      avatarHue: profiles.avatarHue,
      posts30d: sql<number>`(select count(*)::int from ${posts} where ${posts.userId} = ${guildMembers.userId} and ${posts.guildId} = ${guildId} and ${posts.deletedAt} is null and ${posts.createdAt} >= ${since})`,
      theses: sql<number>`(select count(*)::int from ${theses} where ${theses.userId} = ${guildMembers.userId} and ${theses.guildId} = ${guildId})`,
    })
    .from(guildMembers)
    .innerJoin(profiles, eq(profiles.userId, guildMembers.userId))
    .where(eq(guildMembers.guildId, guildId))
    .orderBy(sql`case ${guildMembers.role} when 'owner' then 0 when 'admin' then 1 else 2 end`, asc(guildMembers.joinedAt));
  return rows;
}

export async function listPendingRequests(actorId: string, guildId: string) {
  const role = await roleIn(actorId, guildId);
  if (!guildCan(role, "approve_request")) return [];
  return getDb()
    .select({ invite: guildInvites, handle: profiles.handle, displayName: profiles.displayName, avatarHue: profiles.avatarHue })
    .from(guildInvites)
    .innerJoin(profiles, eq(profiles.userId, guildInvites.userId))
    .where(and(eq(guildInvites.guildId, guildId), eq(guildInvites.kind, "request"), eq(guildInvites.status, "pending")))
    .orderBy(asc(guildInvites.createdAt));
}

export async function moderationLog(actorId: string, guildId: string) {
  const role = await roleIn(actorId, guildId);
  if (!guildCan(role, "remove_member")) throw forbidden();
  return getDb().select().from(guildModerationActions).where(eq(guildModerationActions.guildId, guildId)).orderBy(desc(guildModerationActions.createdAt)).limit(100);
}

/** Minimum consenting members before any aggregate is shown, so no one is identifiable. */
export const ANALYTICS_MIN_MEMBERS = 3;

/**
 * Averages the allocation percentages of members who explicitly opted in.
 * Values, holdings and individual contributions are never exposed.
 */
export async function guildAnalytics(viewerId: string, guildId: string) {
  if (!(await roleIn(viewerId, guildId))) throw notFound("Guild");
  const consenting = await getDb()
    .select({ userId: guildMembers.userId })
    .from(guildMembers)
    .where(and(eq(guildMembers.guildId, guildId), eq(guildMembers.shareAllocation, true)));
  if (consenting.length < ANALYTICS_MIN_MEMBERS) return { available: false as const, consenting: consenting.length, required: ANALYTICS_MIN_MEMBERS };

  const totals = { assetClass: new Map<string, Dec>(), region: new Map<string, Dec>() };
  let counted = 0;
  for (const m of consenting) {
    const { valuation } = await getValuation(m.userId);
    if (valuation.totals.marketValue.isZero()) continue;
    counted++;
    for (const dim of ["assetClass", "region"] as const) {
      for (const s of valuation.allocation[dim]) totals[dim].set(s.label, (totals[dim].get(s.label) ?? ZERO).plus(s.percent));
    }
  }
  if (counted < ANALYTICS_MIN_MEMBERS) return { available: false as const, consenting: counted, required: ANALYTICS_MIN_MEMBERS };
  const avg = (m: Map<string, Dec>) =>
    [...m.entries()].map(([label, v]) => ({ label, percent: v.div(counted).toDecimalPlaces(3).toFixed() })).sort((a, b) => d(b.percent).cmp(d(a.percent)));
  return { available: true as const, members: counted, assetClass: avg(totals.assetClass), region: avg(totals.region) };
}

/** On account deletion: give each owned Guild to its senior admin (or oldest member), or dissolve it. */
export async function handOverOwnedGuilds(db: DbOrTx, userId: string) {
  const owned = await db.select().from(guilds).where(eq(guilds.ownerId, userId));
  for (const g of owned) {
    const [heir] = await db
      .select()
      .from(guildMembers)
      .where(and(eq(guildMembers.guildId, g.id), sql`${guildMembers.userId} <> ${userId}`))
      .orderBy(sql`case ${guildMembers.role} when 'admin' then 0 else 1 end`, asc(guildMembers.joinedAt))
      .limit(1);
    if (heir) {
      await db.update(guilds).set({ ownerId: heir.userId }).where(eq(guilds.id, g.id));
      await db.update(guildMembers).set({ role: "owner" }).where(and(eq(guildMembers.guildId, g.id), eq(guildMembers.userId, heir.userId)));
    } else {
      await db.delete(guilds).where(eq(guilds.id, g.id));
    }
  }
}

export async function myGuilds(userId: string) {
  return getDb()
    .select({ guild: guilds, role: guildMembers.role })
    .from(guildMembers)
    .innerJoin(guilds, eq(guilds.id, guildMembers.guildId))
    .where(eq(guildMembers.userId, userId))
    .orderBy(asc(guilds.name));
}

export async function recentGuildActivity(userId: string, since: Date) {
  return getDb()
    .select({ n: sql<number>`count(*)::int`, guildId: posts.guildId })
    .from(posts)
    .innerJoin(guildMembers, and(eq(guildMembers.guildId, posts.guildId), eq(guildMembers.userId, userId)))
    .where(and(gte(posts.createdAt, since), sql`${posts.userId} <> ${userId}`))
    .groupBy(posts.guildId);
}
