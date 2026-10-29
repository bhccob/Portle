import { and, desc, eq, isNull, sql } from "drizzle-orm";
import { getDb, type DbOrTx } from "../db";
import { notifications } from "../db/schema";

export type NotificationKind =
  | "friend_request"
  | "friend_accepted"
  | "comment"
  | "reaction"
  | "guild_request"
  | "guild_invite"
  | "guild_joined"
  | "relic"
  | "paper_fill"
  | "thesis_review"
  | "system";

export async function notify(
  db: DbOrTx,
  n: { userId: string; kind: NotificationKind; actorId?: string | null; title: string; body?: string; href?: string; entityType?: string; entityId?: string },
) {
  if (n.actorId && n.actorId === n.userId) return;
  await db.insert(notifications).values({
    userId: n.userId,
    kind: n.kind,
    actorId: n.actorId ?? null,
    title: n.title.slice(0, 160),
    body: (n.body ?? "").slice(0, 400),
    href: n.href,
    entityType: n.entityType,
    entityId: n.entityId,
  });
}

export async function listNotifications(userId: string, limit = 50) {
  return getDb().select().from(notifications).where(eq(notifications.userId, userId)).orderBy(desc(notifications.createdAt)).limit(limit);
}

export async function unreadCount(userId: string) {
  const [{ n }] = await getDb()
    .select({ n: sql<number>`count(*)::int` })
    .from(notifications)
    .where(and(eq(notifications.userId, userId), isNull(notifications.readAt)));
  return n;
}

export async function markAllRead(userId: string) {
  await getDb()
    .update(notifications)
    .set({ readAt: new Date() })
    .where(and(eq(notifications.userId, userId), isNull(notifications.readAt)));
}

export async function markRead(userId: string, id: string) {
  await getDb()
    .update(notifications)
    .set({ readAt: new Date() })
    .where(and(eq(notifications.userId, userId), eq(notifications.id, id)));
}
