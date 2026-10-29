# Roadmap

Status as of the first build. Phases follow the master prompt; adjusted to what exists.

## Done

- **Phase 0–1:** stack, schema, migrations, design system (now the Portle palette), auth with verification/reset, onboarding with consent, app shell (desktop sidebar, mobile tab bar), profile, privacy settings with preview, labelled demo mode.
- **Phase 2:** accounts, manual transactions, CSV import with mapping and dedupe, decimal-safe average-cost accounting, currency conversion, holdings and allocation, transaction history, TWR performance chart.
- **Phase 3:** market-data adapter (demo + Finnhub quotes), search, instrument pages, watchlists, indices, sector moves, source/time labels.
- **Phase 4:** theses with immutable revisions, sources, tags, notes; Paper Lab with separate ledger, market/limit orders, fees/slippage, idempotency, thesis links.
- **Phase 5:** feed, posts with audiences, comments, reactions, bookmarks, reports, friendships, blocks, notifications, Guilds with roles, requests, invites, moderation, consented analytics.
- **Phase 6:** Relics with server-side evaluation, journal with prompts/calendar/search, Archives with guides and collections.
- **Phase 7 (partial):** data export, account deletion, broker adapter interface, security headers, nonce-based Content-Security-Policy via `proxy.ts`, dependency audit.

## Next, in priority order

1. **Landing page** — shipped: the friendly Notebook design on charcoal (see DESIGN.md).
2. **Production deployment:** the repo is ready for Vercel with Neon and Resend (`docs/DEPLOYMENT.md`, CI already runs every check on each push); the accounts and a custom domain remain, then Neon preview branches as a staging environment.
3. **Shared rate-limit store** (Redis/Upstash) before scaling past one instance. (The nonce-based CSP from this item is done.)
4. **Licensed market data:** choose a provider after checking coverage and licence terms (Finnhub/Polygon/EODHD), add daily history to the adapter, cache per provider rules; earnings calendar and fundamentals from the same source.
5. **Broker sync (SnapTrade):** verify coverage for IBKR, DEGIRO, Trading 212; implement request signing, hosted connection flow, encrypted token storage, nightly idempotent sync into the ledger, reconnect/disconnect, reconciliation against broker balances, duplicate handling between CSV and synced rows.
6. **Performance at scale:** materialised daily portfolio snapshots refreshed by a background job; pagination on feeds already exists, add it to theses and journal lists.
7. **Money-weighted return in the UI**, per-currency return breakdown, FX history for historic conversion.
8. **Moderation console** for platform reports; email notifications with preferences (thesis revisit reminders are the first candidate).
9. **Accessibility audit** with assistive-technology testing; light-theme contrast pass on every screen.
10. **Legal review** of terms and privacy notice before public launch.

## Known limitations

- Demo prices are synthetic; no licensed data is configured.
- Paper Lab account is single-currency (USD by default); non-USD securities are refused rather than converted.
- Historic portfolio values convert at today's FX rate.
- In-memory rate limits for server actions are per instance.
- Broker sync is not implemented; CSV import is the supported path.
- Thesis revisit reminders are created when the member next opens the app (no background job yet), and appear in Notifications only, not by email.
