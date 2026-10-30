import { beforeAll, describe, expect, it } from "vitest";
import { createTestDb, createTestUser } from "@/test/db";
import type { Db } from "../db";
import { getPrices, searchInstruments } from "./market";
import { addOwnItem, createAccount, getValuation, listOwnItems, setOwnPrice } from "./portfolio";

let db: Db;
beforeAll(async () => {
  db = await createTestDb();
});

describe("things priced by hand", () => {
  it("values gold at the member's own price, on the free plan, and keeps it out of everyone's search", async () => {
    const u = await createTestUser(db, "Goldie");
    const acc = await createAccount(u.id, { name: "Safe", currency: "EUR" });
    const coin = await addOwnItem(u.id, {
      accountId: acc.id,
      name: "Gold coins",
      quantity: "4",
      price: "250",
      cost: "200",
      currency: "EUR",
      tradeDate: "2026-01-02",
    });

    const price = (await getPrices([coin], { userId: u.id })).get(coin.id)!;
    expect(price).toMatchObject({ source: "Your own price", isDemo: false, currency: "EUR" });
    expect(Number(price.price)).toBe(250);

    const { valuation } = await getValuation(u.id);
    const held = valuation.holdings.find((h) => h.instrument.id === coin.id)!;
    expect(held.marketValue?.toString()).toBe("1000");
    expect(held.unrealizedBase?.toString()).toBe("200");

    await setOwnPrice(u.id, coin.id, "300");
    expect(Number((await listOwnItems(u.id))[0].price)).toBe(300);
    expect((await searchInstruments("Gold coins")).map((r) => r.id)).not.toContain(coin.id);

    const other = await createTestUser(db, "Snoop");
    await expect(setOwnPrice(other.id, coin.id, "1")).rejects.toThrow(/not found/i);
    expect((await getPrices([coin], { userId: other.id })).size).toBe(0);
  });
});
