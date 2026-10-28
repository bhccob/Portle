import { describe, expect, it } from "vitest";
import { eligibleRelics, longestStreak, RELICS, type RelicMetrics } from "./relics";

const zero: RelicMetrics = {
  thesesCreated: 0,
  thesesWithInvalidation: 0,
  thesisRevisions: 0,
  thesesClosedWithReview: 0,
  invalidatedWithReview: 0,
  journalDays: 0,
  journalLongestStreak: 0,
  paperReflections: 0,
  thesisLinkedPaperOrders: 0,
  accountsTracked: 0,
  cleanImports: 0,
  watchlistSize: 0,
  guildMemberships: 0,
  commentsOnOthersTheses: 0,
  privacyPreviewed: 0,
};

describe("Relic eligibility", () => {
  it("awards nothing for no activity", () => {
    expect(eligibleRelics(zero)).toEqual([]);
  });

  it("awards exactly at the threshold", () => {
    expect(eligibleRelics({ ...zero, thesesCreated: 1 }).map((r) => r.key)).toEqual(["first-specimen"]);
    expect(eligibleRelics({ ...zero, thesesWithInvalidation: 2 })).toEqual([]);
  });

  it("never rewards trading volume or profit", () => {
    const metricNames = RELICS.map((r) => r.metric.toLowerCase());
    for (const banned of ["profit", "return", "trades", "volume", "gain"]) {
      expect(metricNames.some((m) => m.includes(banned))).toBe(false);
    }
  });

  it("has unique keys and a written rule for every relic", () => {
    expect(new Set(RELICS.map((r) => r.key)).size).toBe(RELICS.length);
    expect(RELICS.every((r) => r.rule.length > 10)).toBe(true);
  });
});

describe("longestStreak", () => {
  it("counts consecutive days and ignores duplicates", () => {
    expect(longestStreak([])).toBe(0);
    expect(longestStreak(["2024-01-01", "2024-01-02", "2024-01-02", "2024-01-04"])).toBe(2);
    expect(longestStreak(["2024-02-28", "2024-02-29", "2024-03-01"])).toBe(3);
  });
});
