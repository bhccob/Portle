import { beforeAll, describe, expect, it } from "vitest";
import { createTestDb, createTestUser } from "@/test/db";
import type { Db } from "../db";
import { resetRateLimits } from "../rate-limit";
import { createGuild, joinGuild, suggestGuilds } from "./guilds";
import { getLab } from "./paper";
import { completeOnboarding } from "./profile";
import { buildViewer } from "./viewer";

let db: Db;

beforeAll(async () => {
  db = await createTestDb();
  resetRateLimits();
});

describe("onboarding", () => {
  it("needs only a name, a handle and the terms: no money question", async () => {
    const u = await createTestUser(db, "Newcomer");
    const p = await completeOnboarding(u.id, { handle: "newcomer", displayName: "Newcomer", acceptTerms: true });
    expect(p.handle).toBe("newcomer");
    expect(p.baseCurrency).toBe("EUR");
    expect(p.experience).toBeNull();
    // Practice starts with pretend money on its own, changeable later in Practice.
    expect(Number((await getLab(u.id)).account.startingCash)).toBe(100000);
  });

  it("saves the picked topics, including the new ones, and how long they have invested", async () => {
    const u = await createTestUser(db, "Picker");
    const p = await completeOnboarding(u.id, {
      handle: "picker",
      displayName: "Picker",
      acceptTerms: true,
      interests: ["Market news", "Technology", "ETFs", "Real estate"],
      experience: "starting",
    });
    expect(p.interests).toEqual(["Market news", "Technology", "ETFs", "Real estate"]);
    expect(p.experience).toBe("starting");
  });
});

describe("Guild suggestions", () => {
  it("suggests discoverable Guilds about a member's topics that they have not joined", async () => {
    const owner = await createTestUser(db, "Owner");
    await completeOnboarding(owner.id, { handle: "owner_one", displayName: "Owner", acceptTerms: true });
    const etf = await createGuild(owner.id, { name: "Steady Index", topic: "ETFs and index funds", joinPolicy: "open" });
    const econ = await createGuild(owner.id, { name: "Rate Watchers", topic: "Economy", joinPolicy: "open" });
    await createGuild(owner.id, { name: "Coin Talk", topic: "Crypto", joinPolicy: "open" });
    await createGuild(owner.id, { name: "Hidden ETF circle", topic: "ETFs", visibility: "private" });

    const fan = await createTestUser(db, "Fan");
    await completeOnboarding(fan.id, { handle: "fan", displayName: "Fan", acceptTerms: true, interests: ["ETFs", "Macro"] });
    await joinGuild(fan.id, econ.id);

    const names = (await suggestGuilds(await buildViewer(fan.id), ["ETFs", "Macro"])).map((g) => g.guild.name);
    expect(names).toEqual([etf.name]);
  });

  it("suggests nothing without topics", async () => {
    const u = await createTestUser(db, "Quiet");
    expect(await suggestGuilds(await buildViewer(u.id), [])).toEqual([]);
  });
});
