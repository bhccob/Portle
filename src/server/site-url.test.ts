import { describe, expect, it } from "vitest";
import { deploymentOrigins, siteUrl } from "./site-url";

describe("site URL", () => {
  it("uses BETTER_AUTH_URL when set", () => {
    expect(siteUrl({ BETTER_AUTH_URL: "https://portle.example", VERCEL_PROJECT_PRODUCTION_URL: "portle.vercel.app" })).toBe("https://portle.example");
  });

  it("uses Vercel's production address otherwise", () => {
    expect(siteUrl({ VERCEL_PROJECT_PRODUCTION_URL: "portle.vercel.app" })).toBe("https://portle.vercel.app");
  });

  it("is unknown without either", () => {
    expect(siteUrl({})).toBeUndefined();
  });
});

describe("deployment origins", () => {
  it("trusts this deployment's own one-off and branch addresses on Vercel", () => {
    expect(deploymentOrigins({ VERCEL_URL: "portle-a1b2c3-bob.vercel.app", VERCEL_BRANCH_URL: "portle-git-main-bob.vercel.app" })).toEqual([
      "https://portle-a1b2c3-bob.vercel.app",
      "https://portle-git-main-bob.vercel.app",
    ]);
  });

  it("lists each address once", () => {
    expect(deploymentOrigins({ VERCEL_URL: "portle.vercel.app", VERCEL_BRANCH_URL: "portle.vercel.app" })).toEqual(["https://portle.vercel.app"]);
  });

  it("adds nothing off Vercel", () => {
    expect(deploymentOrigins({})).toEqual([]);
  });
});
