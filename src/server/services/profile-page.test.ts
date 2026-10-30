import { eq } from "drizzle-orm";
import { beforeAll, describe, expect, it } from "vitest";
import { profileSections } from "@/domain/profile-layout";
import { createTestDb, createTestUser } from "@/test/db";
import type { Db } from "../db";
import { notifications, privacySettings } from "../db/schema";
import { completeOnboarding, deleteExperience, getProfileView, saveExperience, updateProfile } from "./profile";
import { addProfileComment, deleteProfileComment } from "./profile-comments";
import { blockUser, respondFriendRequest, sendFriendRequest } from "./social";
import { createThesis } from "./theses";
import { buildViewer } from "./viewer";

let db: Db;
let bob: string;
let cleo: string;

const base = { displayName: "Bob Chung", bio: "I write things down.", interests: [], avatarHue: "262" };

beforeAll(async () => {
  db = await createTestDb();
  for (const [name, handle] of [
    ["Bob Chung", "bob_page"],
    ["Cleo", "cleo_page"],
  ] as const) {
    const u = await createTestUser(db, name);
    await completeOnboarding(u.id, { handle, displayName: name, baseCurrency: "EUR", acceptTerms: true, paperStartingCash: "10000" });
    if (handle === "bob_page") bob = u.id;
    else cleo = u.id;
  }
  // Bob's profile is open to every member, so Cleo sees it without being a friend.
  await db.update(privacySettings).set({ profileVisibility: "public" }).where(eq(privacySettings.userId, bob));
});

