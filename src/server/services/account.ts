import { eq, inArray, or } from "drizzle-orm";
import { getDb } from "../db";
import * as s from "../db/schema";
import { audit } from "../audit";

/**
 * Everything Portle stores about a user, in a portable JSON document (GDPR
 * Art. 20). Excludes password hashes, session tokens and encrypted provider secrets.
 */
export async function exportUserData(userId: string) {
  const db = getDb();
  const [u] = await db.select({ id: s.user.id, name: s.user.name, email: s.user.email, emailVerified: s.user.emailVerified, createdAt: s.user.createdAt }).from(s.user).where(eq(s.user.id, userId));
  const thesesRows = await db.select().from(s.theses).where(eq(s.theses.userId, userId));
  const thesisIds = thesesRows.map((t) => t.id);
  const collectionsRows = await db.select().from(s.collections).where(eq(s.collections.userId, userId));
  const paperAccountRows = await db.select().from(s.paperAccounts).where(eq(s.paperAccounts.userId, userId));
  const paperIds = paperAccountRows.map((p) => p.id);

  const data = {
    exportedAt: new Date().toISOString(),
    format: "portle-export/1",
    user: u,
    profile: (await db.select().from(s.profiles).where(eq(s.profiles.userId, userId)))[0] ?? null,
    privacy: (await db.select().from(s.privacySettings).where(eq(s.privacySettings.userId, userId)))[0] ?? null,
    consents: await db.select().from(s.consents).where(eq(s.consents.userId, userId)),
    portfolios: await db.select().from(s.portfolios).where(eq(s.portfolios.userId, userId)),
    accounts: await db.select().from(s.accounts).where(eq(s.accounts.userId, userId)),
    transactions: await db.select().from(s.transactions).where(eq(s.transactions.userId, userId)),
    imports: await db.select().from(s.importBatches).where(eq(s.importBatches.userId, userId)),
    watchlists: await db.select().from(s.watchlists).where(eq(s.watchlists.userId, userId)),
    theses: thesesRows,
    thesisRevisions: thesisIds.length ? await db.select().from(s.thesisRevisions).where(inArray(s.thesisRevisions.thesisId, thesisIds)) : [],
    thesisNotes: await db.select().from(s.thesisNotes).where(eq(s.thesisNotes.userId, userId)),
    journal: await db.select().from(s.journalEntries).where(eq(s.journalEntries.userId, userId)),
    costs: await db.select().from(s.costs).where(eq(s.costs.userId, userId)),
    experience: await db.select().from(s.profileExperience).where(eq(s.profileExperience.userId, userId)),
    collections: collectionsRows,
    collectionItems: collectionsRows.length ? await db.select().from(s.collectionItems).where(inArray(s.collectionItems.collectionId, collectionsRows.map((c) => c.id))) : [],
    paperAccounts: paperAccountRows,
    paperOrders: paperIds.length ? await db.select().from(s.paperOrders).where(inArray(s.paperOrders.paperAccountId, paperIds)) : [],
    paperFills: paperIds.length ? await db.select().from(s.paperFills).where(inArray(s.paperFills.paperAccountId, paperIds)) : [],
    paperLedger: paperIds.length ? await db.select().from(s.paperLedger).where(inArray(s.paperLedger.paperAccountId, paperIds)) : [],
    posts: await db.select().from(s.posts).where(eq(s.posts.userId, userId)),
    comments: await db.select().from(s.comments).where(eq(s.comments.userId, userId)),
    profileComments: await db.select().from(s.profileComments).where(eq(s.profileComments.authorId, userId)),
    reactions: await db.select().from(s.reactions).where(eq(s.reactions.userId, userId)),
    bookmarks: await db.select().from(s.bookmarks).where(eq(s.bookmarks.userId, userId)),
    friendships: await db.select().from(s.friendships).where(or(eq(s.friendships.userLow, userId), eq(s.friendships.userHigh, userId))),
    guildMemberships: await db.select().from(s.guildMembers).where(eq(s.guildMembers.userId, userId)),
    relics: await db.select().from(s.userRelics).where(eq(s.userRelics.userId, userId)),
    notifications: await db.select().from(s.notifications).where(eq(s.notifications.userId, userId)),
    brokerConnections: (await db.select().from(s.brokerConnections).where(eq(s.brokerConnections.userId, userId))).map((c) => ({ ...c, encryptedSecret: undefined })),
    brokerIdentities: (await db.select().from(s.brokerUsers).where(eq(s.brokerUsers.userId, userId))).map((b) => ({ ...b, encryptedSecret: undefined })),
  };
  await audit(db, { userId, action: "account.exported" });
  return data;
}
