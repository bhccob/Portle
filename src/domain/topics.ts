/**
 * The topics a member can follow, in the groups onboarding shows them in. Stored
 * values never change once saved (a member's profile keeps them), so a value can
 * carry a shorter label for display, such as "Macro" shown as "Economy".
 */
export const TOPIC_GROUPS = [
  {
    title: "How you invest",
    topics: ["Learning the basics", "Long-term investing", "Index funds", "ETFs", "Dividends", "Growth stocks", "Value investing", "Bonds"],
  },
  { title: "Industries", topics: ["Technology", "Healthcare", "Energy", "Financials", "Consumer", "Real estate"] },
  { title: "Markets & news", topics: ["Market news", "Macro", "Emerging markets", "Crypto"] },
] as const;

export type Interest = (typeof TOPIC_GROUPS)[number]["topics"][number];

export const INTERESTS = TOPIC_GROUPS.flatMap((g) => g.topics) as unknown as readonly [Interest, ...Interest[]];

const LABELS: Partial<Record<Interest, string>> = {
  "Learning the basics": "The basics",
  "Long-term investing": "Long-term",
  Macro: "Economy",
};

export const topicLabel = (topic: string) => LABELS[topic as Interest] ?? topic;

/** Everyday words people use for a topic, for finding Guilds about it. */
const SYNONYMS: Partial<Record<Interest, string[]>> = {
  "Learning the basics": ["basics", "beginner", "learning"],
  "Long-term investing": ["long-term", "long term", "buy and hold"],
  "Index funds": ["index", "passive"],
  ETFs: ["etf"],
  Dividends: ["dividend", "income"],
  "Growth stocks": ["growth"],
  "Value investing": ["value"],
  Bonds: ["bond", "fixed income"],
  Technology: ["tech", "semiconductor", "software"],
  Healthcare: ["health", "pharma", "biotech"],
  Energy: ["oil", "renewable", "solar"],
  Financials: ["bank", "financial", "insurance"],
  Consumer: ["retail", "consumer"],
  "Real estate": ["real estate", "property", "reit"],
  "Market news": ["news", "markets"],
  Macro: ["macro", "economy", "rates", "inflation"],
  "Emerging markets": ["emerging"],
  Crypto: ["crypto", "bitcoin"],
};

export const topicSearchTerms = (topic: Interest) => [...new Set([topic.toLowerCase(), ...(SYNONYMS[topic] ?? [])])];

/** How long a member has invested, if they say. "Just starting" brings the beginner guides to Home. */
export const EXPERIENCE = ["starting", "under_1y", "1_3y", "over_3y"] as const;
export type Experience = (typeof EXPERIENCE)[number];

export const EXPERIENCE_LABEL: Record<Experience, string> = {
  starting: "Just starting",
  under_1y: "Less than a year",
  "1_3y": "One to three years",
  over_3y: "More than three years",
};
