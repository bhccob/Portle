import { beforeAll, describe, expect, it } from "vitest";
import { createTestDb, createTestUser } from "@/test/db";
import type { Db } from "../db";
import { addCost, deleteCost, getSpending, listCosts, updateCost } from "./spending";

let db: Db;

beforeAll(async () => {
  db = await createTestDb();
});

describe("spending", () => {
  it("adds costs in the member's currency and totals them per month and year", async () => {
    const u = await createTestUser(db, "Saver");
    await addCost(u.id, { name: "Rent", amount: "850", frequency: "monthly", category: "housing", nextDate: "2026-11-01" });
    await addCost(u.id, { name: "Car insurance", amount: "540,00", frequency: "yearly", category: "insurance", nextDate: "" });
    const month = await getSpending(u.id, "month");
    expect(month.currency).toBe("EUR");
    expect(month.total.toFixed(2)).toBe("895.00");
    expect(month.byCategory.map((c) => c.category)).toEqual(["housing", "insurance"]);
    expect((await getSpending(u.id, "year")).total.toFixed(2)).toBe("10740.00");
  });

  it("explains what's wrong with a cost instead of saving it", async () => {
    const u = await createTestUser(db, "Typo");
    await expect(addCost(u.id, { name: "", amount: "abc", frequency: "daily", category: "fun" })).rejects.toMatchObject({
      issues: expect.arrayContaining([
        expect.objectContaining({ path: ["name"] }),
        expect.objectContaining({ path: ["amount"], message: "Enter an amount, like 45 or 13.99." }),
        expect.objectContaining({ path: ["frequency"] }),
        expect.objectContaining({ path: ["category"] }),
      ]),
    });
  });

  it("only lets the owner change or remove a cost", async () => {
    const owner = await createTestUser(db, "Owner");
    const other = await createTestUser(db, "Other");
    const cost = await addCost(owner.id, { name: "Gym", amount: "29.99", frequency: "monthly", category: "subscriptions" });
    await expect(updateCost(other.id, cost.id, { name: "Mine now", amount: "1", frequency: "monthly", category: "other" })).rejects.toThrow(/not found/);
    await expect(deleteCost(other.id, cost.id)).rejects.toThrow(/not found/);
    expect(await listCosts(other.id)).toEqual([]);

    await updateCost(owner.id, cost.id, { name: "Gym", amount: "34.99", frequency: "monthly", category: "subscriptions" });
    expect((await listCosts(owner.id))[0].amount).toBe("34.9900000000");
    await deleteCost(owner.id, cost.id);
    expect(await listCosts(owner.id)).toEqual([]);
  });
});
