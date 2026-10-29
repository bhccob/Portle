---
version: 1
slug: "src-app-page-tsx"
primary_target: "src/app/page.tsx"
related_targets: []
---

# Landing page (/)

Scope: public landing page. Visitor mode: Persuade.
Audience: retail investors, many of them beginners, with positions across one or more brokers who want one private place for holdings and the reasoning behind them. First release is open sign-up; a public launch follows.
Action: open an archive (email sign-up, working form leading into /sign-up).
Proof on hand: none beyond the product itself; demo content is labelled "Sample" or "Example". No testimonials, numbers or partner claims.
User steer (binding): friendly and welcoming, never intimidating; a dark gray background. History: round one, two re-rolls, glass lockers (shipped), then a vitrine blend (shipped). On 2026-10-29 the user said the vitrine "looks too simple like ai generated and its too intimidating", asked for "more friendly and welcoming maybe dark gray background", and chose between the Notebook and Illustrated comps ("either first or third one i cant decide"): Notebook builds the first viewport, Illustrated's desk drawing closes the page.
Stated changes to the comp's words and art (user, 2026-10-29): the friend's comment avatar is a smiling young Asian man, and the name reads "Bob", not "Maya". Build decision: the comp's real company logos on the sample holdings are replaced by letter tiles, so the page carries no third-party trademarks.
Approved comp: .impeccable/mocks/friendly/notebook.png (supersedes .impeccable/mocks/blend/blend-a.png and every earlier comp). Section art: .impeccable/mocks/friendly/illustrated.png (desk illustration only).

## Direction contract

THESIS: Investing feels calmer when your reasons are written down. The product's own cards (a sample portfolio, a "Why I bought" note, a friend's comment) lie on the page like notes on a desk. Refuses the category default: phone mockup over a hero gradient plus a row of feature cards.

OWN-WORLD: Neutral charcoal ground #1c1c20 with slightly raised panels #212128 and cards #25262d, thin light borders and soft offset shadows. One accent, lilac (#9877e1 action, #9b82d7 dots and rules, #b096ec pills) with lavender highlights; warm off-white text. Gabarito, round and friendly, bold for headlines; tabular numerals. Generous radii (pills for actions, 18–28px for cards); small tilts, never more than about five degrees. A hand-drawn lilac line illustration for warmth, used once.

STORY: The visitor understands that Porfael keeps their holdings and the reasons behind them in one private place; feels it is friendly and made for beginners; sees how it works in three small habits; learns they can practise with pretend money and share percentages, never amounts, with friends; gets plain answers to the worries they arrived with; enters an email.

FIRST VIEWPORT: Nav row: faceted P mark and wordmark left, Portfolio · Theses · Paper Lab · Guilds after it, Sign in right. Left: bold two-line headline "Know why you own what you own.", a three-line subline, a joined pill email field with "Start your archive", and three reassurances with line icons (No broker passwords · Only you see your numbers · Free to start). Right: three tilted cards: a sample portfolio with a donut and four holdings, a "Why I bought ASML" note with three bullets, a "Revisit in January" tag and a gem sticker, and Bob's comment with his avatar. Bottom: a lighter panel with rounded top corners opens "How Porfael works".

FORM: Notebook, a friendly redirection of the Specimen Vitrine world chosen by the user in a comp round of three (Notebook, Guided tour, Illustrated), carried over: one accession label, the faceted mark, lilac on dark, private by default. seed:8e691fddaa371d1f (the world's original roll; this direction came from a user-steered comp round, not a new roll). Signature interaction: the notes settle into place on load and drift a few pixels with the pointer, each at its own depth. Motion grammar: one gentle settle, CSS from the first paint, reduced-motion safe.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
