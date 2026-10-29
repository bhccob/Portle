import { describe, expect, it } from "vitest";
import { EXPERIENCE, INTERESTS, TOPIC_GROUPS, topicLabel, topicSearchTerms } from "./topics";

describe("topics", () => {
  it("puts every interest in exactly one group", () => {
    const grouped = TOPIC_GROUPS.flatMap((g) => g.topics);
    expect([...grouped].sort()).toEqual([...INTERESTS].sort());
    expect(new Set(grouped).size).toBe(grouped.length);
  });

  it("keeps the values members have already saved", () => {
    for (const saved of ["Long-term investing", "ETFs", "Macro", "Learning the basics", "Index funds", "Crypto"]) expect(INTERESTS).toContain(saved);
  });

  it("shows short labels where the stored value is long or technical", () => {
    expect(topicLabel("Macro")).toBe("Economy");
    expect(topicLabel("Learning the basics")).toBe("The basics");
    expect(topicLabel("ETFs")).toBe("ETFs");
  });

  it("searches Guilds by the topic and its everyday words", () => {
    expect(topicSearchTerms("Macro")).toEqual(expect.arrayContaining(["macro", "economy"]));
    expect(topicSearchTerms("ETFs")).toContain("etf");
  });

  it("offers four experience answers", () => {
    expect(EXPERIENCE).toEqual(["starting", "under_1y", "1_3y", "over_3y"]);
  });
});
