import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import { proxy } from "./proxy";

const nonceOf = (policy: string | null) => /'nonce-([^']+)'/.exec(policy ?? "")?.[1];

describe("proxy", () => {
  it("sends a nonce-based policy and hands the same policy to rendering", () => {
    const res = proxy(new NextRequest("http://localhost:3000/home"));
    const policy = res.headers.get("content-security-policy");
    expect(nonceOf(policy)).toBeTruthy();
    // Next.js reads the nonce from the request's policy header and stamps it on its scripts.
    expect(res.headers.get("x-middleware-request-content-security-policy")).toBe(policy);
  });

  it("makes a fresh nonce for every request", () => {
    const nonces = new Set(Array.from({ length: 20 }, () => nonceOf(proxy(new NextRequest("http://localhost:3000/")).headers.get("content-security-policy"))));
    expect(nonces.size).toBe(20);
  });
});
