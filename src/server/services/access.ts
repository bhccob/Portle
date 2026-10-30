import { and, asc, desc, eq, inArray, ne, sql } from "drizzle-orm";
import { cache } from "react";
import { audit } from "../audit";
import { getDb } from "../db";
import { accessInvites, brokerConnections, fullAccess, profiles, user } from "../db/schema";
import { forbidden, notFound, UserFacingError } from "../errors";
import { assertRateLimit } from "../rate-limit";
import { brokerSpotsLeft, brokerStatus, disconnectBroker, listBrokerConnections } from "./brokers";
import { notify } from "./notifications";

export type AccessStatus = "none" | "requested" | "granted" | "declined";
export type Access = { full: boolean; owner: boolean; status: AccessStatus };

const EMAIL = /^[^\s@<>"]+@[^\s@<>"]+\.[^\s@<>"]+$/;

/** The people who run this Portle, from OWNER_EMAILS (comma-separated). They always have full access and decide who else does. */
export function ownerEmails() {
  return new Set(
    (process.env.OWNER_EMAILS ?? "")
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter((e) => EMAIL.test(e)),
  );
}

async function emailOf(userId: string) {
  const [u] = await getDb().select({ email: user.email }).from(user).where(eq(user.id, userId));
  if (!u) throw notFound("Member");
  return u.email.toLowerCase();
}

/**
 * Whether a member has full access: real prices and broker linking. Read once per request.
 * An email the owner let in ahead of time turns into full access here, the first time it's checked.
 */
export const getAccess = cache(async (userId: string): Promise<Access> => {
  const email = await emailOf(userId);
  if (ownerEmails().has(email)) return { full: true, owner: true, status: "granted" };
  const db = getDb();
  const [row] = await db.select().from(fullAccess).where(eq(fullAccess.userId, userId));
  if (row?.status === "granted") return { full: true, owner: false, status: "granted" };
  const [invite] = await db.select().from(accessInvites).where(eq(accessInvites.email, email));
  if (invite) {
    await grant(userId, row?.note ?? "");
    await db.delete(accessInvites).where(eq(accessInvites.email, email));
    return { full: true, owner: false, status: "granted" };
  }
  return { full: false, owner: false, status: row?.status ?? "none" };
});

export async function hasFullAccess(userId: string) {
  return (await getAccess(userId)).full;
}

/** Throws when the member lacks full access, with words they can act on. */
export async function assertFullAccess(userId: string, what: string) {
  if (!(await hasFullAccess(userId))) throw new UserFacingError(`${what} is part of full access. Ask for it from Markets or Portfolio.`, "forbidden");
}

async function assertOwner(userId: string) {
  if (!ownerEmails().has(await emailOf(userId))) throw forbidden("Only the owner of this Portle can do that.");
}

async function grant(userId: string, note: string) {
  const now = new Date();
  await getDb()
    .insert(fullAccess)
    .values({ userId, status: "granted", note, decidedAt: now })
    .onConflictDoUpdate({ target: fullAccess.userId, set: { status: "granted", decidedAt: now } });
}

/** Members who run this Portle, for addressing requests ("Ask Bob") and notifying them. */
export async function listOwners() {
  const emails = [...ownerEmails()];
  if (!emails.length) return [];
  return getDb()
    .select({ id: user.id, name: profiles.displayName })
    .from(user)
    .innerJoin(profiles, eq(profiles.userId, user.id))
    .where(inArray(sql`lower(${user.email})`, emails));
}

/** The owner's first name for "Ask Bob for full access", or a plain stand-in when none is set up. */
export async function ownerName() {
  const [first] = await listOwners();
  return first?.name.split(/\s+/)[0] || "the owner";
}

/** What the ask-for-access pieces on a page need about the viewer. */
export async function accessInfo(userId: string) {
  const [access, name, spotsLeft] = await Promise.all([getAccess(userId), ownerName(), brokerStatus().configured ? brokerSpotsLeft() : Promise.resolve(null)]);
  return { full: access.full, owner: access.owner, status: access.status, ownerName: name, spotsLeft };
}

export async function requestAccess(userId: string, note: string) {
  assertRateLimit(`access-request:${userId}`, 5, 24 * 3600_000);
  const current = await getAccess(userId);
  if (current.full) return current;
  const clean = note.trim().slice(0, 280);
  const db = getDb();
  await db
    .insert(fullAccess)
    .values({ userId, status: "requested", note: clean, requestedAt: new Date() })
    .onConflictDoUpdate({ target: fullAccess.userId, set: { status: "requested", note: clean, requestedAt: new Date(), decidedAt: null } });
  const [me] = await db.select({ name: profiles.displayName }).from(profiles).where(eq(profiles.userId, userId));
  for (const owner of await listOwners()) {
    await notify(db, {
      userId: owner.id,
      kind: "access",
      actorId: userId,
      title: `${me?.name ?? "A member"} asked for full access`,
      body: clean,
      href: "/settings/access",
    });
  }
  return { full: false, owner: false, status: "requested" } satisfies Access;
}

/** The owner's answer to a request. Saying no can be undone later by letting them in. */
export async function decideAccess(ownerId: string, memberId: string, allow: boolean) {
  await assertOwner(ownerId);
  const db = getDb();
  const [row] = await db.select().from(fullAccess).where(eq(fullAccess.userId, memberId));
  if (!row) throw notFound("Request");
  if (allow) await grant(memberId, row.note);
  else await db.update(fullAccess).set({ status: "declined", decidedAt: new Date() }).where(eq(fullAccess.userId, memberId));
  if (allow)
    await notify(db, {
      userId: memberId,
      kind: "access",
      actorId: ownerId,
      title: "You have full access",
      body: "Real prices and broker linking are on for you.",
      href: "/portfolio",
    });
  await audit(db, { userId: ownerId, action: allow ? "access.granted" : "access.declined", entityType: "user", entityId: memberId });
}

/**
 * Takes full access away. Their broker links are disconnected so they stop costing a spot;
 * the accounts and history already copied stay in Portle as records.
 */
export async function removeAccess(ownerId: string, memberId: string) {
  await assertOwner(ownerId);
  if (ownerEmails().has(await emailOf(memberId))) throw new UserFacingError("Owners always have full access. Remove them from OWNER_EMAILS instead.");
  for (const c of await listBrokerConnections(memberId)) await disconnectBroker(memberId, c.id, false);
  const db = getDb();
  await db.delete(fullAccess).where(eq(fullAccess.userId, memberId));
  await audit(db, { userId: ownerId, action: "access.removed", entityType: "user", entityId: memberId });
}

/** Lets someone in by email: straight away if they're a member, otherwise the first time they sign in. */
export async function inviteByEmail(ownerId: string, rawEmail: string) {
  await assertOwner(ownerId);
  const email = rawEmail.trim().toLowerCase();
  if (!EMAIL.test(email) || email.length > 254) throw new UserFacingError("That doesn't look like an email address.");
  const db = getDb();
  const [member] = await db
    .select({ id: user.id })
    .from(user)
    .where(eq(sql`lower(${user.email})`, email));
  if (member) {
    await grant(member.id, "");
    await notify(db, {
      userId: member.id,
      kind: "access",
      actorId: ownerId,
      title: "You have full access",
      body: "Real prices and broker linking are on for you.",
      href: "/portfolio",
    });
    return { joined: true };
  }
  await db.insert(accessInvites).values({ email }).onConflictDoNothing();
  return { joined: false };
}

export async function cancelInvite(ownerId: string, email: string) {
  await assertOwner(ownerId);
  await getDb().delete(accessInvites).where(eq(accessInvites.email, email.trim().toLowerCase()));
}

/** Everything the owner's Full access page shows. */
export async function accessOverview(ownerId: string) {
  await assertOwner(ownerId);
  const db = getDb();
  const owners = ownerEmails();
  const rows = await db
    .select({
      userId: fullAccess.userId,
      status: fullAccess.status,
      note: fullAccess.note,
      requestedAt: fullAccess.requestedAt,
      decidedAt: fullAccess.decidedAt,
      name: profiles.displayName,
      handle: profiles.handle,
      avatarHue: profiles.avatarHue,
      email: user.email,
    })
    .from(fullAccess)
    .innerJoin(user, eq(user.id, fullAccess.userId))
    .innerJoin(profiles, eq(profiles.userId, fullAccess.userId))
    .where(ne(fullAccess.status, "declined"))
    .orderBy(desc(fullAccess.requestedAt));
  const ownerRows = owners.size
    ? await db
        .select({ userId: user.id, name: profiles.displayName, handle: profiles.handle, avatarHue: profiles.avatarHue, email: user.email })
        .from(user)
        .innerJoin(profiles, eq(profiles.userId, user.id))
        .where(inArray(sql`lower(${user.email})`, [...owners]))
    : [];
  const linked = await db
    .select({ userId: brokerConnections.userId, n: sql<number>`count(*)::int` })
    .from(brokerConnections)
    .where(and(eq(brokerConnections.provider, brokerStatus().id), ne(brokerConnections.status, "disconnected")))
    .groupBy(brokerConnections.userId);
  const brokers = (id: string) => linked.find((l) => l.userId === id)?.n ?? 0;
  const granted = rows.filter((r) => r.status === "granted" && !owners.has(r.email.toLowerCase()));
  return {
    requests: rows.filter((r) => r.status === "requested").map((r) => ({ ...r, email: undefined })),
    members: [
      ...ownerRows.map((o) => ({ ...o, email: undefined, owner: true, since: null as Date | null, brokers: brokers(o.userId) })),
      ...granted.map((g) => ({ ...g, email: undefined, owner: false, since: g.decidedAt, brokers: brokers(g.userId) })),
    ],
    invites: await db.select().from(accessInvites).orderBy(asc(accessInvites.createdAt)),
    brokerSpotsUsed: linked.reduce((s, l) => s + l.n, 0),
    brokerSpotLimit: brokerStatus().connectionLimit ?? null,
  };
}
