---
name: Portle
description: A friendly, private place to track your investments and write down why you bought each one.
colors:
  ink: "#15141f"
  indigo: "#5146e1"
  violet: "#7b6ff5"
  violet-bright: "#8e84f8"
  violet-light: "#a39bfa"
  lavender: "#b9adfa"
  lavender-soft: "#c4bcfb"
  porcelain: "#f2f1fb"
  mist: "#b3b0cf"
  sky: "#56b8f5"
  cyan: "#25d0ee"
  ember: "#ff9340"
  charcoal: "#1c1c20"
  charcoal-raised: "#212128"
  charcoal-card: "#25262d"
  charcoal-field: "#26262d"
  charcoal-rule: "#383843"
  action-indigo: "#6157ea"
  action-indigo-deep: "#5146e1"
  pill-lavender: "#b9adfa"
  label-ink: "#1d1850"
  soft-text: "#bcb9d8"
  quiet-text: "#9a98b6"
  warm-white: "#f6f4fc"
  gain: "#7fd6a0"
  glass-depth-1: "rgb(33 31 58 / 0.52)"
  glass-depth-2: "rgb(39 36 68 / 0.82)"
  hairline: "rgb(255 255 255 / 0.09)"
  positive: "#5fd59d"
  negative: "#ff8a97"
  warning: "#f2bd62"
  info: "#8cb8ff"
typography:
  display:
    fontFamily: "Gabarito, Onest, ui-sans-serif, system-ui, sans-serif"
    fontSize: "4.948cqw"
    fontWeight: 700
    lineHeight: 1.135
    letterSpacing: "-0.02em"
  headline:
    fontFamily: "Gabarito, Onest, ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(32px, 3.4vw, 48px)"
    fontWeight: 700
    lineHeight: 1.1
    letterSpacing: "-0.02em"
  title:
    fontFamily: "Onest, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.75rem"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "-0.025em"
  body:
    fontFamily: "Onest, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 400
    lineHeight: 1.55
  lede:
    fontFamily: "Gabarito, Onest, ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(17px, 1.35vw, 19px)"
    fontWeight: 400
    lineHeight: 1.6
  label:
    fontFamily: "Gabarito, Onest, ui-sans-serif, system-ui, sans-serif"
    fontSize: "12.5px"
    fontWeight: 600
    lineHeight: 1
    letterSpacing: "0.01em"
    fontFeature: "\"tnum\" 1, \"lnum\" 1"
rounded:
  tag: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  vignette: "18px"
  xl: "22px"
  card: "24px"
  panel: "28px"
  pill: "999px"
spacing:
  gutter: "clamp(16px, 5vw, 56px)"
  card-inset: "24px"
  section: "clamp(96px, 10vw, 152px)"
components:
  button-primary:
    backgroundColor: "{colors.violet-bright}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    height: "40px"
    padding: "0 16px"
  button-primary-hover:
    backgroundColor: "{colors.violet-light}"
  button-start:
    backgroundColor: "{colors.action-indigo}"
    textColor: "{colors.warm-white}"
    rounded: "{rounded.pill}"
    height: "56px"
    padding: "0 24px"
  button-start-hover:
    backgroundColor: "{colors.action-indigo-deep}"
  input-start:
    backgroundColor: "{colors.charcoal-field}"
    textColor: "{colors.warm-white}"
    rounded: "{rounded.pill}"
    height: "56px"
    padding: "0 22px"
  pill-tag:
    backgroundColor: "{colors.pill-lavender}"
    textColor: "{colors.label-ink}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    height: "24px"
    padding: "0 10px"
  note-card:
    backgroundColor: "{colors.charcoal-card}"
    textColor: "{colors.warm-white}"
    rounded: "{rounded.card}"
    padding: "24px"
  glass-panel:
    backgroundColor: "{colors.glass-depth-1}"
    rounded: "{rounded.xl}"
---

# Design System: Portle

## Overview

**Creative North Star: "The Notebook on a Calm Desk"**

Investing feels calmer when your reasons are written down. Portle looks like a tidy desk at night: a neutral charcoal surface, a few cards of your own lying on it at small angles (a portfolio, a note saying why you bought something, a comment from a friend), and one soft violet lamp of colour. It is friendly before it is clever. A first-time investor should feel welcome and unhurried; nothing on the page should look like a trading terminal.

The system has two rooms that share one palette of violet light, taken from the Portle symbol. The public landing page is the friendly front room: charcoal, roomy, rounded, with the product's own cards shown as tilted notes and a hand-drawn desk illustration to close. The signed-in app is phone-first and calm, modelled on the user's references (Blossom and their own Steady app): a plain ground that follows the phone's light or dark setting, two soft glows at the top, content sitting on the page in hairline rows rather than in cards, and one floating glass tab bar. Its signature is the portfolio ring. Practice money (the Paper Lab) is a separate blue room so it can never be mistaken for real money. Both keep the Portle symbol, the violet action, the private-by-default promise and Gabarito for display type.

