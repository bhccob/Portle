/**
 * Members see these as Relics. They reward process, not outcomes: research, revision, reflection,
 * consistency, learning and helping others. No rule references trade
 * frequency, position size, leverage or profit.
 *
 * Most level up through five stones, and the icon changes at each one. One-level Relics
 * are milestones, and Early member is special: it can't be worked for.
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
  brokersLinked: number;
  costsTracked: number;
  friends: number;
  holdingsRecorded: number;
};

export const LEVEL_NAMES = ["Pebble", "Quartz", "Amethyst", "Geode", "Diamond"] as const;
/** How rare each stone is, shown beside a Relic's level. One-level milestones count as Uncommon. */
export const LEVEL_RARITY = ["Common", "Uncommon", "Rare", "Epic", "Legendary"] as const;

export type BadgeCategory = "Time on Portle" | "Research" | "Reflection" | "Practice" | "Portfolio" | "Community" | "Privacy";

export type BadgeDefinition = {
  key: string;
  name: string;
  description: string;
  /** The small label above the name in the Relics panel. */
  category: BadgeCategory;
  metric: keyof BadgeMetrics;
  /** What each level needs, lowest first. One entry for a milestone that doesn't level up. */
  levels: number[];
  /** The transparent rule for reaching `n`, shown to the member verbatim. */
  rule: (n: number) => string;
  /** "3 more theses": singular and plural of what counts. */
  unit: [string, string];
};

const plural = (n: number, [one, many]: [string, string]) => `${n} ${n === 1 ? one : many}`;
const YEAR = 365;

/** Most keys predate the levels (they were single Relics), so members keep what they earned. */
export const BADGES: BadgeDefinition[] = [
  {
    key: "years",
    name: "Years",
    description: "Years on Portle. Keep coming back and time does the rest: a new level every year.",
    category: "Time on Portle",
    metric: "memberDays",
    levels: [1, 2, 3, 4, 5].map((y) => y * YEAR),
    rule: (n) => `Be a member for ${plural(Math.round(n / YEAR), ["year", "years"])}.`,
    unit: ["day", "days"],
  },
  {
    key: "first-specimen",
    name: "Thesis writer",
    description: "Theses in your archive, each with your reasons written down.",
    category: "Research",
    metric: "thesesCreated",
    levels: [1, 5, 10, 25, 50],
    rule: (n) => `Write ${plural(n, ["thesis", "theses"])}.`,
    unit: ["thesis", "theses"],
  },
  {
    key: "fault-line",
    name: "Fault lines",
    description: "Theses that say what would prove you wrong.",
    category: "Research",
    metric: "thesesWithInvalidation",
    levels: [1, 3, 10, 25, 50],
    rule: (n) => `Write down what would prove you wrong on ${plural(n, ["thesis", "theses"])}.`,
    unit: ["thesis", "theses"],
  },
  {
    key: "growth-rings",
    name: "Growth rings",
    description: "Your reasoning grew in layers as the evidence changed.",
    category: "Research",
    metric: "thesisRevisions",
    levels: [1, 5, 15, 30, 60],
    rule: (n) => `Revise your theses ${plural(n, ["time", "times"])} after the first draft.`,
    unit: ["revision", "revisions"],
  },
  {
    key: "closing-note",
    name: "Closing notes",
    description: "Theses you concluded with a written review of how they played out.",
    category: "Research",
    metric: "thesesClosedWithReview",
    levels: [1, 3, 10, 20, 40],
    rule: (n) => `Close ${plural(n, ["thesis", "theses"])} as validated or invalidated, with a note saying why.`,
    unit: ["closed thesis", "closed theses"],
  },
  {
    key: "honest-ledger",
    name: "Honest ledger",
    description: "Times you said plainly that a thesis was wrong, and why.",
    category: "Research",
    metric: "invalidatedWithReview",
    levels: [1, 3, 5, 10, 20],
    rule: (n) => `Mark ${plural(n, ["thesis", "theses"])} invalidated, with a note explaining what you learned.`,
    unit: ["honest review", "honest reviews"],
  },
  {
    key: "watchkeeper",
    name: "Watchkeeper",
    description: "Securities you're studying on one watchlist.",
    category: "Research",
    metric: "watchlistSize",
    levels: [5, 10, 25, 50, 100],
    rule: (n) => `Keep ${plural(n, ["security", "securities"])} on one watchlist.`,
    unit: ["security", "securities"],
  },
  {
    key: "lamplighter",
    name: "Journal keeper",
    description: "Days you wrote in your journal.",
    category: "Reflection",
    metric: "journalDays",
    levels: [7, 30, 60, 120, 365],
    rule: (n) => `Write in your journal on ${plural(n, ["day", "days"])}.`,
    unit: ["day", "days"],
  },
  {
    key: "unbroken-seam",
    name: "Streak",
    description: "Your longest run of journal days in a row.",
    category: "Reflection",
    metric: "journalLongestStreak",
    levels: [3, 7, 14, 30, 100],
    rule: (n) => `Write in your journal ${n} days in a row.`,
    unit: ["day in a row", "days in a row"],
  },
  {
    key: "rehearsal",
    name: "Rehearsal",
    description: "Practice trades that test a thesis before real money does.",
    category: "Practice",
    metric: "thesisLinkedPaperOrders",
    levels: [3, 10, 25, 50, 100],
    rule: (n) => `Make ${plural(n, ["practice trade", "practice trades"])} linked to a thesis.`,
    unit: ["practice trade", "practice trades"],
  },
  {
    key: "post-mortem",
    name: "Post-mortem",
    description: "Journal entries looking back at a practice trade.",
    category: "Practice",
    metric: "paperReflections",
    levels: [1, 5, 15, 30, 60],
    rule: (n) => `Write ${plural(n, ["journal entry", "journal entries"])} about a practice trade.`,
    unit: ["reflection", "reflections"],
  },
  {
    key: "first-holding",
    name: "First holding",
    description: "The first thing you own, written down in Portle.",
    category: "Portfolio",
    metric: "holdingsRecorded",
    levels: [1],
    rule: () => "Record a holding, by hand, from a CSV or from your broker.",
    unit: ["holding", "holdings"],
  },
  {
    key: "broker",
    name: "Broker linked",
    description: "You linked a broker, so your holdings update by themselves.",
    category: "Portfolio",
    metric: "brokersLinked",
    levels: [1],
    rule: () => "Link a broker to Portle.",
    unit: ["broker", "brokers"],
  },
  {
    key: "cartographer",
    name: "Cartographer",
    description: "Accounts you keep track of in Portle.",
    category: "Portfolio",
    metric: "accountsTracked",
    levels: [2, 3, 4, 6, 10],
    rule: (n) => `Track holdings in ${plural(n, ["account", "accounts"])}.`,
    unit: ["account", "accounts"],
  },
  {
    key: "clean-import",
    name: "Clean imports",
    description: "Broker exports imported without a single error.",
    category: "Portfolio",
    metric: "cleanImports",
    levels: [1, 3, 10, 25, 50],
    rule: (n) => `Import ${plural(n, ["CSV", "CSVs"])} with no errors.`,
    unit: ["import", "imports"],
  },
  {
    key: "budget",
    name: "Budget keeper",
    description: "Regular costs you keep track of on Spending.",
    category: "Portfolio",
    metric: "costsTracked",
    levels: [1, 5, 10, 20, 30],
    rule: (n) => `Track ${plural(n, ["regular cost", "regular costs"])} on Spending.`,
    unit: ["cost", "costs"],
  },
  {
    key: "circle",
    name: "Circle",
    description: "Friends you share your reasoning with.",
    category: "Community",
    metric: "friends",
    levels: [1, 3, 5, 10, 25],
    rule: (n) => `Have ${plural(n, ["friend", "friends"])} on Portle.`,
    unit: ["friend", "friends"],
  },
  {
    key: "hearth",
    name: "Guild member",
    description: "Guilds you belong to.",
    category: "Community",
    metric: "guildMemberships",
    levels: [1, 2, 3, 5, 8],
    rule: (n) => `Join ${plural(n, ["Guild", "Guilds"])}.`,
    unit: ["Guild", "Guilds"],
  },
  {
    key: "good-counsel",
    name: "Good counsel",
    description: "Considered responses to other people's reasoning.",
    category: "Community",
    metric: "commentsOnOthersTheses",
    levels: [1, 10, 25, 50, 100],
    rule: (n) => `Comment on other members' theses ${plural(n, ["time", "times"])}.`,
    unit: ["comment", "comments"],
  },
  {
    key: "veil",
    name: "Privacy check",
    description: "You looked at your profile the way others see it.",
    category: "Privacy",
    metric: "privacyPreviewed",
    levels: [1],
    rule: () => "Preview your profile as someone else sees it.",
    unit: ["preview", "previews"],
  },
];

