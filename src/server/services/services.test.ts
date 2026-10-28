import { randomUUID } from "node:crypto";
import { eq, sql } from "drizzle-orm";
import { beforeAll, describe, expect, it } from "vitest";
import { createTestDb, createTestUser } from "@/test/db";
import type { Db } from "../db";
import * as s from "../db/schema";
import { resetRateLimits } from "../rate-limit";
import { exportUserData } from "./account";
import { addToWatchlist, getInstrumentBySymbol, listWatchlists } from "./market";
import { getLab, placeOrder, processOpenOrders } from "./paper";
import { addTransaction, createAccount, getPerformance, getValuation, importCsv } from "./portfolio";
import { completeOnboarding, getProfileView, previewProfileAs, updatePrivacy } from "./profile";
import { evaluateRelics } from "./relics";
import { addComment, blockUser, createPost, listFeed, respondFriendRequest, sendFriendRequest } from "./social";
import { createGuild, getGuild, guildAnalytics, handOverOwnedGuilds, joinGuild, removeMember, respondToRequest, setShareAllocation, listPendingRequests } from "./guilds";
import { createThesis, getThesis, listSharedTheses, reviseThesis } from "./theses";
import { buildViewer } from "./viewer";

let db: Db;
let alice: string, bob: string, carol: string;

async function member(name: string, handle: string) {
  const u = await createTestUser(db, name);
  await completeOnboarding(u.id, { handle, displayName: name, baseCurrency: "EUR", acceptTerms: true, paperStartingCash: "10000" });
  return u.id;
}

beforeAll(async () => {
  db = await createTestDb();
  resetRateLimits();
  alice = await member("Alice", "alice");
  bob = await member("Bob", "bob");
  carol = await member("Carol", "carol");
  await sendFriendRequest(alice, bob);
  await respondFriendRequest(bob, alice, true);
});

describe("portfolio", () => {
  let accountId: string;
  let asml: string;

  beforeAll(async () => {
    accountId = (await createAccount(alice, { name: "DEGIRO", institution: "DEGIRO", currency: "EUR" })).id;
    asml = (await getInstrumentBySymbol("ASML"))!.id;
    await addTransaction(alice, { accountId, type: "buy", instrumentId: asml, tradeDate: "2025-03-03", quantity: "10", price: "600", fee: "2" });
  });

  it("values holdings with labelled demo prices", async () => {
    const { valuation } = await getValuation(alice);
    expect(valuation.holdings).toHaveLength(1);
    expect(valuation.holdings[0].costBasis!.toFixed()).toBe("6002");
    expect(valuation.usesDemoPrices).toBe(true);
    expect(valuation.holdings[0].price!.source).toMatch(/Demo/);
  });

  it("rejects transactions on someone else's account", async () => {
    await expect(addTransaction(bob, { accountId, type: "buy", instrumentId: asml, tradeDate: "2025-03-03", quantity: "1", price: "1" })).rejects.toThrow(/not found/);
  });

  it("rejects future-dated transactions", async () => {
    await expect(addTransaction(alice, { accountId, type: "deposit", tradeDate: "2999-01-01", amount: "1" })).rejects.toThrow();
  });

  it("imports CSV rows and skips duplicates on re-import", async () => {
    const csv = "date,type,symbol,quantity,price,fee\n2025-01-02,buy,MSFT,3,410.5,1\n2025-01-03,buy,NOT-A-REAL-CO,1,10,0\n2025-01-04,bogus,MSFT,1,1,0";
    const mapping = { date: "date", type: "type", symbol: "symbol", quantity: "quantity", price: "price", fee: "fee" };
    const first = await importCsv(alice, { accountId, filename: "t.csv", text: csv, mapping, dateFormat: "YYYY-MM-DD" });
    expect(first).toMatchObject({ imported: 2, duplicates: 0, unresolved: ["NOT-A-REAL-CO"] });
    expect(first.errors).toHaveLength(1);
    const again = await importCsv(alice, { accountId, filename: "t.csv", text: csv, mapping, dateFormat: "YYYY-MM-DD" });
    expect(again).toMatchObject({ imported: 0, duplicates: 2 });
  });

  it("excludes unpriced securities from totals instead of guessing", async () => {
    const { valuation } = await getValuation(alice);
    expect(valuation.excluded.map((e) => e.symbol)).toContain("NOT-A-REAL-CO");
  });

  it("computes a time-weighted return series", async () => {
    const perf = await getPerformance(alice, "1Y");
    expect(perf.available).toBe(true);
    if (perf.available) expect(perf.points.length).toBeGreaterThan(100);
  });
});

