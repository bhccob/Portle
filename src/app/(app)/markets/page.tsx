import Link from "next/link";
import { CalendarClock, Search, Star } from "lucide-react";
import { Sparkline } from "@/components/charts/line-chart";
import { SourceBadge } from "@/components/ui/badge";
import { Change } from "@/components/ui/finance";
import { PageHeader, Panel } from "@/components/ui/panel";
import { EmptyState } from "@/components/ui/states";
import { d } from "@/domain/money";
import { formatMoney, formatNumber } from "@/lib/format";
import { ensureDefaultWatchlist, getIndices, getPrices, listWatchlists, marketStatus, searchInstruments } from "@/server/services/market";
import { requireMember } from "@/server/session";
import { NewWatchlistForm, RemoveWatchItem } from "./market-controls";

export const metadata = { title: "Markets" };

export default async function MarketsPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q = "" } = await searchParams;
  const { user } = await requireMember();
  await ensureDefaultWatchlist(user.id);
  const [indices, lists, universe] = await Promise.all([getIndices(92), listWatchlists(user.id), searchInstruments(q, q ? 30 : 60)]);
  const status = marketStatus();
  const prices = await getPrices([...universe, ...lists.flatMap((l) => l.items.map((i) => i.instrument))]);
  const pct = (id: string) => {
    const p = prices.get(id);
    return p?.previousClose && Number(p.previousClose) ? d(p.price).minus(p.previousClose).div(p.previousClose) : null;
  };

  const sectors = new Map<string, { n: number; sum: number }>();
  for (const i of universe) {
    const c = pct(i.id);
    if (!c || !i.sector || i.assetClass !== "equity") continue;
    const s = sectors.get(i.sector) ?? { n: 0, sum: 0 };
    s.n++;
    s.sum += c.toNumber();
    sectors.set(i.sector, s);
  }

  return (
    <>
      <PageHeader title="Markets" description="Indices, sectors and the securities you're studying." actions={<SourceBadge kind={status.isDemo ? "demo" : "delayed"} detail={status.isDemo ? "Demo market data · synthetic" : status.label} />} />
      {status.isDemo ? (
        <p className="-mt-3 mb-6 max-w-[72ch] text-xs text-fg-subtle">{status.note} Configure a licensed provider (see .env.example) for real quotes.</p>
      ) : null}

      <section aria-labelledby="indices-title" className="mb-6">
        <h2 id="indices-title" className="sr-only">
          Major indices
        </h2>
        <ul className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
          {indices.map((ix) => {
            const change = Number(ix.previousClose) ? d(ix.value).minus(ix.previousClose).div(ix.previousClose) : null;
            return (
              <li key={ix.key} className="border-t border-line py-3">
                <p className="truncate text-xs text-fg-subtle">{ix.name}</p>
                <p className="num mt-1 text-[1.0625rem] font-semibold text-fg">{formatNumber(ix.value, { decimals: 2 })}</p>
                <div className="mt-1 flex items-end justify-between gap-2">
                  <Change percent={change} />
                  <Sparkline values={ix.history.map((h) => Number(h.close))} label={`${ix.name}, last 3 months`} className="h-6 w-16" />
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      <div className="grid gap-5 xl:grid-cols-[1.4fr_1fr]">
        <Panel
          title={q ? `Results for “${q}”` : "Securities"}
          actions={
            <form role="search" className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-fg-subtle" aria-hidden />
              <input
                name="q"
                defaultValue={q}
                placeholder="Ticker, name or ISIN"
                aria-label="Search securities"
                className="h-9 w-56 rounded-[var(--radius-md)] border border-line bg-field pr-3 pl-8 text-sm text-fg placeholder:text-fg-subtle focus:border-accent focus:outline-none"
              />
            </form>
          }
          bodyClassName="px-0 pb-2"
        >
          {universe.length === 0 ? (
            <EmptyState icon={Search} title="No securities match">
              Try a ticker like ASML or a name like Vanguard. Securities you imported that we couldn&apos;t match appear here as &ldquo;Unlisted&rdquo;.
            </EmptyState>
          ) : (
            <ul>
              {universe.map((i) => {
                const p = prices.get(i.id);
                return (
                  <li key={i.id} className="border-t border-line first:border-t-0">
                    <Link href={`/markets/${i.id}`} className="flex items-center justify-between gap-4 px-5 py-2.5 hover:bg-field/60">
                      <span className="min-w-0">
                        <span className="font-semibold text-fg">{i.symbol}</span> <span className="text-xs text-fg-subtle">{i.exchange || "Unlisted"}</span>
                        <span className="block truncate text-xs text-fg-muted">{i.name}</span>
                      </span>
                      <span className="shrink-0 text-right">
                        <span className="num block text-sm text-fg">{p ? formatMoney(p.price, p.currency) : <span className="text-fg-subtle">No price</span>}</span>
                        <Change percent={pct(i.id)} />
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>

        <div className="min-w-0 space-y-5">
          <Panel title="Watchlists" description="Private to you" actions={<NewWatchlistForm />} bodyClassName="px-0 pb-2">
            {lists.map((l) => (
              <div key={l.id} className="border-t border-line first:border-t-0">
                <p className="px-5 pt-3 pb-1 text-xs font-medium text-fg-subtle">{l.name}</p>
                {l.items.length === 0 ? (
                  <p className="flex items-center gap-2 px-5 pb-3 text-sm text-fg-muted">
                    <Star className="size-4" aria-hidden /> Open any security and press Watch to add it here.
                  </p>
                ) : (
                  <ul>
                    {l.items.map((it) => {
                      const p = prices.get(it.instrument.id);
                      return (
                        <li key={it.instrument.id} className="flex items-center justify-between gap-3 px-5 py-1.5">
                          <Link href={`/markets/${it.instrument.id}`} className="min-w-0 hover:underline">
                            <span className="font-medium text-fg">{it.instrument.symbol}</span>{" "}
                            <span className="truncate text-xs text-fg-subtle">{it.instrument.name}</span>
                          </Link>
                          <span className="flex shrink-0 items-center gap-2">
                            <span className="num text-sm text-fg">{p ? formatMoney(p.price, p.currency) : "—"}</span>
                            <Change percent={pct(it.instrument.id)} />
                            <RemoveWatchItem watchlistId={l.id} instrumentId={it.instrument.id} symbol={it.instrument.symbol} />
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            ))}
          </Panel>

          <Panel title="Sectors today" description="Average move of listed stocks in each sector">
            {sectors.size === 0 ? (
              <p className="text-sm text-fg-muted">No sector data.</p>
            ) : (
              <ul className="space-y-2">
                {[...sectors.entries()]
                  .map(([name, s]) => ({ name, avg: s.sum / s.n, n: s.n }))
                  .sort((a, b) => b.avg - a.avg)
                  .map((s) => (
                    <li key={s.name} className="flex items-center justify-between text-sm">
                      <span className="text-fg-muted">
                        {s.name} <span className="text-xs text-fg-subtle">· {s.n}</span>
                      </span>
                      <Change percent={s.avg.toFixed(6)} />
                    </li>
                  ))}
              </ul>
            )}
          </Panel>

          <Panel title="Earnings calendar">
            <EmptyState icon={CalendarClock} title="Needs a licensed data source" className="py-4">
              Earnings dates aren&apos;t part of the demo data, and Portle won&apos;t show dates it can&apos;t source. This appears once a provider with corporate-event data is configured.
            </EmptyState>
          </Panel>
        </div>
      </div>
    </>
  );
}
