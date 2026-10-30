import Link from "next/link";
import { cookies } from "next/headers";
import { after } from "next/server";
import { ChevronRight, Info, Lock, Plus, Star, Wallet } from "lucide-react";
import { AccessButton } from "@/components/access/access-client";
import { LineChart } from "@/components/charts/line-chart";
import { OrbitRing, type OrbitSlice } from "@/components/charts/orbit-ring";
import { ringColor } from "@/components/charts/ring";
import { foldSlices } from "@/components/charts/ring-geometry";
import { HideNumbersButton } from "@/components/shell/hide-numbers";
import { SourceBadge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Change, Money, Secret } from "@/components/ui/finance";
import { LogoTile } from "@/components/ui/logo-tile";
import { PageHeader, Panel, Stat } from "@/components/ui/panel";
import { Callout, EmptyState } from "@/components/ui/states";
import { LinkTabs } from "@/components/ui/tabs";
import { d, type Dec } from "@/domain/money";
import { formatMoney, formatPercent, formatQuantity, maskFor } from "@/lib/format";
import { accessInfo } from "@/server/services/access";
import { brokerSpotsFull, brokerStatus, listBrokerConnections, syncStaleBrokerConnections } from "@/server/services/brokers";
import { logosFor, type LogoInfo } from "@/server/services/logos";
import { ensureDefaultWatchlist, getPrices, isOwnListing, listWatchlists, type Range } from "@/server/services/market";
import { getPerformance, getValuation, listOwnItems } from "@/server/services/portfolio";
import { getPrivacy } from "@/server/services/profile";
import { requireMember } from "@/server/session";
import { AddWays } from "./broker-client";
import {
  AccountPicker,
  AddInvestmentsButton,
  CurrencyPicker,
  ManageMenu,
  ReturnPicker,
  ShareButton,
  SortPicker,
  WatchlistSheet,
  type ManageProps,
  type MixPreview,
  type ReturnFigure,
} from "./portfolio-client";
import { AddTransactionDialog, LoadSampleButton } from "./portfolio-forms";
import { ReturnBlock } from "./summary";

export const metadata = { title: "My portfolio" };

const RANGES: Range[] = ["1M", "3M", "6M", "YTD", "1Y", "3Y"];
const RING = 216;
/** On computers the ring takes the middle of the page, so it can be bigger. */
const RING_WIDE = 300;

type Row = {
  id: string;
  label: string;
  sub: string;
  href: string | null;
  kind?: "cash" | "own";
  logo: LogoInfo | null;
  colour: string;
  share: number;
  value: Dec | null;
  quantity: Dec | null;
  todayValue: Dec | null;
  todayPct: Dec | null;
  allValue: Dec | null;
  allPct: Dec | null;
};

const signOf = (v: Dec | null | undefined) => (!v ? 0 : v.gt(0) ? 1 : v.lt(0) ? -1 : 0);