describe("privacy", () => {
  it("hides exact values and, by default, allocation from friends", async () => {
    const view = await getProfileView(await buildViewer(bob), "alice");
    expect(view.allocation).toBeNull();
    expect(view.holdings).toBeNull();
  });

  it("hides friends-only profiles from strangers", async () => {
    await expect(getProfileView(await buildViewer(carol), "alice")).rejects.toThrow(/not found/);
  });

  it("shares percentages only once the owner opts in", async () => {
    await updatePrivacy(alice, {
      profileVisibility: "friends",
      allocationVisibility: "friends",
      holdingsVisibility: "friends",
      activityVisibility: "private",
      thesesDefaultVisibility: "private",
      journalDefaultVisibility: "private",
      guildsVisibility: "friends",
      relicsVisibility: "friends",
      discoverable: true,
    });
    const view = await getProfileView(await buildViewer(bob), "alice");
    expect(view.allocation![0].slices.length).toBeGreaterThan(0);
    const json = JSON.stringify(view);
    // Only labels and percent strings: no market values, quantities or cost.
    for (const banned of ["marketValue", "costBasis", "quantity", "6002", "accountIds"]) expect(json).not.toContain(banned);
  });

  it("previews through the same code path other members use", async () => {
    const asMember = await previewProfileAs(alice, "member");
    expect(asMember.visible).toBe(false);
    const asFriend = await previewProfileAs(alice, "friend");
    expect(asFriend.visible && asFriend.view.allocation).toBeTruthy();
  });

  it("exports the user's data without secrets", async () => {
    const data = await exportUserData(alice);
    expect(data.transactions.length).toBeGreaterThan(0);
    expect(JSON.stringify(data)).not.toMatch(/password|encryptedSecret|token/i);
  });
});

describe("theses", () => {
  let privateId: string, friendsId: string;

  beforeAll(async () => {
    privateId = (await createThesis(alice, { title: "Private idea", visibility: "private" })).id;
    friendsId = (await createThesis(alice, { title: "Shared with friends", visibility: "friends", invalidationCriteria: "Orders fall two quarters in a row." })).id;
  });

  it("enforces visibility on direct access by id", async () => {
    await expect(getThesis(await buildViewer(bob), privateId)).rejects.toThrow(/not found/);
    await expect(getThesis(await buildViewer(carol), friendsId)).rejects.toThrow(/not found/);
    expect((await getThesis(await buildViewer(bob), friendsId)).thesis.title).toBe("Shared with friends");
  });

  it("only lists what the viewer may read", async () => {
    const titles = (await listSharedTheses(await buildViewer(bob))).map((t) => t.thesis.title);
    expect(titles).toEqual(["Shared with friends"]);
    expect(await listSharedTheses(await buildViewer(carol))).toHaveLength(0);
  });

  it("appends immutable revisions", async () => {
    await reviseThesis(alice, friendsId, { title: "Shared with friends", visibility: "friends", status: "active", changeNote: "Added evidence." });
    const t = await getThesis(await buildViewer(alice), friendsId);
    expect(t.revisions.map((r) => r.revision)).toEqual([2, 1]);
    expect(t.thesis.status).toBe("active");
  });

  it("refuses edits by non-owners", async () => {
    await expect(reviseThesis(bob, friendsId, { title: "hijack" })).rejects.toThrow(/not found/);
  });

  it("requires a review note to close a thesis", async () => {
    await expect(reviseThesis(alice, friendsId, { title: "x x x", status: "invalidated" })).rejects.toThrow();
  });

  it("blocks comments from people who cannot see it", async () => {
    await expect(addComment(await buildViewer(carol), { type: "thesis", id: friendsId }, "hi")).rejects.toThrow(/not found/);
    await addComment(await buildViewer(bob), { type: "thesis", id: friendsId }, "Good point on orders.");
  });
});

