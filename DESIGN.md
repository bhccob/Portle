---
name: Porfael
description: A friendly, private place to track your investments and write down why you bought each one.
colors:
  ink: "#171320"
  amethyst: "#49366b"
  lilac: "#9b82d7"
  lilac-bright: "#ac97e0"
  lavender: "#d5c6f2"
  porcelain: "#f3eff8"
  muted-heather: "#b7aecb"
  charcoal: "#1c1c20"
  charcoal-raised: "#212128"
  charcoal-card: "#25262d"
  charcoal-field: "#26262d"
  charcoal-rule: "#383843"
  action-lilac: "#9877e1"
  action-lilac-bright: "#a68aea"
  action-lilac-deep: "#8462d6"
  pill-lilac: "#b096ec"
  label-ink: "#2a1d52"
  soft-text: "#bcb9d8"
  quiet-text: "#9a98b6"
  warm-white: "#f6f4fc"
  gain: "#7fd6a0"
  glass-depth-1: "rgb(38 31 54 / 0.52)"
  glass-depth-2: "rgb(44 36 63 / 0.82)"
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
    backgroundColor: "{colors.lilac}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    height: "40px"
    padding: "0 16px"
  button-primary-hover:
    backgroundColor: "{colors.lilac-bright}"
  button-start:
    backgroundColor: "{colors.action-lilac}"
    textColor: "{colors.warm-white}"
    rounded: "{rounded.pill}"
    height: "56px"
    padding: "0 24px"
  button-start-hover:
    backgroundColor: "{colors.action-lilac-bright}"
  button-start-small:
    backgroundColor: "{colors.action-lilac-deep}"
    textColor: "{colors.warm-white}"
    rounded: "{rounded.pill}"
    height: "56px"
  input-start:
    backgroundColor: "{colors.charcoal-field}"
    textColor: "{colors.warm-white}"
    rounded: "{rounded.pill}"
    height: "56px"
    padding: "0 22px"
  pill-tag:
    backgroundColor: "{colors.pill-lilac}"
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

# Design System: Porfael

## Overview

**Creative North Star: "The Notebook on a Calm Desk"**

Investing feels calmer when your reasons are written down. Porfael looks like a tidy desk at night: a neutral charcoal surface, a few cards of your own lying on it at small angles (a portfolio, a note saying why you bought something, a comment from a friend), and one soft lilac lamp of colour. It is friendly before it is clever. A first-time investor should feel welcome and unhurried; nothing on the page should look like a trading terminal.

The system has two rooms that share one palette of lilac light. The public landing page is the friendly front room: charcoal, roomy, rounded, with the product's own cards shown as tilted notes and a hand-drawn desk illustration to close. The signed-in app is the workroom: an ink-and-amethyst glass shell with denser panels, tabular numerals and familiar controls. Both keep the faceted P, the lilac action, the private-by-default promise and Gabarito for display type.

**Key Characteristics:**
- Charcoal ground on the landing page; ink and amethyst glass in the app. Lilac is the only accent in both.
- Show the product, not a picture of it: the hero is made of real card components with sample data, labelled "Sample" or "Example".
- Friendly geometry: pill actions, 18–28px cards, tilts of at most about five degrees.
- Plain, warm copy that answers beginners' worries (passwords, privacy, cost, advice).
- Numbers are tabular, and money is shown only to its owner; shared views use percentages.

## Colors

A neutral charcoal family with one lilac accent and a pale lavender highlight; the app keeps its deeper ink and amethyst.

### Primary
- **Action Lilac** (action-lilac): the landing page's primary action, a pill with a white Gabarito semibold label. At 20px and up the label is large text (3.5:1); on smaller buttons the fill deepens to action-lilac-deep for 4.6:1. Hover brightens one step (action-lilac-bright).
- **Lamp Lilac** (lilac): bullet dots, rules, the step path, chart series one, the app's primary action fill.

### Secondary
- **Pill Lilac** (pill-lilac) with **Label Ink** (label-ink): small filled pills such as "Sample", "Revisit in January" and the sticky note.
- **Vault Amethyst** (amethyst): the app's brand plate and selected rows.

### Tertiary
- **Lantern Lavender** (lavender): focus rings and hover text. It is light, not colour, so it is used sparingly.