/** Relics that can't be worked for: they say when someone joined. Owners wear titles beside their handle instead. */
export const SPECIAL_BADGES = [
  { key: "early", name: "Early member", description: "Joined before Portle opened to everyone. It can't be earned later." },
] as const;
export type SpecialBadgeKey = (typeof SPECIAL_BADGES)[number]["key"];

export const BADGE_BY_KEY = new Map(BADGES.map((b) => [b.key, b]));
export const SPECIAL_BY_KEY = new Map<string, (typeof SPECIAL_BADGES)[number]>(SPECIAL_BADGES.map((b) => [b.key, b]));

/** One-level Relics are milestones: they get their own blue tile instead of the five stones. */
export const isMilestone = (key: string) => BADGE_BY_KEY.get(key)?.levels.length === 1;

/** A level's short label for the ladder: "5 theses", "1 year". */
export function levelLabel(def: BadgeDefinition, n: number) {
  return def.metric === "memberDays" ? plural(Math.round(n / YEAR), ["year", "years"]) : plural(n, def.unit);
}

/** Time on Portle in words: "1 year, 2 months", "5 months", "12 days". */
export function memberFor(days: number) {
  const years = Math.floor(days / YEAR);
  const months = Math.floor((days % YEAR) / 30.44);
  if (years) return months ? `${plural(years, ["year", "years"])}, ${plural(months, ["month", "months"])}` : plural(years, ["year", "years"]);
  return months ? plural(months, ["month", "months"]) : plural(Math.max(days, 0), ["day", "days"]);
}

/** "10 more months" for time on Portle, "3 more theses" for everything else. */
function remaining(def: BadgeDefinition, value: number, next: number) {
  const left = Math.max(1, next - value);
  if (def.metric === "memberDays" && left >= 31) return plural(Math.max(1, Math.round(left / 30.44)), ["more month", "more months"]);
  return plural(left, def.unit).replace(/^(\d+)/, "$1 more");
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
    toNext: next === null ? null : remaining(def, value, next),
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
