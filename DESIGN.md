---
name: Porfael
description: A private investing archive in amethyst glass, where every position is kept with the reason it was bought.
colors:
  ink: "#171320"
  cabinet-ground: "#100e1e"
  amethyst: "#49366b"
  lilac: "#9b82d7"
  lilac-bright: "#ac97e0"
  archive-violet: "#7f62d2"
  archive-violet-deep: "#7154c6"
  lavender: "#d5c6f2"
  porcelain: "#f3eff8"
  paper-white: "#ffffff"
  muted-heather: "#b7aecb"
  dusk-heather: "#8a84b7"
  field-ink: "#171428"
  field-rule: "#554e82"
  label-ink: "#2f2258"
  glass-depth-1: "rgb(38 31 54 / 0.52)"
  glass-depth-2: "rgb(44 36 63 / 0.82)"
  hairline: "rgb(213 198 242 / 0.1)"
  positive: "#5fd59d"
  negative: "#ff8a97"
  warning: "#f2bd62"
  info: "#8cb8ff"
typography:
  display:
    fontFamily: "Geom, Onest, ui-sans-serif, system-ui, sans-serif"
    fontSize: "3.832cqw"
    fontWeight: 400
    lineHeight: 1.1165
    letterSpacing: "-0.012em"
  headline:
    fontFamily: "Geom, Onest, ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(30px, 3.3vw, 46px)"
    fontWeight: 400
    lineHeight: 1.12
    letterSpacing: "-0.022em"
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
  label:
    fontFamily: "Geom, Onest, ui-sans-serif, system-ui, sans-serif"
    fontSize: "12px"
    fontWeight: 500
    lineHeight: 1
    letterSpacing: "0.01em"
    fontFeature: "\"tnum\" 1, \"lnum\" 1"
rounded:
  tag: "4px"
  sm: "8px"
  md: "12px"
  pane: "14px"
  lg: "16px"
  xl: "22px"
  pill: "999px"
spacing:
  gutter: "16px"
  pane-inset: "20px"
  section: "clamp(96px, 11vw, 168px)"
components:
  button-primary:
    backgroundColor: "{colors.lilac}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    height: "40px"
    padding: "0 16px"
  button-primary-hover:
    backgroundColor: "{colors.lilac-bright}"
  button-archive:
    backgroundColor: "{colors.archive-violet}"
    textColor: "{colors.paper-white}"
    rounded: "{rounded.pill}"
    height: "52px"
    padding: "0 24px"
  button-archive-hover:
    backgroundColor: "{colors.archive-violet-deep}"
  input-archive:
    backgroundColor: "{colors.field-ink}"
    textColor: "{colors.porcelain}"
    rounded: "{rounded.pill}"
    height: "52px"
    padding: "0 18px"
  accession-tag:
    backgroundColor: "{colors.hairline}"
    textColor: "{colors.lavender}"
    typography: "{typography.label}"
    rounded: "{rounded.tag}"
    height: "22px"
    padding: "0 8px"
  accession-tag-lit:
    backgroundColor: "{colors.lavender}"
    textColor: "{colors.label-ink}"
    rounded: "{rounded.tag}"
    height: "22px"
  glass-panel:
    backgroundColor: "{colors.glass-depth-1}"
    rounded: "{rounded.xl}"
---

# Design System: Porfael

## Overview

**Creative North Star: "The Specimen Vitrine"**

Every position is a specimen kept under glass with the reasoning that put it there. Porfael is a quiet collection room at night: an ink ground deepening into amethyst, frosted vitrine panes with one bright hairline along their top edge, and lilac light falling on whatever the visitor has chosen to keep. Nothing on the page shouts. The interface earns trust by being calm, legible and exact, so a beginner is not intimidated and a serious investor is not patronised.

Density follows the surface. The public landing page is spacious and image-led: a wall of glass specimen lockers with one lit and pulled forward. The signed-in app is an Operate surface, with denser glass panels, tabular numerals and familiar controls. Brand lives in the details there: the faceted P, the accession label, the lilac focus ring and the glass depth steps.

