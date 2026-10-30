import { and, eq, inArray, ne, sql } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { buildLedger } from "@/domain/accounting";
import { setBrokerProviderForTests, type BrokerActivity, type BrokerPosition, type BrokerProvider, type BrokerUser } from "@/integrations/brokers";
import { createTestDb, createTestUser as createUser, grantFullAccess } from "@/test/db";
import type { Db } from "../db";
import { accounts, brokerConnections, brokerUsers, instruments, transactions } from "../db/schema";
import { resetRateLimits } from "../rate-limit";
import {
  addBrokerAccounts,
  disconnectBroker,
  listUnlinkedBrokerAccounts,
  refreshBrokerConnections,
  startBrokerConnection,
  syncBrokerConnection,
} from "./brokers";
import { getPrices } from "./market";
import { ledgerRows } from "./portfolio";

/** A stand-in broker: one DEGIRO login with two accounts, whose data a test can change. */
class FakeBroker implements BrokerProvider {
  readonly id = "fake";
  registered: string[] = [];
  removed: string[] = [];
  disabled = false;
  limit: number | null = null;
  connectError: number | null = null;
  positions: Record<string, BrokerPosition[]> = {};
  activities: Record<string, BrokerActivity[]> = {};
  status() {
    return { id: this.id, label: "Fake", configured: true, note: "", docsUrl: "", connectionLimit: this.limit };
  }
  async registerUser(ref: string): Promise<BrokerUser> {
    this.registered.push(ref);
    return { userId: ref, userSecret: `secret-for-${ref}` };
  }
  async connectUrl(user: BrokerUser, returnUrl: string, reconnect?: string) {
    if (this.connectError) throw Object.assign(new Error("Refused"), { status: this.connectError });
    return `https://broker.example/connect?u=${user.userId}&back=${encodeURIComponent(returnUrl)}${reconnect ? `&fix=${reconnect}` : ""}`;
  }
  async listConnections() {
    return this.removed.includes("auth-1") ? [] : [{ externalId: "auth-1", institution: "DEGIRO", disabled: this.disabled }];
  }
  async listAccounts() {
    return [
      { externalId: "acc-main", connectionExternalId: "auth-1", name: "Main", institution: "DEGIRO", currency: "EUR" },
      { externalId: "acc-pension", connectionExternalId: "auth-1", name: "Pension", institution: "DEGIRO", currency: "EUR" },
    ];
  }
  async listPositions(_: BrokerUser, accountId: string) {
    if (this.disabled) throw Object.assign(new Error("Brokerage auth disabled"), { status: 402 });
    return this.positions[accountId] ?? [];
  }
  async listActivities(_: BrokerUser, accountId: string) {
    return this.activities[accountId] ?? [];
  }
  async removeConnection(_: BrokerUser, id: string) {
    this.removed.push(id);
  }
  async deleteUser() {}
}

const asml = { symbol: "ASML", name: "ASML Holding", currency: "EUR", kind: "equity" as const };
const vwrl = { symbol: "VWRL", name: "Vanguard FTSE All-World", currency: "EUR", kind: "etf" as const };

let db: Db;
let broker: FakeBroker;

/** Broker linking is part of full access, so test members get it unless a test says otherwise. */
async function createTestUser(database: Db, name: string) {
  const u = await createUser(database, name);
  await grantFullAccess(database, u.id);
  return u;
}

beforeAll(async () => {
  db = await createTestDb();
});
beforeEach(() => {
  resetRateLimits();
  broker = new FakeBroker();
  setBrokerProviderForTests(broker);
});
afterAll(() => setBrokerProviderForTests(null));

async function holdings(userId: string, accountId: string) {
  const { positions } = buildLedger(await ledgerRows(userId, [accountId]));
  return Object.fromEntries(positions.filter((p) => p.quantity.gt(0)).map((p) => [p.instrumentId, p.quantity.toString()]));
}