**Key Characteristics:**
- Charcoal ground on the landing page; a plain light or ink ground in the app (following the phone), with glass only on what floats. Violet is the only accent in both; the symbol's sky, cyan and ember appear only in data and in the mark itself.
- Show the product, not a picture of it: the hero is made of real card components with sample data, labelled "Sample" or "Example".
- Friendly geometry: pill actions, 18–28px cards, tilts of at most about five degrees.
- Plain, warm copy that answers beginners' worries (passwords, privacy, cost, advice).
- Numbers are tabular, and money is shown only to its owner; shared views use percentages.

## Colors

A neutral charcoal family with one violet accent and a pale lavender highlight, all drawn from the Portle symbol; the app keeps a deeper ink and indigo.

### Primary
- **Action Indigo** (action-indigo): the landing page's primary action, a pill with a white Gabarito semibold label at 5.2:1 at any size. Hover goes one step deeper (action-indigo-deep), never lighter.
- **Portle Violet** (violet): bullet dots, rules, the step path and focus edges on the landing page. The app's primary fill is violet-bright with ink text (6:1), hovering to violet-light.

### Secondary
- **Pill Lavender** (pill-lavender) with **Label Ink** (label-ink): small filled pills such as "Sample", "Revisit in January" and the sticky note (8:1).
- **Brand Indigo** (indigo): the app's brand fills, selected rows (as a 26% tint) and the body of the symbol.

### Tertiary
- **Lantern Lavender** (lavender-soft): focus rings, links and hover text. It is light, not colour, so it is used sparingly.
- **Sky, Cyan and Ember** (sky, cyan, ember): the symbol's dial and core. Sky and cyan are chart series and the sample donut; ember stays in the mark and the rare spark, never on chrome.

### Neutral
- **Charcoal** (charcoal): the landing ground, sampled from the approved comp.
- **Charcoal Raised** (charcoal-raised): a step up from the ground, kept for small surfaces. The landing no longer puts sections in raised panels (the "How Portle works" band, the Relics shelf and the closing card were removed on 2026-10-29 as too boxy).
- **Charcoal Card** (charcoal-card), **Field** (charcoal-field) and **Rule** (charcoal-rule): cards, inputs and their 1px edge.
- **Warm White** (warm-white), **Soft Text** (soft-text) and **Quiet Text** (quiet-text): headings, body and captions on charcoal (body 9.6:1, captions 6.3:1).
- **Ink** (ink), **Porcelain** (porcelain) and **Mist** (mist): the app's ground and text.
- **Hairline** (hairline): dividers and card edges, translucent white on charcoal.

Semantic colours (positive, negative, warning, info, gain) belong to data only: returns, gains and losses, import results. They never decorate chrome.

### Named Rules
**The One Lamp Rule.** Violet is the only accent. A screen lights one thing (the primary action, the step number, the selected row) and leaves the rest of the desk in charcoal.

**The Neutral Ground Rule.** The landing ground is a true neutral charcoal, not purple-black and not pure black. Warmth comes from the violet and the copy, not from tinting the ground.

## Typography

**Display Font:** Gabarito (with Onest, then the system sans)
**Body Font:** Onest in the app; Gabarito on the landing page
**Label Font:** Gabarito at small sizes, with tabular figures

**Character:** Gabarito is round, open and friendly; at bold weights it carries the landing headlines without shouting. Onest is the app's quieter working face. No mono; numbers use tabular, lining figures.

### Hierarchy
- **Display** (Gabarito 700, 4.948cqw of the hero frame (133px at 2688, about 71px at 1440), line-height 1.135, -0.02em): the landing headline only, left aligned over two lines.
- **Headline** (Gabarito 700, clamp(32px, 3.4vw, 48px), line-height 1.1, -0.02em): landing section headings, balanced.
- **Title** (Gabarito 700, 2rem, line-height 1.08, -0.02em): app page titles and the greeting.
- **Section** (Gabarito 700, 1.1875rem): app section headings, each under a hairline.
- **Figure** (Gabarito 700, 1.625–2.125rem, tabular): the big money numbers on Home, Portfolio and Practice.
- **Lede** (Gabarito 400, 17–19px, line-height 1.6, 40ch): landing section introductions.
- **Body** (Onest 400, 0.9375rem, line-height 1.55): app text; long-form notes use a 68ch measure at line-height 1.7.
- **Label** (Gabarito 600, 12.5px, +0.01em): pills, tags and small captions.

