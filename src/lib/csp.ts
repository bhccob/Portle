/**
 * The Content Security Policy for every page, built per request around a fresh nonce.
 *
 * Scripts are strict: only those carrying the nonce run (Next.js stamps it on its own),
 * plus what they load ('strict-dynamic'). Styles allow inline because React writes style
 * attributes and Sonner injects a <style> tag without a nonce; the XSS risk is in scripts.
 * Everything else the browser loads comes from this site: fonts are self-hosted by
 * next/font, and market data, FX and email are fetched by the server, never the browser.
 * Profile pictures and company logos are served by Portle itself (/api/pictures, /api/logos),
 * so images need no outside host; blob: is the crop step's preview of a chosen photo.
 */
export function contentSecurityPolicy(nonce: string, { dev }: { dev: boolean }) {
  return [
    "default-src 'self'",
    // React uses eval in development only, to rebuild server error stacks in the browser.
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${dev ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' blob: data:",
    "font-src 'self'",
    "object-src 'none'",
    "base-uri 'none'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    // Local development runs over plain http.
    ...(dev ? [] : ["upgrade-insecure-requests"]),
  ].join("; ");
}
