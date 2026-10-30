import { d, sum, ZERO, type Dec } from "./money";

export const FREQUENCIES = ["weekly", "monthly", "quarterly", "yearly"] as const;
export type Frequency = (typeof FREQUENCIES)[number];

export const FREQUENCY_LABEL: Record<Frequency, string> = {
  weekly: "Every week",
  monthly: "Every month",
  quarterly: "Every 3 months",
  yearly: "Every year",
};

export const CATEGORIES = ["housing", "groceries", "insurance", "bills", "subscriptions", "transport", "other"] as const;
export type Category = (typeof CATEGORIES)[number];

export const CATEGORY_LABEL: Record<Category, string> = {
  housing: "Housing",
  groceries: "Groceries",
  insurance: "Insurance",
  bills: "Bills",
  subscriptions: "Subscriptions",
  transport: "Transport",
  other: "Other",
};

const PER_YEAR: Record<Frequency, number> = { weekly: 52, monthly: 12, quarterly: 4, yearly: 1 };

export type Per = "month" | "year";

/** What a cost comes to per month or per year. A week is 52 a year, so a weekly €10 is €43.33 a month. */
export function costPer(amount: Dec | string, frequency: Frequency, per: Per): Dec {
  const yearly = d(amount).times(PER_YEAR[frequency]);
  return per === "year" ? yearly : yearly.div(12);
}

const iso = (t: Date) => t.toISOString().slice(0, 10);

/** Adds months, keeping the day where the month has it and the month's last day where it doesn't (31 Jan + 1 month = 28 Feb). */
function addMonths(day: string, months: number) {
  const [y, m, dd] = day.split("-").map(Number);
  const first = new Date(Date.UTC(y, m - 1 + months, 1));
  const last = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0)).getUTCDate();
  return iso(new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth(), Math.min(dd, last))));
}

/** The next time a cost is paid on or after `today`, moving a past date forward by its frequency. */
export function nextPayment(nextDate: string | null, frequency: Frequency, today: string): string | null {
  if (!nextDate) return null;
  // Step from the date the member gave, so a monthly cost on the 31st keeps coming back to the month's end.
  for (let n = 0; n < 5000; n++) {
    const candidate =
      frequency === "weekly"
        ? iso(new Date(Date.parse(nextDate) + n * 7 * 86400_000))
        : addMonths(nextDate, n * { monthly: 1, quarterly: 3, yearly: 12 }[frequency]);
    if (candidate >= today) return candidate;
  }
  return null;
}

export type CostInput = { id: string; name: string; amount: string; currency: string; frequency: Frequency; category: Category; nextDate: string | null };

/**
 * The Spending page in numbers: the total per month or year in one currency, each category's share,
 * and what's due in the next 30 days. `convert` turns other currencies into `currency`; a cost it
 * can't convert is left out of the totals rather than guessed.
 */
export function summarizeCosts(costs: CostInput[], opts: { per: Per; currency: string; today: string; convert?: (amount: Dec, from: string) => Dec | null }) {
  const items = costs.map((c) => {
    const native = costPer(c.amount, c.frequency, opts.per);
    const inBase = c.currency === opts.currency ? native : (opts.convert?.(native, c.currency) ?? null);
    return { ...c, per: native, inBase, next: nextPayment(c.nextDate, c.frequency, opts.today) };
  });
  const counted = items.filter((i) => i.inBase);
  const total = sum(counted.map((i) => i.inBase!));
  const categories = new Map<Category, Dec>();
  for (const i of counted) categories.set(i.category, (categories.get(i.category) ?? ZERO).plus(i.inBase!));
  const horizon = iso(new Date(Date.parse(opts.today) + 30 * 86400_000));
  return {
    total,
    byCategory: [...categories.entries()]
      .map(([category, amount]) => ({ category, amount, share: total.gt(0) ? amount.div(total) : ZERO }))
      .sort((a, b) => b.amount.cmp(a.amount)),
    items: items.sort((a, b) => (b.inBase ?? ZERO).cmp(a.inBase ?? ZERO)),
    upcoming: items.filter((i) => i.next && i.next <= horizon).sort((a, b) => a.next!.localeCompare(b.next!)),
    uncounted: items.filter((i) => !i.inBase).map((i) => i.name),
  };
}
