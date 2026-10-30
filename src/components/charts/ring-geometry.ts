/** Geometry for the portfolio ring: where each slice starts and how long it runs, in stroke units. */

export type RingSlice = { label: string; percent: number };

/** The smallest stroke a non-empty slice is drawn with, so it never disappears behind the gaps. */
const SLIVER = 0.6;

/**
 * Lays shares end to end round a circle of the given circumference. Each slice is
 * shortened by `gap` so neighbours never touch; a lone slice is drawn whole.
 */
export function ringSegments(shares: number[], circumference: number, gap: number) {
  const positive = shares.map((s) => (s > 0 ? s : 0));
  const total = positive.reduce((a, b) => a + b, 0);
  if (total <= 0) return [];
  const drawn = positive.filter((s) => s > 0).length;
  const segments: { offset: number; length: number }[] = [];
  let at = 0;
  for (const s of positive) {
    if (s <= 0) continue;
    const span = (s / total) * circumference;
    segments.push({ offset: round(at), length: drawn === 1 ? circumference : round(Math.max(span - gap, SLIVER)) });
    at += span;
  }
  return segments;
}

/** Keeps the first `max - 1` slices and folds the rest into "Other", so the ring and its legend stay readable. */
export function foldSlices<T extends RingSlice>(slices: T[], max: number): (T | RingSlice)[] {
  if (slices.length <= max) return slices;
  const rest = slices.slice(max - 1).reduce((sum, s) => sum + s.percent, 0);
  return [...slices.slice(0, max - 1), { label: "Other", percent: rest }];
}

const round = (n: number) => Math.round(n * 1000) / 1000;

/**
 * Where marks sit round the ring, in radians clockwise from the top: each slice's middle, then
 * neighbours nudged apart until they are at least `minGap` apart, so small slices' logos never overlap.
 */
export function orbitAngles(shares: number[], minGap: number) {
  const total = shares.reduce((a, b) => a + Math.max(b, 0), 0);
  if (total <= 0) return shares.map(() => 0);
  let at = 0;
  const angles = shares.map((s) => {
    const span = (Math.max(s, 0) / total) * 2 * Math.PI;
    const mid = at + span / 2;
    at += span;
    return mid;
  });
  if (angles.length < 2 || angles.length * minGap > 2 * Math.PI) return angles;
  for (let round = 0; round < 200; round++) {
    let moved = false;
    for (let i = 0; i < angles.length; i++) {
      const j = (i + 1) % angles.length;
      const gap = angles[j] - angles[i] + (j === 0 ? 2 * Math.PI : 0);
      if (gap < minGap - 1e-9) {
        const push = (minGap - gap) / 2;
        angles[i] -= push;
        angles[j] += push;
        moved = true;
      }
    }
    if (!moved) break;
  }
  return angles;
}
