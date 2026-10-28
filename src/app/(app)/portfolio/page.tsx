import Link from "next/link";
import { FileUp, Info, Wallet } from "lucide-react";
import { AllocationBar } from "@/components/charts/allocation";
import { LineChart } from "@/components/charts/line-chart";
import { SourceBadge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Change, Money } from "@/components/ui/finance";
import { PageHeader, Panel, Stat } from "@/components/ui/panel";
import { Callout, EmptyState, PrivateNote } from "@/components/ui/states";
import { LinkTabs } from "@/components/ui/tabs";
import { formatMoney, formatPercent, formatQuantity } from "@/lib/format";
import type { Range } from "@/server/services/market";
import { getPerformance, getValuation } from "@/server/services/portfolio";
import { requireMember } from "@/server/session";
import { AddTransactionDialog, BaseCurrencySelect, CreateAccountForm, LoadSampleButton } from "./portfolio-forms";

export const metadata = { title: "Portfolio" };

const RANGES: Range[] = ["1M", "3M", "6M", "YTD", "1Y", "3Y"];
const DIMS = [
  ["assetClass", "Asset class"],
  ["sector", "Sector"],
  ["region", "Region"],
  ["currency", "Currency"],
] as const;

export default async function PortfolioPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const { user } = await requireMember();
  const range = (RANGES.includes(sp.range as Range) ? sp.range : "1Y") as Range;
  const dim = (DIMS.find(([k]) => k === sp.dim)?.[0] ?? "assetClass") as (typeof DIMS)[number][0];
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
        <PageHeader title="Portfolio" description="Track every account in one place. Values stay private to you." />
        <Panel>
          <EmptyState icon={Wallet} title="Start with an account">
            Add the brokerage or bank account you invest through. Then record positions by hand, or import a CSV export from your broker.
          </EmptyState>
          <div className="mx-auto max-w-3xl">
            <CreateAccountForm compact />
            <p className="mt-4 text-center text-sm text-fg-muted">
              Just looking around? <LoadSampleButton />
            </p>
          </div>
        </Panel>
      </>
    );
  }

  const hasHoldings = v.holdings.length > 0;
  const perf = hasHoldings ? await getPerformance(user.id, range, { accountId: sp.account }) : null;
  const priceKind = v.usesDemoPrices ? "demo" : "delayed";

  return (
    <>
      <PageHeader
        title="Portfolio"
        description="Positions are rebuilt from your transactions. Everything on this page is visible only to you."
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
          className="mb-5 w-fit max-w-full"
          label="Filter by account"
          current={sp.account ?? "all"}
          items={[{ value: "all", label: "All accounts", href: qs({ account: undefined }) }, ...accounts.map((a) => ({ value: a.id, label: a.name, href: qs({ account: a.id }) }))]}
        />
      ) : null}

      {!hasHoldings ? (
        <Panel>
          <EmptyState icon={Wallet} title="Record your first position" action={<><AddTransactionDialog accounts={accountOptions} defaultType="transfer_in" /><ButtonLink href="/portfolio/import" variant="secondary">Import a CSV</ButtonLink><LoadSampleButton /></>}>
            Add what you hold today as an opening position, or import your broker&apos;s transaction history so returns can be reconstructed accurately.
          </EmptyState>
        </Panel>
      ) : (
        <div className="space-y-5">
          <div className="grid gap-5 xl:grid-cols-[1.6fr_1fr]">
            <Panel
              title="Holdings value"
              actions={<SourceBadge kind={priceKind} detail={v.usesDemoPrices ? "Demo prices · synthetic" : data.market.label} asOf={v.oldestPriceAsOf} />}
            >
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <p className="num text-[2rem] leading-none font-semibold tracking-[-0.03em] text-fg">{formatMoney(v.totals.marketValue, base)}</p>
                  <p className="mt-2 text-sm text-fg-muted">
                    <Change value={v.totals.dayChange} percent={v.totals.dayChangePct} currency={base} /> <span className="text-fg-subtle">since previous close</span>
                  </p>
                </div>
                <LinkTabs label="Chart range" current={range} items={RANGES.map((r) => ({ value: r, label: r, href: qs({ range: r }) }))} />
              </div>
              <div className="mt-5">
                {perf?.available ? (
                  <LineChart points={perf.points.map((p) => ({ date: p.date, value: Number(p.value) }))} mode="money" currency={base} label="Holdings value" height={210} />
                ) : (
                  <Callout tone="neutral" icon={Info}>
                    {perf && !perf.available ? perf.reason : "Not enough history yet."}
                  </Callout>
                )}
              </div>
              <dl className="mt-5 grid grid-cols-2 gap-x-6 gap-y-4 border-t border-line pt-4 sm:grid-cols-4">
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

            <Panel title="Allocation" description="Share of priced holdings">
              <LinkTabs className="mb-5" label="Allocation dimension" current={dim} items={DIMS.map(([k, l]) => ({ value: k, label: l, href: qs({ dim: k }) }))} />
              <AllocationBar label={`Allocation by ${dim}`} slices={v.allocation[dim].map((s) => ({ label: s.label, percent: s.percent.toFixed() }))} />
            </Panel>
          </div>

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

          <Panel title="Holdings" description={`${v.holdings.length} open position${v.holdings.length === 1 ? "" : "s"}`} actions={<PrivateNote>Only you can see values</PrivateNote>} bodyClassName="px-0 pb-2">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-sm">
                <caption className="sr-only">Open positions with cost, value and unrealized profit or loss</caption>
                <thead>
                  <tr className="border-b border-line text-left text-xs text-fg-subtle">
                    <th scope="col" className="px-5 py-2.5 font-medium">Security</th>
                    <th scope="col" className="px-3 py-2.5 text-right font-medium">Quantity</th>
                    <th scope="col" className="px-3 py-2.5 text-right font-medium">Avg cost</th>
                    <th scope="col" className="px-3 py-2.5 text-right font-medium">Price</th>
                    <th scope="col" className="px-3 py-2.5 text-right font-medium">Value ({base})</th>
                    <th scope="col" className="px-3 py-2.5 text-right font-medium">Unrealized</th>
                    <th scope="col" className="px-5 py-2.5 text-right font-medium">Weight</th>
                  </tr>
                </thead>
                <tbody>
                  {v.holdings.map((h) => (
                    <tr key={h.instrument.id} className="border-b border-line/60 last:border-0 hover:bg-field/60">
                      <th scope="row" className="px-5 py-3 text-left font-normal">
                        <Link href={`/markets/${h.instrument.id}`} className="group block min-w-0">
                          <span className="font-semibold text-fg group-hover:underline">{h.instrument.symbol}</span>
                          <span className="block max-w-[260px] truncate text-xs text-fg-subtle">{h.instrument.name}</span>
                        </Link>
                      </th>
                      <td className="num px-3 py-3 text-right text-fg">{formatQuantity(h.quantity)}</td>
                      <td className="num px-3 py-3 text-right text-fg-muted">{h.averageCost ? formatMoney(h.averageCost, h.instrument.currency) : <span title="Cost basis unknown">Unknown</span>}</td>
                      <td className="num px-3 py-3 text-right text-fg-muted">
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
                      <td className="num px-3 py-3 text-right font-medium text-fg">{formatMoney(h.marketValueBase, base)}</td>
                      <td className="px-3 py-3 text-right">{h.unrealizedBase ? <Change value={h.unrealizedBase} percent={h.unrealizedPct} currency={base} /> : <span className="text-fg-subtle">—</span>}</td>
                      <td className="num px-5 py-3 text-right text-fg-muted">{h.weight ? formatPercent(h.weight) : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
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
