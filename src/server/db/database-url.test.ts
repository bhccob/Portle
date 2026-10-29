import { describe, expect, it } from "vitest";
import { databaseUrl } from "./index";

describe("database URL", () => {
  it("uses DATABASE_URL when set", () => {
    expect(databaseUrl({ DATABASE_URL: "postgres://db.example/app" })).toBe("postgres://db.example/app");
  });

  it("falls back to the local PGlite (no URL) off Vercel", () => {
    expect(databaseUrl({})).toBeUndefined();
    expect(databaseUrl({ DATABASE_URL: "" })).toBeUndefined();
  });

  it("refuses to run on Vercel without one, saying how to fix it", () => {
    expect(() => databaseUrl({ VERCEL: "1" })).toThrow(/DATABASE_URL is not set.*Storage/);
  });
});
