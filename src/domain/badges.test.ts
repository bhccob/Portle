import { describe, expect, it } from "vitest";
import { BADGES, BADGE_BY_KEY, badgeLevel, badgeProgress, isMilestone, LEVEL_NAMES, longestStreak, memberFor, type BadgeMetrics } from "./badges";

const zero: BadgeMetrics = {
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
  memberDays: 0,
  brokersLinked: 0,
  costsTracked: 0,
  friends: 0,
  holdingsRecorded: 0,
};
const theses = BADGE_BY_KEY.get("first-specimen")!;

describe("badge levels", () => {
  it("starts at no level and climbs exactly at each threshold", () => {
    expect(BADGES.every((b) => badgeLevel(b, zero) === 0)).toBe(true);
    expect(badgeLevel(theses, { ...zero, thesesCreated: 1 })).toBe(1);
    expect(badgeLevel(theses, { ...zero, thesesCreated: 4 })).toBe(1);
    expect(badgeLevel(theses, { ...zero, thesesCreated: 5 })).toBe(2);
    expect(badgeLevel(theses, { ...zero, thesesCreated: 500 })).toBe(5);
  });

  it("says how far the next level is, and never drops a level already reached", () => {
    expect(badgeProgress(theses, { ...zero, thesesCreated: 7 })).toMatchObject({ level: 2, next: 10, toNext: "3 more theses", fraction: 0.7 });
    expect(badgeProgress(theses, { ...zero, thesesCreated: 9 }).toNext).toBe("1 more thesis");
    expect(badgeProgress(theses, { ...zero, thesesCreated: 60 })).toMatchObject({ level: 5, next: null, toNext: null, fraction: 1 });
    // A thesis deleted later doesn't take the level away.
    expect(badgeProgress(theses, { ...zero, thesesCreated: 2 }, 3).level).toBe(3);
  });

  it("writes every rule out, with five stone levels at most", () => {
    expect(new Set(BADGES.map((b) => b.key)).size).toBe(BADGES.length);
    for (const b of BADGES) {
      expect(b.levels.length).toBeGreaterThan(0);
      expect(b.levels.length).toBeLessThanOrEqual(LEVEL_NAMES.length);
      expect([...b.levels].sort((x, y) => x - y)).toEqual(b.levels);
      expect(b.levels.every((n) => b.rule(n).length > 10)).toBe(true);
    }
    expect(BADGE_BY_KEY.get("years")!.rule(730)).toBe("Be a member for 2 years.");
  });

  it("never rewards trading volume or profit", () => {
    const metricNames = BADGES.map((b) => b.metric.toLowerCase());
    for (const banned of ["profit", "return", "trades", "volume", "gain"]) {
      expect(metricNames.some((m) => m.includes(banned))).toBe(false);
    }
  });
});

describe("time on Portle", () => {
  const years = BADGE_BY_KEY.get("years")!;
  it("levels up once a year and counts down in months", () => {
    expect(badgeProgress(years, { ...zero, memberDays: 60 })).toMatchObject({ level: 0, toNext: "10 more months" });
    expect(badgeProgress(years, { ...zero, memberDays: 400 })).toMatchObject({ level: 1, toNext: "11 more months" });
    expect(badgeProgress(years, { ...zero, memberDays: 720 }).toNext).toBe("10 more days");
    expect(memberFor(425)).toBe("1 year, 1 month");
    expect(memberFor(20)).toBe("20 days");
  });

  it("treats one-level Relics as milestones", () => {
    expect(isMilestone("broker")).toBe(true);
    expect(isMilestone("first-specimen")).toBe(false);
    expect(badgeLevel(BADGE_BY_KEY.get("broker")!, { ...zero, brokersLinked: 1 })).toBe(1);
  });
});

describe("longestStreak", () => {
  it("counts consecutive days and ignores duplicates", () => {
    expect(longestStreak([])).toBe(0);
    expect(longestStreak(["2024-01-01", "2024-01-02", "2024-01-02", "2024-01-04"])).toBe(2);
    expect(longestStreak(["2024-02-28", "2024-02-29", "2024-03-01"])).toBe(3);
  });
});
