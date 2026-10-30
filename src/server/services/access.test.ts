import { eq } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createTestDb, createTestUser } from "@/test/db";
import type { Db } from "../db";
import { instruments, notifications, profiles } from "../db/schema";
import { resetRateLimits } from "../rate-limit";
import { accessOverview, decideAccess, getAccess, inviteByEmail, removeAccess, requestAccess } from "./access";
import { startBrokerConnection } from "./brokers";
import { getPrices } from "./market";

let db: Db;
let owner: { id: string; name: string };
const previousOwners = process.env.OWNER_EMAILS;

async function member(name: string) {
  const u = await createTestUser(db, name);
  await db.insert(profiles).values({ userId: u.id, handle: name.toLowerCase(), displayName: name });
  return u;
}

beforeAll(async () => {
  db = await createTestDb();
  owner = await member("Bob");
  process.env.OWNER_EMAILS = `someone@else.test, ${owner.id}@example.test`;
});
beforeEach(() => resetRateLimits());
afterAll(() => {
  process.env.OWNER_EMAILS = previousOwners;
});

describe("full access", () => {
  it("is on for owners and off for everyone else until they're let in", async () => {
    expect(await getAccess(owner.id)).toEqual({ full: true, owner: true, status: "granted" });
    const sam = await member("Sam");
    expect(await getAccess(sam.id)).toEqual({ full: false, owner: false, status: "none" });
  });

  it("hides real prices without it, but Practice always has pretend ones", async () => {
    const sam = await member("Sam2");
    const [aapl] = await db.select().from(instruments).where(eq(instruments.symbol, "AAPL"));
    expect((await getPrices([aapl], { userId: sam.id })).size).toBe(0);
    expect((await getPrices([aapl], "practice")).get(aapl.id)?.isDemo).toBe(true);
    expect((await getPrices([aapl], { userId: owner.id })).size).toBe(1);
  });

  it("keeps broker linking for members with full access", async () => {
    const sam = await member("Sam3");
    await expect(startBrokerConnection(sam.id, "http://x/back")).rejects.toThrow(/part of full access/);
  });

  it("goes from a request with a note to the owner's answer, notifying both", async () => {
    const lina = await member("Lina");
    await requestAccess(lina.id, "  Hi Bob, it's Lina  ");
    expect((await getAccess(lina.id)).status).toBe("requested");
    const [toOwner] = await db.select().from(notifications).where(eq(notifications.userId, owner.id));
    expect(toOwner).toMatchObject({ kind: "access", href: "/settings/access", body: "Hi Bob, it's Lina" });
    expect((await accessOverview(owner.id)).requests.map((r) => r.name)).toContain("Lina");

    await expect(decideAccess(lina.id, lina.id, true)).rejects.toThrow(/Only the owner/);
    await decideAccess(owner.id, lina.id, true);
    expect((await getAccess(lina.id)).full).toBe(true);
    const [toLina] = await db.select().from(notifications).where(eq(notifications.userId, lina.id));
    expect(toLina.title).toBe("You have full access");
    expect((await accessOverview(owner.id)).members.map((m) => m.name)).toEqual(expect.arrayContaining(["Bob", "Lina"]));

    await removeAccess(owner.id, lina.id);
    expect((await getAccess(lina.id)).status).toBe("none");
  });

  it("lets someone in by email before or after they sign up", async () => {
    const noah = await member("Noah");
    expect(await inviteByEmail(owner.id, `${noah.id}@EXAMPLE.test`)).toEqual({ joined: true });
    expect((await getAccess(noah.id)).full).toBe(true);

    expect(await inviteByEmail(owner.id, "later@example.test")).toEqual({ joined: false });
    expect((await accessOverview(owner.id)).invites.map((i) => i.email)).toContain("later@example.test");
    await expect(inviteByEmail(owner.id, "not an email")).rejects.toThrow(/doesn't look like an email/);
  });

  it("never lets a member see the owner's page or take access from an owner", async () => {
    const eve = await member("Eve");
    await expect(accessOverview(eve.id)).rejects.toThrow(/Only the owner/);
    await expect(removeAccess(owner.id, owner.id)).rejects.toThrow(/Owners always have full access/);
  });
});
