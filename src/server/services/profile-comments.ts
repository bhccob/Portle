import { and, desc, eq, notInArray, or, sql } from "drizzle-orm";
import { canCommentOnProfile, canView, type Audience, type Viewer } from "@/domain/permissions";
import { COMMENT_MAX } from "@/domain/profile-layout";
import { getDb } from "../db";
import { privacySettings, profileComments, profiles } from "../db/schema";
import { notFound, UserFacingError } from "../errors";
import { assertRateLimit } from "../rate-limit";
import { notify } from "./notifications";

/** A profile someone may see, with who may write on it. Hidden and missing profiles look the same. */
async function visibleProfile(viewer: Viewer, profileUserId: string) {
  const [p] = await getDb()
    .select({
      userId: profiles.userId,
      handle: profiles.handle,
      onboardedAt: profiles.onboardedAt,
      commentAudience: profiles.commentAudience,
      visibility: privacySettings.profileVisibility,
    })
    .from(profiles)
    .leftJoin(privacySettings, eq(privacySettings.userId, profiles.userId))
    .where(eq(profiles.userId, profileUserId));
  if (!p?.onboardedAt || !canView(viewer, { ownerId: p.userId, audience: (p.visibility ?? "friends") as Audience })) throw notFound("Member");
  return p;
}

/** The newest comments on a profile, without anyone the viewer blocked or was blocked by. */
export async function listProfileComments(viewer: Viewer, profileUserId: string, limit = 10) {
  const db = getDb();
  const blocked = [...viewer.blockedIds];
  const where = and(eq(profileComments.profileUserId, profileUserId), blocked.length ? notInArray(profileComments.authorId, blocked) : undefined);
  const rows = await db
    .select({
      id: profileComments.id,
      body: profileComments.body,
      createdAt: profileComments.createdAt,
      author: { userId: profiles.userId, handle: profiles.handle, displayName: profiles.displayName, avatarHue: profiles.avatarHue },
    })
    .from(profileComments)
    .innerJoin(profiles, eq(profiles.userId, profileComments.authorId))
    .where(where)
    .orderBy(desc(profileComments.createdAt))
    .limit(limit);
  const [{ n }] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(profileComments)
    .where(where);
  return { comments: rows, total: n };
}

export async function addProfileComment(viewer: Viewer, profileUserId: string, body: string) {
  const clean = body.trim();
  if (!clean) throw new UserFacingError("Write a comment first.");
  if (clean.length > COMMENT_MAX) throw new UserFacingError(`Comments are limited to ${COMMENT_MAX.toLocaleString("en")} characters.`);
  const p = await visibleProfile(viewer, profileUserId);
  if (!canCommentOnProfile(viewer, p.userId, p.commentAudience as Audience)) throw new UserFacingError("You can't comment on this profile.");
  assertRateLimit(`profile-comment:${viewer.userId}`, 30, 3600_000);
  const db = getDb();
  const [row] = await db.insert(profileComments).values({ profileUserId: p.userId, authorId: viewer.userId, body: clean }).returning();
  const [me] = await db.select({ displayName: profiles.displayName }).from(profiles).where(eq(profiles.userId, viewer.userId));
  await notify(db, {
    userId: p.userId,
    actorId: viewer.userId,
    kind: "comment",
    title: `${me?.displayName ?? "A member"} commented on your profile`,
    body: clean.slice(0, 140),
    href: `/u/${p.handle}#comments`,
    entityType: "profile_comment",
    entityId: row.id,
  });
  return row;
}

/** The profile's owner may delete any comment on it; everyone else only their own. */
export async function deleteProfileComment(userId: string, commentId: string) {
  const [row] = await getDb()
    .delete(profileComments)
    .where(and(eq(profileComments.id, commentId), or(eq(profileComments.authorId, userId), eq(profileComments.profileUserId, userId))))
    .returning({ id: profileComments.id });
  if (!row) throw notFound("Comment");
}