describe("connecting a broker", () => {
  it("registers the member once, keeps their secret encrypted, and sends them to the broker's page", async () => {
    const u = await createTestUser(db, "Connector");
    const url = await startBrokerConnection(u.id, "http://localhost:3000/portfolio/connected");
    expect(url).toMatch(/^https:\/\/broker\.example\/connect/);
    await startBrokerConnection(u.id, "http://localhost:3000/portfolio/connected");
    expect(broker.registered).toHaveLength(1);
    expect(broker.registered[0]).toMatch(/^portle-[0-9a-f-]{36}$/);
    const [row] = await db.select().from(brokerUsers).where(eq(brokerUsers.userId, u.id));
    expect(row.encryptedSecret).not.toContain("secret-for");
  });

  it("offers the broker's accounts, then copies history and matches today's holdings", async () => {
    const u = await createTestUser(db, "Syncer");
    await startBrokerConnection(u.id, "http://localhost:3000/portfolio/connected");
    expect((await listUnlinkedBrokerAccounts(u.id)).map((a) => a.name)).toEqual(["Main", "Pension"]);

    broker.activities["acc-main"] = [
      { externalId: "t1", type: "deposit", tradeDate: "2026-01-02", security: null, quantity: null, price: null, amount: "5000", fee: "0", currency: "EUR" },
      { externalId: "t2", type: "buy", tradeDate: "2026-01-05", security: asml, quantity: "2", price: "600", amount: null, fee: "2", currency: "EUR" },
    ];
    // The broker holds one more ASML than its history shows, and VWRL with no history at all.
    broker.positions["acc-main"] = [
      { ...asml, quantity: "3", averagePrice: "610", price: "700" },
      { ...vwrl, quantity: "10", averagePrice: "100", price: "120" },
    ];

    const [result] = await addBrokerAccounts(u.id, ["acc-main"]);
    expect(result).toEqual({ ok: true });
    const [acc] = await db.select().from(accounts).where(eq(accounts.userId, u.id));
    expect(acc).toMatchObject({ name: "DEGIRO · Main", source: "broker", externalId: "acc-main" });
    expect(Object.values(await holdings(u.id, acc.id)).sort()).toEqual(["10", "3"]);
    expect((await listUnlinkedBrokerAccounts(u.id)).map((a) => a.name)).toEqual(["Pension"]);

    const rows = await db.select().from(transactions).where(eq(transactions.accountId, acc.id));
    expect(rows.every((r) => r.source === "broker")).toBe(true);
    const before = rows.length;

    // Syncing again changes nothing.
    expect(await syncBrokerConnection(u.id, acc.brokerConnectionId!)).toEqual({ ok: true });
    expect(await db.select().from(transactions).where(eq(transactions.accountId, acc.id))).toHaveLength(before);

    // A sale the broker reports is followed.
    broker.positions["acc-main"] = [{ ...asml, quantity: "3", averagePrice: "610", price: "700" }];
    await syncBrokerConnection(u.id, acc.brokerConnectionId!);
    expect(Object.values(await holdings(u.id, acc.id))).toEqual(["3"]);
  });

  it("keeps the broker's own prices, which beat demo ones everywhere but Practice", async () => {
    const u = await createTestUser(db, "Pricer");
    await startBrokerConnection(u.id, "http://x/back");
    broker.positions["acc-main"] = [
      { ...asml, quantity: "2", averagePrice: "600", price: "712.4" },
      { ...vwrl, quantity: "1", averagePrice: "100", price: null },
    ];
    await addBrokerAccounts(u.id, ["acc-main"]);
    const [acc] = await db.select().from(accounts).where(eq(accounts.userId, u.id));
    const rows = await db
      .select()
      .from(instruments)
      .where(inArray(instruments.id, Object.keys(await holdings(u.id, acc.id))));
    const held = rows.find((r) => r.symbol === "ASML")!;

    const price = (await getPrices(rows, { userId: u.id })).get(held.id)!;
    expect(price).toMatchObject({ currency: "EUR", source: "DEGIRO via Fake", isDemo: false });
    expect(Number(price.price)).toBe(712.4);
    expect((await getPrices([held], "practice")).get(held.id)?.source).not.toBe("DEGIRO via Fake");
  });

  it("links and syncs one broker on the free plan, with only that broker's prices, and asks for Plus for a second", async () => {
    const u = await createUser(db, "Freebie");
    await startBrokerConnection(u.id, "http://x/back");
    broker.positions["acc-main"] = [{ ...asml, quantity: "2", averagePrice: "600", price: "712.4" }];
    await addBrokerAccounts(u.id, ["acc-main"]);
    const [acc] = await db.select().from(accounts).where(eq(accounts.userId, u.id));
    expect(await syncBrokerConnection(u.id, acc.brokerConnectionId!)).toEqual({ ok: true });

    const rows = await db
      .select()
      .from(instruments)
      .where(inArray(instruments.symbol, ["ASML", "AAPL"]));
    const prices = await getPrices(rows, { userId: u.id });
    // The broker's price, and no made-up one for something the broker didn't price.
    expect([...prices.values()].map((p) => p.source)).toEqual(["DEGIRO via Fake"]);

    await expect(startBrokerConnection(u.id, "http://x/back")).rejects.toThrow(/free plan links one broker/);
    // Repairing the one link is always allowed.
    expect(await startBrokerConnection(u.id, "http://x/back", acc.brokerConnectionId!)).toContain("fix=auth-1");
  });

  it("keeps a member's broker price to that member", async () => {
    const a = await createTestUser(db, "Holder");
    await startBrokerConnection(a.id, "http://x/back");
    broker.positions["acc-main"] = [{ ...asml, quantity: "1", averagePrice: "600", price: "699" }];
    await addBrokerAccounts(a.id, ["acc-main"]);
    const [held] = await db.select().from(instruments).where(eq(instruments.symbol, "ASML"));
    expect((await getPrices([held], { userId: a.id })).get(held.id)?.source).toBe("DEGIRO via Fake");

    const b = await createTestUser(db, "Neighbour");
    expect((await getPrices([held], { userId: b.id })).get(held.id)?.source).not.toBe("DEGIRO via Fake");
  });

  it("says plainly when the broker signed Portle out", async () => {
    const u = await createTestUser(db, "SignedOut");
    await startBrokerConnection(u.id, "http://localhost:3000/portfolio/connected");
    await addBrokerAccounts(u.id, ["acc-main"]);
    broker.disabled = true;
    const [conn] = await refreshBrokerConnections(u.id);
    expect(conn.status).toBe("error");
    const res = await syncBrokerConnection(u.id, conn.id);
    expect(res.ok).toBe(false);
    expect(res.error).toMatch(/Reconnect/);
    expect(await startBrokerConnection(u.id, "http://localhost:3000/portfolio/connected", conn.id)).toContain("fix=auth-1");
  });

  it("says plainly when every broker spot is taken, but still lets a member repair their own link", async () => {
    const first = await createTestUser(db, "Spot");
    await startBrokerConnection(first.id, "http://x/back");
    await addBrokerAccounts(first.id, ["acc-main"]);
    // Every active link in this Portle counts, whoever made it.
    const [{ n }] = await db
      .select({ n: sql<number>`count(*)::int` })
      .from(brokerConnections)
      .where(ne(brokerConnections.status, "disconnected"));
    broker.limit = n;

    const late = await createTestUser(db, "Late");
    await expect(startBrokerConnection(late.id, "http://x/back")).rejects.toThrow(/spots are taken/);
    const [conn] = await db.select().from(brokerConnections).where(eq(brokerConnections.userId, first.id));
    expect(await startBrokerConnection(first.id, "http://x/back", conn.id)).toContain("fix=auth-1");
  });

  it("never signs anyone up at the provider when Portle can't store their secret", async () => {
    const u = await createTestUser(db, "BadKey");
    const key = process.env.PORTLE_ENCRYPTION_KEY;
    process.env.PORTLE_ENCRYPTION_KEY = "too-short";
    try {
      await expect(startBrokerConnection(u.id, "http://x/back")).rejects.toThrow(/isn't set up correctly/);
      expect(broker.registered).toEqual([]);
    } finally {
      process.env.PORTLE_ENCRYPTION_KEY = key;
    }
  });

  it("explains a refused new link instead of asking the member to sign in again", async () => {
    const u = await createTestUser(db, "Refused");
    broker.connectError = 403;
    await expect(startBrokerConnection(u.id, "http://x/back")).rejects.toThrow(/spots may be taken/);
    broker.connectError = 500;
    await expect(startBrokerConnection(u.id, "http://x/back")).rejects.toThrow(/didn't answer/);
  });

  it("disconnects, keeping the records or removing them", async () => {
    const keep = await createTestUser(db, "Keeper");
    await startBrokerConnection(keep.id, "http://x/back");
    broker.positions["acc-main"] = [{ ...asml, quantity: "1", averagePrice: "600", price: null }];
    await addBrokerAccounts(keep.id, ["acc-main"]);
    const [conn] = await db.select().from(brokerConnections).where(eq(brokerConnections.userId, keep.id));
    await disconnectBroker(keep.id, conn.id, false);
    expect(broker.removed).toEqual(["auth-1"]);
    const [kept] = await db.select().from(accounts).where(eq(accounts.userId, keep.id));
    expect(kept).toMatchObject({ brokerConnectionId: null, externalId: null, source: "broker" });
    expect(Object.values(await holdings(keep.id, kept.id))).toEqual(["1"]);

    const drop = await createTestUser(db, "Dropper");
    broker.removed = [];
    await startBrokerConnection(drop.id, "http://x/back");
    await addBrokerAccounts(drop.id, ["acc-main"]);
    const [c2] = await db.select().from(brokerConnections).where(eq(brokerConnections.userId, drop.id));
    await disconnectBroker(drop.id, c2.id, true);
    expect(
      await db
        .select()
        .from(accounts)
        .where(and(eq(accounts.userId, drop.id))),
    ).toHaveLength(0);
  });
});