export default async function PortfolioPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const { user } = await requireMember();
  const range = (RANGES.includes(sp.range as Range) ? sp.range : "1Y") as Range;
  const sort = sp.sort === "return" || sp.sort === "name" ? sp.sort : "value";
  const access = await accessInfo(user.id);
  // Looking at one account at a time is part of Plus; the free plan always sees everything together.
  const accountId = access.full ? sp.account : undefined;
  const data = await getValuation(user.id, { accountId });
  const { valuation: v, accounts, portfolio } = data;
  const base = portfolio.baseCurrency;
  const jar = await cookies();
  const hideAmounts = jar.get("portle-hide-amounts")?.value === "1";
  const ringReturn = jar.get("portle-ring-return")?.value === "all" ? "all" : "today";
  const brokers = brokerStatus();
  const brokersFull = brokers.configured && (await brokerSpotsFull());
  const connections = await listBrokerConnections(user.id);
  // Linked brokers catch up quietly after the page is sent, at most every few hours.
  if (connections.length) after(() => syncStaleBrokerConnections(user.id).catch(() => undefined));
  const qs = (patch: Record<string, string | undefined>) => {
    const p = new URLSearchParams(
      Object.entries({ range, sort: sort === "value" ? undefined : sort, account: accountId, ...patch }).filter(([, x]) => x) as [string, string][],
    );
    return `/portfolio?${p}`;
  };
  const accountOptions = accounts.map((a) => ({ id: a.id, name: a.name, currency: a.currency }));

  if (!accounts.length) {
    return (
      <>
        <PageHeader title="Add what you own" description="Only you ever see the amounts. Portle never moves money." />
        <AddWays configured={brokers.configured} full={brokersFull} access={access} linked={connections.length} />
        <p className="mt-8 text-center text-sm text-fg-muted">
          Just looking around? <LoadSampleButton />
        </p>
      </>
    );
  }

  const synced = connections.filter((c) => c.accounts > 0);
  const hasHoldings = v.holdings.length > 0;
  // Some holding has a real price: the member's broker's, their own, or (with Plus) the market's.
  const priced = v.holdings.some((h) => h.price);
  // Real prices but only demo history: the chart would draw a made-up line, so it waits for a market data plan.
  const noRealHistory = data.market.isDemo && !v.usesDemoPrices;
  const perf = hasHoldings && priced && access.full && !noRealHistory ? await getPerformance(user.id, range, { accountId }) : null;
  const priceKind = v.usesDemoPrices ? "demo" : data.market.isDemo || !access.full ? "broker" : "delayed";
  // Prices say where they came from: demo, the member's broker, their own, or the market data plan.
  const priceLabel = v.usesDemoPrices
    ? v.priceSources.length
      ? "Some prices are demo"
      : "Demo prices · synthetic"
    : v.priceSources.length === 1
      ? v.priceSources[0]
      : data.market.isDemo || !access.full
        ? "Broker prices"
        : data.market.label;

  await ensureDefaultWatchlist(user.id);
  const [lists, ownItems, privacy] = await Promise.all([listWatchlists(user.id), listOwnItems(user.id), getPrivacy(user.id)]);
  const watch = lists[0]?.items ?? [];
  const [logos, watchPrices] = await Promise.all([
    logosFor([
      ...v.holdings.map((h) => ({ id: h.instrument.id, symbol: h.instrument.symbol, exchange: h.instrument.exchange ?? "" })),
      ...watch.map((i) => i.instrument),
    ]),
    getPrices(
      watch.map((i) => i.instrument),
      { userId: user.id },
    ),
  ]);

  // Everything as a share of the whole: priced holdings plus cash, or (with no prices at all) what was paid.
  const paidOf = new Map(data.paid.rows.map((r) => [r.holding.instrument.id, r.paid]));
  const cash = v.totals.cash.gt(0) ? v.totals.cash : null;
  const total = priced ? v.totals.marketValue.plus(cash ?? 0) : data.paid.total;
  const share = (x: Dec | null) => (x && total.gt(0) ? Number(x.div(total)) : 0);
  const rows: Row[] = v.holdings.map((h) => {
    const own = isOwnListing(h.instrument.exchange ?? "");
    const worth = priced ? h.marketValueBase : (paidOf.get(h.instrument.id) ?? null);
    return {
      id: h.instrument.id,
      label: h.instrument.symbol,
      sub: own ? "Your own price" : h.instrument.name,
      href: own ? null : `/markets/${h.instrument.id}`,
      kind: own ? "own" : undefined,
      logo: logos.get(h.instrument.id) ?? null,
      colour: "",
      share: share(worth),
      value: worth,
      quantity: h.quantity,
      todayValue: h.dayChangeBase,
      todayPct: h.dayChangePct,
      allValue: h.unrealizedBase,
      allPct: h.unrealizedPct,
    };
  });
  if (cash)
    rows.push({
      id: "cash",
      label: "Cash",
      sub: "In your accounts",
      href: null,
      kind: "cash",
      logo: null,
      colour: "",
      share: share(cash),
      value: cash,
      quantity: null,
      todayValue: null,
      todayPct: null,
      allValue: null,
      allPct: null,
    });
  const byShare = [...rows].filter((r) => r.share > 0).sort((a, b) => b.share - a.share);
  // A holding keeps its ring colour in the list; ones folded into "Other" take Other's colour.
  const folded = foldSlices(
    byShare.map((r) => ({ label: r.label, percent: r.share })),
    6,
  );
  byShare.forEach((r, i) => (r.colour = folded[i]?.label === r.label ? ringColor(i, r.label) : "var(--chart-7)"));
  // Table cells: the amount (hidden with "Hide numbers") over its percentage, in the gain or loss colour.
  const delta = (value: Dec | null, pct: Dec | null) =>
    pct ? (
      <span className={signOf(pct) > 0 ? "text-positive" : signOf(pct) < 0 ? "text-negative" : "text-fg-muted"}>
        {value ? <Money value={value} currency={base} signed className="block text-[0.8125rem] font-medium" /> : null}
        <span className="num block text-xs">{formatPercent(pct, { signed: true, decimals: 2 })}</span>
      </span>
    ) : (
      <span className="text-fg-subtle">—</span>
    );
  const tile = (r: Row, size: number, round = false) => (
    <LogoTile symbol={r.label} logo={r.logo} kind={r.kind} size={size} round={round} fallback={r.colour || "var(--chart-7)"} />
  );
  const slices: OrbitSlice[] = byShare.map((r) => ({ label: r.label, percent: r.share, mark: tile(r, 32, true) }));
  const mixLabel = priced ? "Your mix by value" : "Your mix by what you paid";
  const otherMark = (n: number) => <LogoTile symbol={`+${n}`} kind="other" size={32} round />;
  const ordered = [...rows].sort((a, b) =>
    sort === "name" ? a.label.localeCompare(b.label) : sort === "return" ? Number(b.allPct ?? -Infinity) - Number(a.allPct ?? -Infinity) : b.share - a.share,
  );

  const figure = (value: Dec | null, pct: Dec | null, note?: string): ReturnFigure =>
    value || pct
      ? {
          money: value ? formatMoney(value, base, { signed: true }) : null,
          mask: maskFor(base),
          pct: pct ? formatPercent(pct, { signed: true, decimals: 2 }) : null,
          tone: signOf(pct ?? value),
        }
      : { money: null, mask: maskFor(base), pct: null, tone: 0, note };
  const todayFig: ReturnFigure = !access.full
    ? { money: null, mask: maskFor(base), pct: null, tone: 0, locked: true }
    : figure(v.totals.dayChangePct ? v.totals.dayChange : null, v.totals.dayChangePct, "No price from yesterday yet");
  const allFig = figure(v.totals.unrealizedPct ? v.totals.unrealized : null, v.totals.unrealizedPct);
  // Beside the ring on computers: today's best and worst holding, then what selling and dividends have brought in.
  const movers = v.holdings.filter((h) => h.dayChangePct).sort((a, b) => Number(b.dayChangePct) - Number(a.dayChangePct));
  const moved = (h: (typeof movers)[number]) => (
    <>
      {h.instrument.symbol}{" "}
      <span className={signOf(h.dayChangePct) > 0 ? "text-positive" : signOf(h.dayChangePct) < 0 ? "text-negative" : "text-fg-muted"}>
        {formatPercent(h.dayChangePct!, { signed: true, decimals: 2 })}
      </span>
    </>
  );
  const todayDetails =
    movers.length > 1
      ? [
          { term: "Best", detail: moved(movers[0]) },
          { term: "Worst", detail: moved(movers[movers.length - 1]) },
        ]
      : undefined;
  const allDetails = [
    {
      term: "Sold",
      detail: (
        <Money
          value={v.totals.realized}
          currency={base}
          signed
          className={signOf(v.totals.realized) > 0 ? "text-positive" : signOf(v.totals.realized) < 0 ? "text-negative" : undefined}
        />
      ),
    },
    { term: "Dividends", detail: <Money value={v.totals.income} currency={base} /> },
  ];
  const held = `${v.holdings.length} ${v.holdings.length === 1 ? "holding" : "holdings"}${cash ? " and cash" : ""}`;
  // Under the ring: where the prices come from, or why there are none yet.
  const source = priced ? (
    <p className="flex justify-center">
      <SourceBadge kind={priceKind} detail={priceLabel} asOf={v.oldestPriceAsOf} />
    </p>
  ) : (
    <div className="mx-auto max-w-[34ch] text-center">
      <p className="text-[0.8125rem] text-fg-muted">
        Portle shows what you paid until it has prices. Link your broker for its prices, or get Plus for market prices.
      </p>
      <AccessButton access={access} className="mt-3" />
    </div>
  );

  const mix: MixPreview = {
    assetClass: v.allocation.assetClass.map((s) => ({ label: s.label, percent: Number(s.percent) })),
    sector: v.allocation.sector.map((s) => ({ label: s.label, percent: Number(s.percent) })),
    region: v.allocation.region.map((s) => ({ label: s.label, percent: Number(s.percent) })),
    currency: v.allocation.currency.map((s) => ({ label: s.label, percent: Number(s.percent) })),
  };
  const manage: ManageProps = {
    accounts: accountOptions,
    access,
    broker: { configured: brokers.configured, full: brokersFull, linked: connections.length },
    baseCurrency: base,
    ownItems: ownItems.map((o) => ({ id: o.id, name: o.name, currency: o.currency, price: o.price })),
    visibility: { holdings: privacy.holdingsVisibility, allocation: privacy.allocationVisibility },
  };

  const watchRows = watch.length ? (
    <ul>
      {watch.map((i) => {
        const p = watchPrices.get(i.instrument.id);
        const day = p?.previousClose && d(p.previousClose).gt(0) ? d(p.price).minus(p.previousClose).div(p.previousClose) : null;
        return (
          <li key={i.instrument.id} className="border-t border-line first:border-t-0">
            <Link href={`/markets/${i.instrument.id}`} className="flex items-center gap-3 py-3">
              <LogoTile symbol={i.instrument.symbol} logo={logos.get(i.instrument.id)} size={38} />
              <span className="min-w-0 flex-1">
                <span className="block font-display text-[0.9375rem] font-semibold text-fg">{i.instrument.symbol}</span>
                <span className="block truncate text-xs text-fg-subtle">{i.instrument.name}</span>
              </span>
              <span className="text-right">
                <span className="num block text-sm font-semibold text-fg">{p ? formatMoney(p.price, p.currency) : "—"}</span>
                {day ? <Change percent={day} className="justify-end" /> : null}
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  ) : (
    <p className="py-3 text-sm text-fg-muted">Nothing on your watchlist yet. Find a stock on Markets and add it.</p>
  );
  const watchRail = (
    <>
      <div className="mb-1 flex items-center justify-between">
        <h2 className="flex items-center gap-2 font-display text-lg font-bold text-fg">
          <Star className="size-4 fill-[var(--chart-4)] text-[var(--chart-4)]" aria-hidden /> Watchlist
          <span className="num grid h-5 min-w-5 place-items-center rounded-full bg-[color-mix(in_srgb,var(--chart-4)_26%,transparent)] px-1.5 text-xs">
            {watch.length}
          </span>
        </h2>
        <Link href="/markets" className="text-[0.8125rem] font-semibold text-accent hover:underline">
          See all
        </Link>
      </div>
      {watchRows}
    </>
  );

  return (
    <>
      {/* The title; on computers the account switch sits beside it and three actions on the right. The currency lives in Manage. */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 lg:mb-2">
        <div className="flex items-center gap-3.5">
          <h1 className="font-display text-[1.75rem] leading-tight font-bold tracking-[-0.02em] text-fg lg:text-[2rem]">Portfolio</h1>
          <div className="hidden lg:block">
            <AccountPicker accounts={accountOptions} current={accountId} access={access} quiet />
          </div>
        </div>
        <div className="hidden items-center gap-2 lg:flex">
          <ShareButton mix={mix} wide />
          <ManageMenu labelled {...manage} />
          <AddInvestmentsButton {...manage} />
        </div>
      </div>

      {/* Phones: Share and Watchlist first, then the accounts, currency and the bank button. */}
      <div className="lg:hidden">
        <div className="grid grid-cols-2 gap-2.5">
          <ShareButton mix={mix} />
          <WatchlistSheet count={watch.length}>
            {watchRows}
            <div className="mt-1 flex items-center justify-between border-t border-line pt-3 text-[0.8125rem] font-semibold text-accent">
              <Link href="/markets" className="inline-flex items-center gap-1 hover:underline">
                <Plus className="size-4" aria-hidden /> Add a stock
              </Link>
              <Link href="/markets" className="inline-flex items-center gap-0.5 hover:underline">
                Open in Markets <ChevronRight className="size-4" aria-hidden />
              </Link>
            </div>
          </WatchlistSheet>
        </div>
        <div className="mt-3.5 flex items-center gap-2">
          <AccountPicker accounts={accountOptions} current={accountId} access={access} />
          <CurrencyPicker value={base} />
          <span className="ml-auto">
            <ManageMenu {...manage} />
          </span>
        </div>
      </div>

      {sp.synced ? (
        <Callout tone="neutral" className="mt-4">
          Your accounts are in. Portle keeps them up to date from your broker, and labels everything it copies.
        </Callout>
      ) : null}
      {synced.some((c) => c.status === "error") ? (
        <Link href="/settings/connections" className="mt-3 inline-block text-[0.8125rem] font-medium text-warning hover:underline">
          A broker needs you to sign in again
        </Link>
      ) : null}

      {!hasHoldings ? (
        <EmptyState
          icon={Wallet}
          title="Record your first position"
          className="mt-6"
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
          <div>
            {/* Phones: the ring with each holding's logo floating round it, the total and one return in the middle. */}
            <section aria-label="Your mix" className="mt-2 lg:hidden">
              <OrbitRing slices={slices} size={RING} thickness={20} label={mixLabel} other={otherMark}>
                <span className="flex flex-wrap items-center justify-center gap-x-1.5 gap-y-1 text-[0.8125rem] text-fg-subtle">
                  {priced ? "Total value" : "What you put in"}
                  <HideNumbersButton pill initial={hideAmounts} />
                </span>
                <span className="num secret font-display text-[1.625rem] leading-tight font-bold tracking-[-0.02em] text-fg" data-mask={maskFor(base)}>
                  {formatMoney(total, base)}
                </span>
                {priced ? <ReturnPicker initial={ringReturn} today={todayFig} allTime={allFig} access={access} /> : null}
              </OrbitRing>
              {source}
            </section>

            {/* Computers: a bigger ring in the middle, Today on its left and All time on its right (under it on narrower screens). */}
            <section
              aria-label="Your mix"
              className="hidden items-center gap-x-12 gap-y-6 lg:grid lg:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] xl:gap-x-6"
            >
              <div className="lg:col-span-2 xl:col-span-1 xl:col-start-2 xl:row-start-1">
                <OrbitRing slices={slices} size={RING_WIDE} thickness={26} label={mixLabel} other={otherMark}>
                  <span className="inline-flex items-center gap-1.5 text-[0.8125rem] text-fg-subtle">
                    {priced ? "Total value" : "What you put in"}
                    <HideNumbersButton pill initial={hideAmounts} />
                  </span>
                  <span
                    className="num secret font-display text-[2rem] leading-tight font-bold tracking-[-0.02em] whitespace-nowrap text-fg"
                    data-mask={maskFor(base)}
                  >
                    {formatMoney(total, base)}
                  </span>
                  <span className="mt-1 text-xs text-fg-subtle">
                    {held} · {base}
                  </span>
                </OrbitRing>
                {source}
              </div>
              {priced ? (
                <>
                  <ReturnBlock
                    side="left"
                    label="Today"
                    value={v.totals.dayChangePct ? v.totals.dayChange : null}
                    percent={v.totals.dayChangePct}
                    currency={base}
                    against="Since yesterday's close"
                    note="No price from yesterday yet. It comes with a market data plan."
                    details={todayDetails}
                    locked={access.full ? undefined : access}
                    className="xl:col-start-1 xl:row-start-1"
                  />
                  <ReturnBlock
                    side="right"
                    label="All time"
                    value={v.totals.unrealizedPct ? v.totals.unrealized : null}
                    percent={v.totals.unrealizedPct}
                    currency={base}
                    against="Against what you paid"
                    details={allDetails}
                    className="xl:col-start-3 xl:row-start-1"
                  />
                </>
              ) : null}
            </section>

            <div className="mt-4 grid gap-x-10 lg:mt-8 lg:border-t lg:border-line lg:pt-5 xl:grid-cols-[minmax(0,1fr)_260px]">
              <section aria-label="Holdings" className="min-w-0">
                <div className="mb-1 flex items-center justify-between gap-3">
                  <h2 className="font-display text-xl font-bold text-fg">Holdings</h2>
                  <SortPicker value={sort} />
                </div>

                {/* Phones: one row each, value and all-time return on the right. */}
                <ul className="lg:hidden">
                  {ordered.map((r) => {
                    const inner = (
                      <>
                        {tile(r, 42)}
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-display text-[0.9375rem] font-semibold text-fg">{r.label}</span>
                          <span className="block truncate text-xs text-fg-subtle">
                            <span className="num">{formatPercent(r.share)}</span>
                            {r.quantity ? (
                              <>
                                {" · "}
                                <Secret className="num">{formatQuantity(r.quantity)}</Secret> {r.kind === "own" ? "held" : "shares"}
                              </>
                            ) : (
                              ` · ${base}`
                            )}
                          </span>
                        </span>
                        <span className="text-right">
                          {r.value ? (
                            <Money value={r.value} currency={base} className="block text-[0.9375rem] font-semibold text-fg" />
                          ) : (
                            <span className="block text-sm text-fg-muted">No price</span>
                          )}
                          {r.allPct ? <Change percent={r.allPct} className="justify-end" /> : null}
                        </span>
                      </>
                    );
                    return (
                      <li key={r.id} className="border-t border-line first:border-t-0">
                        {r.href ? (
                          <Link href={r.href} className="flex items-center gap-3 py-3">
                            {inner}
                          </Link>
                        ) : (
                          <div className="flex items-center gap-3 py-3">{inner}</div>
                        )}
                      </li>
                    );
                  })}
                </ul>

                {/* Computers: position, today and all time side by side. */}
                <table className="hidden w-full text-sm lg:table">
                  <caption className="sr-only">Your holdings with value, today&apos;s change and all-time return</caption>
                  <thead>
                    <tr className="border-b border-line text-right text-xs whitespace-nowrap text-fg-subtle">
                      <th scope="col" className="py-3 text-left font-medium">
                        Holding
                      </th>
                      <th scope="col" className="py-3 pl-3 font-medium">
                        Position
                      </th>
                      <th scope="col" className="py-3 pl-3 font-medium">
                        <span className="inline-flex items-center gap-1">{!access.full ? <Lock className="size-3" aria-label="Plus" /> : null}Today</span>
                      </th>
                      <th scope="col" className="py-3 pl-3 font-medium">
                        All time
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {ordered.map((r) => {
                      const name = (
                        <>
                          {tile(r, 40)}
                          <span className="min-w-0">
                            <span className="block font-display font-semibold text-fg group-hover:underline">{r.label}</span>
                            <span className="block max-w-[240px] truncate text-xs text-fg-subtle">
                              <span className="num">{formatPercent(r.share)}</span> · {r.sub}
                            </span>
                          </span>
                        </>
                      );
                      return (
                        <tr key={r.id} className="border-t border-line first:border-t-0">
                          <th scope="row" className="py-3 text-left font-normal">
                            {r.href ? (
                              <Link href={r.href} className="group flex min-w-0 items-center gap-3">
                                {name}
                              </Link>
                            ) : (
                              <span className="flex min-w-0 items-center gap-3">{name}</span>
                            )}
                          </th>
                          <td className="py-3 pl-3 text-right whitespace-nowrap">
                            {r.value ? (
                              <Money value={r.value} currency={base} className="block font-semibold text-fg" />
                            ) : (
                              <span className="text-fg-muted">No price</span>
                            )}
                            {r.quantity ? (
                              <span className="block text-xs text-fg-subtle">
                                <Secret className="num">{formatQuantity(r.quantity)}</Secret> {r.kind === "own" ? "held" : "shares"}
                              </span>
                            ) : null}
                          </td>
                          <td className="py-3 pl-3 text-right whitespace-nowrap">{delta(r.todayValue, r.todayPct)}</td>
                          <td className="py-3 pl-3 text-right whitespace-nowrap">{delta(r.allValue, r.allPct)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                {/* Between phone and wide screens the watchlist sits under the holdings. */}
                <div className="mt-8 hidden lg:block xl:hidden">{watchRail}</div>
              </section>

              <aside aria-label="Watchlist" className="hidden border-l border-line pl-7 xl:block">
                {watchRail}
              </aside>
            </div>
          </div>

          {data.issues.length || (priced && v.excluded.length) ? (
            <Callout tone="warning" title="Some figures need attention">
              <ul className="list-disc space-y-0.5 pl-4">
                {(priced ? v.excluded : []).map((e) => (
                  <li key={e.symbol}>
                    <strong>{e.symbol}</strong>: {e.reason}
                    {access.full ? "" : " on the free plan"}. It is left out of totals rather than estimated.
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

          <Panel
            title="Value over time"
            actions={
              access.full && priced && !noRealHistory ? (
                <LinkTabs label="Chart range" current={range} items={RANGES.map((r) => ({ value: r, label: r, href: qs({ range: r }) }))} />
              ) : null
            }
          >
            {perf?.available ? (
              <LineChart
                points={perf.points.map((p) => ({ date: p.date, value: Number(p.value) }))}
                mode="money"
                currency={base}
                label="Holdings value"
                height={200}
              />
            ) : !access.full ? (
              <Callout tone="neutral" icon={Lock}>
                Value over time needs market prices, which come with Portle Plus.
                <AccessButton access={access} className="mt-2 flex w-fit" />
              </Callout>
            ) : (
              <Callout tone="neutral" icon={Info}>
                {noRealHistory
                  ? "Your broker sends today's prices, not past ones, so this chart appears once Portle has a market data plan for price history."
                  : perf && !perf.available
                    ? perf.reason
                    : "Not enough history yet."}
              </Callout>
            )}
            <dl className="mt-6 grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-4">
              <Stat
                label="Unrealized P/L"
                value={priced ? <Change value={v.totals.unrealized} percent={v.totals.unrealizedPct} currency={base} size="md" /> : "—"}
                hint={priced ? "Open positions vs. cost" : "Needs prices"}
              />
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
            {data.fx.asOf !== "demo" ? ` as of ${data.fx.asOf}` : ""}. Cost basis is converted at current rates, so unrealized P/L in {base} includes currency
            movements.{" "}
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
