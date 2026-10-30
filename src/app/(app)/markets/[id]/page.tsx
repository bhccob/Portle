import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, FlaskConical, ScrollText } from "lucide-react";
import { AccessBand } from "@/components/access/access-client";
import { LineChart } from "@/components/charts/line-chart";
import { HideTotalButton } from "@/components/shell/hide-total";
import { Badge, SourceBadge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Change } from "@/components/ui/finance";
import { PageHeader, Panel, Stat } from "@/components/ui/panel";
import { Callout, PrivateNote } from "@/components/ui/states";
import { LinkTabs } from "@/components/ui/tabs";
import { d } from "@/domain/money";
import { formatDate, formatMoney, formatPercent, formatQuantity } from "@/lib/format";
import { accessInfo } from "@/server/services/access";
import { getHistory, getInstrument, getPrices, listWatchlists, type Range } from "@/server/services/market";
import { getValuation } from "@/server/services/portfolio";
import { listOwnTheses, listSharedTheses } from "@/server/services/theses";
import { requireViewer } from "@/server/viewer-session";
import { WatchButton } from "../market-controls";

const RANGES: Range[] = ["1M", "3M", "6M", "YTD", "1Y", "3Y"];
const UUID = /^[0-9a-f-]{36}$/i;

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const inst = UUID.test(id) ? await getInstrument(id) : null;
  return { title: inst ? `${inst.symbol} · ${inst.name}` : "Security" };
}