### Neutral
- **Charcoal** (charcoal): the landing ground, sampled from the approved comp.
- **Charcoal Raised** (charcoal-raised): panels a step up, such as the "How Porfael works" band, the Relics shelf and the closing card.
- **Charcoal Card** (charcoal-card), **Field** (charcoal-field) and **Rule** (charcoal-rule): cards, inputs and their 1px edge.
- **Warm White** (warm-white), **Soft Text** (soft-text) and **Quiet Text** (quiet-text): headings, body and captions on charcoal (body 9.6:1, captions 6.3:1).
- **Ink** (ink), **Porcelain** (porcelain) and **Muted Heather** (muted-heather): the app's ground and text.
- **Hairline** (hairline): dividers and card edges, translucent white on charcoal.

Semantic colours (positive, negative, warning, info, gain) belong to data only: returns, gains and losses, import results. They never decorate chrome.

### Named Rules
**The One Lamp Rule.** Lilac is the only accent. A screen lights one thing (the primary action, the step number, the selected row) and leaves the rest of the desk in charcoal.

**The Neutral Ground Rule.** The landing ground is a true neutral charcoal, not purple-black and not pure black. Warmth comes from the lilac and the copy, not from tinting the ground.

## Typography

**Display Font:** Gabarito (with Onest, then the system sans)
**Body Font:** Onest in the app; Gabarito on the landing page
**Label Font:** Gabarito at small sizes, with tabular figures

**Character:** Gabarito is round, open and friendly; at bold weights it carries the landing headlines without shouting. Onest is the app's quieter working face. No mono; numbers use tabular, lining figures.

### Hierarchy
- **Display** (Gabarito 700, 4.948cqw of the hero frame (133px at 2688, about 71px at 1440), line-height 1.135, -0.02em): the landing headline only, left aligned over two lines.
- **Headline** (Gabarito 700, clamp(32px, 3.4vw, 48px), line-height 1.1, -0.02em): landing section headings, balanced.
- **Title** (Onest 600, 1.75rem, line-height 1.2, -0.025em): app page titles.
- **Lede** (Gabarito 400, 17–19px, line-height 1.6, 40ch): landing section introductions.
- **Body** (Onest 400, 0.9375rem, line-height 1.55): app text; long-form notes use a 68ch measure at line-height 1.7.
- **Label** (Gabarito 600, 12.5px, +0.01em): pills, tags and small captions.

### Named Rules
**The Friendly Bold Rule.** Headlines are bold and rounded, never thin or condensed; emphasis comes from size and weight, never from gradient text.

**The Tabular Rule.** Every number that can be compared (weights, returns, balances, dates in a rail) is set with tabular, lining figures.

## Layout

The landing page has two modes:

- **First viewport (1180px and up).** It is one frame with the approved comp's 2688×1520 proportions. Regions are placed in percentages of the frame and sized in container units (cqw), so the composition scales as one piece. Each hero card is its own container, so its contents scale with the card.
- **Below 1180px.** One column: headline, subline, the email form (stacked below 640px), the reassurances, then the three cards stacked full width with a little of their tilt, then the "How Porfael works" band.

Sections below sit in a 1180px container with a fluid 16–56px gutter and are separated by clamp(96px, 10vw, 152px), with more space above a heading than below it. The rhythm varies on purpose: a raised band with three steps, two alternating split sections (art and copy), a centred shelf, a two-column FAQ, and a closing card with the illustration. Breakpoints are 640px, 900px (sections) and 1180px (the hero).

The app uses a sidebar shell with content in glass panels on a fixed ambient field.

## Elevation & Depth

On the landing page, depth is paper on a desk: opaque charcoal cards with a 1px light edge and a soft, offset shadow, tilted a few degrees and overlapping each other. Raised panels step up in tone instead of casting shadows.

The app keeps its three glass depth steps. Depth 1 is content panels: 18px blur, 52% fill. Depth 2 is overlays and menus: 28px blur, 82% fill. Depth 3 is navigation chrome: 22px blur. Each pane carries a 1px inner top highlight as its lit edge.

### Shadow Vocabulary
- **Note** (`box-shadow: 0 0.7cqw 1.4cqw -0.4cqw rgb(0 0 0 / 0.55), inset 0 1px 0 rgb(255 255 255 / 0.05)`): hero cards on the landing page, scaled with the frame.
- **Card** (`box-shadow: 0 28px 50px -26px rgb(0 0 0 / 0.7)`): section cards such as the Paper Lab ticket and the Guild card.
- **Edge** (`box-shadow: inset 0 1px 0 rgb(255 255 255 / 0.06)`): the lit top edge of every app glass panel.
- **Ambient 1 and 2** (`0 10px 30px -18px rgb(0 0 0 / 0.7)`, `0 24px 60px -24px rgb(0 0 0 / 0.75)`): app panels and overlays.

