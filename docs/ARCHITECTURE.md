# Architecture

Portle is a modular monolith: one Next.js application, one PostgreSQL database, with domain logic kept out of UI components and external providers kept behind adapters.

```
src/
  domain/          Pure, framework-free logic. No I/O. Fully unit-tested.
    money.ts         Decimal (decimal.js) helpers, currency rounding, input parsing
    accounting.ts    Ledger → positions/cash (average cost), oversell and data issues
    valuation.ts     Positions + prices + FX → holdings, totals, allocation, exclusions
    fx.ts            FX converter (direct, inverse, cross via pivot; null if no path)
    history.ts       Daily holdings value series with flows (for TWR)
    returns.ts       Time-weighted and money-weighted (XIRR) returns
    paper.ts         Paper Lab execution engine (market/limit, fees, slippage)
    permissions.ts   The single visibility rule (canView) and Guild role matrix
    relics.ts        Relic catalogue, transparent rules, streak calculation
    csv-import.ts    CSV parse, column mapping, date detection, validation, dedupe keys
  server/          Server-only code
    db/              Drizzle schema (snake_case), client selection, seed
    services/        Use cases; every function takes the acting user id and enforces
                     ownership/visibility in its queries
    auth.ts          Better Auth configuration
    session.ts       Request-scoped session/profile helpers (requireMember)
    action.ts        runAction(): uniform ActionResult for server actions
    crypto.ts        AES-256-GCM for secrets at rest
    rate-limit.ts    In-memory limiter for server actions
    mail.ts          Resend in production, dev outbox otherwise
  integrations/    Provider adapters (market data, FX, brokers)
  app/             Routes. (auth), onboarding, (app) shell routes, api/, legal/
  components/      Design-system UI kit, charts, shell, social, relic icons
e2e/               Playwright journeys
scripts/           dev launcher, DB setup, dev seed, QA screenshots
```

## Key decisions

**Rendering model.** Next.js 16 ships with Cache Components on; Portle turns it off. Nearly every screen is per-user private data, and request-time rendering removes a class of bugs where private data could be cached and served to the wrong person. Pages read the session through `requireMember()`, which is `React.cache`d per request.

**Mutations.** Server Actions call services and return a typed `ActionResult` (never throwing to the client). Validation uses Zod in services, so the same rules apply to actions, scripts and tests. Unexpected errors are logged by name only and reported generically.

**Money.** All amounts are `numeric(28,10)` in Postgres and `decimal.js` in code. Numbers are converted to JavaScript floats only for chart coordinates. Intl formatting receives decimal strings.

**Positions are derived.** There is no mutable holdings table. Positions, cost basis, realized P/L and cash are rebuilt from the transaction ledger on read (`buildLedger`). An opening position without history is a `transfer_in` transaction. This keeps imports, edits and deletions consistent and auditable. For large ledgers, add a materialised snapshot table refreshed by a background job (see ROADMAP).

**Paper Lab is a separate ledger.** `paper_*` tables never reference real accounts or transactions. Orders run inside a transaction that locks the paper account row (`SELECT … FOR UPDATE`), and `(paper_account_id, idempotency_key)` is unique, so double submits return the original order. Resting limit orders are re-evaluated whenever the Lab is opened.

**Visibility.** One function, `canView(viewer, resource)`, decides access for every piece of member content. List queries also filter in SQL, then re-check in code. Not-found and not-permitted are indistinguishable to the requester. Profiles are served only through `getProfileView`, the single path that reads portfolio data on someone else's behalf, and it returns percentages only.

**Relics.** Awarded by `evaluateRelics()` from count queries over the member's own rows. The `(user_id, relic_key)` primary key makes awards idempotent; it runs after relevant actions and on the privacy preview.

## Providers

| Concern | Adapter | Default | Status |
|---|---|---|---|
| Market data | `integrations/market-data` (`MarketDataProvider`) | `DemoMarketDataProvider`: deterministic synthetic prices anchored to 2026-10-01, labelled "Demo · synthetic" everywhere | Finnhub adapter implemented for quotes (15-min DB cache, client-side throttle); not exercised against the live API |
| FX | `integrations/fx` | ECB reference rates via Frankfurter, cached daily in `fx_rates`; falls back to cached rates, then to labelled demo rates | Live provider verified in development |
| Brokers | `integrations/brokers` (`BrokerProvider`) | SnapTrade adapter reports "not configured" | Interface only; signing and sync deliberately unimplemented until a sandbox account exists |
| Email | `server/mail.ts` | Dev outbox at `/dev/mailbox` (404 in production) | Resend when `RESEND_API_KEY` is set |

## Local development database

`pnpm dev` runs `scripts/dev.ts`, which starts a real PostgreSQL server from the `embedded-postgres` package (bound to localhost, data in `.data/postgres`), migrates, seeds reference instruments and starts `next dev`. An in-process PGlite database was tried first and lost recent writes whenever Next restarted its dev server, so PGlite is used only for tests (in-memory, per test file). Any process can still use PGlite by leaving `DATABASE_URL` unset.

## Testing

- `pnpm test`: Vitest, 51 domain unit tests plus 32 service integration tests on in-memory Postgres (PGlite).
- `pnpm test:e2e`: Playwright journey (register → verify → onboard → holding → thesis → paper trade → journal → Guild → post → access checks → account deletion).
- `scripts/qa-shots.ts`: authenticated screenshots at 1440px and 390px for visual review.
