import Link from "next/link";
import { FileUp, Info, Lock, Wallet } from "lucide-react";
import { LineChart } from "@/components/charts/line-chart";
import { Ring, RingLegend, ringColor } from "@/components/charts/ring";
import { holdingSlices } from "@/components/charts/ring-data";
import { SourceBadge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Change, Money } from "@/components/ui/finance";
import { PageHeader, Panel, Stat } from "@/components/ui/panel";
import { Callout, EmptyState } from "@/components/ui/states";
import { LinkTabs } from "@/components/ui/tabs";
import { formatMoney, formatPercent, formatQuantity } from "@/lib/format";
import type { Range } from "@/server/services/market";
import { getPerformance, getValuation } from "@/server/services/portfolio";
import { requireMember } from "@/server/session";
import { AddTransactionDialog, BaseCurrencySelect, CreateAccountForm, LoadSampleButton } from "./portfolio-forms";

export const metadata = { title: "My portfolio" };

const RANGES: Range[] = ["1M", "3M", "6M", "YTD", "1Y", "3Y"];
const DIMS = [
  ["holdings", "Holdings"],
  ["assetClass", "Type"],
  ["sector", "Sector"],
  ["region", "Region"],
  ["currency", "Currency"],
] as const;
type Dim = (typeof DIMS)[number][0];

const INTRO = "What you really own, as you recorded it. Portle never moves money, and only you see the amounts.";

