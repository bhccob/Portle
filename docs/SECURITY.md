# Security and privacy

## Principles

1. Exact financial values never leave their owner. No setting, API or profile path exposes balances, values, quantities, cost basis, transactions, account names or broker details to anyone else.
2. Authorization is enforced on the server, close to the data. Hiding a control is never the protection.
3. Not-found and not-permitted look identical to the requester.
4. Providers and secrets stay server-side.

## Authentication

- Better Auth with email and password (10–128 characters), required email verification, password reset with one-hour tokens, and revocation of other sessions on reset.
- Sessions: 14 days, refreshed daily; cookies are `HttpOnly`, `SameSite=Lax`, and `Secure` in production. Better Auth checks the request origin on state-changing endpoints (CSRF).
- Rate limits (database-backed, Better Auth): sign-in 8/min, sign-up 10/10 min, reset and verification mail 5/10 min, other auth endpoints 100/min. `AUTH_RATE_LIMIT=off` exists for automated tests only.
- Account deletion requires the current password and a typed confirmation.

## Authorization

- Every service function receives the acting user's id from the session, never from the client.
- Ownership is part of each query (`WHERE user_id = $actor`).
- Member content goes through `canView` (`src/domain/permissions.ts`); list endpoints filter in SQL and re-check in code. Blocks override every audience.
- Guild actions use a role matrix; admins cannot remove owners or other admins.
- Guild analytics average only members who opted in, and only once at least three have (k-anonymity).
- Paper orders may link only theses the trader can see; journal links only the author's own records.
- Postgres row-level security is **not** used: authorization lives in the service layer and is covered by integration tests. If RLS is added later, it must be configured per role and tested; enabling it alone is not protection.

## Input and output

- Zod validates every input in services. Monetary input is parsed into exact decimals.
- Member Markdown is rendered with `react-markdown` with raw HTML skipped, images disabled, and links limited to http(s), mailto and relative paths, opened with `rel="noopener noreferrer nofollow"`.
- Thesis sources and collection links accept `https://` only.
- CSV import: 2 MB limit, 5,000 rows, parsed as data (no formulas evaluated), every row validated, errors reported by row number.
- SQL is parameterised through Drizzle; `LIKE` patterns escape wildcards.

## Secrets

- `.env*` files are git-ignored; `.env.example` documents every variable without values.
- Broker tokens (when enabled) are encrypted with AES-256-GCM (`PORTLE_ENCRYPTION_KEY`) and excluded from data exports.
- No secrets in client bundles: only `NEXT_PUBLIC_*` variables reach the browser, and none are defined.

## Logging

- Unexpected server-action errors are logged as `name: message` (truncated), never with request payloads.
- Audit events record action names and ids only (`account.onboarded`, `privacy.updated`, `portfolio.csv_import` with counts, `account.exported`, `account.deleted`, `social.block`).
- Known gap: the Next.js **development** server logs full request URLs, which include one-time email verification tokens. Production (`next start`) does not log request URLs by default; any production log pipeline must not record query strings on `/api/auth/*`.

## Headers

`X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, a restrictive `Permissions-Policy`, `Cross-Origin-Opener-Policy: same-origin`, HSTS in production, `X-Powered-By` removed.

**Content-Security-Policy.** `src/proxy.ts` gives every page request a fresh nonce and builds the policy in `src/lib/csp.ts`. Scripts run only if they carry the nonce (Next.js stamps it on its own scripts) or were loaded by one that does (`'strict-dynamic'`); there is no `'unsafe-inline'` for scripts, and `'unsafe-eval'` only in development, where React uses it for error stacks. Styles allow inline, because React writes `style` attributes and Sonner injects a `<style>` tag without a nonce; the injection risk the policy guards against is in scripts. Everything else comes from this site: `object-src` and `base-uri` are `'none'`, forms post only to this site, framing is refused, and production upgrades insecure requests. API routes, build assets and public files are outside the proxy matcher, since they carry no page scripts. Nonces need request-time rendering, which every page already uses.

## Rate limiting outside auth

Server actions use an in-memory sliding window (posts 20/h, comments 60/h, transactions 120/h, imports 20/h, paper orders 120/h, reports 20/h, friend requests 30/h, Guild creation 5/day, exports 5/h). It is per process: a shared store is required before running more than one instance.

## Verified by tests

- Service tests: cross-user access by id, friends-only vs strangers, Guild-only scoping, blocks, privacy defaults, percentages-only profile output (no values, quantities or account ids in the serialized response), export contains no password/token/secret, paper ledger separation, idempotency, oversell/overspend refusal, deletion cascades.
- End-to-end: anonymous access redirects or returns 401; another member's request for a private thesis never contains its content; account deletion prevents sign-in; every script tag in a page carries that response's nonce, each load gets a fresh one, and the whole member journey (sign-up to deletion) reports no CSP violations.

## Dependency hygiene

`pnpm audit` is clean. A transitive `esbuild` (via `drizzle-kit`) is pinned to ≥0.25 through `pnpm.overrides`.

## Privacy rights (GDPR)

Data export (Settings → Data & account, JSON), account deletion, consent records, and privacy controls with a live preview rendered through the same code path other members use. Legal pages are early-access drafts and must be reviewed before a public launch.
