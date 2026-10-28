import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";
import { z } from "zod";
import { canView, type Audience, type Viewer } from "@/domain/permissions";
import { getDb } from "../db";
import { guildMembers, instruments, profiles, theses, thesisNotes, thesisRevisions, thesisTransactionLinks, transactions } from "../db/schema";
import { forbidden, notFound, UserFacingError } from "../errors";

const STATUSES = ["researching", "active", "under_review", "validated", "invalidated", "archived"] as const;
export type ThesisStatus = (typeof STATUSES)[number];

const text = (max: number) => z.string().trim().max(max).default("");
const source = z.object({
  label: z.string().trim().min(1).max(120),
  url: z
    .url("Use a full https:// link.")
    .refine((u) => u.startsWith("https://"), "Only https links are allowed."),
});

export const thesisInput = z
  .object({
    title: z.string().trim().min(3, "Give the thesis a title.").max(120),
    summary: text(400),
    instrumentId: z.uuid().optional().nullable(),
    status: z.enum(STATUSES).default("researching"),
    visibility: z.enum(["private", "friends", "guild", "public"]).default("private"),
    guildId: z.uuid().optional().nullable(),
    timeHorizon: text(60),
    tags: z.array(z.string().trim().toLowerCase().regex(/^[a-z0-9-]{1,24}$/, "Tags: letters, numbers, dashes.")).max(8).default([]),
    rationale: text(8000),
    bullCase: text(4000),
    bearCase: text(4000),
    assumptions: text(4000),
    catalysts: text(4000),
    risks: text(4000),
    valuation: text(4000),
    invalidationCriteria: text(2000),
    sources: z.array(source).max(20).default([]),
    changeNote: text(1000),
  })
  .superRefine((v, ctx) => {
    if (v.visibility === "guild" && !v.guildId) ctx.addIssue({ code: "custom", path: ["guildId"], message: "Choose which Guild can see it." });
    if ((v.status === "validated" || v.status === "invalidated") && !v.changeNote)
      ctx.addIssue({ code: "custom", path: ["changeNote"], message: "Explain what happened before closing a thesis." });
  });

export type ThesisInput = z.input<typeof thesisInput>;

async function assertGuildMember(userId: string, guildId: string) {
  const [m] = await getDb()
    .select()
    .from(guildMembers)
    .where(and(eq(guildMembers.guildId, guildId), eq(guildMembers.userId, userId)));
  if (!m) throw forbidden("You can only share with Guilds you belong to.");
}

const revisionFields = (v: z.output<typeof thesisInput>) => ({
  title: v.title,
  summary: v.summary,
  status: v.status,
  rationale: v.rationale,
  bullCase: v.bullCase,
  bearCase: v.bearCase,
  assumptions: v.assumptions,
  catalysts: v.catalysts,
  risks: v.risks,
  valuation: v.valuation,
  invalidationCriteria: v.invalidationCriteria,
  timeHorizon: v.timeHorizon,
  sources: v.sources,
  changeNote: v.changeNote,
});

export async function createThesis(userId: string, raw: ThesisInput) {
  const v = thesisInput.parse(raw);
  if (v.guildId) await assertGuildMember(userId, v.guildId);
  return getDb().transaction(async (tx) => {
    const [t] = await tx
      .insert(theses)
      .values({
        userId,
        instrumentId: v.instrumentId ?? null,
        title: v.title,
        summary: v.summary,
        status: v.status,
        visibility: v.visibility,
        guildId: v.visibility === "guild" ? v.guildId! : null,
        timeHorizon: v.timeHorizon,
        tags: v.tags,
      })
      .returning();
    await tx.insert(thesisRevisions).values({ thesisId: t.id, revision: 1, ...revisionFields(v), changeNote: v.changeNote || "First draft." });
    return t;
  });
}

/** Appends a revision. Earlier revisions are never modified. */
export async function reviseThesis(userId: string, thesisId: string, raw: ThesisInput) {
  const v = thesisInput.parse(raw);
  if (v.guildId && v.visibility === "guild") await assertGuildMember(userId, v.guildId);
  return getDb().transaction(async (tx) => {
    const [t] = await tx.select().from(theses).where(and(eq(theses.id, thesisId), eq(theses.userId, userId))).for("update");
    if (!t) throw notFound("Thesis");
    const revision = t.currentRevision + 1;
    await tx.insert(thesisRevisions).values({ thesisId, revision, ...revisionFields(v) });
    const [updated] = await tx
      .update(theses)
      .set({
        instrumentId: v.instrumentId ?? null,
        title: v.title,
        summary: v.summary,
        status: v.status,
        visibility: v.visibility,
        guildId: v.visibility === "guild" ? v.guildId! : null,
        timeHorizon: v.timeHorizon,
        tags: v.tags,
        currentRevision: revision,
        updatedAt: new Date(),
      })
      .where(eq(theses.id, thesisId))
      .returning();
    return updated;
  });
}

export async function deleteThesis(userId: string, thesisId: string) {
  const res = await getDb().delete(theses).where(and(eq(theses.id, thesisId), eq(theses.userId, userId))).returning({ id: theses.id });
  if (!res.length) throw notFound("Thesis");
}

