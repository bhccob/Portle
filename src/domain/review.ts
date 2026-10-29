/**
 * Revisit dates for theses. Dates are calendar days in ISO form (YYYY-MM-DD),
 * compared as UTC days, the same convention journal entries use.
 */

export const OPEN_STATUSES = ["researching", "active", "under_review"] as const;

const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;

export function utcToday(now = new Date()): string {
  return now.toISOString().slice(0, 10);
}

/** True for a real calendar day such as 2027-02-28 (not 2027-02-30). */
export function isIsoDay(value: string): boolean {
  if (!ISO_DAY.test(value)) return false;
  const d = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
}

/** Adds whole months, clamping to the end of a shorter month (31 Jan + 1 month = 28 or 29 Feb). */
export function addMonths(day: string, months: number): string {
  const [y, m, d] = day.split("-").map(Number);
  const target = new Date(Date.UTC(y, m - 1 + months, 1));
  const lastDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
  target.setUTCDate(Math.min(d, lastDay));
  return target.toISOString().slice(0, 10);
}

export type ReviewState = "none" | "upcoming" | "soon" | "due";

/** "due" on or after the date; "soon" within the next 14 days. Closed theses never come due. */
export function reviewState(reviewOn: string | null, status: string, today: string): ReviewState {
  if (!reviewOn || !(OPEN_STATUSES as readonly string[]).includes(status)) return "none";
  if (reviewOn <= today) return "due";
  return reviewOn <= addDays(today, 14) ? "soon" : "upcoming";
}

export function addDays(day: string, days: number): string {
  const d = new Date(`${day}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
