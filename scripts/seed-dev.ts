/**
 * Local development seed: three verified @example.test members with a sample
 * portfolio, theses, journal entries, a Guild and friendships, so every screen
 * has something to show. Refuses to run against a non-local database.
 * Usage: pnpm db:seed-dev (with the dev server's DATABASE_URL, or PGlite).
 */
import "./local-db-env";
import { eq } from "drizzle-orm";
import { TEST_PASSWORD } from "../e2e/fixtures";
import { auth } from "../src/server/auth";
import { getDb } from "../src/server/db";
import { profiles, user } from "../src/server/db/schema";
import { createGuild, joinGuild, setShareAllocation } from "../src/server/services/guilds";
import { createEntry } from "../src/server/services/journal";
import { addToWatchlist, getInstrumentBySymbol, listWatchlists } from "../src/server/services/market";
import { loadSamplePortfolio } from "../src/server/services/portfolio";
import { completeOnboarding, updatePrivacy } from "../src/server/services/profile";
import { evaluateRelics } from "../src/server/services/relics";
import { createPost, respondFriendRequest, sendFriendRequest } from "../src/server/services/social";
import { createThesis, reviseThesis } from "../src/server/services/theses";

async function member(name: string, handle: string) {
  const email = `${handle}@example.test`;
  const db = getDb();
  let [u] = await db.select().from(user).where(eq(user.email, email));
  if (!u) {
    await auth.api.signUpEmail({ body: { name, email, password: TEST_PASSWORD } });
    [u] = await db.select().from(user).where(eq(user.email, email));
  }
  await db.update(user).set({ emailVerified: true }).where(eq(user.id, u.id));
  const [p] = await db.select().from(profiles).where(eq(profiles.userId, u.id));
  if (!p?.onboardedAt) {
    await completeOnboarding(u.id, { handle, displayName: name, baseCurrency: "EUR", interests: ["Long-term investing", "ETFs"], paperStartingCash: "100000", acceptTerms: true });
  }
  return { id: u.id, fresh: !p?.onboardedAt };
}

async function main() {
  const ada = await member("Ada Lovelace", "ada");
  const ben = await member("Ben Okafor", "ben");
  const cleo = await member("Cleo Marsh", "cleo");
  if (!ada.fresh) {
    console.log("Seed accounts already exist (ada, ben, cleo @example.test).");
    process.exit(0);
  }

  for (const m of [ada, ben, cleo]) await loadSamplePortfolio(m.id);
  await sendFriendRequest(ada.id, ben.id);
  await respondFriendRequest(ben.id, ada.id, true);
  await sendFriendRequest(cleo.id, ada.id);

  await updatePrivacy(ada.id, {
    profileVisibility: "friends",
    allocationVisibility: "friends",
    holdingsVisibility: "private",
    activityVisibility: "friends",
    thesesDefaultVisibility: "friends",
    journalDefaultVisibility: "private",
    guildsVisibility: "friends",
    relicsVisibility: "friends",
    discoverable: true,
  });

  const asml = (await getInstrumentBySymbol("ASML"))!;
  const t = await createThesis(ada.id, {
    title: "Lithography stays a one-supplier market",
    summary: "EUV demand outlasts the current capex lull because no second supplier can ship before 2030.",
    instrumentId: asml.id,
    status: "active",
    visibility: "friends",
    timeHorizon: "3–5 years",
    tags: ["semiconductors", "moat"],
    rationale: "Every leading-edge node needs EUV, and High-NA extends the roadmap. Customer concentration is the price of the monopoly.",
    bullCase: "High-NA adoption at two or more foundries by 2027; services revenue keeps compounding on the installed base.",
    bearCase: "A prolonged memory and logic capex pause, or export restrictions widening to service contracts.",
    assumptions: "Leading-edge wafer starts grow mid-single digits; no viable alternative patterning at scale.",
    catalysts: "Quarterly order intake; High-NA shipments; customer capex guidance.",
    risks: "Export controls, customer concentration, cyclicality.",
    valuation: "Paying a premium multiple; acceptable only while the monopoly assumption holds.",
    invalidationCriteria: "EUV order intake falls for two consecutive quarters while customers guide capex up.",
    sources: [{ label: "ASML annual report", url: "https://www.asml.com/en/investors/annual-report" }],
  });
  await reviseThesis(ada.id, t.id, {
    title: "Lithography stays a one-supplier market",
    summary: "EUV demand outlasts the current capex lull because no second supplier can ship before 2030.",
    instrumentId: asml.id,
    status: "under_review",
    visibility: "friends",
    timeHorizon: "3–5 years",
    tags: ["semiconductors", "moat"],
    invalidationCriteria: "EUV order intake falls for two consecutive quarters while customers guide capex up.",
    changeNote: "Order intake dipped one quarter. Not the trigger yet; reviewing customer capex commentary.",
  });
  await createThesis(ada.id, { title: "Global index core, picked stocks at the edge", summary: "Keep 70% in a global index fund; individual names only with a written thesis.", status: "active", visibility: "private", tags: ["process"] });

  const today = new Date();
  for (let i = 0; i < 4; i++) {
    const d = new Date(today.getTime() - i * 86400_000).toISOString().slice(0, 10);
    await createEntry(ada.id, {
      entryDate: d,
      title: ["Re-read the ASML thesis", "Why I didn't add to MSFT", "Notes on index rebalancing", "What would prove me wrong?"][i],
      body: "Wrote down what I believed before checking the price. **Evidence first**, then the chart.",
      prompt: "What did I believe at the time?",
      tags: ["reflection"],
    });
  }

  const [wl] = await listWatchlists(ada.id);
  for (const s of ["NVDA", "SAP", "TSM", "COST"]) await addToWatchlist(ada.id, wl.id, (await getInstrumentBySymbol(s))!.id);

  const g = await createGuild(ada.id, { name: "Long Horizon", description: "Index-first investors who write things down.", topic: "Long-term investing", visibility: "discoverable", joinPolicy: "open" });
  await joinGuild(ben.id, g.id);
  await joinGuild(cleo.id, g.id);
  for (const m of [ada, ben, cleo]) await setShareAllocation(m.id, g.id, true);

  await createPost(ada.id, { body: "Shared my lithography thesis. Tell me where it breaks.", audience: "friends", thesisId: t.id });
  await createPost(ben.id, { body: "Rebalanced back to target after the quarter. Boring is the point.", audience: "friends" });
  await createPost(cleo.id, { body: "Welcome to Long Horizon. Post your rebalancing rules here.", audience: "guild", guildId: g.id });

  for (const m of [ada, ben, cleo]) await evaluateRelics(m.id);
  console.log("Seeded ada, ben and cleo @example.test (password in e2e/fixtures.ts).");
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