### Named Rules
**The Friendly Bold Rule.** Headlines are bold and rounded, never thin or condensed; emphasis comes from size and weight, never from gradient text.

**The Tabular Rule.** Every number that can be compared (weights, returns, balances, dates in a rail) is set with tabular, lining figures.

## Layout

The landing page has two modes:

- **First viewport (1180px and up).** It is one frame with the approved comp's 2688×1520 proportions. Regions are placed in percentages of the frame and sized in container units (cqw), so the composition scales as one piece. Each hero card is its own container, so its contents scale with the card.
- **Below 1180px.** One column: headline, subline, the email form (stacked below 640px), the reassurances, then the three cards stacked full width with a little of their tilt, then the "How Portle works" band.

Sections below sit in a 1180px container with a fluid 16–56px gutter and are separated by clamp(96px, 10vw, 152px), with more space above a heading than below it. The rhythm varies on purpose: a raised band with three steps, two alternating split sections (art and copy), a centred shelf, a two-column FAQ, and a closing card with the illustration. Breakpoints are 640px, 900px (sections) and 1180px (the hero).

The app is designed for the phone first. Phones get a top bar that scrolls away (brand, notifications, the account menu, which also holds Markets, Journal, Archives, Guilds, Relics and Settings) and a floating tab bar with five places: Home, Portfolio, Theses, Circle and Practice. Desktop shows the same five, then the rest, in a sidebar on the page (a hairline edge, no slab), with content up to 1120px. Sections sit on the page, separated by a hairline and generous space; lists are hairline rows with a leading tile, two lines of text and a trailing value or chevron. Cards are not used to hold layout.

## Elevation & Depth

On the landing page, depth is paper on a desk: opaque charcoal cards with a 1px light edge and a soft, offset shadow, tilted a few degrees and overlapping each other. Sections sit directly on the ground with no container panels, so the product cards are the only boxes on the page.

In the app, glass is reserved for what floats above the page: the tab bar (depth 3), menus, dialogs, tooltips and the search list (depth 2). Content never sits in a glass panel. Depth on the page comes from spacing, hairlines and the soft glows at the top.

### Shadow Vocabulary
- **Note** (`box-shadow: 0 0.7cqw 1.4cqw -0.4cqw rgb(0 0 0 / 0.55), inset 0 1px 0 rgb(255 255 255 / 0.05)`): hero cards on the landing page, scaled with the frame.
- **Card** (`box-shadow: 0 28px 50px -26px rgb(0 0 0 / 0.7)`): section cards such as the Paper Lab ticket and the Guild card.
- **Edge** (`box-shadow: inset 0 1px 0 rgb(255 255 255 / 0.06)`): the lit top edge of every app glass panel.
- **Ambient 1 and 2** (`0 10px 30px -18px rgb(0 0 0 / 0.7)`, `0 24px 60px -24px rgb(0 0 0 / 0.75)`): app panels and overlays.

### Named Rules
**The Paper-On-A-Desk Rule.** Landing cards are opaque paper, not glass: a soft offset shadow, a light edge, and a tilt of at most about five degrees. Glass belongs to the app.

**The One Drawing Rule.** The hand-drawn violet illustration appears once, to close the page (its plate was drawn in lilac and is turned 13° toward violet in CSS). Everything else shows the real product.

## Shapes

- **Logo.** The Portle symbol: a P whose bowl is a portfolio dial of segmented arcs (violet, lavender, periwinkle, sky, cyan) around an ember core, on an indigo stem. A compact cut without the thin outer arcs and inner ring is used below about 28px and for the favicon.
- **Corners.** Friendly and nested: pills for actions, fields and tags; 18px for small vignettes; 24px for section cards; 28px for panels; 44px (at 2688) for the hero notes; 22px for app panels.
- **Relic frames.** Relics sit in a hexagonal specimen frame.
- **Lines.** 1px hairlines and short violet rules beside centred headings; a dashed violet path joins the three steps. No thick rules or coloured side stripes.

## Components

### Buttons
- **Start (landing):** an indigo-violet pill with a white semibold label, 56px tall in flow. In the hero it is joined to the right end of the email field so the two read as one control.
- **Primary (app):** an indigo pill (violet with ink text in dark mode), Gabarito semibold, 40px tall, sitting on a 3px shade of its own colour that flattens to 1px when pressed.
- **Practice:** the same pill in practice blue, used only for practice trades.
- **Secondary:** a quiet field-tinted pill, no border.
- **Hover / Focus:** hover shifts the fill one step (160ms, ease-out cubic-bezier(0.22, 1, 0.36, 1)); press scales to 0.98; focus is a 2px lavender ring offset by 3px.

