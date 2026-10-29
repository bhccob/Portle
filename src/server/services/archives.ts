import { and, asc, desc, eq, inArray, isNull, sql } from "drizzle-orm";
import { z } from "zod";
import { canView, type Audience, type Viewer } from "@/domain/permissions";
import { getDb } from "../db";
import { bookmarks, collectionItems, collections, posts, profiles, theses } from "../db/schema";
import { notFound, UserFacingError } from "../errors";

export const collectionInput = z.object({
  title: z.string().trim().min(1, "Name the collection.").max(80),
  description: z.string().trim().max(400).default(""),
  visibility: z.enum(["private", "friends", "public"]).default("private"),
});

export async function listCollections(userId: string) {
  return getDb()
    .select({
      collection: collections,
      items: sql<number>`(select count(*)::int from ${collectionItems} where ${collectionItems.collectionId} = ${collections.id})`,
    })
    .from(collections)
    .where(eq(collections.userId, userId))
    .orderBy(desc(collections.updatedAt));
}

export async function createCollection(userId: string, raw: z.input<typeof collectionInput>) {
  const v = collectionInput.parse(raw);
  const [row] = await getDb()
    .insert(collections)
    .values({ ...v, userId })
    .returning();
  return row;
}

export async function updateCollection(userId: string, id: string, raw: z.input<typeof collectionInput>) {
  const v = collectionInput.parse(raw);
  const res = await getDb()
    .update(collections)
    .set({ ...v, updatedAt: new Date() })
    .where(and(eq(collections.id, id), eq(collections.userId, userId)))
    .returning();
  if (!res.length) throw notFound("Collection");
}

export async function deleteCollection(userId: string, id: string) {
  const res = await getDb()
    .delete(collections)
    .where(and(eq(collections.id, id), eq(collections.userId, userId)))
    .returning({ id: collections.id });
  if (!res.length) throw notFound("Collection");
}

export const itemInput = z
  .object({
    itemType: z.enum(["thesis", "post", "instrument", "link", "journal", "guide"]),
    itemId: z.string().max(80).optional().nullable(),
    url: z
      .url()
      .refine((u) => u.startsWith("https://"), "Only https links.")
      .optional()
      .nullable(),
    title: z.string().trim().min(1, "Add a title.").max(160),
    note: z.string().trim().max(1000).default(""),
    sourceName: z.string().trim().max(80).default(""),
  })
  .superRefine((v, ctx) => {
    if (v.itemType === "link" && !v.url) ctx.addIssue({ code: "custom", path: ["url"], message: "Add the link." });
    if (v.itemType !== "link" && !v.itemId) ctx.addIssue({ code: "custom", path: ["itemId"], message: "Missing item." });
  });

export async function addItem(userId: string, collectionId: string, raw: z.input<typeof itemInput>) {
  const v = itemInput.parse(raw);
  const db = getDb();
  const [c] = await db
    .select()
    .from(collections)
    .where(and(eq(collections.id, collectionId), eq(collections.userId, userId)));
  if (!c) throw notFound("Collection");
  const n = (
    await db
      .select({ n: sql<number>`count(*)::int` })
      .from(collectionItems)
      .where(eq(collectionItems.collectionId, collectionId))
  )[0].n;
  if (n >= 500) throw new UserFacingError("A collection holds up to 500 items.");
  await db.insert(collectionItems).values({ ...v, collectionId });
  await db.update(collections).set({ updatedAt: new Date() }).where(eq(collections.id, collectionId));
}

export async function removeItem(userId: string, itemId: string) {
  const db = getDb();
  const [row] = await db
    .select({ id: collectionItems.id })
    .from(collectionItems)
    .innerJoin(collections, eq(collections.id, collectionItems.collectionId))
    .where(and(eq(collectionItems.id, itemId), eq(collections.userId, userId)));
  if (!row) throw notFound("Item");
  await db.delete(collectionItems).where(eq(collectionItems.id, itemId));
}

export async function getCollection(viewer: Viewer, id: string) {
  const db = getDb();
  const [row] = await db
    .select({ collection: collections, owner: { handle: profiles.handle, displayName: profiles.displayName } })
    .from(collections)
    .innerJoin(profiles, eq(profiles.userId, collections.userId))
    .where(eq(collections.id, id));
  if (!row || !canView(viewer, { ownerId: row.collection.userId, audience: row.collection.visibility as Audience })) throw notFound("Collection");
  const items = await db.select().from(collectionItems).where(eq(collectionItems.collectionId, id)).orderBy(asc(collectionItems.addedAt));
  return { ...row, items, isOwner: row.collection.userId === viewer.userId };
}

/** Bookmarked posts and theses, re-checked against current visibility (it may have changed since saving). */
export async function listBookmarks(viewer: Viewer) {
  const db = getDb();
  const marks = await db.select().from(bookmarks).where(eq(bookmarks.userId, viewer.userId)).orderBy(desc(bookmarks.createdAt));
  const postIds = marks.filter((m) => m.targetType === "post").map((m) => m.targetId);
  const thesisIds = marks.filter((m) => m.targetType === "thesis").map((m) => m.targetId);
  const [postRows, thesisRows] = await Promise.all([
    postIds.length
      ? db
          .select({ post: posts, author: { handle: profiles.handle, displayName: profiles.displayName } })
          .from(posts)
          .innerJoin(profiles, eq(profiles.userId, posts.userId))
          .where(and(inArray(posts.id, postIds), isNull(posts.deletedAt)))
      : Promise.resolve([]),
    thesisIds.length
      ? db
          .select({ thesis: theses, author: { handle: profiles.handle, displayName: profiles.displayName } })
          .from(theses)
          .innerJoin(profiles, eq(profiles.userId, theses.userId))
          .where(inArray(theses.id, thesisIds))
      : Promise.resolve([]),
  ]);
  return {
    posts: postRows.filter((r) => canView(viewer, { ownerId: r.post.userId, audience: r.post.audience as Audience, guildId: r.post.guildId })),
    theses: thesisRows
      .filter((r) => canView(viewer, { ownerId: r.thesis.userId, audience: r.thesis.visibility as Audience, guildId: r.thesis.guildId }))
      // A revisit schedule is private to the thesis owner.
      .map((r) => (r.thesis.userId === viewer.userId ? r : { ...r, thesis: { ...r.thesis, reviewOn: null, reviewRemindedOn: null } })),
  };
}
