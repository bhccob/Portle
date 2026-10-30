import { and, desc, eq, inArray, ne, sql } from "drizzle-orm";
import { z } from "zod";
import { isCurrency } from "@/domain/money";
import { canView, profileAccess, type Audience, type Viewer } from "@/domain/permissions";
import { APPROACHES, BANNER_STYLES, HORIZONS, profileSections, SECTIONS, type BannerStyle, type SectionSetting } from "@/domain/profile-layout";
import { EXPERIENCE, INTERESTS } from "@/domain/topics";
import { audit } from "../audit";
import { getDb } from "../db";
import { consents, friendships, guildMembers, guilds, privacySettings, profileExperience, profiles, theses, user } from "../db/schema";
import { notFound, UserFacingError } from "../errors";
import { shownBadges } from "./badges";
import { ensureDefaultWatchlist } from "./market";
import { ensurePaperAccount } from "./paper";
import { ensurePortfolio, getValuation } from "./portfolio";

export const TERMS_VERSION = "2026-10";
const RESERVED = new Set(["admin", "portle", "porfael", "support", "help", "settings", "api", "root", "system", "me", "guild", "guilds", "relics", "badges", "founder"]);

export const handleSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9_]{3,20}$/, "3–20 characters: lowercase letters, numbers and underscores.")
  .refine((h) => !RESERVED.has(h), "That handle is reserved.");

// The topic list lives in domain/topics, grouped the way onboarding shows it.
export { INTERESTS };