### Named Rules
**The Paper-On-A-Desk Rule.** Landing cards are opaque paper, not glass: a soft offset shadow, a light edge, and a tilt of at most about five degrees. Glass belongs to the app.

**The One Drawing Rule.** The hand-drawn lilac illustration appears once, to close the page. Everything else shows the real product.

## Shapes

- **Logo.** The faceted P: straight cuts, a beveled bowl and a locked counter, in lilac facets.
- **Corners.** Friendly and nested: pills for actions, fields and tags; 18px for small vignettes; 24px for section cards; 28px for panels; 44px (at 2688) for the hero notes; 22px for app panels.
- **Relic frames.** Relics sit in a hexagonal specimen frame.
- **Lines.** 1px hairlines and short lilac rules beside centred headings; a dashed lilac path joins the three steps. No thick rules or coloured side stripes.

## Components

### Buttons
- **Start (landing):** a lilac pill with a white semibold label, 56px tall in flow. In the hero it is joined to the right end of the email field so the two read as one control.
- **Primary (app):** lilac fill with ink text, 40px tall, gently rounded (12px).
- **Hover / Focus:** hover shifts the fill one step (160ms, ease-out cubic-bezier(0.22, 1, 0.36, 1)); press scales to 0.98; focus is a 2px lavender ring offset by 3px.

### Inputs / Fields
- **Style:** charcoal-field fill, 1px charcoal-rule edge, a pill shape, a quiet placeholder (#8f8da8) and a lilac caret.
- **Focus:** the edge turns lilac and a 2px lavender ring wraps the whole pill.
- **Size:** 56px tall with 16px text on phones so they do not zoom.

### Notes (signature)
The hero's three cards, built from real components with sample data: the **Portfolio** card (a donut drawn from the weights, total value, all-time change, four holdings with letter tiles), the **Thesis note** ("Why I bought ASML", three bullets, a pill tag and a gem sticker) and the **Comment** (a friend's avatar, name in lilac, one line). Each is tilted a few degrees and overlaps its neighbour; on load they settle into place, and with a mouse they drift a few pixels at different depths. Neither motion runs under reduced motion.

### Pills and Tags
- **Filled pill:** pill-lilac with label-ink text ("Sample", "Revisit in January").
- **Soft tag:** translucent lilac with lavender text (the accession label, e.g. "ASML").
- **Outline tag:** a lilac ring, no fill ("Practice money"), for anything on the separate Paper Lab ledger.

### Steps
Three numbered lilac circles joined by a dashed path, each with a short heading, two lines of copy and a small tilted product vignette (an import, a note, a revision rail). On phones the path is dropped and the steps stack.

### Cards / Containers
- **Corner Style:** 24px section cards, 28px panels, 22px app panels.
- **Background:** charcoal-card on the landing page; glass depth fills in the app.
- **Border:** 1px hairline.
- **Nesting:** cards never nest inside cards; lists and rows sit directly in the card with hairline dividers.

### FAQ
A two-column block: the heading on the left, native disclosure rows on the right with a lilac plus that turns into a cross when open.

### Navigation
- **Landing:** the faceted mark and wordmark, then Portfolio · Theses · Paper Lab · Guilds in soft text, Sign in at the right in white. Links brighten to lavender on hover. Below 640px only the brand and Sign in remain.
- **App:** a glass depth-3 sidebar with lucide icons at one stroke weight.

### Relic
Relics are hexagonal frames whose finish encodes the tier, with a single-stroke glyph inside. Unearned Relics are dimmed. Each states its rule and the visitor's progress in a small pill.

## Do's and Don'ts

### Do:
- **Do** show real product components with sample data in the hero, and label them "Sample" or "Example".
- **Do** keep one lilac accent lit per screen and leave the rest in charcoal and soft text.
- **Do** answer beginners' worries in plain words (no broker passwords, only you see your numbers, free to start, not investment advice).
- **Do** set every comparable number with tabular figures, and show money values only to their owner. Shared views use percentages.
- **Do** keep white-on-lilac labels at 20px or larger; smaller buttons use action-lilac-deep.
- **Do** draw icons from one stroke family (lucide at 1.4–1.8) or as small inline SVG.

### Don't:
- **Don't** put a kicker or eyebrow label above a heading; the heading carries itself.
- **Don't** use glass, neon glows or dramatic spotlights on the landing page; it is paper on a desk.
- **Don't** use gradient text, coloured side stripes, or Unicode glyphs and emoji as icons.
- **Don't** tilt anything more than about five degrees, or tilt text that people need to read at length.
- **Don't** use semantic green or red outside data (returns, gains, losses, import results).
- **Don't** reproduce third-party logos in sample data; use letter tiles.