**Key Characteristics:**
- Dark by default (evening research under low light); a porcelain light theme carries the same roles.
- Glass is a depth system with exactly three steps, never decoration.
- One accession-label form (PF-#### · SYMBOL · status) repeats at every scale, from the hero plate to table chips.
- Lilac is the only accent; semantic colours appear only on data.
- Numbers are tabular, and money is shown only to its owner.

## Colors

A narrow violet family on near-black ink: one accent (lilac), one deep brand tone (amethyst), one pale light (lavender), and porcelain for text.

### Primary
- **Lamp Lilac** (lilac): the app's primary action fill, focus-adjacent highlights, chart series one, the earned edge of a Relic. Its brighter step (lilac-bright) is the hover state.
- **Archive Violet** (archive-violet): the landing page's call to action. It is the deepest lilac that still holds white label text at 4.5:1; its hover goes one step deeper (archive-violet-deep), never lighter, so contrast never drops.

### Secondary
- **Vault Amethyst** (amethyst): the brand plate behind the mark, selected rows and the light theme's primary action.

### Tertiary
- **Lantern Lavender** (lavender): focus rings, the lit accession label and section sub-labels on dark. It is light, not colour, so it is used sparingly.

### Neutral
- **Ink** (ink): the app ground in the dark theme.
- **Cabinet Ground** (cabinet-ground): the landing page ground, a shade deeper and bluer than ink so the locker plate's lilac reads as lamplight.
- **Porcelain** (porcelain): primary text on dark and the light theme's ground.
- **Muted Heather** (muted-heather) and **Dusk Heather** (dusk-heather): secondary text and captions. Dusk is the floor for small text on the cabinet ground (5.5:1).
- **Field Ink** (field-ink) with **Field Rule** (field-rule): input fills and their 1px border.
- **Hairline** (hairline): every divider and pane border, always translucent lavender, never grey.
- **Label Ink** (label-ink): text on the lit lavender accession label.

Semantic colours (positive, negative, warning, info) belong to data only: returns, gains and losses, import warnings. They never decorate chrome.

### Named Rules
**The One Lamp Rule.** Lilac is the only accent. A screen lights one thing (the primary action, the lit specimen, the selected row) and leaves the rest of the collection in shadow.

**The Lilac-Not-Grey Rule.** Neutrals are tinted from the violet family. Secondary text, borders and dividers are heather or translucent lavender, never neutral grey.

## Typography

**Display Font:** Geom (with Onest, then the system sans)
**Body Font:** Onest (with the system sans)
**Label Font:** Geom at small sizes, with tabular figures

**Character:** Two clean geometric sans faces. Geom is rounder and more open; it sets the landing page's display lines and the accession labels. Onest carries the app's working text. Neither face is mono; numbers are set with tabular and lining figures instead.

### Hierarchy
- **Display** (Geom 400, 3.832cqw of the hero frame (103px at 2688, about 55px at 1440), line-height 1.1165): the landing headline only, centred over two lines.
- **Headline** (Geom 400, clamp(30px, 3.3vw, 46px), line-height 1.12): landing section headings, balanced.
- **Title** (Onest 600, 1.75rem, line-height 1.2, -0.025em): app page titles.
- **Body** (Onest 400, 0.9375rem, line-height 1.55): app text. Long-form notes and theses use a 68ch measure at line-height 1.7. Landing ledes are Geom at 16 to 17.5px, line-height 1.62, 46ch.
- **Label** (Geom 500, 12px, +0.01em): accession tags, table headers and pane captions.

### Named Rules
**The Weight-Not-Size Rule.** Display and headline stay at weight 400. Emphasis comes from size and from the one lilac accent, never from bold display type or gradient text.

**The Tabular Rule.** Every number that can be compared (weights, returns, quantities, dates in a rail) is set with tabular, lining figures.

## Layout

The app uses a sidebar shell with content in glass panels on a fixed ambient field. The landing page has two modes:

- **First viewport (1024px and up).** It is one frame with the comp's 2688×1520 proportions. Every region is placed in percentages of the frame and sized in container units (cqw), so the whole composition scales as one piece.
- **Below 1024px.** The frame reflows into one centred column: headline, subline, then a full-bleed slice of the locker plate kept centred on the lit locker, then the stacked email form.

Wide, short windows cap the frame at 1.86 times the viewport height and fade the band's ends.

Landing sections sit in a 1180px container with a fluid 16 to 56px gutter. They are separated by clamp(96px, 11vw, 168px), with more space above a heading than below it. Section heads pair the heading (7 columns) with its lede (5 columns), aligned to the baseline. Breakpoints are 640px and 1024px.

## Elevation & Depth

Depth is glass. The app has three steps. Depth 1 is content panels: 18px blur, 52% fill. Depth 2 is overlays and menus: 28px blur, 82% fill. Depth 3 is navigation chrome: 22px blur. Each step raises blur and surface brightness together, and each pane carries a 1px inner top highlight as its lit edge.

App panels add a soft, offset ambient shadow beneath the glass. The landing page uses none: there, depth comes only from overlapping panes, and one integer depth scale drives blur, border brightness and fill.

### Shadow Vocabulary
- **Edge** (`box-shadow: inset 0 1px 0 rgb(255 255 255 / 0.06)`): the lit top edge of every app glass panel.
- **Ambient 1** (`box-shadow: 0 10px 30px -18px rgb(0 0 0 / 0.7)`): content panels in the app.
- **Ambient 2** (`box-shadow: 0 24px 60px -24px rgb(0 0 0 / 0.75)`): overlays, menus and toasts in the app.

### Named Rules
**The Overlap Rule.** On the landing page, one pane sits in front of another to show depth, and the pane behind gets more blur and less light. Nothing there casts a drop shadow.

**The Glass-Has-Something-Behind-It Rule.** A glass pane is only drawn where there is light behind it to frost: the ambient field in the app, or a soft lilac glow in a landing section. Glass on a flat ground is a costume.

## Shapes

The geometry is cut stone, not soft plastic:

- **Logo.** The faceted P has straight cuts, a beveled bowl and a locked counter.
- **Corners.** Radii are modest and nested: 4px for accession tags, 8 to 12px for controls, 14px for landing panes, 16 to 22px for app panels.
- **Pills.** Fully round pills are reserved for the landing's email field and call to action.
- **Relic frames.** Relics sit in a hexagonal specimen frame.
- **Borders.** Lines are 1px translucent lavender hairlines; there are no thick rules or coloured side stripes.

## Components

### Buttons
- **Shape:** gently rounded in the app (12px); a full pill on the landing page.
- **Primary (app):** lilac fill with ink text, 40px tall, 16px horizontal padding, and a faint inner top highlight.
- **Archive (landing):** archive-violet fill with white text at weight 400 to 500, 52px tall in flow.
- **Hover / Focus:** hover shifts the fill one step (160 to 220ms, ease-out cubic-bezier(0.22, 1, 0.36, 1)). Press scales to 0.98. Focus is a 2px lavender ring offset by 2 to 3px.
- **Secondary / Ghost:** secondary is a depth-1 glass button with no shadow. Ghost is muted text that brightens onto the selected tint.

### Accession Label (signature)
- **Form:** "PF-0042 · ASML · Sample thesis", a 4px-radius label with Geom 500 12px tabular text. One form at every scale.
- **Resting:** translucent lavender fill with a hairline border and lavender text.
- **Lit:** a frosted lavender gradient (#dccafb to #c3abf2) with label-ink text, used for the one specimen in focus.
- **Paper:** a dashed hairline border with no fill, used for Paper Lab orders, which are a separate ledger.
- **On the plate:** in the hero, the lit label sits inside the locker plate's own label slot and scales with the plate.

### Cards / Containers (glass panes)
- **Corner Style:** 22px app panels, 14px landing panes.
- **Background:** the glass depth fills above, frosting the ambient field.
- **Shadow Strategy:** see Elevation & Depth (ambient in the app, overlap only on the landing page).
- **Border:** 1px hairline; brighter on the top edge.
- **Internal Padding:** 20px (pane heads at 16 by 20px).
- **Nesting:** panes never nest inside panes. Tables, timelines and ledgers sit directly in the pane with hairline row dividers.

### Inputs / Fields
- **Style:** field-ink fill, 1px field-rule border, lavender-tinted placeholder (dusk heather) and a lilac caret.
- **Focus:** the border shifts to lilac and a 2px lavender ring appears around the whole field.
- **Size:** 52px tall on the landing page, with 16px input text so phones do not zoom.

### Navigation
- **Landing:** brand at the left, Portfolio · Theses · Paper Lab · Guilds centred, Sign in at the right. Links are porcelain and turn lavender on hover. Below 640px the centre links are hidden and only the brand and Sign in remain.
- **App:** a glass depth-3 sidebar with lucide icons at one stroke weight. The selected item sits on the amethyst-tinted selected fill.

### Revision Rail
A horizontal hairline with an open lavender ring for each revision and a filled lilac marker with a soft halo for "Now". On phones it becomes vertical. Revisions are listed, never overwritten.

### Relic
Relics are hexagonal frames whose finish encodes the tier (common, rare, epic), with a single-stroke glyph inside. Unearned Relics are dimmed and desaturated. Each one states its rule and the visitor's progress in text.

### Locker Light (motion)
This is the landing page's one authored moment. On load, the lit locker's lamp flares to 85% and settles back over 2.2s while a soft band of light crosses the glass (2s, power2.inOut). Afterwards that light follows a mouse pointer across the band. Both layers rest invisible, so the page is complete without the script. The moment does not run under reduced motion.

## Do's and Don'ts

### Do:
- **Do** keep one lilac accent lit per screen and leave the rest in ink, heather and hairline.
- **Do** repeat the accession label (PF-#### · SYMBOL · status) wherever a position, thesis or order is named.
- **Do** set every comparable number with tabular, lining figures, and show money values only to their owner. Shared views use percentages.
- **Do** label demonstration content as a sample, in the panel caption, wherever it appears.
- **Do** keep white text on lilac at 4.5:1 or better: use archive-violet (#7f62d2) or deeper behind white, and ink text on the lighter lilac.
- **Do** place glass only where there is light behind it to frost.

### Don't:
- **Don't** put a kicker or eyebrow label above a heading; the heading carries itself.
- **Don't** use drop shadows on the landing page; show depth by overlapping panes.
- **Don't** use gradient text, coloured side stripes, or neutral grey for secondary text.
- **Don't** set display lines in bold; Geom display stays at weight 400.
- **Don't** use semantic green or red outside data (returns, gains, losses, warnings).
- **Don't** shrink the faceted gem mark (PorfaelGem) below about 24px; use the two-tone PorfaelMark there.
