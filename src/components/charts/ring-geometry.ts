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