describe("paper trading lab", () => {
  it("fills, stays separate from the real ledger, and is idempotent", async () => {
    const msft = (await getInstrumentBySymbol("MSFT"))!.id;
    const before = (await db.select({ n: sql<number>`count(*)::int` }).from(s.transactions))[0].n;
    const key = randomUUID();
    const r1 = await placeOrder(bob, { instrumentId: msft, side: "buy", type: "market", quantity: "2", idempotencyKey: key });
    const r2 = await placeOrder(bob, { instrumentId: msft, side: "buy", type: "market", quantity: "2", idempotencyKey: key });
    expect(r1.order.status).toBe("filled");
    expect(r2.duplicate).toBe(true);
    expect(r2.order.id).toBe(r1.order.id);
    const lab = await getLab(bob);
    expect(lab.positions[0].quantity.toFixed()).toBe("2");
    expect(lab.cash.lt(10000)).toBe(true);
    const after = (await db.select({ n: sql<number>`count(*)::int` }).from(s.transactions))[0].n;
    expect(after).toBe(before);
  });

  it("rejects overselling and overspending without changing cash", async () => {
    const msft = (await getInstrumentBySymbol("MSFT"))!.id;
    const cashBefore = (await getLab(bob)).cash.toFixed();
    const oversell = await placeOrder(bob, { instrumentId: msft, side: "sell", type: "market", quantity: "5", idempotencyKey: randomUUID() });
    expect(oversell.order.status).toBe("rejected");
    const overspend = await placeOrder(bob, { instrumentId: msft, side: "buy", type: "market", quantity: "1000", idempotencyKey: randomUUID() });
    expect(overspend.order.status).toBe("rejected");
    expect((await getLab(bob)).cash.toFixed()).toBe(cashBefore);
  });

  it("rests far-away limit orders and refuses currencies the account cannot hold", async () => {
    const msft = (await getInstrumentBySymbol("MSFT"))!.id;
    const r = await placeOrder(bob, { instrumentId: msft, side: "buy", type: "limit", quantity: "1", limitPrice: "1", idempotencyKey: randomUUID() });
    expect(r.order.status).toBe("open");
    expect(await processOpenOrders(bob)).toBe(0);
    const asml = (await getInstrumentBySymbol("ASML"))!.id;
    await expect(placeOrder(bob, { instrumentId: asml, side: "buy", type: "market", quantity: "1", idempotencyKey: randomUUID() })).rejects.toThrow(/USD/);
  });

  it("only links orders to theses the trader can see", async () => {
    const msft = (await getInstrumentBySymbol("MSFT"))!.id;
    const hidden = (await createThesis(carol, { title: "Carol private", visibility: "private" })).id;
    await expect(placeOrder(bob, { instrumentId: msft, side: "buy", type: "market", quantity: "1", thesisId: hidden, idempotencyKey: randomUUID() })).rejects.toThrow(/not found/);
  });
});

