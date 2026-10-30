import { describe, expect, it } from "vitest";
import { foldSlices, orbitAngles, ringSegments } from "./ring-geometry";

describe("ring geometry", () => {
  it("lays slices end to end round the ring, each shortened by the gap", () => {
    const segs = ringSegments([0.5, 0.3, 0.2], 100, 2);
    expect(segs.map((s) => s.offset)).toEqual([0, 50, 80]);
    expect(segs.map((s) => s.length)).toEqual([48, 28, 18]);
  });

  it("normalises shares that do not add up to one", () => {
    const segs = ringSegments([2, 1, 1], 100, 0);
    expect(segs.map((s) => s.length)).toEqual([50, 25, 25]);
  });

  it("keeps a sliver visible for a tiny slice instead of a negative length", () => {
    const [, tiny] = ringSegments([0.999, 0.001], 100, 2);
    expect(tiny.length).toBeGreaterThan(0);
  });

  it("draws one whole ring, with no gap, for a single slice", () => {
    expect(ringSegments([1], 100, 2)).toEqual([{ offset: 0, length: 100 }]);
  });

  it("skips empty and negative slices", () => {
    expect(ringSegments([0, -1], 100, 2)).toEqual([]);
  });

  it("folds everything past the limit into Other, keeping order and the total", () => {
    const slices = ["A", "B", "C", "D"].map((label, i) => ({ label, percent: [0.4, 0.3, 0.2, 0.1][i] }));
    const folded = foldSlices(slices, 3);
    expect(folded.map((s) => s.label)).toEqual(["A", "B", "Other"]);
    expect(folded[2].percent).toBeCloseTo(0.3);
  });

  it("leaves short lists alone", () => {
    const slices = [{ label: "A", percent: 1 }];
    expect(foldSlices(slices, 6)).toBe(slices);
  });

  it("puts each mark in the middle of its slice, clockwise from the top", () => {
    const [a, b] = orbitAngles([0.5, 0.5], 0.1);
    expect(a).toBeCloseTo(Math.PI / 2);
    expect(b).toBeCloseTo((3 * Math.PI) / 2);
  });

  it("nudges marks on small neighbouring slices apart", () => {
    const angles = orbitAngles([0.9, 0.04, 0.03, 0.03], 0.5);
    for (let i = 1; i < angles.length; i++) expect(angles[i] - angles[i - 1]).toBeGreaterThanOrEqual(0.5 - 1e-6);
    expect(angles[0] + 2 * Math.PI - angles[angles.length - 1]).toBeGreaterThanOrEqual(0.5 - 1e-6);
  });
});
