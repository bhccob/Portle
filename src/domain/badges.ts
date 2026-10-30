/**
 * Badges reward process, not outcomes: research, revision, reflection,
 * consistency, learning and helping others. No rule references trade
 * frequency, position size, leverage or profit.
 *
 * Most badges level up through five stones, and the icon changes at each one.
 * Founder and Early member are special: they have one level and can't be worked for.
 */
export type BadgeMetrics = {
  thesesCreated: number;
  thesesWithInvalidation: number;
  thesisRevisions: number;
  thesesClosedWithReview: number;
  invalidatedWithReview: number;
  journalDays: number;
  journalLongestStreak: number;
  paperReflections: number;
  thesisLinkedPaperOrders: number;
  accountsTracked: number;
  cleanImports: number;
  watchlistSize: number;
  guildMemberships: number;
  commentsOnOthersTheses: number;
  privacyPreviewed: number;
  memberDays: number;
};

export const LEVEL_NAMES = ["Pebble", "Quartz", "Amethyst", "Geode", "Diamond"] as const;

export type BadgeDefinition = {
  key: string;
  name: string;
  description: string;
  metric: keyof BadgeMetrics;
  /** What each level needs, lowest first. One entry for a badge that doesn't level up. */
  levels: number[];
  /** The transparent rule for reaching `n`, shown to the member verbatim. */
  rule: (n: number) => string;
  /** "3 more theses": singular and plural of what counts. */
  unit: [string, string];
};

const plural = (n: number, [one, many]: [string, string]) => `${n} ${n === 1 ? one : many}`;
const AGE = new Map([
  [30, "1 month"],
  [90, "3 months"],
  [180, "6 months"],
  [365, "1 year"],
  [730, "2 years"],
]);

/** The keys predate badges (they were Relics), so members keep what they earned. */
export const BADGES: BadgeDefinition[] = [
  {
    key: "member",
    name: "Member",
    description: "Time on Portle. Keep coming back and time does the rest.",
    metric: "memberDays",
    levels: [30, 90, 180, 365, 730],
    rule: (n) => `Be a member for ${AGE.get(n) ?? plural(n, ["day", "days"])}.`,
    unit: ["day", "days"],
  },
  {
    key: "first-specimen",
    name: "Thesis writer",
    description: "Theses in your archive, each with your reasons written down.",
    metric: "thesesCreated",
    levels: [1, 5, 10, 25, 50],
    rule: (n) => `Write ${plural(n, ["thesis", "theses"])}.`,
    unit: ["thesis", "theses"],
  },
  {
    key: "fault-line",
    name: "Fault lines",
    description: "Theses that say what would prove you wrong.",
    metric: "thesesWithInvalidation",
    levels: [1, 3, 10, 25, 50],
    rule: (n) => `Write down what would prove you wrong on ${plural(n, ["thesis", "theses"])}.`,
    unit: ["thesis", "theses"],
  },
  {
    key: "growth-rings",
    name: "Growth rings",
    description: "Your reasoning grew in layers as the evidence changed.",
    metric: "thesisRevisions",
    levels: [1, 5, 15, 30, 60],
    rule: (n) => `Revise your theses ${plural(n, ["time", "times"])} after the first draft.`,
    unit: ["revision", "revisions"],
  },
  {
    key: "closing-note",
    name: "Closing notes",
    description: "Theses you concluded with a written review of how they played out.",
    metric: "thesesClosedWithReview",
    levels: [1, 3, 10, 20, 40],
    rule: (n) => `Close ${plural(n, ["thesis", "theses"])} as validated or invalidated, with a note saying why.`,
    unit: ["closed thesis", "closed theses"],
  },
  {
    key: "honest-ledger",
    name: "Honest ledger",
    description: "Times you said plainly that a thesis was wrong, and why.",
    metric: "invalidatedWithReview",
    levels: [1, 3, 5, 10, 20],
    rule: (n) => `Mark ${plural(n, ["thesis", "theses"])} invalidated, with a note explaining what you learned.`,
    unit: ["honest review", "honest reviews"],
  },
  {
    key: "lamplighter",
    name: "Journal keeper",
    description: "Days you wrote in your journal.",
    metric: "journalDays",
    levels: [7, 30, 60, 120, 365],
    rule: (n) => `Write in your journal on ${plural(n, ["day", "days"])}.`,
    unit: ["day", "days"],
  },
  {
    key: "unbroken-seam",
    name: "Streak",
    description: "Your longest run of journal days in a row.",
    metric: "journalLongestStreak",
    levels: [3, 7, 14, 30, 100],
    rule: (n) => `Write in your journal ${n} days in a row.`,
    unit: ["day in a row", "days in a row"],
  },
  {
    key: "rehearsal",
    name: "Rehearsal",
    description: "Practice trades that test a thesis before real money does.",
    metric: "thesisLinkedPaperOrders",
    levels: [3, 10, 25, 50, 100],
    rule: (n) => `Make ${plural(n, ["practice trade", "practice trades"])} linked to a thesis.`,
    unit: ["practice trade", "practice trades"],
  },
  {
    key: "post-mortem",
    name: "Post-mortem",
    description: "Journal entries looking back at a practice trade.",
    metric: "paperReflections",
    levels: [1, 5, 15, 30, 60],
    rule: (n) => `Write ${plural(n, ["journal entry", "journal entries"])} about a practice trade.`,
    unit: ["reflection", "reflections"],
  },
  {
    key: "cartographer",
    name: "Cartographer",
    description: "Accounts you keep track of in Portle.",
    metric: "accountsTracked",
    levels: [2, 3, 4, 6, 10],
    rule: (n) => `Track holdings in ${plural(n, ["account", "accounts"])}.`,
    unit: ["account", "accounts"],
  },
  {
    key: "clean-import",
    name: "Clean imports",
    description: "Broker exports imported without a single error.",
    metric: "cleanImports",
    levels: [1, 3, 10, 25, 50],
    rule: (n) => `Import ${plural(n, ["CSV", "CSVs"])} with no errors.`,
    unit: ["import", "imports"],
  },
  {
    key: "watchkeeper",
    name: "Watchkeeper",
    description: "Securities you're studying on one watchlist.",
    metric: "watchlistSize",
    levels: [5, 10, 25, 50, 100],
    rule: (n) => `Keep ${plural(n, ["security", "securities"])} on one watchlist.`,
    unit: ["security", "securities"],
  },
  {
    key: "veil",
    name: "Privacy check",
    description: "You looked at your profile the way others see it.",
    metric: "privacyPreviewed",
    levels: [1],
    rule: () => "Preview your profile as someone else sees it.",
    unit: ["preview", "previews"],
  },
  {
    key: "hearth",
    name: "Guild member",
    description: "Guilds you belong to.",
    metric: "guildMemberships",
    levels: [1, 2, 3, 5, 8],
    rule: (n) => `Join ${plural(n, ["Guild", "Guilds"])}.`,
    unit: ["Guild", "Guilds"],
  },
  {
    key: "good-counsel",
    name: "Good counsel",
    description: "Considered responses to other people's reasoning.",
    metric: "commentsOnOthersTheses",
    levels: [1, 10, 25, 50, 100],
    rule: (n) => `Comment on other members' theses ${plural(n, ["time", "times"])}.`,
    unit: ["comment", "comments"],
  },
];