### Inputs / Fields
- **Style:** charcoal-field fill, 1px charcoal-rule edge, a pill shape, a quiet placeholder (#8f8da8) and a violet caret.
- **Focus:** the edge turns violet and a soft 4px violet glow (22%) surrounds the pill. The text inside never gets an outline of its own, and autofilled emails keep the field's colours instead of the browser's pale box.
- **Size:** 56px tall with 16px text on phones so they do not zoom.

### Notes (signature)
The hero's three cards, built from real components with sample data: the **Portfolio** card (a donut drawn from the weights, total value, all-time change, four holdings with letter tiles), the **Thesis note** ("Why I bought ASML", three bullets, a pill tag and a gem sticker) and the **Comment** (a friend's avatar, name in lilac, one line). Each is tilted a few degrees and overlaps its neighbour; on load they settle into place, and with a mouse they drift a few pixels at different depths. Neither motion runs under reduced motion.

### Pills and Tags
- **Filled pill:** pill-lavender with label-ink text ("Sample", "Revisit in January").
- **Soft tag:** translucent violet with lavender text (the accession label, e.g. "ASML").
- **Outline tag:** a lavender ring, no fill ("Practice money"), for anything on the separate Paper Lab ledger.

### Steps
Three numbered indigo-violet circles joined by a dashed path, each with a short heading, two lines of copy and a small tilted product vignette (an import, a note, a revision rail). On phones the path is dropped and the steps stack.

### Cards / Containers
- **Corner Style:** 24px section cards and 28px panels on the landing page. The app has no content cards; tiles are 12px, controls are pills.
- **Background:** charcoal-card on the landing page.
- **Border:** 1px hairline.
- **Nesting:** cards never nest inside cards; lists and rows sit directly in the card with hairline dividers.

### FAQ
A two-column block: the heading on the left, native disclosure rows on the right with a lavender plus that turns into a cross when open.

### Navigation
- **Landing:** the Portle symbol and wordmark, then Portfolio · Theses · Paper Lab · Guilds · Relics in soft text, Sign in at the right in white. Links brighten to lavender on hover. Below 720px only the brand and Sign in remain.
- **App:** a floating glass tab bar on phones (Home, Portfolio, Theses, Circle, Practice; Practice lights in practice blue) and a sidebar on desktop, with lucide icons at one stroke weight.

### Portfolio ring (signature)
A donut drawn from shares: one slice per holding (or per type, sector, region or currency), largest first, with a 2px surface gap between slices and anything folded past six into a quiet "Other". The total and its all-time return sit in the middle. It leads Home and My portfolio, and appears small wherever percentages are shared (posts, profiles, Guild averages). A legend or the holdings rows always repeat each slice's name and share, and each slice names itself on hover, so colour is never the only carrier. Its six series colours (--chart-1..6) were validated for colour-blind separation and contrast in both themes with the dataviz validator.

### Practice room
Practice money (the Paper Lab) has its own room: a pale blue ground (deep blue in dark mode) that replaces the page's glows, a dashed ring and dashed position tiles, an outline "Practice money · not real" chip, the word "pretend" beside its numbers, and a practice-blue action. On Home it appears as a dashed blue strip under the real portfolio. Real money is never drawn in these colours or with dashes.

### Relic
Relics are hexagonal frames whose finish encodes the tier, with a single-stroke glyph inside. Unearned Relics are dimmed. Each states its rule and the visitor's progress in a small pill.

## Do's and Don'ts

### Do:
- **Do** show real product components with sample data in the hero, and label them "Sample" or "Example".
- **Do** keep one violet accent lit per screen and leave the rest in charcoal and soft text.
- **Do** answer beginners' worries in plain words (no broker passwords, only you see your numbers, free to start, not investment advice).
- **Do** set every comparable number with tabular figures, and show money values only to their owner. Shared views use percentages.
- **Do** put white labels only on indigo-violet (action-indigo or deeper); lighter violets and lavenders carry ink text.
- **Do** draw icons from one stroke family (lucide at 1.4–1.8) or as small inline SVG.

### Don't:
- **Don't** put a kicker or eyebrow label above a heading; the heading carries itself.
- **Don't** use glass, neon glows or dramatic spotlights on the landing page; it is paper on a desk.
- **Don't** use gradient text, coloured side stripes, or Unicode glyphs and emoji as icons.
- **Don't** tilt anything more than about five degrees, or tilt text that people need to read at length.
- **Don't** use semantic green or red outside data (returns, gains, losses, import results).
- **Don't** reproduce third-party logos in sample data; use letter tiles.
