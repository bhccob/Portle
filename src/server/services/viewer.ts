import { and, eq, or } from "drizzle-orm";
import type { Viewer } from "@/domain/permissions";
import { getDb } from "../db";
import { friendships, guildMembers, userBlocks } from "../db/schema";

/** Loads the relationships every visibility decision for this user depends on. */
export async function buildViewer(userId: string): Promise<Viewer> {
  const db = getDb();
  const [friends, guilds, blocks] = await Promise.all([
    db
      .select()
      .from(friendships)
      .where(and(eq(friendships.status, "accepted"), or(eq(friendships.userLow, userId), eq(friendships.userHigh, userId)))),
    db.select({ guildId: guildMembers.guildId }).from(guildMembers).where(eq(guildMembers.userId, userId)),
    db
      .select()
      .from(userBlocks)
      .where(or(eq(userBlocks.blockerId, userId), eq(userBlocks.blockedId, userId))),
  ]);
  return {
    userId,
    friendIds: new Set(friends.map((f) => (f.userLow === userId ? f.userHigh : f.userLow))),
    guildIds: new Set(guilds.map((g) => g.guildId)),
    blockedIds: new Set(blocks.map((b) => (b.blockerId === userId ? b.blockedId : b.blockerId))),
  };
}