export const onboardingInput = z.object({
  handle: handleSchema,
  displayName: z.string().trim().min(1, "Enter a display name.").max(40),
  baseCurrency: z.string().refine(isCurrency, "Choose a supported currency.").default("EUR"),
  interests: z.array(z.enum(INTERESTS)).max(INTERESTS.length).default([]),
  // Optional and private: how long they have invested ("Rather not say" is null).
  experience: z.enum(EXPERIENCE).nullable().default(null),
  // Practice starts with pretend money on its own; nothing to choose at sign-up.
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
        experience: input.experience,
        avatarHue: String(200 + (userId.charCodeAt(0) * 7) % 120),
        onboardedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: profiles.userId,
        set: {
          handle: input.handle,
          displayName: input.displayName,
          baseCurrency: input.baseCurrency,
          interests: input.interests,
          experience: input.experience,
          onboardedAt: new Date(),
        },
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

/** A link a profile may show: a full http(s) address with a real host, never javascript: or data:. */
function isWebAddress(value: string) {
  try {
    const url = new URL(value);
    return (url.protocol === "https:" || url.protocol === "http:") && url.hostname.includes(".");
  } catch {
    return false;
  }
}

const optionalUrl = z
  .string()
  .trim()
  .max(200)
  .refine((v) => !v || isWebAddress(v), "Paste the whole address, starting with https://")
  .transform((v) => v || undefined);
const thisYear = () => new Date().getUTCFullYear();

export const profileInput = z.object({
  displayName: z.string().trim().min(1, "Enter a display name.").max(40),
  /** The About section. */
  bio: z.string().trim().max(600, "Keep About under 600 characters.").default(""),
  interests: z.array(z.enum(INTERESTS)).max(INTERESTS.length).default([]),
  avatarHue: z.coerce.number().int().min(0).max(359).transform(String),
  headline: z.string().trim().max(120, "Keep the headline under 120 characters.").default(""),
  location: z.string().trim().max(60, "Keep the location under 60 characters.").default(""),
  bannerStyle: z.enum(BANNER_STYLES as [BannerStyle, ...BannerStyle[]]).default("dial"),
  links: z.object({ website: optionalUrl.optional(), linkedin: optionalUrl.optional(), github: optionalUrl.optional(), x: optionalUrl.optional() }).default({}),
  investingSince: z.coerce
    .number()
    .int()
    .refine((y) => y >= 1950 && y <= thisYear(), "Choose a year.")
    .nullable()
    .default(null),
  approach: z.enum(APPROACHES).nullable().default(null),
  horizon: z.enum(HORIZONS).nullable().default(null),
  sections: z
    .array(z.object({ key: z.enum(SECTIONS), visible: z.boolean() }))
    .max(SECTIONS.length)
    .default([]),
  featuredThesisIds: z.array(z.uuid()).max(3, "Pin up to three theses.").default([]),
});

export async function updateProfile(userId: string, raw: z.input<typeof profileInput>) {
  const input = profileInput.parse(raw);
  const db = getDb();
  // Only your own theses can be pinned; anything else is dropped rather than trusted.
  const own = input.featuredThesisIds.length
    ? (await db.select({ id: theses.id }).from(theses).where(and(eq(theses.userId, userId), inArray(theses.id, input.featuredThesisIds)))).map((t) => t.id)
    : [];
  await db
    .update(profiles)
    .set({ ...input, featuredThesisIds: input.featuredThesisIds.filter((id) => own.includes(id)), sections: profileSections(input.sections), updatedAt: new Date() })
    .where(eq(profiles.userId, userId));
}

export const experienceInput = z
  .object({
    title: z.string().trim().min(1, "Give it a title, like Software developer.").max(80),
    organisation: z.string().trim().max(80).default(""),
    startYear: z.coerce.number().int().min(1950, "Choose a year."),
    endYear: z.preprocess((v) => (v === "" || v === "now" || v === null ? null : v), z.coerce.number().int().nullable()),
    description: z.string().trim().max(280).default(""),
  })
  .refine((e) => e.startYear <= thisYear(), { path: ["startYear"], message: "Choose a year that has started." })
  .refine((e) => e.endYear === null || e.endYear >= e.startYear, { path: ["endYear"], message: "It can't end before it starts." });

const MAX_EXPERIENCE = 12;

export async function listExperience(userId: string) {
  return getDb()
    .select()
    .from(profileExperience)
    .where(eq(profileExperience.userId, userId))
    .orderBy(sql`${profileExperience.endYear} is not null`, desc(profileExperience.endYear), desc(profileExperience.startYear));
}

/** Adds a work or study entry, or changes one when `id` is given. */
export async function saveExperience(userId: string, raw: unknown, id?: string) {
  const input = experienceInput.parse(raw);
  const db = getDb();
  if (id) {
    const [row] = await db
      .update(profileExperience)
      .set(input)
      .where(and(eq(profileExperience.id, id), eq(profileExperience.userId, userId)))
      .returning();
    if (!row) throw notFound("Experience");
    return row;
  }
  if ((await listExperience(userId)).length >= MAX_EXPERIENCE) throw new UserFacingError(`A profile holds up to ${MAX_EXPERIENCE} entries.`);
  const [row] = await db.insert(profileExperience).values({ userId, ...input }).returning();
  return row;
}

export async function deleteExperience(userId: string, id: string) {
  const [row] = await getDb()
    .delete(profileExperience)
    .where(and(eq(profileExperience.id, id), eq(profileExperience.userId, userId)))
    .returning({ id: profileExperience.id });
  if (!row) throw notFound("Experience");
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

/** Who sees your holdings and your mix: the two privacy settings Portfolio's "Holding visibility" changes. */
export async function updateHoldingVisibility(userId: string, raw: { holdingsVisibility: string; allocationVisibility: string }) {
  const input = z.object({ holdingsVisibility: audience, allocationVisibility: audience }).parse(raw);
  await getPrivacy(userId);
  await getDb()
    .update(privacySettings)
    .set({ ...input, updatedAt: new Date() })
    .where(eq(privacySettings.userId, userId));
  await audit(getDb(), { userId, action: "privacy.updated" });
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

  const relics = access.relics ? await shownBadges(p.userId) : [];

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

  const [experience, [friendCount]] = await Promise.all([
    listExperience(p.userId),
    db
      .select({ n: sql<number>`count(*)::int` })
      .from(friendships)
      .where(and(eq(friendships.status, "accepted"), sql`${p.userId} in (${friendships.userLow}, ${friendships.userHigh})`)),
  ]);
  // Pinned theses keep the order they were pinned in, and only ones this viewer may read appear.
  const featured = p.featuredThesisIds.map((id) => visibleTheses.find((t) => t.id === id)).filter((t) => !!t);

  return {
    profile: {
      userId: p.userId,
      handle: p.handle,
      displayName: p.displayName,
      bio: p.bio,
      avatarHue: p.avatarHue,
      interests: p.interests,
      memberSince: p.createdAt,
      headline: p.headline,
      location: p.location,
      bannerStyle: (BANNER_STYLES.includes(p.bannerStyle as BannerStyle) ? p.bannerStyle : "dial") as BannerStyle,
      links: p.links,
      investingSince: p.investingSince,
      approach: p.approach,
      horizon: p.horizon,
    },
    sections: profileSections(p.sections as SectionSetting[] | null),
    featured,
    experience,
    friendCount: friendCount?.n ?? 0,
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
