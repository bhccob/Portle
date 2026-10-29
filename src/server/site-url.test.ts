import { describe, expect, it } from "vitest";
import { siteUrl } from "./site-url";

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