const listColumns = {
  thesis: theses,
  instrument: { id: instruments.id, symbol: instruments.symbol, name: instruments.name },
  author: { handle: profiles.handle, displayName: profiles.displayName, avatarHue: profiles.avatarHue },
};

export async function listOwnTheses(userId: string, opts: { status?: ThesisStatus; tag?: string } = {}) {
  const conds = [eq(theses.userId, userId)];
  if (opts.status) conds.push(eq(theses.status, opts.status));
  if (opts.tag) conds.push(sql`${opts.tag} = any(${theses.tags})`);
  return getDb()
    .select(listColumns)
    .from(theses)
    .leftJoin(instruments, eq(instruments.id, theses.instrumentId))
    .innerJoin(profiles, eq(profiles.userId, theses.userId))
    .where(and(...conds))
    .orderBy(desc(theses.updatedAt));
}

/** Theses by other members that this viewer is allowed to read. Filtering happens in SQL, then re-checked. */
export async function listSharedTheses(viewer: Viewer, opts: { guildId?: string; limit?: number } = {}) {
  const friendIds = [...viewer.friendIds];
  const guildIds = [...viewer.guildIds];
  const visible = sql`(
    ${theses.visibility} = 'public'
    or (${theses.visibility} = 'friends' and ${friendIds.length ? inArray(theses.userId, friendIds) : sql`false`})
    or (${theses.visibility} = 'guild' and ${guildIds.length ? inArray(theses.guildId, guildIds) : sql`false`})
  )`;
  const conds = [sql`${theses.userId} <> ${viewer.userId}`, visible];
  if (opts.guildId) conds.push(eq(theses.guildId, opts.guildId));
  const rows = await getDb()
    .select(listColumns)
    .from(theses)
    .leftJoin(instruments, eq(instruments.id, theses.instrumentId))
    .innerJoin(profiles, eq(profiles.userId, theses.userId))
    .where(and(...conds))
    .orderBy(desc(theses.updatedAt))
    .limit(opts.limit ?? 50);
  return rows.filter((r) => canView(viewer, { ownerId: r.thesis.userId, audience: r.thesis.visibility as Audience, guildId: r.thesis.guildId }));
}

export async function getThesis(viewer: Viewer, thesisId: string) {
  const db = getDb();
  const [row] = await db
    .select(listColumns)
    .from(theses)
    .leftJoin(instruments, eq(instruments.id, theses.instrumentId))
    .innerJoin(profiles, eq(profiles.userId, theses.userId))
    .where(eq(theses.id, thesisId));
  if (!row || !canView(viewer, { ownerId: row.thesis.userId, audience: row.thesis.visibility as Audience, guildId: row.thesis.guildId })) {
    throw notFound("Thesis");
  }
  const isOwner = row.thesis.userId === viewer.userId;
  const revisions = await db.select().from(thesisRevisions).where(eq(thesisRevisions.thesisId, thesisId)).orderBy(desc(thesisRevisions.revision));
  const notes = isOwner ? await db.select().from(thesisNotes).where(eq(thesisNotes.thesisId, thesisId)).orderBy(desc(thesisNotes.createdAt)) : [];
  const links = isOwner
    ? await db
        .select({ tx: transactions, symbol: instruments.symbol })
        .from(thesisTransactionLinks)
        .innerJoin(transactions, eq(transactions.id, thesisTransactionLinks.transactionId))
        .leftJoin(instruments, eq(instruments.id, transactions.instrumentId))
        .where(eq(thesisTransactionLinks.thesisId, thesisId))
        .orderBy(asc(transactions.tradeDate))
    : [];
  return { ...row, isOwner, current: revisions[0], revisions, notes, links };
}

export async function addThesisNote(userId: string, thesisId: string, body: string) {
  const clean = body.trim().slice(0, 4000);
  if (!clean) throw new UserFacingError("Write something first.");
  const [t] = await getDb().select().from(theses).where(and(eq(theses.id, thesisId), eq(theses.userId, userId)));
  if (!t) throw notFound("Thesis");
  await getDb().insert(thesisNotes).values({ thesisId, userId, body: clean });
}

/** Links a real transaction to a thesis. Both must belong to the same user. */
export async function linkTransaction(userId: string, thesisId: string, transactionId: string) {
  const db = getDb();
  const [t] = await db.select().from(theses).where(and(eq(theses.id, thesisId), eq(theses.userId, userId)));
  const [tx] = await db.select().from(transactions).where(and(eq(transactions.id, transactionId), eq(transactions.userId, userId)));
  if (!t || !tx) throw notFound("Thesis or transaction");
  await db.insert(thesisTransactionLinks).values({ thesisId, transactionId }).onConflictDoNothing();
}

export async function unlinkTransaction(userId: string, thesisId: string, transactionId: string) {
  const [t] = await getDb().select().from(theses).where(and(eq(theses.id, thesisId), eq(theses.userId, userId)));
  if (!t) throw notFound("Thesis");
  await getDb()
    .delete(thesisTransactionLinks)
    .where(and(eq(thesisTransactionLinks.thesisId, thesisId), eq(thesisTransactionLinks.transactionId, transactionId)));
}