/** Badges that can't be worked for: they say who someone is to Portle. */
export const SPECIAL_BADGES = [
  { key: "founder", name: "Founder", description: "Started Portle. Whoever runs this Portle has it, with full access to everything." },
  { key: "early", name: "Early member", description: "Joined before Portle opened to everyone. It can't be earned later." },
] as const;
export type SpecialBadgeKey = (typeof SPECIAL_BADGES)[number]["key"];

export const BADGE_BY_KEY = new Map(BADGES.map((b) => [b.key, b]));
export const SPECIAL_BY_KEY = new Map<string, (typeof SPECIAL_BADGES)[number]>(SPECIAL_BADGES.map((b) => [b.key, b]));

/** A level's short label for the ladder: "5 theses", "1 year". */
export function levelLabel(def: BadgeDefinition, n: number) {
  return def.metric === "memberDays" ? (AGE.get(n) ?? plural(n, def.unit)) : plural(n, def.unit);
}

/** How many levels the metric has reached: 0 when the first isn't reached yet. */
export function badgeLevel(def: BadgeDefinition, metrics: BadgeMetrics) {
  return def.levels.filter((t) => metrics[def.metric] >= t).length;
}

/** Where a member stands on a badge, and what the next level asks for. */
export function badgeProgress(def: BadgeDefinition, metrics: BadgeMetrics, reached = 0) {
  const value = metrics[def.metric];
  const level = Math.max(reached, badgeLevel(def, metrics));
  const next = def.levels[level] ?? null;
  return {
    value,
    level,
    maxLevel: def.levels.length,
    next,
    /** "3 more theses", or null at the top level. */
    toNext: next === null ? null : plural(Math.max(1, next - value), def.unit).replace(/^(\d+)/, "$1 more"),
    /** How far toward the next level's count, 0 to 1: 1 of 5 theses is a fifth of the way. */
    fraction: next === null ? 1 : Math.min(1, Math.max(0, value / next)),
  };
}

/** Longest run of consecutive calendar days in a set of ISO dates (YYYY-MM-DD). */
export function longestStreak(dates: string[]): number {
  const days = [...new Set(dates)].map((s) => Date.parse(`${s}T00:00:00Z`) / 86400_000).sort((a, b) => a - b);
  let best = 0;
  let run = 0;
  for (let i = 0; i < days.length; i++) {
    run = i > 0 && days[i] - days[i - 1] === 1 ? run + 1 : 1;
    best = Math.max(best, run);
  }
  return best;
}