export default async function PortfolioPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const { user } = await requireMember();
  const range = (RANGES.includes(sp.range as Range) ? sp.range : "1Y") as Range;
  const dim = (DIMS.find(([k]) => k === sp.dim)?.[0] ?? "holdings") as Dim;
  const data = await getValuation(user.id, { accountId: sp.account });
  const { valuation: v, accounts, portfolio } = data;
  const base = portfolio.baseCurrency;
  const qs = (patch: Record<string, string | undefined>) => {
    const p = new URLSearchParams(Object.entries({ range, dim, account: sp.account, ...patch }).filter(([, x]) => x) as [string, string][]);
    return `/portfolio?${p}`;
  };
  const accountOptions = accounts.map((a) => ({ id: a.id, name: a.name, currency: a.currency }));

  if (!accounts.length) {
    return (
      <>
        <PageHeader title="My portfolio" description={INTRO} />
        <EmptyState icon={Wallet} title="Start with an account">
          Add the brokerage or bank account you invest through. Then record positions by hand, or import a CSV export from your broker.
        </EmptyState>
        <div className="mx-auto max-w-3xl">
          <CreateAccountForm compact />
          <p className="mt-4 text-center text-sm text-fg-muted">
            Just looking around? <LoadSampleButton />
          </p>
        </div>
      </>
    );
  }

  const hasHoldings = v.holdings.length > 0;
  const perf = hasHoldings ? await getPerformance(user.id, range, { accountId: sp.account }) : null;
  const priceKind = v.usesDemoPrices ? "demo" : "delayed";
  const byHolding = holdingSlices(v.holdings);
  const slices = dim === "holdings" ? byHolding : v.allocation[dim].map((s) => ({ label: s.label, percent: Number(s.percent) }));
  // A holding keeps its ring colour in the table; ones folded into "Other" take Other's colour.
  const colourOf = new Map(byHolding.map((s, i) => [s.label, i < 5 || byHolding.length <= 6 ? ringColor(i, s.label) : "var(--chart-7)"]));

  return (
    <>
      <PageHeader
        title="My portfolio"
        description={INTRO}
        actions={
          <>
            <BaseCurrencySelect value={base} />
            <ButtonLink href="/portfolio/import" variant="secondary">
              <FileUp className="size-4" aria-hidden /> Import CSV
            </ButtonLink>
            <AddTransactionDialog accounts={accountOptions} />
          </>
        }
      />

      {accounts.length > 1 ? (
        <LinkTabs
          className="mb-6 w-fit max-w-full"
          label="Filter by account"
          current={sp.account ?? "all"}
          items={[{ value: "all", label: "All accounts", href: qs({ account: undefined }) }, ...accounts.map((a) => ({ value: a.id, label: a.name, href: qs({ account: a.id }) }))]}
        />
      ) : null}

      {!hasHoldings ? (
        <EmptyState
          icon={Wallet}
          title="Record your first position"
          action={
            <>
              <AddTransactionDialog accounts={accountOptions} defaultType="transfer_in" />
              <ButtonLink href="/portfolio/import" variant="secondary">
                Import a CSV
              </ButtonLink>
              <LoadSampleButton />
            </>
          }
        >
          Add what you hold today as an opening position, or import your broker&apos;s transaction history so returns can be reconstructed accurately.
        </EmptyState>
      ) : (
        <div className="space-y-10">
          {/* The ring is the page: your mix, with the total and its return in the middle. */}
          <section aria-label="Your mix" className="grid items-center gap-x-12 gap-y-6 lg:grid-cols-[auto_1fr]">
            <div className="grid justify-items-center gap-4">
              <LinkTabs className="w-full max-w-[420px] lg:hidden" label="Group the ring by" current={dim} items={DIMS.map(([k, l]) => ({ value: k, label: l, href: qs({ dim: k }) }))} />
              <Ring slices={slices} label={`Your mix by ${DIMS.find(([k]) => k === dim)![1].toLowerCase()}`} size={256} thickness={28}>
                <span className="text-[0.8125rem] text-fg-subtle">Total value</span>
                <span className="num font-display text-[1.75rem] leading-tight font-bold tracking-[-0.02em] text-fg">{formatMoney(v.totals.marketValue, base)}</span>
                {v.totals.unrealizedPct ? (
                  <span className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-field px-2.5 py-0.5 text-[0.8125rem]">
                    <Change percent={v.totals.unrealizedPct} /> <span className="text-fg-subtle">all time</span>
                  </span>
                ) : null}
              </Ring>
              <div className="flex flex-wrap justify-center gap-2">
                <SourceBadge kind={priceKind} detail={v.usesDemoPrices ? "Demo prices · synthetic" : data.market.label} asOf={v.oldestPriceAsOf} />
                <span className="inline-flex h-6 items-center gap-1 rounded-full bg-field px-2.5 text-xs text-fg-muted">
                  Today <Change percent={v.totals.dayChangePct} />
                </span>
              </div>
            </div>
            <div className="min-w-0">
              <LinkTabs className="mb-5 hidden w-fit lg:flex" label="Group the ring by" current={dim} items={DIMS.map(([k, l]) => ({ value: k, label: l, href: qs({ dim: k }) }))} />
              <RingLegend slices={slices} className="max-w-md" />
              <p className="mt-4 flex items-center gap-1.5 text-xs text-fg-subtle">
                <Lock className="size-3" aria-hidden /> Shares of priced holdings. Friends only ever see percentages, and only if you share them.
              </p>
            </div>
          </section>

          {data.issues.length || v.excluded.length ? (
            <Callout tone="warning" title="Some figures need attention">
              <ul className="list-disc space-y-0.5 pl-4">
                {v.excluded.map((e) => (
                  <li key={e.symbol}>
                    <strong>{e.symbol}</strong>: {e.reason}. It is left out of totals rather than estimated.
                  </li>
                ))}
                {data.issues.slice(0, 5).map((i) => (
                  <li key={i.transactionId}>{i.message}</li>
                ))}
              </ul>
              <Link href="/portfolio/transactions" className="mt-1 inline-block font-medium text-fg underline">
                Review transactions
              </Link>
            </Callout>
          ) : null}

          <Panel title="Holdings" description={`${v.holdings.length} open position${v.holdings.length === 1 ? "" : "s"}`}>
            <table className="w-full text-sm">
              <caption className="sr-only">Open positions with cost, value and unrealized profit or loss</caption>
              <thead>
                <tr className="text-left text-xs text-fg-subtle">
                  <th scope="col" className="py-2 pr-3 font-medium">
                    Security
                  </th>
                  <th scope="col" className="hidden px-3 py-2 text-right font-medium md:table-cell">
                    Quantity
                  </th>
                  <th scope="col" className="hidden px-3 py-2 text-right font-medium lg:table-cell">
                    Avg cost
                  </th>
                  <th scope="col" className="hidden px-3 py-2 text-right font-medium md:table-cell">
                    Price
                  </th>
                  <th scope="col" className="hidden px-3 py-2 text-right font-medium sm:table-cell">
                    Value ({base})
                  </th>
                  <th scope="col" className="py-2 pl-3 text-right font-medium">
                    Share · return
                  </th>
                </tr>
              </thead>
              <tbody>
                {v.holdings.map((h) => (
                  <tr key={h.instrument.id} className="border-t border-line">
                    <th scope="row" className="py-3 pr-3 text-left font-normal">
                      <Link href={`/markets/${h.instrument.id}`} className="group flex min-w-0 items-center gap-3">
                        <span
                          className="grid size-10 shrink-0 place-items-center rounded-[12px] font-display text-[0.8125rem] font-bold text-white"
                          style={{ background: colourOf.get(h.instrument.symbol) ?? "var(--chart-7)" }}
                          aria-hidden
                        >
                          {h.instrument.symbol.slice(0, 2)}
                        </span>
                        <span className="min-w-0">
                          <span className="block font-semibold text-fg group-hover:underline">{h.instrument.symbol}</span>
                          <span className="block max-w-[min(240px,40vw)] truncate text-xs text-fg-subtle">{h.instrument.name}</span>
                        </span>
                      </Link>
                    </th>
                    <td className="num hidden px-3 py-3 text-right text-fg md:table-cell">{formatQuantity(h.quantity)}</td>
                    <td className="num hidden px-3 py-3 text-right text-fg-muted lg:table-cell">
                      {h.averageCost ? formatMoney(h.averageCost, h.instrument.currency) : <span title="Cost basis unknown">Unknown</span>}
                    </td>
                    <td className="num hidden px-3 py-3 text-right text-fg-muted md:table-cell">
                      {h.price ? (
                        <>
                          {formatMoney(h.price.price, h.price.currency)}
                          {h.dayChangePct ? (
                            <span className="block">
                              <Change percent={h.dayChangePct} />
                            </span>
                          ) : null}
                        </>
                      ) : (
                        "No price"
                      )}
                    </td>
                    <td className="num hidden px-3 py-3 text-right font-medium text-fg sm:table-cell">{formatMoney(h.marketValueBase, base)}</td>
                    <td className="py-3 pl-3 text-right">
                      <span className="num block font-display font-semibold text-fg">{h.weight ? formatPercent(h.weight) : "—"}</span>
                      {h.unrealizedPct ? (
                        <span className="mt-1 inline-flex rounded-full bg-field px-2 py-0.5">
                          <Change percent={h.unrealizedPct} />
                        </span>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Panel>

          <Panel title="Value over time" actions={<LinkTabs label="Chart range" current={range} items={RANGES.map((r) => ({ value: r, label: r, href: qs({ range: r }) }))} />}>
            {perf?.available ? (
              <LineChart points={perf.points.map((p) => ({ date: p.date, value: Number(p.value) }))} mode="money" currency={base} label="Holdings value" height={200} />
            ) : (
              <Callout tone="neutral" icon={Info}>
                {perf && !perf.available ? perf.reason : "Not enough history yet."}
              </Callout>
            )}
            <dl className="mt-6 grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-4">
              <Stat label="Unrealized P/L" value={<Change value={v.totals.unrealized} percent={v.totals.unrealizedPct} currency={base} size="md" />} hint="Open positions vs. cost" />
              <Stat label="Realized P/L" value={<Change value={v.totals.realized} currency={base} size="md" />} hint="Closed lots, after fees" />
              <Stat label="Dividends & income" value={<Money value={v.totals.income} currency={base} />} />
              <Stat
                label={
                  <span className="inline-flex items-center gap-1">
                    Time-weighted return ({range})
                    <Link href="/archives/guides/returns" className="text-fg-subtle hover:text-fg" aria-label="How returns are calculated">
                      <Info className="size-3.5" />
                    </Link>
                  </span>
                }
                value={perf?.available ? <Change percent={perf.twr} size="md" /> : "—"}
                hint="Excludes deposits and withdrawals"
              />
            </dl>
          </Panel>

          <p className="text-xs text-fg-subtle">
            Currency conversion: {data.fx.label}
            {data.fx.asOf !== "demo" ? ` as of ${data.fx.asOf}` : ""}. Cost basis is converted at current rates, so unrealized P/L in {base} includes currency movements.{" "}
            <Link href="/portfolio/transactions" className="underline">
              All transactions
            </Link>{" "}
            ·{" "}
            <Link href="/portfolio/accounts" className="underline">
              Accounts
            </Link>
          </p>
        </div>
      )}
    </>
  );
}
