# Porfael

A private archive for your portfolio, your investment theses, and the friends you trust with them.

Porfael combines a multi-account portfolio tracker, an investment-thesis archive with immutable revisions, a paper trading lab on a separate ledger, a reflective journal, and a friends-first social layer with Guilds and Relics. Exact values are private by default and enforced on the server; others only ever see the percentages and writing you choose to share.

> Early access. Market data runs in a clearly labelled **demo mode** (synthetic prices) until a licensed provider is configured. FX uses live ECB reference rates. Broker sync is not enabled yet; CSV import is supported.

## Quick start

Requires Node 24+ and pnpm 9.

```bash
pnpm install
```

```bash
cp .env.example .env.local
```

Fill `BETTER_AUTH_SECRET` and `PORFAEL_ENCRYPTION_KEY` with 32 random bytes each, base64-encoded:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

Start everything (a local PostgreSQL server is started automatically from `.data/postgres`, migrated and seeded):

```bash
pnpm dev
```

Optional: three example members (`ada`, `ben`, `cleo` @example.test, password in `e2e/fixtures.ts`) with sample portfolios, theses, a Guild and posts:

```bash
pnpm db:seed-dev
```

Open http://localhost:3000. Without a mail provider, verification and reset emails appear at http://localhost:3000/dev/mailbox (development only).

## Tests and checks

```bash
pnpm test
```

```bash
pnpm test:e2e
```

```bash
pnpm typecheck
```

```bash
pnpm lint
```

- Unit and integration: 87 tests (domain accounting, valuation, FX, returns, paper engine, permissions, Relics, CSV import, plus service tests on in-memory Postgres).
- End-to-end: the full member journey including privacy checks and account deletion.

## Configuration

See `.env.example`. Production needs `DATABASE_URL` (PostgreSQL), `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `PORFAEL_ENCRYPTION_KEY` and `RESEND_API_KEY`. Real quotes need `MARKET_DATA_PROVIDER=finnhub` and `FINNHUB_API_KEY` (check the licence terms for your use).

## Documentation

- `PRODUCT.md`: product truth and principles
- `docs/PRODUCT_SPEC.md`: what each screen does
- `docs/ARCHITECTURE.md`: structure and key decisions
- `docs/DATA_MODEL.md`: schema, accounting and return methodology
- `docs/SECURITY.md`: privacy model, auth, threat mitigations
- `docs/ROADMAP.md`: what's next and known limitations

## Stack

Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4, Drizzle ORM, PostgreSQL, Better Auth, decimal.js, Zod, Radix UI, Vitest, Playwright.

Porfael is for education and record-keeping. It is not a broker and does not give financial advice.
