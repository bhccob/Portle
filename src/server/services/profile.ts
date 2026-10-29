import { and, desc, eq, ne, sql } from "drizzle-orm";
import { z } from "zod";
import { isCurrency } from "@/domain/money";
import { canView, profileAccess, type Audience, type Viewer } from "@/domain/permissions";
import { RELIC_BY_KEY } from "@/domain/relics";
import { audit } from "../audit";
import { getDb } from "../db";
import { consents, friendships, guildMembers, guilds, privacySettings, profiles, theses, user, userRelics } from "../db/schema";
import { notFound, UserFacingError } from "../errors";
import { ensureDefaultWatchlist } from "./market";
import { ensurePaperAccount } from "./paper";
import { ensurePortfolio, getValuation } from "./portfolio";

export const TERMS_VERSION = "2026-10";
const RESERVED = new Set(["admin", "portle", "porfael", "support", "help", "settings", "api", "root", "system", "me", "guild", "guilds", "relics"]);

export const handleSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9_]{3,20}$/, "3–20 characters: lowercase letters, numbers and underscores.")
  .refine((h) => !RESERVED.has(h), "That handle is reserved.");

export const INTERESTS = [
  "Long-term investing",
  "Dividends",
  "Index funds",
  "Growth stocks",
  "Value investing",
  "ETFs",
  "Technology",
  "Healthcare",
  "Energy",
  "Emerging markets",
  "Bonds",
  "Crypto",
  "Macro",
  "Learning the basics",
] as const;

export const onboardingInput = z.object({
  handle: handleSchema,
  displayName: z.string().trim().min(1, "Enter a display name.").max(40),
  baseCurrency: z.string().refine(isCurrency, "Choose a supported currency."),
  interests: z.array(z.enum(INTERESTS)).max(8).default([]),
  paperStartingCash: z.enum(["10000", "50000", "100000"]).default("100000"),
  acceptTerms: z.literal(true, { error: "Please accept the terms and privacy notice to continue." }),
});

export async function isHandleAvailable(handle: string, exceptUserId?: string) {
  const conds = [sql`lower(${profiles.handle}) = ${handle.toLowerCase()}`];
  if (exceptUserId) conds.push(ne(profiles.userId, exceptUserId));
  const rows = await getDb().select({ id: profiles.userId }).from(profiles).where(and(...conds));
  return rows.length === 0;
}

/** Creates the profile and every per-user default in one transaction. Idempotent per user. */
export async function completeOnboarding(userId: string, raw: z.input<typeof onboardingInput>) {
  const input = onboardingInput.parse(raw);
  const db = getDb();
  const [existing] = await db.select().from(profiles).where(eq(profiles.userId, userId));
  if (existing?.onboardedAt) return existing;
  if (!(await isHandleAvailable(input.handle, userId))) throw new UserFacingError("That handle is taken. Try another.");

  await db.transaction(async (tx) => {
    await tx
      .insert(profiles)
      .values({
        userId,
        handle: input.handle,
        displayName: input.displayName,
        baseCurrency: input.baseCurrency,
        interests: input.interests,
        avatarHue: String(200 + (userId.charCodeAt(0) * 7) % 120),
        onboardedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: profiles.userId,
        set: { handle: input.handle, displayName: input.displayName, baseCurrency: input.baseCurrency, interests: input.interests, onboardedAt: new Date() },
      });
    await tx.insert(privacySettings).values({ userId }).onConflictDoNothing();
    await tx.insert(consents).values([
      { userId, kind: "terms", granted: true, version: TERMS_VERSION },
      { userId, kind: "privacy_notice", granted: true, version: TERMS_VERSION },
    ]);
    await tx.update(user).set({ name: input.displayName }).where(eq(user.id, userId));
    await audit(tx, { userId, action: "account.onboarded" });
  });
  await ensurePortfolio(userId, input.baseCurrency);
  await ensurePaperAccount(userId, input.paperStartingCash);
  await ensureDefaultWatchlist(userId);
  const [p] = await db.select().from(profiles).where(eq(profiles.userId, userId));
  return p;
}

export const profileInput = z.object({
  displayName: z.string().trim().min(1, "Enter a display name.").max(40),
  bio: z.string().trim().max(280).default(""),
  interests: z.array(z.enum(INTERESTS)).max(8).default([]),
  avatarHue: z.coerce.number().int().min(0).max(359).transform(String),
});

export async function updateProfile(userId: string, raw: z.input<typeof profileInput>) {
  const input = profileInput.parse(raw);
  await getDb().update(profiles).set({ ...input, updatedAt: new Date() }).where(eq(profiles.userId, userId));
}

const audience = z.enum(["private", "friends", "public"]);
export const privacyInput = z.object({
  profileVisibility: audience,
  allocationVisibility: audience,
  holdingsVisibility: audience,
  activityVisibility: audience,
  thesesDefaultVisibility: audience,
  journalDefaultVisibility: z.enum(["private", "friends"]),
  guildsVisibility: audience,
  relicsVisibility: audience,
  discoverable: z.boolean(),
});

export async function getPrivacy(userId: string) {
  const db = getDb();
  const [row] = await db.select().from(privacySettings).where(eq(privacySettings.userId, userId));
  if (row) return row;
  const [created] = await db.insert(privacySettings).values({ userId }).returning();
  return created;
}

export async function updatePrivacy(userId: string, raw: z.input<typeof privacyInput>) {
  const input = privacyInput.parse(raw);
  await getPrivacy(userId);
  await getDb()
    .update(privacySettings)
    .set({ ...input, updatedAt: new Date() })
    .where(eq(privacySettings.userId, userId));
  await audit(getDb(), { userId, action: "privacy.updated" });
}

