import Link from "next/link";
import { CalendarClock, CheckCircle2, ChevronRight, Circle, FlaskConical, Gem, Lock, NotebookPen, ScrollText, ShieldAlert } from "lucide-react";
import { Ring } from "@/components/charts/ring";
import { holdingSlices, practiceSlices } from "@/components/charts/ring-data";
import { Avatar } from "@/components/ui/avatar";
import { Badge, SourceBadge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Change } from "@/components/ui/finance";
import { Panel } from "@/components/ui/panel";
import { d } from "@/domain/money";
import { reviewState, utcToday } from "@/domain/review";
import { formatDate, formatMoney, formatPercent, relativeTime } from "@/lib/format";
import { listEntries, REFLECTION_PROMPTS } from "@/server/services/journal";
import { getPrices, listWatchlists } from "@/server/services/market";
import { getLab } from "@/server/services/paper";
import { getValuation } from "@/server/services/portfolio";
import { listRelics } from "@/server/services/relics";
import { listFeed } from "@/server/services/social";
import { listOwnTheses } from "@/server/services/theses";
import { requireViewer } from "@/server/viewer-session";
import { STATUS_LABEL, STATUS_TONE } from "../theses/page";

export const metadata = { title: "Home" };

const olderThanDays = (date: Date, days: number) => Date.now() - date.getTime() > days * 86400_000;

/** A hairline row that links somewhere: a leading tile, two lines of text, a chevron. */
function RowLink({ href, lead, title, sub, end }: { href: string; lead: React.ReactNode; title: React.ReactNode; sub?: React.ReactNode; end?: React.ReactNode }) {
  return (
    <li>
      <Link href={href} className="group flex items-center gap-3 py-3">
        {lead}
        <span className="min-w-0 flex-1">
          <span className="block truncate font-medium text-fg group-hover:underline">{title}</span>
          {sub ? <span className="mt-0.5 block truncate text-[0.8125rem] text-fg-subtle">{sub}</span> : null}
        </span>
        {end ?? <ChevronRight className="size-4 shrink-0 text-fg-subtle" aria-hidden />}
      </Link>
    </li>
  );
}

const tile = "grid size-10 shrink-0 place-items-center rounded-[12px]";

