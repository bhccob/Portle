import { and, desc, eq, gte, ilike, lte, or, sql } from "drizzle-orm";
import { z } from "zod";
import { canView, type Viewer } from "@/domain/permissions";
import { getDb } from "../db";
import { instruments, journalEntries, paperOrders, profiles, theses, transactions } from "../db/schema";
import { notFound, UserFacingError } from "../errors";
import { personColumns, withAuthorPictures } from "./pictures";

export const REFLECTION_PROMPTS = [
  "What did I believe at the time?",
  "What evidence supported the decision?",
  "What could prove me wrong?",
  "What did I learn afterward?",
  "What would I do differently with the same information?",
  "What am I paying attention to this week, and why?",
] as const;

export const journalInput = z.object({
  entryDate: z.iso.date("Choose a date."),
  // Optional: an entry without one is titled by its first line (see titleFromBody).
  title: z.string().trim().max(120).default(""),
  body: z.string().max(20_000).default(""),
  prompt: z.string().max(200).optional().nullable(),
  visibility: z.enum(["private", "friends"]).default("private"),
  thesisId: z.uuid().optional().nullable(),
  instrumentId: z.uuid().optional().nullable(),
  paperOrderId: z.uuid().optional().nullable(),
  transactionId: z.uuid().optional().nullable(),
  tags: z.array(z.string().trim().toLowerCase().regex(/^[a-z0-9-]{1,24}$/)).max(8).default([]),
});

/** The first line of an entry as plain text, shortened at a word, for entries saved without a title. */
export function titleFromBody(body: string) {
  const line = (body.split("\n").find((l) => l.trim()) ?? "")
    .replace(/^\s*(#{1,6}\s+|>\s*|[-*+]\s+|\d+[.)]\s+)/, "")
    .replace(/[*_`~]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  if (line.length <= 80) return line;
  const cut = line.slice(0, 79);
  return `${cut.slice(0, cut.lastIndexOf(" ") > 40 ? cut.lastIndexOf(" ") : 79).trimEnd()}…`;
}

function withTitle(v: z.output<typeof journalInput>) {
  const title = v.title || titleFromBody(v.body);
  if (!title) throw new UserFacingError("Write something first.");
  return { ...v, title };
}

/** Links may only point at the author's own theses, orders and transactions. */
async function assertLinks(userId: string, v: z.output<typeof journalInput>) {
  const db = getDb();
  if (v.thesisId && !(await db.select({ id: theses.id }).from(theses).where(and(eq(theses.id, v.thesisId), eq(theses.userId, userId)))).length) throw notFound("Thesis");
  if (v.paperOrderId && !(await db.select({ id: paperOrders.id }).from(paperOrders).where(and(eq(paperOrders.id, v.paperOrderId), eq(paperOrders.userId, userId)))).length)
    throw notFound("Paper order");
  if (v.transactionId && !(await db.select({ id: transactions.id }).from(transactions).where(and(eq(transactions.id, v.transactionId), eq(transactions.userId, userId)))).length)
    throw notFound("Transaction");
}

export async function createEntry(userId: string, raw: z.input<typeof journalInput>) {
  const v = withTitle(journalInput.parse(raw));
  if (v.entryDate > new Date().toISOString().slice(0, 10)) throw new UserFacingError("Journal entries can't be dated in the future.");
  await assertLinks(userId, v);
  const [row] = await getDb().insert(journalEntries).values({ ...v, userId }).returning();
  return row;
}

export async function updateEntry(userId: string, id: string, raw: z.input<typeof journalInput>) {
  const v = withTitle(journalInput.parse(raw));
  await assertLinks(userId, v);
  const [row] = await getDb()
    .update(journalEntries)
    .set({ ...v, updatedAt: new Date() })
    .where(and(eq(journalEntries.id, id), eq(journalEntries.userId, userId)))
    .returning();
  if (!row) throw notFound("Journal entry");
  return row;
}

export async function deleteEntry(userId: string, id: string) {
  const res = await getDb().delete(journalEntries).where(and(eq(journalEntries.id, id), eq(journalEntries.userId, userId))).returning({ id: journalEntries.id });
  if (!res.length) throw notFound("Journal entry");
}

export async function listEntries(userId: string, opts: { q?: string; tag?: string; from?: string; to?: string } = {}) {
  const conds = [eq(journalEntries.userId, userId)];
  if (opts.q) {
    const like = `%${opts.q.trim().slice(0, 60).replace(/[%_\\]/g, "\\$&")}%`;
    conds.push(or(ilike(journalEntries.title, like), ilike(journalEntries.body, like))!);
  }
  if (opts.tag) conds.push(sql`${opts.tag} = any(${journalEntries.tags})`);
  if (opts.from) conds.push(gte(journalEntries.entryDate, opts.from));
  if (opts.to) conds.push(lte(journalEntries.entryDate, opts.to));
  return getDb()
    .select({ entry: journalEntries, thesisTitle: theses.title, symbol: instruments.symbol })
    .from(journalEntries)
    .leftJoin(theses, eq(theses.id, journalEntries.thesisId))
    .leftJoin(instruments, eq(instruments.id, journalEntries.instrumentId))
    .where(and(...conds))
    .orderBy(desc(journalEntries.entryDate), desc(journalEntries.createdAt))
    .limit(200);
}

export async function getEntry(viewer: Viewer, id: string) {
  const [row] = await getDb()
    .select({ entry: journalEntries, author: personColumns, thesisTitle: theses.title, symbol: instruments.symbol })
    .from(journalEntries)
    .innerJoin(profiles, eq(profiles.userId, journalEntries.userId))
    .leftJoin(theses, eq(theses.id, journalEntries.thesisId))
    .leftJoin(instruments, eq(instruments.id, journalEntries.instrumentId))
    .where(eq(journalEntries.id, id));
  if (!row || !canView(viewer, { ownerId: row.entry.userId, audience: row.entry.visibility as "private" | "friends" })) throw notFound("Journal entry");
  const isOwner = row.entry.userId === viewer.userId;
  const [shown] = await withAuthorPictures(viewer, [row]);
  // Links to private records are shown to the owner only.
  return isOwner ? { ...shown, isOwner } : { ...shown, isOwner, entry: { ...shown.entry, transactionId: null, paperOrderId: null } };
}
