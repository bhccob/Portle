import { eq } from "drizzle-orm";
import { beforeAll, describe, expect, it } from "vitest";
import { profileSections } from "@/domain/profile-layout";
import { createTestDb, createTestUser } from "@/test/db";
import type { Db } from "../db";
import { privacySettings } from "../db/schema";
import { completeOnboarding, deleteExperience, getProfileView, saveExperience, updateProfile } from "./profile";
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
    ).toEqual(["experience:true", "about:false", "invest:true", "featured:true", "theses:true", "allocation:true", "guilds:true"]);
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
