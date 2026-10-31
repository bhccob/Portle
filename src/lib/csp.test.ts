import { describe, expect, it } from "vitest";
import { contentSecurityPolicy } from "./csp";

const directives = (policy: string) => new Map(policy.split("; ").map((d) => [d.split(" ")[0], d.split(" ").slice(1)]));

describe("content security policy", () => {
  it("runs only scripts carrying the request's nonce, and what they load", () => {
    const script = directives(contentSecurityPolicy("abc123", { dev: false })).get("script-src");
    expect(script).toEqual(["'self'", "'nonce-abc123'", "'strict-dynamic'"]);
  });

  it("blocks plugins, base-tag hijacks, framing and off-site form posts", () => {
    const policy = directives(contentSecurityPolicy("abc123", { dev: false }));
    expect(policy.get("default-src")).toEqual(["'self'"]);
    expect(policy.get("object-src")).toEqual(["'none'"]);
    expect(policy.get("base-uri")).toEqual(["'none'"]);
    expect(policy.get("frame-ancestors")).toEqual(["'none'"]);
    expect(policy.get("form-action")).toEqual(["'self'"]);
    expect(policy.has("upgrade-insecure-requests")).toBe(true);
  });

  it("loads profile pictures and logos from this site, and the crop step's local preview, but no outside image host", () => {
    const img = directives(contentSecurityPolicy("abc123", { dev: false })).get("img-src");
    expect(img).toEqual(["'self'", "blob:", "data:"]);
    expect(img?.some((source) => source.includes("."))).toBe(false);
  });

  it("allows eval in development only, where React uses it for error stacks", () => {
    const dev = directives(contentSecurityPolicy("abc123", { dev: true }));
    expect(dev.get("script-src")).toContain("'unsafe-eval'");
    expect(dev.has("upgrade-insecure-requests")).toBe(false);
  });
});
