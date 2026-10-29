import { describe, expect, it } from "vitest";
import { addDays, addMonths, isIsoDay, reviewState, utcToday } from "./review";

describe("revisit dates", () => {
  it("reads today as a UTC calendar day", () => {
    expect(utcToday(new Date("2026-10-29T23:30:00Z"))).toBe("2026-10-29");
  });

  it("accepts only real calendar days", () => {
    expect(isIsoDay("2027-02-28")).toBe(true);
    expect(isIsoDay("2028-02-29")).toBe(true);
    expect(isIsoDay("2027-02-29")).toBe(false);
    expect(isIsoDay("2027-2-1")).toBe(false);
    expect(isIsoDay("next tuesday")).toBe(false);
  });

  it("adds months, clamping to the end of shorter months", () => {
    expect(addMonths("2026-10-29", 3)).toBe("2027-01-29");
    expect(addMonths("2027-01-31", 1)).toBe("2027-02-28");
    expect(addMonths("2026-08-31", 6)).toBe("2027-02-28");
    expect(addMonths("2026-10-29", 12)).toBe("2027-10-29");
    expect(addDays("2026-12-25", 14)).toBe("2027-01-08");
  });

  it("is due on the day, soon within two weeks, and never for closed theses", () => {
    expect(reviewState("2026-10-29", "active", "2026-10-29")).toBe("due");
    expect(reviewState("2026-10-01", "researching", "2026-10-29")).toBe("due");
    expect(reviewState("2026-11-05", "active", "2026-10-29")).toBe("soon");
    expect(reviewState("2027-01-29", "active", "2026-10-29")).toBe("upcoming");
    expect(reviewState("2026-10-01", "validated", "2026-10-29")).toBe("none");
    expect(reviewState(null, "active", "2026-10-29")).toBe("none");
  });
});
