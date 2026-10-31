import { describe, expect, it } from "vitest";
import { ratesNote } from "./format";

describe("ratesNote", () => {
  it("says whose rates and from which day", () => {
    expect(ratesNote({ isDemo: false, asOf: "2026-10-30" })).toBe("European Central Bank rates from 30 Oct");
  });

  it("never passes demo rates off as real ones", () => {
    expect(ratesNote({ isDemo: true, asOf: "demo" })).toBe("Demo rates, fixed for testing");
  });
});
