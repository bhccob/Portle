import Link from "next/link";
import { ArrowRight, CalendarClock, CheckCircle2, Circle, FlaskConical, Gem, NotebookPen, ScrollText, ShieldAlert } from "lucide-react";
import { LineChart } from "@/components/charts/line-chart";
import { Avatar } from "@/components/ui/avatar";
import { Badge, SourceBadge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Change } from "@/components/ui/finance";
import { Panel } from "@/components/ui/panel";
import { PrivateNote } from "@/components/ui/states";
import { d } from "@/domain/money";
import { reviewState, utcToday } from "@/domain/review";
import { formatDate, formatMoney, relativeTime } from "@/lib/format";
import { listEntries, REFLECTION_PROMPTS } from "@/server/services/journal";
import { getPrices, listWatchlists } from "@/server/services/market";
import { getLab } from "@/server/services/paper";
import { getPerformance, getValuation } from "@/server/services/portfolio";
import { listRelics } from "@/server/services/relics";
import { listFeed } from "@/server/services/social";
import { listOwnTheses } from "@/server/services/theses";
import { requireViewer } from "@/server/viewer-session";
import { STATUS_LABEL, STATUS_TONE } from "../theses/page";

export const metadata = { title: "Overview" };

const olderThanDays = (date: Date, days: number) => Date.now() - date.getTime() > days * 86400_000;