const pct = (v: { toDecimalPlaces: (n: number) => { toFixed: () => string } }) => v.toDecimalPlaces(3).toFixed();

/**
 * Everything another member may see on a profile. This is the only function that
 * reads portfolio data on behalf of someone other than its owner, and it returns
 * percentages only: no values, quantities, cost bases, accounts or transactions.
 */
export async function getProfileView(viewer: Viewer, handle: string) {
  const db = getDb();
  const [p] = await db.select().from(profiles).where(sql`lower(${profiles.handle}) = ${handle.toLowerCase()}`);
  if (!p || !p.onboardedAt) throw notFound("Member");
  const settings = await getPrivacy(p.userId);
  const access = profileAccess(viewer, p.userId, settings);
  if (!access.profile) throw notFound("Member");
  const isOwner = viewer.userId === p.userId;

  let allocation: { dimension: string; slices: { label: string; percent: string }[] }[] | null = null;
  let holdings: { symbol: string; name: string; percent: string }[] | null = null;
  if (access.allocation || access.holdings) {
    const { valuation } = await getValuation(p.userId);
    if (access.allocation) {
      allocation = (["assetClass", "region", "sector"] as const).map((dim) => ({
        dimension: dim,
        slices: valuation.allocation[dim].map((s) => ({ label: s.label, percent: pct(s.percent) })),
      }));
    }
    if (access.holdings) {
      holdings = valuation.holdings
        .filter((h) => h.weight)
        .map((h) => ({ symbol: h.instrument.symbol, name: h.instrument.name, percent: pct(h.weight!) }));
    }
  }

  const relics = access.relics
    ? (await db.select().from(userRelics).where(and(eq(userRelics.userId, p.userId), eq(userRelics.displayed, true))))
        .map((r) => ({ ...RELIC_BY_KEY.get(r.relicKey)!, awardedAt: r.awardedAt }))
        .filter((r) => r.key)
    : [];

  const guildRows = access.guilds
    ? await db
        .select({ id: guilds.id, slug: guilds.slug, name: guilds.name, visibility: guilds.visibility })
        .from(guildMembers)
        .innerJoin(guilds, eq(guilds.id, guildMembers.guildId))
        .where(eq(guildMembers.userId, p.userId))
    : [];

  const thesisRows = await db
    .select({ id: theses.id, title: theses.title, summary: theses.summary, status: theses.status, visibility: theses.visibility, guildId: theses.guildId, updatedAt: theses.updatedAt })
    .from(theses)
    .where(eq(theses.userId, p.userId))
    .orderBy(desc(theses.updatedAt))
    .limit(30);
  const visibleTheses = thesisRows.filter((t) => canView(viewer, { ownerId: p.userId, audience: t.visibility as Audience, guildId: t.guildId }));

  let relationship: "self" | "friends" | "pending_out" | "pending_in" | "none" | "blocked" = "none";
  if (isOwner) relationship = "self";
  else if (viewer.blockedIds.has(p.userId)) relationship = "blocked";
  else {
    const [low, high] = [viewer.userId, p.userId].sort();
    const [f] = await db.select().from(friendships).where(and(eq(friendships.userLow, low), eq(friendships.userHigh, high)));
    if (f?.status === "accepted") relationship = "friends";
    else if (f) relationship = f.requestedBy === viewer.userId ? "pending_out" : "pending_in";
  }

  return {
    profile: { userId: p.userId, handle: p.handle, displayName: p.displayName, bio: p.bio, avatarHue: p.avatarHue, interests: p.interests, memberSince: p.createdAt },
    access,
    allocation,
    holdings,
    relics,
    guilds: guildRows.filter((g) => g.visibility === "discoverable" || viewer.guildIds.has(g.id) || isOwner),
    theses: visibleTheses,
    relationship,
  };
}

/**
 * Renders the owner's profile as a given audience would see it, through the same
 * code path other members use, so the preview cannot drift from reality.
 */
export async function previewProfileAs(userId: string, as: "friend" | "member") {
  const [p] = await getDb().select().from(profiles).where(eq(profiles.userId, userId));
  if (!p) throw notFound("Profile");
  // A synthetic outsider: no shared Guilds, so Guild-only items stay hidden in both previews.
  const synthetic: Viewer = {
    userId: `preview:${as}`,
    friendIds: new Set(as === "friend" ? [userId] : []),
    guildIds: new Set(),
    blockedIds: new Set(),
  };
  await audit(getDb(), { userId, action: "privacy.previewed", metadata: { as } });
  try {
    return { visible: true as const, view: await getProfileView(synthetic, p.handle) };
  } catch {
    return { visible: false as const };
  }
}

export async function searchMembers(viewer: Viewer, q: string) {
  const term = q.trim().toLowerCase().slice(0, 40);
  if (term.length < 2) return [];
  const like = `%${term.replace(/[%_\\]/g, "\\$&")}%`;
  const rows = await getDb()
    .select({ userId: profiles.userId, handle: profiles.handle, displayName: profiles.displayName, avatarHue: profiles.avatarHue, discoverable: privacySettings.discoverable })
    .from(profiles)
    .innerJoin(privacySettings, eq(privacySettings.userId, profiles.userId))
    .where(sql`(lower(${profiles.handle}) like ${like} or lower(${profiles.displayName}) like ${like}) and ${profiles.onboardedAt} is not null`)
    .limit(20);
  return rows.filter((r) => r.userId !== viewer.userId && !viewer.blockedIds.has(r.userId) && (r.discoverable || viewer.friendIds.has(r.userId)));
}
