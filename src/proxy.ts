import { NextResponse, type NextRequest } from "next/server";
import { contentSecurityPolicy } from "@/lib/csp";

/**
 * Gives every page request its own CSP nonce. Next.js reads the nonce from the
 * request's policy header while rendering and stamps it on its scripts; the browser
 * enforces the same policy from the response. Pages already render per request
 * (the root layout reads the theme cookie), so every page gets a fresh nonce.
 */
export function proxy(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const policy = contentSecurityPolicy(nonce, { dev: process.env.NODE_ENV === "development" });

  const headers = new Headers(request.headers);
  headers.set("Content-Security-Policy", policy);
  const response = NextResponse.next({ request: { headers } });
  response.headers.set("Content-Security-Policy", policy);
  return response;
}

export const config = {
  matcher: [
    {
      // Pages only: API responses, build assets, optimised images and public files carry no scripts to guard.
      source: "/((?!api/|_next/static|_next/image|.*\\.(?:svg|png|jpg|jpeg|webp|avif|ico|txt|xml)$).*)",
      // Prefetches return no HTML, so they need no nonce.
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
