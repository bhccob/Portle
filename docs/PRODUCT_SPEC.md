# Product specification (as built)

Porfael is a private-by-default investing companion: a portfolio tracker, an investment-thesis archive, a paper trading lab, a journal and a focused social layer. Product truth lives in `PRODUCT.md`; this file describes what each destination does today.

## Destinations

| Route | Purpose | Notes |
|---|---|---|
| `/home` Overview | What needs attention today | Setup checklist, private portfolio snapshot with 3-month TWR, theses under review or stale (90 days), journal prompt of the day, watchlist movers, circle activity, Paper Lab equity, next Relic |
| `/portfolio` | Holdings across accounts | Base-currency totals, day change, unrealized/realized/income, TWR by range, allocation by asset class/sector/region/currency, account filter, issues (unpriced securities, oversells), labelled sample data for exploration |
| `/portfolio/transactions`, `/accounts`, `/import` | Ledger, accounts, CSV import | Column-mapping import with in-browser validation preview and duplicate skipping |
| `/markets`, `/markets/[id]` | Research | Indices, search, sector moves, watchlists, instrument page with range chart, your private position, related theses. Earnings calendar shows an honest "needs a licensed source" state |
| `/theses` | Reasoning archive | Thesis editor (claim, bull/bear, assumptions, catalysts, risks, valuation, invalidation, sources, horizon, tags, audience), immutable revisions with change notes, private notes, comments, reactions, bookmarks, linked paper orders |
| `/lab` | Paper Trading Lab | Separate virtual ledger, market and limit orders, fees and slippage (editable), idempotent submits, rejection reasons, reset with new epoch |
| `/journal` | Reflection | Prompts, Markdown, links to theses/securities/paper orders, tags, search, month calendar, streaks, private by default |
| `/feed` | Friends-first discussion | Audience per post (friends, a Guild, all members), thesis sharing that can't widen the thesis's own audience, allocation insights as server-computed percentages labelled self-reported vs broker-verified, reactions, comments, bookmarks, reports, people search, friend requests, blocking |
| `/guilds` | Focused groups | Discover, create, join (open/request/invite), roles, invites, requests, removal, ownership transfer, moderation log, shared watchlists and theses, consent-gated analytics |
| `/archives` | Knowledge | Original guides (returns methodology, writing a thesis, diversification, using the Lab, privacy), collections, bookmarks (re-checked for visibility) |
| `/relics` | Progression | 15 Relics across research, reflection, Lab, organisation and community; every rule written out; progress; per-Relic profile display toggle |
| `/u/[handle]` | Profile | Rendered through the privacy filter; allocation percentages and holdings-by-weight only if shared |
| `/notifications` | Updates | Friend requests, comments, Guild events, Relics, limit-order fills |
| `/settings/*` | Control | Profile, privacy (with friend/member preview), connections (honest provider status), data export, sessions, consents, deletion |

## Relics

First Specimen, Fault Line, Growth Rings, Closing Note, Honest Ledger (research); Lamplighter, Unbroken Seam (reflection); Rehearsal, Post-Mortem (Lab); Cartographer, Clean Import, Watchkeeper, Veil (organisation); Hearth, Good Counsel (community). No Relic references trade count, position size, returns or profit; a test enforces that.

## Data honesty

Every price shows its source and time; demo prices read "Demo · synthetic". FX shows "ECB reference rates" with the date, or "Demo FX". Unpriced securities are excluded from totals and listed. Missing cost basis is shown as unknown. Manual, CSV and broker data carry distinct labels.

## Not built yet

See `ROADMAP.md`.