describe("feed", () => {
  it("shows friends' posts to friends only, and drops blocked authors", async () => {
    await createPost(alice, { body: "Re-reading the 10-K tonight.", audience: "friends" });
    expect((await listFeed(await buildViewer(bob))).some((p) => p.post.body.includes("10-K"))).toBe(true);
    expect((await listFeed(await buildViewer(carol))).some((p) => p.post.body.includes("10-K"))).toBe(false);
  });

  it("refuses to share a private thesis to friends", async () => {
    const t = await createThesis(alice, { title: "Quiet one", visibility: "private" });
    await expect(createPost(alice, { body: "look", audience: "friends", thesisId: t.id })).rejects.toThrow(/fewer people/);
  });

  it("shares allocation as server-computed percentages", async () => {
    const p = await createPost(alice, { body: "My mix", audience: "friends", insightDimension: "assetClass" });
    expect(p.insight!.slices.every((sl) => /^\d+(\.\d+)?$/.test(sl.percent))).toBe(true);
    expect(p.insight!.verified).toBe(false);
  });

  it("removes blocked users' content", async () => {
    await blockUser(bob, alice);
    expect((await listFeed(await buildViewer(bob))).some((p) => p.author.userId === alice)).toBe(false);
  });
});

describe("guilds", () => {
  it("keeps private guilds invisible and enforces roles", async () => {
    const g = await createGuild(carol, { name: "Quiet Compounders", visibility: "private", joinPolicy: "request" });
    await expect(getGuild(await buildViewer(bob), g.slug)).rejects.toThrow(/not found/);
    await expect(joinGuild(bob, g.id)).rejects.toThrow(/not found/);
  });

  it("runs the request/approve flow and protects the owner", async () => {
    const g = await createGuild(carol, { name: "Dividend Circle", visibility: "discoverable", joinPolicy: "request" });
    expect((await joinGuild(bob, g.id)).status).toBe("requested");
    const [req] = await listPendingRequests(carol, g.id);
    await respondToRequest(carol, req.invite.id, true);
    expect((await getGuild(await buildViewer(bob), g.slug)).role).toBe("member");
    await expect(removeMember(bob, g.id, carol)).rejects.toThrow(/permission/);
  });

  it("withholds analytics until three members consent", async () => {
    const g = await createGuild(alice, { name: "Index Fans", joinPolicy: "open" });
    await setShareAllocation(alice, g.id, true);
    const a = await guildAnalytics(alice, g.id);
    expect(a.available).toBe(false);
  });

  it("hands ownership over when the owner leaves the platform", async () => {
    const g = await createGuild(alice, { name: "Handover Test", joinPolicy: "open" });
    await joinGuild(carol, g.id);
    await handOverOwnedGuilds(db, alice);
    const [row] = await db.select().from(s.guilds).where(eq(s.guilds.id, g.id));
    expect(row.ownerId).toBe(carol);
  });
});

describe("relics", () => {
  it("awards from server-side metrics exactly once", async () => {
    const first = await evaluateRelics(alice);
    expect(first).toContain("first-specimen");
    expect(await evaluateRelics(alice)).toEqual([]);
    const rows = await db.select().from(s.userRelics).where(eq(s.userRelics.userId, alice));
    expect(rows.filter((r) => r.relicKey === "first-specimen")).toHaveLength(1);
  });

  it("counts watchlist breadth", async () => {
    const [wl] = await listWatchlists(carol);
    for (const sym of ["AAPL", "MSFT", "NVDA", "ASML", "SAP"]) await addToWatchlist(carol, wl.id, (await getInstrumentBySymbol(sym))!.id);
    expect(await evaluateRelics(carol)).toContain("watchkeeper");
  });
});

describe("account deletion", () => {
  it("cascades every user-owned row", async () => {
    const dave = await member("Dave", "dave");
    await createThesis(dave, { title: "Delete me" });
    await db.delete(s.user).where(eq(s.user.id, dave));
    for (const table of [s.profiles, s.theses, s.paperAccounts, s.portfolios, s.watchlists]) {
      const rows = await db.select().from(table).where(eq((table as typeof s.theses).userId, dave));
      expect(rows).toHaveLength(0);
    }
  });
});
