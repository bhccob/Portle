/**
 * Portle's own editorial guides (original text). Educational only, not advice.
 */
export type Guide = { slug: string; title: string; summary: string; minutes: number; body: string };

export const GUIDES: Guide[] = [
  {
    slug: "returns",
    title: "How Portle measures returns",
    summary: "Unrealized, realized, time-weighted and money-weighted returns, and why a rising balance isn't always performance.",
    minutes: 5,
    body: `Your account balance can go up because markets rose or because you added money. Only the first is performance. Portle keeps the two apart.

## Cost basis
Portle uses the **average-cost method**. Each purchase adds its price and fees to the position's cost; a sale removes cost in proportion to the shares sold. If a position arrived without a known cost (for example a transfer you didn't price), its cost basis is marked *unknown* and it is left out of profit figures rather than guessed.

## Unrealized and realized
- **Unrealized P/L** is the difference between what your open positions are worth now and what they cost.
- **Realized P/L** is the profit or loss locked in by sales, after fees.
- **Income** is dividends and interest, after withholding you recorded.

## Time-weighted return (TWR)
The headline return on the Portfolio page is time-weighted for the holdings you own. Each day's return is measured *before* that day's purchases and sales, and the days are chained together. Adding €10,000 on a flat day therefore changes the value but not the return. TWR answers: *how did my choices of what to hold perform?*

## Money-weighted return (MWR)
A money-weighted return (an internal rate of return) also rewards or penalises **when** you added money. It answers: *how did my actual euros do?* Both are legitimate; they answer different questions.

## Currencies
Totals are converted into your base currency using the latest European Central Bank reference rates (or clearly labelled demo rates). Cost basis is converted at today's rate too, so unrealized P/L in your base currency includes currency movements.

## What Portle won't do
It won't show a price it can't source, estimate a missing value, or call a deposit a gain.`,
  },
  {
    slug: "writing-a-thesis",
    title: "Writing a thesis that can be wrong",
    summary: "A useful thesis names the claim, the strongest counter-argument and the evidence that would change your mind.",
    minutes: 4,
    body: `A thesis is not a ticker and a feeling. It's a claim about the world that the market hasn't fully priced, written so that you can be shown wrong.

## The parts
1. **The claim.** One sentence. "Lithography stays a one-supplier market through 2030" is a claim; "ASML is great" is not.
2. **The bull case.** What has to go right, in order.
3. **The bear case.** The strongest argument against you, written as its best advocate would put it.
4. **Assumptions.** The facts you're relying on that you haven't verified.
5. **Catalysts.** Events that will reveal whether you're right.
6. **What would prove you wrong.** Specific and observable: a number, a date, an event.

## Revisions are the point
When the evidence changes, revise the thesis and say what changed. Portle keeps every revision, so later you can see what you believed *at the time*, not what you remember believing.

## Judge the process
A profitable trade doesn't prove a thesis was sound, and a losing one doesn't prove it was foolish. When you close a thesis, write down whether the reasoning held up.`,
  },
  {
    slug: "diversification",
    title: "Diversification across regions and currencies",
    summary: "Concentration hides in places a holdings list doesn't show: one country, one currency, one sector.",
    minutes: 4,
    body: `Owning twenty stocks isn't diversification if they all rise and fall together.

## Look at three dimensions
- **Sector.** Several "different" companies can depend on the same customers.
- **Region.** Where a company earns its money matters more than where it is listed.
- **Currency.** If you spend euros but hold mostly dollar assets, currency moves become a large part of your result.

## Use the allocation views
The Portfolio page breaks your holdings down by asset class, sector, region and currency. A broad index fund counts as "Global" or "Diversified" because it holds many regions at once.

## A question to journal on
If your largest position fell by half tomorrow, how would the rest of your portfolio, and your plans, cope?`,
  },
  {
    slug: "paper-lab",
    title: "Using the Paper Lab without fooling yourself",
    summary: "Simulated trading teaches process, not profit. Set it up so it tells you the truth.",
    minutes: 3,
    body: `Virtual money is consequence-free, which is exactly why it can mislead.

## Make it realistic
- Keep the starting balance close to what you'd actually invest.
- Leave the fee and slippage assumptions on. Real trades always cost something.
- Size positions as you would with real money.

## Link every trade to a thesis
A paper trade without a reason teaches you nothing. Link it to a thesis, then write a journal entry afterwards: what did you expect, and what happened?

## Know the limits
Simulated fills assume you could always trade at the quoted price. Real markets have gaps, halts and emotions. Simulated results don't predict real-world performance.`,
  },
  {
    slug: "privacy",
    title: "What other members can and can't see",
    summary: "Exact values are never shared. Everything else is your choice, and you can preview it.",
    minutes: 2,
    body: `## Never shared
Account balances, position values, quantities, cost basis, transactions, account names, broker details and private notes. There is no setting that exposes them.

## Shared only if you choose
- Your allocation **percentages** (by asset class, sector or region).
- Your holdings **by weight** (symbols and percentages, no amounts).
- Theses and journal entries, one by one, to friends, a Guild or all members.

## Guild analytics
A Guild shows averages only from members who opt in, and only once at least three have, so no individual can be identified.

## Check it yourself
Settings → Privacy shows your profile exactly as a friend and as another member see it, using the same code that serves them.`,
  },
];

export const GUIDE_BY_SLUG = new Map(GUIDES.map((g) => [g.slug, g]));
