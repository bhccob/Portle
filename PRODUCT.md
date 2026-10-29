# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Next.js (App Router) + TypeScript + Tailwind CSS, Drizzle ORM on PostgreSQL (embedded PGlite for zero-setup local development and tests; a real Postgres via `DATABASE_URL` in staging/production), Better Auth for sessions, Vitest and Playwright for tests. Chosen by the user from a recommended option. Deploy target: Vercel-compatible (undecided provider for production Postgres).

## Users

Individual retail investors who hold positions across one or more brokerages (e.g. IBKR, DEGIRO) and want one private place to see their whole portfolio, write down why they own things, test ideas without real money, and talk about them with people they trust. Launches with open sign-up for a first circle of friends; a wider public release is planned, so nothing may assume a closed group of known users.

## Product Purpose

Portle combines a portfolio tracker, an investment journal, a paper-trading simulator, and a focused social network. Success is a user who keeps their holdings current, writes theses with explicit invalidation criteria, revisits them as evidence changes, and learns from both real and simulated decisions, without ever having their private financial values exposed.

## Positioning

The investment thesis is the centre of the product, not the trade: a thesis carries its bull and bear case, assumptions, invalidation criteria, revision history, and links to real transactions and paper trades, so reasoning can be reviewed against outcomes. Privacy is structural: exact values are private by default, and social surfaces only ever see what a user explicitly shares (percentages, theses, selected insights).

## Operating Context

- Users import holdings by manual entry or validated CSV export from their broker; automated broker sync (SnapTrade or similar) is planned behind a provider-independent adapter and is not configured yet.
- Market data comes through a provider adapter; without credentials the app runs on deterministic, explicitly labelled demo data.
- Primary destinations: Overview, Portfolio, Markets, Theses, Paper Trading Lab, Feed, Guilds, Journal, Archives, Profile & Relics, Notifications, Settings & Privacy.
- Used on desktop for research sessions and on phones for quick checks.

## Capabilities and Constraints

- Decimal-safe money arithmetic with explicit currencies; never floating point for accounting.
- Paper trading uses a separate ledger and must never touch real holdings.
- Every external integration reports its real status; no simulated successful connections, no invented quotes presented as real.
- Terminology: Theses, Paper Trading Lab, Guilds, Relics (achievements), Journal, Archives.
- Relics reward research, reflection, consistency and learning; never trading frequency or short-term profit.
- GDPR applies (the founding user is in the EU): data export, account deletion, consent records.
- The GitHub repository is public: no secrets, keys or personal data in source control.

## Brand Commitments

- Name: Portle (renamed from Porfael on 2026-10-29). Symbol: a P whose bowl is a portfolio dial around a warm core (`.impeccable/brand/portle-symbol.source.svg`).
- Palette foundation (binding, drawn from the symbol): Ink `#15141F`, Indigo `#5146E1`, Violet `#7B6FF5`, Lavender `#B9ADFA`, Porcelain `#F2F1FB`, with Sky `#56B8F5` and Cyan `#25D0EE` for data and Ember `#FF9340` for the mark's core, plus supporting semantic tokens. The public landing page sits on neutral charcoal `#1C1C20`.
- The user explicitly prioritises glassmorphism and minimalism, with smooth, interactive motion (overrides the brief's general caution about glass; restraint still applies to everything else).
- Logo: an original geometric P suggesting an archive, faceted gem, or vault; readable small and in monochrome; never an emoji or stock icon.
- Financial semantics: green positive, red negative, grey neutral, amber warning, purple brand; never colour alone.

## Evidence on Hand

None yet. There are no real users, testimonials, press, performance figures, licensed market data, or broker partnerships. Future work must not fabricate any of these; demo content is labelled as demo wherever a visitor could mistake it for real.

## Product Principles

1. Substance before decoration: every screen solves a real investing task.
2. Private by default, enforced on the server, previewable by the user.
3. Research over hype: reward reasoning, evidence and revision, not hindsight or activity.
4. Real and simulated money never mix.
5. Accuracy over false confidence: show source, timestamp and delay for every number.

## Accessibility & Inclusion

Target WCAG 2.2 AA: keyboard navigation, visible focus, contrast verified on glass surfaces, reduced-motion support, screen-reader summaries for charts, touch-friendly mobile controls.
