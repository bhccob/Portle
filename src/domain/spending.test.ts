import { describe, expect, it } from "vitest";
import { d } from "./money";
import { costPer, nextPayment, summarizeCosts, type CostInput } from "./spending";

const cost = (c: Partial<CostInput> & Pick<CostInput, "name" | "amount" | "frequency" | "category">): CostInput => ({
  id: c.name,
  currency: "EUR",
  nextDate: null,
  ...c,
});

describe("spending", () => {
  it("turns any frequency into a month or a year", () => {
    expect(costPer("540", "yearly", "month").toFixed(2)).toBe("45.00");
    expect(costPer("10", "weekly", "month").toFixed(2)).toBe("43.33");
    expect(costPer("90", "quarterly", "year").toFixed(2)).toBe("360.00");
    expect(costPer("850", "monthly", "year").toFixed(2)).toBe("10200.00");
  });

  it("moves a past payment date forward, keeping month ends", () => {
    expect(nextPayment("2026-10-01", "monthly", "2026-10-30")).toBe("2026-11-01");
    expect(nextPayment("2026-01-31", "monthly", "2026-02-10")).toBe("2026-02-28");
    expect(nextPayment("2026-01-31", "monthly", "2026-03-01")).toBe("2026-03-31");
    expect(nextPayment("2026-10-28", "weekly", "2026-10-30")).toBe("2026-11-04");
    expect(nextPayment("2025-01-15", "yearly", "2026-10-30")).toBe("2027-01-15");
    expect(nextPayment("2026-12-01", "quarterly", "2026-10-30")).toBe("2026-12-01");
    expect(nextPayment(null, "monthly", "2026-10-30")).toBeNull();
  });

  it("adds up by category, lists what's due soon, and leaves out what it can't convert", () => {
    const s = summarizeCosts(
      [
        cost({ name: "Rent", amount: "850", frequency: "monthly", category: "housing", nextDate: "2026-10-01" }),
        cost({ name: "Car insurance", amount: "540", frequency: "yearly", category: "insurance", nextDate: "2027-01-15" }),
        cost({ name: "Groceries", amount: "320", frequency: "monthly", category: "groceries" }),
        cost({ name: "Spotify", amount: "11.99", frequency: "monthly", category: "subscriptions", currency: "USD", nextDate: "2026-11-04" }),
        cost({ name: "Odd", amount: "5", frequency: "monthly", category: "other", currency: "XYZ" }),
      ],
      { per: "month", currency: "EUR", today: "2026-10-30", convert: (a, from) => (from === "USD" ? a.times("0.9") : null) },
    );
    expect(s.total.toFixed(2)).toBe("1225.79");
    expect(s.byCategory.map((c) => c.category)).toEqual(["housing", "groceries", "insurance", "subscriptions"]);
    expect(s.byCategory[0].share.toFixed(4)).toBe("0.6934");
    expect(s.upcoming.map((u) => [u.name, u.next])).toEqual([
      ["Rent", "2026-11-01"],
      ["Spotify", "2026-11-04"],
    ]);
    expect(s.uncounted).toEqual(["Odd"]);
    expect(summarizeCosts([], { per: "year", currency: "EUR", today: "2026-10-30" }).total.eq(d(0))).toBe(true);
  });
});