export default async function HomePage() {
  const { user, profile, viewer } = await requireViewer();
  const [val, lab, theses, journal, lists, feed, relics] = await Promise.all([
    getValuation(user.id),
    getLab(user.id),
    listOwnTheses(user.id),
    listEntries(user.id),
    listWatchlists(user.id),
    listFeed(viewer, { limit: 4 }),
    listRelics(user.id),
  ]);
  const base = val.portfolio.baseCurrency;
  const v = val.valuation;
  const watchItems = lists.flatMap((l) => l.items.map((i) => i.instrument));
  const prices = await getPrices(watchItems);
  const movers = watchItems
    .map((i) => {
      const p = prices.get(i.id);
      const chg = p?.previousClose && Number(p.previousClose) ? d(p.price).minus(p.previousClose).div(p.previousClose) : null;
      return { i, p, chg };
    })
    .filter((m) => m.chg)
    .sort((a, b) => b.chg!.abs().cmp(a.chg!.abs()))
    .slice(0, 4);
  const today = utcToday();
  const revisits = theses
    .map((t) => ({ t, state: reviewState(t.thesis.reviewOn, t.thesis.status, today) }))
    .filter((r) => r.state === "due" || r.state === "soon")
    .sort((a, b) => a.t.thesis.reviewOn!.localeCompare(b.t.thesis.reviewOn!))
    .slice(0, 3);
  const attention = theses
    .filter((t) => !revisits.some((r) => r.t.thesis.id === t.thesis.id))
    .filter((t) => t.thesis.status === "under_review" || (t.thesis.status === "active" && !t.thesis.reviewOn && olderThanDays(t.thesis.updatedAt, 90)))
    .slice(0, Math.max(0, 3 - revisits.length));
  const wroteToday = journal.some((j) => j.entry.entryDate === today);
  const prompt = REFLECTION_PROMPTS[new Date().getUTCDate() % REFLECTION_PROMPTS.length];
  const next = relics.filter((r) => !r.earned).sort((a, b) => b.progress.value / b.progress.threshold - a.progress.value / a.progress.threshold)[0];

  const steps = [
    { done: val.accounts.length > 0 && v.holdings.length > 0, label: "Add what you own", href: "/portfolio" },
    { done: theses.length > 0, label: "Write a thesis with what would prove it wrong", href: "/theses/new" },
    { done: lab.orders.length > 0, label: "Try an idea with practice money", href: "/lab" },
    { done: journal.length > 0, label: "Write your first journal entry", href: "/journal/new" },
    { done: relics.some((r) => r.key === "veil" && r.earned), label: "Check what others can see", href: "/settings/privacy" },
  ];
  const showChecklist = steps.some((s) => !s.done);
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  return (
    <>
      <h1 className="font-display text-[2rem] leading-[1.08] font-bold tracking-[-0.02em] text-fg">
        {greeting}, {profile.displayName.split(" ")[0]}
      </h1>
      <p className="mt-1.5 text-sm text-fg-subtle">{formatDate(new Date())}</p>

      <div className="mt-7 grid gap-x-14 gap-y-9 lg:grid-cols-[1.35fr_1fr]">
        <div className="min-w-0 space-y-9">
          {/* Real money comes first, with its ring. */}
          <section aria-labelledby="real-title">
            {v.holdings.length ? (
              <Link href="/portfolio" className="group flex items-center gap-5">
                <Ring slices={holdingSlices(v.holdings)} label="Your mix" size={120} thickness={16} />
                <span className="min-w-0">
                  <span id="real-title" className="flex items-center gap-1.5 font-display text-[0.8125rem] font-semibold text-fg-subtle">
                    <Lock className="size-3.5" aria-hidden /> My real portfolio
                  </span>
                  <span className="num mt-1 block font-display text-[2.125rem] leading-none font-bold tracking-[-0.02em] text-fg group-hover:underline">
                    {formatMoney(v.totals.marketValue, base)}
                  </span>
                  <span className="mt-2 block text-sm">
                    <Change value={v.totals.dayChange} percent={v.totals.dayChangePct} currency={base} /> <span className="text-fg-subtle">today</span>
                  </span>
                  {v.usesDemoPrices ? <SourceBadge kind="demo" className="mt-2.5" detail="Demo prices" /> : null}
                </span>
              </Link>
            ) : (
              <div>
                <h2 id="real-title" className="flex items-center gap-1.5 font-display text-[1.1875rem] font-bold text-fg">
                  My real portfolio
                </h2>
                <p className="mt-1.5 max-w-[46ch] text-sm text-fg-muted">
                  Record what you really own, by hand or from your broker&apos;s CSV. Portle never moves money; only you see the amounts.
                </p>
                <ButtonLink href="/portfolio" className="mt-4">
                  Add what you own
                </ButtonLink>
              </div>
            )}
          </section>

          {showChecklist ? (
            <Panel title="Set up your archive" description={`${steps.filter((s) => s.done).length} of ${steps.length} done`}>
              <ol className="divide-y divide-line">
                {steps.map((s) => (
                  <li key={s.label}>
                    <Link href={s.href} className="flex items-center gap-3 py-2.5 text-[0.9375rem] hover:underline">
                      {s.done ? <CheckCircle2 className="size-5 shrink-0 text-positive" aria-label="Done" /> : <Circle className="size-5 shrink-0 text-fg-subtle" aria-label="To do" />}
                      <span className={s.done ? "text-fg-subtle line-through" : "text-fg"}>{s.label}</span>
                    </Link>
                  </li>
                ))}
              </ol>
            </Panel>
          ) : null}

          <Panel
            title={revisits.length || attention.length ? "Time to revisit" : "Your theses"}
            actions={
              <Link href="/theses" className="font-display text-sm font-semibold text-accent hover:underline">
                All theses
              </Link>
            }
          >
            {theses.length === 0 ? (
              <div>
                <p className="text-sm text-fg-muted">Write down why you own something before the market tells you what to think.</p>
                <ButtonLink href="/theses/new" size="sm" className="mt-3">
                  <ScrollText className="size-4" aria-hidden /> New thesis
                </ButtonLink>
              </div>
            ) : revisits.length || attention.length ? (
              <ul className="divide-y divide-line">
                {revisits.map(({ t, state }) => (
                  <RowLink
                    key={t.thesis.id}
                    href={`/theses/${t.thesis.id}`}
                    lead={
                      <span className={`${tile} ${state === "due" ? "bg-warning-soft text-warning" : "bg-selected text-accent"}`}>
                        <CalendarClock className="size-[18px]" aria-hidden />
                      </span>
                    }
                    title={t.thesis.title}
                    sub={state === "due" ? "Time to revisit" : `Revisit ${formatDate(t.thesis.reviewOn, { withYear: false })}`}
                  />
                ))}
                {attention.map((t) => (
                  <RowLink
                    key={t.thesis.id}
                    href={`/theses/${t.thesis.id}`}
                    lead={
                      <span className={`${tile} bg-warning-soft text-warning`}>
                        <ShieldAlert className="size-[18px]" aria-hidden />
                      </span>
                    }
                    title={t.thesis.title}
                    sub={t.thesis.status === "under_review" ? "Under review" : "Not revisited in 90 days"}
                  />
                ))}
              </ul>
            ) : (
              <ul className="divide-y divide-line">
                {theses.slice(0, 3).map((t) => (
                  <RowLink key={t.thesis.id} href={`/theses/${t.thesis.id}`} lead={null} title={t.thesis.title} end={<Badge tone={STATUS_TONE[t.thesis.status]}>{STATUS_LABEL[t.thesis.status]}</Badge>} />
                ))}
              </ul>
            )}
          </Panel>

          <Panel
            title="From your circle"
            actions={
              <Link href="/feed" className="font-display text-sm font-semibold text-accent hover:underline">
                Circle
              </Link>
            }
          >
            {feed.length === 0 ? (
              <p className="text-sm text-fg-muted">
                Quiet so far.{" "}
                <Link href="/feed?tab=people" className="text-accent hover:underline">
                  Find friends
                </Link>{" "}
                or{" "}
                <Link href="/guilds" className="text-accent hover:underline">
                  join a Guild
                </Link>
                .
              </p>
            ) : (
              <ul className="divide-y divide-line">
                {feed.map((p) => (
                  <RowLink
                    key={p.post.id}
                    href={`/feed/${p.post.id}`}
                    lead={<Avatar name={p.author.displayName} hue={p.author.avatarHue} size="md" />}
                    title={p.post.insight ? `${p.author.displayName.split(" ")[0]} shared their mix` : p.author.displayName}
                    sub={
                      p.post.insight
                        ? p.post.insight.slices
                            .slice(0, 3)
                            .map((s) => `${s.label} ${formatPercent(s.percent, { decimals: 0 })}`)
                            .join(" · ")
                        : `${p.post.body} · ${relativeTime(p.post.createdAt)}`
                    }
                    end={
                      p.post.insight ? (
                        <Ring slices={p.post.insight.slices.map((s) => ({ label: s.label, percent: Number(s.percent) }))} label={`${p.author.displayName}'s mix`} size={36} thickness={7} />
                      ) : undefined
                    }
                  />
                ))}
              </ul>
            )}
          </Panel>
        </div>

        <div className="min-w-0 space-y-9">
          {/* Practice money: its own dashed blue strip, never in real money's style. */}
          <Link
            href="/lab"
            className="group -mx-5 flex items-center gap-4 border-y-[1.5px] border-dashed border-practice-line bg-practice-ground px-5 py-4 sm:-mx-6 sm:px-6 lg:mx-0 lg:rounded-[22px] lg:border-[1.5px]"
            aria-label={`Practice money: ${formatMoney(lab.equity, lab.account.currency)} pretend`}
          >
            <Ring slices={practiceSlices(lab)} label="Practice mix" size={56} thickness={8} dashed />
            <span className="min-w-0 flex-1">
              <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 font-display text-xs font-semibold text-practice shadow-[inset_0_0_0_1.5px_var(--practice-line)]">
                <FlaskConical className="size-3.5" aria-hidden /> Practice money
              </span>
              <span className="mt-1.5 flex flex-wrap items-baseline gap-x-2 font-display">
                <span className="num text-[1.25rem] font-bold text-practice-strong">{formatMoney(lab.equity, lab.account.currency)}</span>
                <span className="num text-[0.8125rem] font-semibold text-practice">
                  {lab.totalReturn ? `${formatPercent(lab.totalReturn, { signed: true, decimals: 2 })} ` : ""}pretend
                </span>
              </span>
            </span>
            <ChevronRight className="size-5 shrink-0 text-practice" aria-hidden />
          </Link>

          <Panel title="Journal">
            <p className="text-sm text-fg-subtle">Today&apos;s prompt</p>
            <p className="mt-1 font-display text-[1.1875rem] leading-snug font-semibold text-fg">{prompt}</p>
            <ButtonLink href={`/journal/new?prompt=${encodeURIComponent(prompt)}`} size="sm" variant={wroteToday ? "secondary" : "primary"} className="mt-4">
              <NotebookPen className="size-4" aria-hidden /> {wroteToday ? "Add another entry" : "Write today's entry"}
            </ButtonLink>
            {journal.length ? (
              <ul className="mt-3 divide-y divide-line">
                {journal.slice(0, 3).map((j) => (
                  <RowLink key={j.entry.id} href={`/journal/${j.entry.id}`} lead={null} title={j.entry.title} end={<span className="shrink-0 text-xs text-fg-subtle">{formatDate(j.entry.entryDate, { withYear: false })}</span>} />
                ))}
              </ul>
            ) : null}
          </Panel>

          {movers.length ? (
            <Panel
              title="Watchlist movers"
              actions={
                <Link href="/markets" className="font-display text-sm font-semibold text-accent hover:underline">
                  Markets
                </Link>
              }
            >
              <ul className="divide-y divide-line">
                {movers.map(({ i, p, chg }) => (
                  <RowLink
                    key={i.id}
                    href={`/markets/${i.id}`}
                    lead={null}
                    title={i.symbol}
                    sub={i.name}
                    end={
                      <span className="shrink-0 text-right">
                        <span className="num block text-sm text-fg">{p ? formatMoney(p.price, p.currency) : ""}</span>
                        <Change percent={chg} />
                      </span>
                    }
                  />
                ))}
              </ul>
            </Panel>
          ) : null}

          {next ? (
            <Panel title="Next Relic">
              <ul>
                <RowLink
                  href="/relics"
                  lead={
                    <span className={`${tile} bg-selected text-accent`}>
                      <Gem className="size-[18px]" aria-hidden />
                    </span>
                  }
                  title={next.name}
                  sub={`${next.rule} · ${next.progress.value} of ${next.progress.threshold}`}
                />
              </ul>
            </Panel>
          ) : null}
        </div>
      </div>
    </>
  );
}