export default async function InstrumentPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ range?: string }> }) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  if (!UUID.test(id)) notFound();
  const { user, viewer } = await requireViewer();
  const inst = await getInstrument(id);
  if (!inst) notFound();
  const range = (RANGES.includes(sp.range as Range) ? sp.range : "1Y") as Range;

  const [access, prices, history, lists, valuation, mine, shared] = await Promise.all([
    accessInfo(user.id),
    getPrices([inst], { userId: user.id }),
    getHistory(inst, range, { userId: user.id }),
    listWatchlists(user.id),
    getValuation(user.id),
    listOwnTheses(user.id),
    listSharedTheses(viewer),
  ]);
  const price = prices.get(inst.id);
  const change = price?.previousClose && Number(price.previousClose) ? d(price.price).minus(price.previousClose).div(price.previousClose) : null;
  const holding = valuation.valuation.holdings.find((h) => h.instrument.id === inst.id);
  const theses = [...mine, ...shared].filter((t) => t.instrument?.id === inst.id);
  const first = history[0] ? Number(history[0].close) : null;
  const last = history.at(-1) ? Number(history.at(-1)!.close) : null;
  const closes = history.map((h) => Number(h.close));

  return (
    <>
      <Link href="/markets" className="mb-3 inline-flex items-center gap-1.5 text-sm text-fg-muted hover:text-fg">
        <ArrowLeft className="size-4" aria-hidden /> Markets
      </Link>
      <PageHeader
        title={
          <span className="flex flex-wrap items-baseline gap-x-3">
            {inst.symbol}
            <span className="text-base font-normal text-fg-muted">{inst.name}</span>
          </span>
        }
        description={[inst.exchange || "Unlisted", inst.currency, inst.sector, inst.region].filter(Boolean).join(" · ")}
        actions={
          <>
            <WatchButton instrumentId={inst.id} lists={lists.map((l) => ({ id: l.id, name: l.name, has: l.items.some((i) => i.instrument.id === inst.id) }))} />
            <ButtonLink href={`/lab?instrument=${inst.id}`} variant="secondary">
              <FlaskConical className="size-4" aria-hidden /> Paper trade
            </ButtonLink>
            <ButtonLink href={`/theses/new?instrument=${inst.id}`}>
              <ScrollText className="size-4" aria-hidden /> Write a thesis
            </ButtonLink>
          </>
        }
      />

      {access.full && !inst.exchange && !price ? (
        <Callout tone="warning" title="No price source for this security" className="mb-5">
          It came from an import and doesn&apos;t match a listing we can price. It stays in your ledger but is excluded from totals.
        </Callout>
      ) : null}

      <div className="grid gap-5 xl:grid-cols-[1.6fr_1fr]">
        <Panel
          title="Price"
          actions={
            price ? (
              <SourceBadge
                kind={price.isDemo ? "demo" : price.delayMinutes ? "delayed" : "live"}
                asOf={price.asOf}
                detail={
                  price.isDemo
                    ? "Demo · synthetic"
                    : `${price.source}${price.delayMinutes >= 1440 ? " · closing price" : price.delayMinutes ? ` · ${price.delayMinutes} min delay` : ""}`
                }
              />
            ) : null
          }
        >
          {!access.full ? <AccessBand access={access} /> : null}
          <div className={access.full ? "flex flex-wrap items-end justify-between gap-4" : "hidden"}>
            <div>
              <p className="num text-[2rem] leading-none font-semibold tracking-[-0.03em] text-fg">
                {price ? formatMoney(price.price, price.currency) : "No price"}
              </p>
              <p className="mt-2 text-sm">
                <Change percent={change} /> <span className="text-fg-subtle">today</span>
              </p>
            </div>
            <LinkTabs label="Chart range" current={range} items={RANGES.map((r) => ({ value: r, label: r, href: `/markets/${inst.id}?range=${r}` }))} />
          </div>
          <div className={access.full ? "mt-5" : "hidden"}>
            <LineChart
              points={history.map((h) => ({ date: h.date, value: Number(h.close) }))}
              mode="index"
              label={`${inst.symbol} closing price`}
              height={240}
            />
          </div>
          {history.length > 1 ? (
            <dl className="mt-5 grid grid-cols-2 gap-4 border-t border-line pt-4 sm:grid-cols-4">
              <Stat label={`Change (${range})`} value={<Change percent={first && last ? ((last - first) / first).toFixed(6) : null} size="md" />} />
              <Stat label={`High (${range})`} value={formatMoney(Math.max(...closes).toFixed(4), inst.currency)} />
              <Stat label={`Low (${range})`} value={formatMoney(Math.min(...closes).toFixed(4), inst.currency)} />
              <Stat label="Previous close" value={price?.previousClose ? formatMoney(price.previousClose, inst.currency) : "—"} />
            </dl>
          ) : null}
          <p className="mt-4 text-xs text-fg-subtle">
            Fundamentals and company news appear when a licensed data provider is configured. Portle doesn&apos;t display figures it can&apos;t source.
          </p>
        </Panel>

        <div className="space-y-5">
          <Panel
            title="Your position"
            actions={
              <div className="flex items-center gap-3">
                <PrivateNote>Private</PrivateNote>
                <HideTotalButton />
              </div>
            }
          >
            {holding ? (
              <dl className="grid grid-cols-2 gap-4">
                <Stat label="Quantity" value={<span className="secret">{formatQuantity(holding.quantity)}</span>} />
                <Stat
                  label="Average cost"
                  value={holding.averageCost ? <span className="secret">{formatMoney(holding.averageCost, inst.currency)}</span> : "Unknown"}
                />
                <Stat
                  label={`Value (${valuation.portfolio.baseCurrency})`}
                  value={<span className="secret">{formatMoney(holding.marketValueBase, valuation.portfolio.baseCurrency)}</span>}
                />
                <Stat label="Weight" value={holding.weight ? formatPercent(holding.weight) : "—"} />
                <Stat
                  className="col-span-2"
                  label="Unrealized"
                  value={
                    holding.unrealizedBase ? (
                      <Change value={holding.unrealizedBase} percent={holding.unrealizedPct} currency={valuation.portfolio.baseCurrency} size="md" />
                    ) : (
                      "—"
                    )
                  }
                />
              </dl>
            ) : (
              <p className="text-sm text-fg-muted">
                You don&apos;t hold {inst.symbol}. Record a purchase from the Portfolio page, or rehearse it in the Paper Lab first.
              </p>
            )}
          </Panel>

          <Panel title="Theses on this security" description="Yours, and ones shared with you">
            {theses.length === 0 ? (
              <p className="text-sm text-fg-muted">
                No theses yet.{" "}
                <Link href={`/theses/new?instrument=${inst.id}`} className="text-accent hover:underline">
                  Write the first one
                </Link>{" "}
                with a bull case, a bear case and what would prove it wrong.
              </p>
            ) : (
              <ul className="space-y-3">
                {theses.map((t) => (
                  <li key={t.thesis.id}>
                    <Link
                      href={`/theses/${t.thesis.id}`}
                      className="block rounded-[var(--radius-md)] border border-line p-3 hover:border-line-strong hover:bg-field"
                    >
                      <span className="flex items-center justify-between gap-2">
                        <span className="font-medium text-fg">{t.thesis.title}</span>
                        <Badge>{t.thesis.status.replace("_", " ")}</Badge>
                      </span>
                      <span className="mt-1 block text-xs text-fg-subtle">
                        {t.thesis.userId === user.id ? "You" : t.author.displayName} · updated {formatDate(t.thesis.updatedAt)}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
      </div>
    </>
  );
}
