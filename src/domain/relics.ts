/**
 * Relics reward process, not outcomes: research, revision, reflection,
 * consistency, learning, and helping others. No rule references trade
 * frequency, position size, leverage or profit.
 */
export type RelicMetrics = {
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
};

export type RelicTier = "common" | "rare" | "epic";
export type RelicCategory = "research" | "journal" | "lab" | "portfolio" | "community";

export type RelicDefinition = {
  key: string;
  name: string;
  description: string;
  /** The transparent eligibility rule, shown to the user verbatim. */
  rule: string;
  tier: RelicTier;
  category: RelicCategory;
  metric: keyof RelicMetrics;
  threshold: number;
};

export const RELICS: RelicDefinition[] = [
  {
    key: "first-specimen",
    name: "First Specimen",
    description: "The first thesis placed in your archive.",
    rule: "Write one investment thesis.",
    tier: "common",
    category: "research",
    metric: "thesesCreated",
    threshold: 1,
  },
  {
    key: "fault-line",
    name: "Fault Line",
    description: "You wrote down what would prove you wrong, three times.",
    rule: "Give three theses written invalidation criteria.",
    tier: "rare",
    category: "research",
    metric: "thesesWithInvalidation",
    threshold: 3,
  },
  {
    key: "growth-rings",
    name: "Growth Rings",
    description: "Your reasoning grew in layers as the evidence changed.",
    rule: "Publish five thesis revisions after the first draft.",
    tier: "rare",
    category: "research",
    metric: "thesisRevisions",
    threshold: 5,
  },
  {
    key: "closing-note",
    name: "Closing Note",
    description: "A thesis concluded with a written review of how it played out.",
    rule: "Mark a thesis validated or invalidated with a change note explaining why.",
    tier: "rare",
    category: "research",
    metric: "thesesClosedWithReview",
    threshold: 1,
  },
  {
    key: "honest-ledger",
    name: "Honest Ledger",
    description: "You recorded that you were wrong, and why. The rarest discipline.",
    rule: "Mark a thesis invalidated with a change note explaining why.",
    tier: "epic",
    category: "research",
    metric: "invalidatedWithReview",
    threshold: 1,
  },
  {
    key: "lamplighter",
    name: "Lamplighter",
    description: "Seven evenings of written reflection.",
    rule: "Write journal entries on seven different days.",
    tier: "common",
    category: "journal",
    metric: "journalDays",
    threshold: 7,
  },
  {
    key: "unbroken-seam",
    name: "Unbroken Seam",
    description: "Two weeks of daily reflection without a gap.",
    rule: "Write a journal entry on fourteen consecutive days.",
    tier: "epic",
    category: "journal",
    metric: "journalLongestStreak",
    threshold: 14,
  },
  {
    key: "rehearsal",
    name: "Rehearsal",
    description: "You tested ideas with virtual money before real money.",
    rule: "Place three paper orders that are linked to a thesis.",
    tier: "common",
    category: "lab",
    metric: "thesisLinkedPaperOrders",
    threshold: 3,
  },
  {
    key: "post-mortem",
    name: "Post-Mortem",
    description: "You reflected on a simulated trade after it happened.",
    rule: "Write a journal entry linked to a paper order.",
    tier: "rare",
    category: "lab",
    metric: "paperReflections",
    threshold: 1,
  },
  {
    key: "cartographer",
    name: "Cartographer",
    description: "Your whole map, not one corner of it.",
    rule: "Track holdings in two or more accounts.",
    tier: "common",
    category: "portfolio",
    metric: "accountsTracked",
    threshold: 2,
  },
  {
    key: "clean-import",
    name: "Clean Import",
    description: "A broker export brought in without a single error.",
    rule: "Complete a CSV import with zero rejected rows.",
    tier: "common",
    category: "portfolio",
    metric: "cleanImports",
    threshold: 1,
  },
  {
    key: "watchkeeper",
    name: "Watchkeeper",
    description: "A considered list of what you are studying.",
    rule: "Keep five securities on a watchlist.",
    tier: "common",
    category: "portfolio",
    metric: "watchlistSize",
    threshold: 5,
  },
  {
    key: "veil",
    name: "Veil",
    description: "You checked exactly what others can see.",
    rule: "Open the privacy preview in Settings.",
    tier: "common",
    category: "portfolio",
    metric: "privacyPreviewed",
    threshold: 1,
  },
  {
    key: "hearth",
    name: "Hearth",
    description: "You found people to think alongside.",
    rule: "Join or found a Guild.",
    tier: "common",
    category: "community",
    metric: "guildMemberships",
    threshold: 1,
  },
  {
    key: "good-counsel",
    name: "Good Counsel",
    description: "Ten considered responses to other people's reasoning.",
    rule: "Comment on ten theses written by other members.",
    tier: "rare",
    category: "community",
    metric: "commentsOnOthersTheses",
    threshold: 10,
  },
];

export const RELIC_BY_KEY = new Map(RELICS.map((r) => [r.key, r]));

export function eligibleRelics(metrics: RelicMetrics): RelicDefinition[] {
  return RELICS.filter((r) => metrics[r.metric] >= r.threshold);
}

export function relicProgress(def: RelicDefinition, metrics: RelicMetrics) {
  const value = metrics[def.metric];
  return { value: Math.min(value, def.threshold), threshold: def.threshold, done: value >= def.threshold };
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
