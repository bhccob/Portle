# Data model

PostgreSQL via Drizzle ORM; the schema lives in `src/server/db/schema/` and migrations in `drizzle/`. Columns are snake_case; ids are UUIDs except Better Auth's text ids. Timestamps are `timestamptz`. Trade and journal dates are `date` (calendar dates, no time zone).

## Ownership and deletion

Every member-owned table references `user.id` with `ON DELETE CASCADE`, so deleting a user removes their data in one statement. The exception is `guilds.owner_id` (`RESTRICT`): before deletion, `handOverOwnedGuilds` passes each owned Guild to its senior admin or oldest member, or dissolves it. `instruments` are shared reference data and are never deleted with a user (`RESTRICT` from transactions and orders).

## Domains

**Auth (Better Auth):** `user`, `session`, `account` (password hash lives here), `verification`, `rate_limit`.

**Member:** `profiles` (unique case-insensitive handle), `privacy_settings` (every field defaults to the most private option), `consents` (append-only; latest per kind wins), `notifications`, `user_blocks`, `audit_events` (action names and ids only; never values), `email_outbox` (development mail).

**Portfolio:** `portfolios` (base currency), `accounts` (currency, source manual/csv/broker/demo, archivable), `instruments` (unique symbol+exchange; exchange `''` marks an imported, unpriced security), `transactions` (the ledger; `UNIQUE(account_id, dedupe_hash)`), `import_batches` (row counts and up to 200 row errors), `quotes` (cache with source, as-of and delay), `fx_rates` (per day), `watchlists` / `watchlist_items` (personal or Guild-shared), `broker_connections` (encrypted secret, status, last sync).

**Research:** `theses` (head row: current title, status, visibility, tags, and the owner-only revisit schedule `review_on` / `review_reminded_on`, which is never returned to other viewers and is cleared when a thesis closes), `thesis_revisions` (immutable, `UNIQUE(thesis_id, revision)`), `thesis_notes` (owner-only), `thesis_transaction_links`, `journal_entries`, `collections`, `collection_items`.

**Paper Lab:** `paper_accounts` (assumptions, `epoch` bumped on reset), `paper_orders` (`UNIQUE(paper_account_id, idempotency_key)`, quote snapshot, reject reason), `paper_fills` (one per order), `paper_ledger` (signed amounts with running balance and a `bigserial` sequence).

**Social:** `friendships` (one row per pair, `user_low < user_high` enforced by a CHECK), `posts` (audience friends/guild/public; insight JSON holds percentages only), `comments`, `reactions` (insightful/agree/challenge/question), `bookmarks`, `reports`.

**Guilds:** `guilds` (visibility, join policy), `guild_members` (role, analytics consent), `guild_invites` (requests and invitations), `guild_moderation_actions`.

**Relics:** `user_relics` (`PRIMARY KEY(user_id, relic_key)`, evidence string, displayed flag). The catalogue and rules are code (`src/domain/relics.ts`).

## Transaction semantics (average cost)

| Type | Quantity | Cost basis | Cash | Notes |
|---|---|---|---|---|
| buy | + q | + q·p + fee | − q·p − fee | |
| sell | − q | − avg·q | + q·p − fee | realized += q·p − fee − avg·q; oversells are flagged, not applied beyond holdings |
| transfer_in | + q | + q·p + fee, or unknown if no price | — | unknown cost excludes the position from P/L |
| transfer_out | − q | − avg·q | — | no realized P/L |
| split | × ratio | unchanged | — | ratio = new shares per old |
| dividend | — | — | + amount − fee | income |
| interest / fee | — | — | ± amount | |
| deposit / withdrawal | — | — | ± amount | tracked as net contributions |

## Returns

- **Unrealized** = market value − cost basis, both converted at the current FX rate (so it includes currency effects).
- **Time-weighted** (holdings sleeve): daily sub-period returns `(V_t + income_t − flows_t) / V_{t−1}`, chained. Flows are buys minus sells; transfers move at that day's market value. Historic values use current FX (a documented simplification).
- **Money-weighted**: XIRR by bisection, implemented and tested; not yet surfaced in the UI.

## Dedupe

CSV rows hash `date|type|symbol|qty|price|amount|fee|currency` (or the broker's transaction id when mapped) plus an occurrence counter within the file, so re-importing a file skips every row while genuinely identical fills in one file are kept. Manual entries never dedupe.