describe("profile page", () => {
  it("keeps a member's order and puts new sections back at the end", () => {
    expect(
      profileSections([
        { key: "experience", visible: true },
        { key: "about", visible: false },
      ]).map((s) => `${s.key}:${s.visible}`),
    ).toEqual(["experience:true", "about:false", "featured:true", "theses:true", "guilds:true", "comments:true"]);
  });

  it("drops sections that left the profile, like How I invest and Allocation", () => {
    expect(
      profileSections([
        { key: "invest", visible: true },
        { key: "allocation", visible: true },
        { key: "theses", visible: false },
      ] as never).map((s) => s.key),
    ).toEqual(["theses", "about", "featured", "experience", "guilds", "comments"]);
  });

  it("takes a longer About me, up to 3,000 characters", async () => {
    await updateProfile(bob, { ...base, bio: `# Hi\n\n${"a".repeat(2990)}` });
    expect((await getProfileView(await buildViewer(cleo), "bob_page")).profile.bio).toMatch(/^# Hi/);
    await expect(updateProfile(bob, { ...base, bio: "a".repeat(3001) })).rejects.toMatchObject({
      issues: [expect.objectContaining({ path: ["bio"] })],
    });
  });

  it("saves the headline, links, how they invest and the section order", async () => {
    await updateProfile(bob, {
      ...base,
      headline: "Building Portle",
      location: "Rotterdam, NL",
      bannerStyle: "night",
      links: { website: "https://portle.cc", github: "" },
      investingSince: 2021,
      approach: "Index first",
      horizon: "10+ years",
      sections: [{ key: "experience", visible: true }],
    });
    const view = await getProfileView(await buildViewer(cleo), "bob_page");
    expect(view.profile).toMatchObject({
      headline: "Building Portle",
      location: "Rotterdam, NL",
      bannerStyle: "night",
      investingSince: 2021,
      horizon: "10+ years",
    });
    expect(view.profile.links).toEqual({ website: "https://portle.cc" });
    expect(view.sections[0]).toEqual({ key: "experience", visible: true });
  });

  it("refuses links that aren't web addresses", async () => {
    await expect(updateProfile(bob, { ...base, links: { website: "javascript:alert(1)" } })).rejects.toMatchObject({
      issues: [expect.objectContaining({ path: ["links", "website"] })],
    });
  });

  it("pins only your own theses, and shows each viewer only the ones they may read", async () => {
    const open = await createThesis(bob, { title: "Index core stays the default", instrumentId: null, visibility: "public" } as never);
    const hidden = await createThesis(bob, { title: "A private hunch", instrumentId: null, visibility: "private" } as never);
    const other = await createThesis(cleo, { title: "Not Bob's", instrumentId: null, visibility: "public" } as never);
    await updateProfile(bob, { ...base, featuredThesisIds: [hidden.id, other.id, open.id] });
    const asCleo = await getProfileView(await buildViewer(cleo), "bob_page");
    expect(asCleo.featured.map((t) => t.title)).toEqual(["Index core stays the default"]);
    const asBob = await getProfileView(await buildViewer(bob), "bob_page");
    expect(asBob.featured.map((t) => t.title)).toEqual(["A private hunch", "Index core stays the default"]);
  });

  it("lists experience newest first, with what's still going on top", async () => {
    await saveExperience(bob, { title: "Software development", organisation: "School", startYear: 2024, endYear: "now" });
    const old = await saveExperience(bob, { title: "Shop assistant", startYear: 2020, endYear: 2022 });
    await saveExperience(bob, { title: "Founder & CEO", organisation: "Portle", startYear: 2026, endYear: "" });
    await expect(saveExperience(bob, { title: "Backwards", startYear: 2024, endYear: 2020 })).rejects.toMatchObject({
      issues: [expect.objectContaining({ message: "It can't end before it starts." })],
    });
    await expect(saveExperience(cleo, { title: "Mine now", startYear: 2020, endYear: "now" }, old.id)).rejects.toThrow(/not found/);
    const view = await getProfileView(await buildViewer(cleo), "bob_page");
    expect(view.experience.map((e) => e.title)).toEqual(["Founder & CEO", "Software development", "Shop assistant"]);
    await deleteExperience(bob, old.id);
    expect((await getProfileView(await buildViewer(cleo), "bob_page")).experience).toHaveLength(2);
  });
});

describe("profile comments", () => {
  it("lets only friends comment until the owner opens it up", async () => {
    await updateProfile(bob, base);
    const asCleo = await getProfileView(await buildViewer(cleo), "bob_page");
    expect(asCleo.canComment).toBe(false);
    await expect(addProfileComment(await buildViewer(cleo), bob, "Hello!")).rejects.toThrow(/can't comment/);

    await updateProfile(bob, { ...base, commentAudience: "public" });
    await addProfileComment(await buildViewer(cleo), bob, "  Your index thesis was clear.  ");
    const view = await getProfileView(await buildViewer(cleo), "bob_page");
    expect(view.canComment).toBe(true);
    expect(view.comments?.total).toBe(1);
    expect(view.comments?.comments[0]).toMatchObject({ body: "Your index thesis was clear.", author: { handle: "cleo_page" } });
    const n = (await db.select().from(notifications).where(eq(notifications.userId, bob))).find((r) => r.kind === "comment");
    expect(n).toMatchObject({ kind: "comment", title: "Cleo commented on your profile", href: "/u/bob_page#comments" });
  });

  it("refuses empty and overlong comments", async () => {
    const v = await buildViewer(cleo);
    await expect(addProfileComment(v, bob, "   ")).rejects.toThrow(/Write a comment/);
    await expect(addProfileComment(v, bob, "a".repeat(1001))).rejects.toThrow(/limited to 1,000/);
  });

  it("lets the author or the profile's owner delete a comment, and nobody else", async () => {
    const dan = (await createTestUser(db, "Dan")).id;
    await completeOnboarding(dan, { handle: "dan_page", displayName: "Dan", baseCurrency: "EUR", acceptTerms: true, paperStartingCash: "10000" });
    const mine = await addProfileComment(await buildViewer(cleo), bob, "Delete me later");
    const other = await addProfileComment(await buildViewer(cleo), bob, "Bob removes this one");
    await expect(deleteProfileComment(dan, mine.id)).rejects.toThrow(/not found/);
    await deleteProfileComment(cleo, mine.id);
    await deleteProfileComment(bob, other.id);
    const left = (await getProfileView(await buildViewer(cleo), "bob_page")).comments!.comments.map((c) => c.body);
    expect(left).not.toContain("Delete me later");
    expect(left).not.toContain("Bob removes this one");
  });

  it("hides every comment, and the box, when comments are off", async () => {
    await updateProfile(bob, { ...base, commentAudience: "private" });
    const asBob = await getProfileView(await buildViewer(bob), "bob_page");
    expect(asBob.comments).toBeNull();
    expect(asBob.canComment).toBe(false);
    await expect(addProfileComment(await buildViewer(cleo), bob, "Still there?")).rejects.toThrow(/can't comment/);
  });

  it("hides comments from members on either side of a block", async () => {
    await updateProfile(bob, { ...base, commentAudience: "public" });
    const erin = (await createTestUser(db, "Erin")).id;
    await completeOnboarding(erin, { handle: "erin_page", displayName: "Erin", baseCurrency: "EUR", acceptTerms: true, paperStartingCash: "10000" });
    await addProfileComment(await buildViewer(erin), bob, "From Erin");
    await blockUser(cleo, erin);
    const asCleo = await getProfileView(await buildViewer(cleo), "bob_page");
    expect(asCleo.comments!.comments.map((c) => c.body)).not.toContain("From Erin");
    expect((await getProfileView(await buildViewer(bob), "bob_page")).comments!.comments.map((c) => c.body)).toContain("From Erin");
  });

  it("only shows who someone's friends are to them and their friends", async () => {
    await sendFriendRequest(cleo, bob);
    await respondFriendRequest(bob, cleo, true);
    const asBob = await getProfileView(await buildViewer(bob), "bob_page");
    expect(asBob.friends.map((f) => f.handle)).toEqual(["cleo_page"]);
    const fred = (await createTestUser(db, "Fred")).id;
    await completeOnboarding(fred, { handle: "fred_page", displayName: "Fred", baseCurrency: "EUR", acceptTerms: true, paperStartingCash: "10000" });
    const asFred = await getProfileView(await buildViewer(fred), "bob_page");
    expect(asFred.friendCount).toBe(1);
    expect(asFred.friends).toEqual([]);
  });
});