export default async function HomePage() {
  const { user, profile, viewer } = await requireViewer();
  const [val, perf, lab, theses, journal, lists, feed, relics] = await Promise.all([
    getValuation(user.id),
    getPerformance(user.id, "3M"),
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
    .slice(0, 5);
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
    { done: val.accounts.length > 0 && v.holdings.length > 0, label: "Add your holdings", href: "/portfolio" },
    { done: theses.length > 0, label: "Write a thesis with what would prove it wrong", href: "/theses/new" },
    { done: lab.orders.length > 0, label: "Rehearse an idea in the Paper Lab", href: "/lab" },
    { done: journal.length > 0, label: "Write your first journal entry", href: "/journal/new" },
    { done: relics.some((r) => r.key === "veil" && r.earned), label: "Check what others can see", href: "/settings/privacy" },
  ];
  const showChecklist = steps.some((s) => !s.done);
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  return (
    <>
      <div className="mb-6">
        <p className="text-sm text-fg-subtle">{formatDate(new Date())}</p>
        <h1 className="mt-1 text-[1.625rem] font-semibold tracking-[-0.025em] text-fg">
          {greeting}, {profile.displayName.split(" ")[0]}
        </h1>
      </div>

      {showChecklist ? (
        <Panel title="Set up your archive" description={`${steps.filter((s) => s.done).length} of ${steps.length} done`} className="mb-5">
          <ol className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {steps.map((s) => (
              <li key={s.label}>
                <Link href={s.href} className="flex items-center gap-2.5 rounded-[var(--radius-md)] px-2 py-1.5 text-sm hover:bg-field">
                  {s.done ? (
                    <CheckCircle2 className="size-4 shrink-0 text-positive" aria-label="Done" />
                  ) : (
                    <Circle className="size-4 shrink-0 text-fg-subtle" aria-label="To do" />
                  )}
                  <span className={s.done ? "text-fg-subtle line-through" : "text-fg"}>{s.label}</span>
                </Link>
              </li>
            ))}
          </ol>
        </Panel>
      ) : null}

      <div className="grid gap-5 lg:grid-cols-[1.5fr_1fr]">
        <div className="min-w-0 space-y-5">
          <Panel
            title="Portfolio"
            actions={
              <>
                <PrivateNote>Only you</PrivateNote>
                <Link href="/portfolio" className="text-sm text-accent hover:underline">
                  Open
                </Link>
              </>
            }
          >
            {v.holdings.length ? (
              <>
                <div className="flex flex-wrap items-end justify-between gap-3">
                  <div>
                    <p className="num text-[1.75rem] leading-none font-semibold tracking-[-0.025em] text-fg">{formatMoney(v.totals.marketValue, base)}</p>
                    <p className="mt-2 text-sm">
                      <Change value={v.totals.dayChange} percent={v.totals.dayChangePct} currency={base} /> <span className="text-fg-subtle">today</span>
                    </p>
                  </div>
                  <div className="text-right text-sm">
                    <p className="text-fg-subtle">3-month time-weighted</p>
                    {perf.available ? <Change percent={perf.twr} size="md" /> : <span className="text-fg-subtle">—</span>}
                  </div>
                </div>
                {perf.available ? (
                  <LineChart
                    points={perf.points.map((p) => ({ date: p.date, value: Number(p.value) }))}
                    mode="money"
                    currency={base}
                    label="Holdings value, 3 months"
                    height={120}
                    className="mt-4"
                  />
                ) : null}
                {v.usesDemoPrices ? <SourceBadge kind="demo" className="mt-3" detail="Valued with demo prices" /> : null}
              </>
            ) : (
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-fg-muted">No holdings yet. Add an account, record a position or import your broker&apos;s CSV.</p>
                <ButtonLink href="/portfolio" size="sm">
                  Add holdings
                </ButtonLink>
              </div>
            )}
          </Panel>

          <Panel
            title="Theses"
            actions={
              <Link href="/theses" className="text-sm text-accent hover:underline">
                All theses
              </Link>
            }
          >
            {theses.length === 0 ? (
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-fg-muted">Write down why you own something before the market tells you what to think.</p>
                <ButtonLink href="/theses/new" size="sm">
                  <ScrollText className="size-4" aria-hidden /> New thesis
                </ButtonLink>
              </div>
            ) : (
              <>
                {revisits.length || attention.length ? (
                  <div className="mb-4 space-y-2">
                    {revisits.map(({ t, state }) => (
                      <Link
                        key={t.thesis.id}
                        href={`/theses/${t.thesis.id}`}
                        className={`flex items-center gap-3 rounded-[var(--radius-md)] border border-line px-3 py-2 text-sm hover:border-line-strong ${state === "due" ? "bg-warning-soft" : "bg-selected/50"}`}
                      >
                        <CalendarClock className={`size-4 shrink-0 ${state === "due" ? "text-warning" : "text-accent"}`} aria-hidden />
                        <span className="min-w-0 flex-1 truncate text-fg">{t.thesis.title}</span>
                        <span className="shrink-0 text-xs text-fg-muted">
                          {state === "due" ? "Time to revisit" : `Revisit ${formatDate(t.thesis.reviewOn, { withYear: false })}`}
                        </span>
                      </Link>
                    ))}
                    {attention.map((t) => (
                      <Link
                        key={t.thesis.id}
                        href={`/theses/${t.thesis.id}`}
                        className="flex items-center gap-3 rounded-[var(--radius-md)] border border-line bg-warning-soft px-3 py-2 text-sm hover:border-line-strong"
                      >
                        <ShieldAlert className="size-4 shrink-0 text-warning" aria-hidden />
                        <span className="min-w-0 flex-1 truncate text-fg">{t.thesis.title}</span>
                        <span className="shrink-0 text-xs text-fg-muted">
                          {t.thesis.status === "under_review" ? "Under review" : "Not revisited in 90 days"}
                        </span>
                      </Link>
                    ))}
                  </div>
                ) : null}
                <ul className="divide-y divide-line">
                  {theses.slice(0, 4).map((t) => (
                    <li key={t.thesis.id}>
                      <Link href={`/theses/${t.thesis.id}`} className="flex items-center justify-between gap-3 py-2.5 text-sm hover:underline">
                        <span className="min-w-0 truncate text-fg">{t.thesis.title}</span>
                        <Badge tone={STATUS_TONE[t.thesis.status]}>{STATUS_LABEL[t.thesis.status]}</Badge>
                      </Link>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </Panel>

          <Panel
            title="From your circle"
            actions={
              <Link href="/feed" className="text-sm text-accent hover:underline">
                Feed
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
              <ul className="space-y-4">
                {feed.map((p) => (
                  <li key={p.post.id} className="flex gap-3">
                    <Avatar name={p.author.displayName} hue={p.author.avatarHue} size="sm" />
                    <div className="min-w-0 text-sm">
                      <p>
                        <span className="font-medium text-fg">{p.author.displayName}</span>{" "}
                        <span className="text-xs text-fg-subtle">{relativeTime(p.post.createdAt)}</span>
                      </p>
                      <Link href={`/feed/${p.post.id}`} className="line-clamp-2 text-fg-muted hover:text-fg">
                        {p.post.body}
                      </Link>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>

        <div className="space-y-5">
          <Panel title="Journal">
            <p className="text-sm text-fg-muted">Today&apos;s prompt</p>
            <p className="mt-1 text-[1.0625rem] font-medium text-fg">{prompt}</p>
            <ButtonLink href={`/journal/new?prompt=${encodeURIComponent(prompt)}`} size="sm" variant={wroteToday ? "secondary" : "primary"} className="mt-4">
              <NotebookPen className="size-4" aria-hidden /> {wroteToday ? "Add another entry" : "Write today's entry"}
            </ButtonLink>
            {journal.length ? (
              <ul className="mt-4 space-y-1.5 border-t border-line pt-3 text-sm">
                {journal.slice(0, 3).map((j) => (
                  <li key={j.entry.id} className="flex justify-between gap-2">
                    <Link href={`/journal/${j.entry.id}`} className="truncate text-fg-muted hover:text-fg">
                      {j.entry.title}
                    </Link>
                    <span className="shrink-0 text-xs text-fg-subtle">{formatDate(j.entry.entryDate, { withYear: false })}</span>
                  </li>
                ))}
              </ul>
            ) : null}
          </Panel>

          <Panel
            title="Watchlist movers"
            actions={
              <Link href="/markets" className="text-sm text-accent hover:underline">
                Markets
              </Link>
            }
          >
            {movers.length === 0 ? (
              <p className="text-sm text-fg-muted">Add securities you&apos;re studying to a watchlist to see their moves here.</p>
            ) : (
              <ul className="space-y-2">
                {movers.map(({ i, p, chg }) => (
                  <li key={i.id} className="flex items-center justify-between gap-2 text-sm">
                    <Link href={`/markets/${i.id}`} className="min-w-0 truncate hover:underline">
                      <span className="font-medium text-fg">{i.symbol}</span> <span className="text-xs text-fg-subtle">{i.name}</span>
                    </Link>
                    <span className="flex shrink-0 items-center gap-2">
                      <span className="num text-fg-muted">{p ? formatMoney(p.price, p.currency) : ""}</span>
                      <Change percent={chg} />
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel title="Paper Lab" actions={<Badge tone="warning">Simulation</Badge>}>
            <div className="flex items-end justify-between gap-3">
              <div>
                <p className="text-xs text-fg-subtle">Virtual equity</p>
                <p className="num text-lg font-semibold text-fg">{formatMoney(lab.equity, lab.account.currency)}</p>
              </div>
              <Change percent={lab.totalReturn} />
            </div>
            <ButtonLink href="/lab" size="sm" variant="secondary" className="mt-4">
              <FlaskConical className="size-4" aria-hidden /> Open the Lab
            </ButtonLink>
          </Panel>

          {next ? (
            <Panel title="Next Relic">
              <Link href="/relics" className="group flex items-start gap-3">
                <span className="grid size-10 shrink-0 place-items-center rounded-[var(--radius-md)] border border-line bg-selected text-accent">
                  <Gem className="size-5" aria-hidden />
                </span>
                <span className="min-w-0">
                  <span className="block font-medium text-fg group-hover:underline">{next.name}</span>
                  <span className="block text-sm text-fg-muted">{next.rule}</span>
                  <span className="mt-2 flex items-center gap-2 text-xs text-fg-subtle">
                    <span className="h-1 w-24 overflow-hidden rounded-full bg-field">
                      <span className="block h-full rounded-full bg-accent" style={{ width: `${(next.progress.value / next.progress.threshold) * 100}%` }} />
                    </span>
                    {next.progress.value} / {next.progress.threshold}
                  </span>
                </span>
                <ArrowRight className="ml-auto size-4 shrink-0 text-fg-subtle" aria-hidden />
              </Link>
            </Panel>
          ) : null}
        </div>
      </div>
    </>
  );
}
