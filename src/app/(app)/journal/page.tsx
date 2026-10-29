import Link from "next/link";
import { NotebookPen, Plus, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { PageHeader, Panel } from "@/components/ui/panel";
import { EmptyState } from "@/components/ui/states";
import { longestStreak } from "@/domain/relics";
import { cn } from "@/lib/cn";
import { formatDate } from "@/lib/format";
import { listEntries } from "@/server/services/journal";
import { requireMember } from "@/server/session";

export const metadata = { title: "Journal" };

function monthGrid(year: number, month: number) {
  const first = new Date(Date.UTC(year, month, 1));
  const days = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const offset = (first.getUTCDay() + 6) % 7; // Monday first
  return { days, offset };
}

export default async function JournalPage({ searchParams }: { searchParams: Promise<{ q?: string; tag?: string; month?: string }> }) {
  const sp = await searchParams;
  const { user } = await requireMember();
  const now = new Date();
  const [y, m] = /^\d{4}-\d{2}$/.test(sp.month ?? "") ? sp.month!.split("-").map(Number) : [now.getUTCFullYear(), now.getUTCMonth() + 1];
  const entries = await listEntries(user.id, { q: sp.q, tag: sp.tag });
  const all = sp.q || sp.tag ? await listEntries(user.id) : entries;
  const byDate = new Map<string, number>();
  for (const e of all) byDate.set(e.entry.entryDate, (byDate.get(e.entry.entryDate) ?? 0) + 1);
  const { days, offset } = monthGrid(y, m - 1);
  const ym = (yy: number, mm: number) => `${yy}-${String(mm).padStart(2, "0")}`;
  const prev = m === 1 ? ym(y - 1, 12) : ym(y, m - 1);
  const next = m === 12 ? ym(y + 1, 1) : ym(y, m + 1);
  const tags = [...new Set(all.flatMap((e) => e.entry.tags))].slice(0, 12);
  const streak = longestStreak(all.map((e) => e.entry.entryDate));

  return (
    <>
      <PageHeader
        title="Journal"
        description="Private by default. Write what you believe before the outcome is known; read it back afterwards."
        actions={
          <ButtonLink href="/journal/new">
            <Plus className="size-4" aria-hidden /> New entry
          </ButtonLink>
        }
      />
      <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
        <div className="min-w-0">
          <form role="search" className="relative mb-4">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-fg-subtle" aria-hidden />
            <input
              name="q"
              defaultValue={sp.q}
              placeholder="Search your entries"
              aria-label="Search journal"
              className="h-10 w-full rounded-[var(--radius-md)] border border-line bg-field pr-3 pl-9 text-sm text-fg placeholder:text-fg-subtle focus:border-accent focus:outline-none"
            />
          </form>
          {entries.length === 0 ? (
            <Panel>
              <EmptyState icon={NotebookPen} title={sp.q || sp.tag ? "No entries match" : "Start your journal"} action={<ButtonLink href="/journal/new">Write an entry</ButtonLink>}>
                {sp.q || sp.tag ? "Try another search." : "Two minutes after the market closes is enough. Use a prompt if you don't know where to start."}
              </EmptyState>
            </Panel>
          ) : (
            <ol className="space-y-3">
              {entries.map(({ entry, thesisTitle, symbol }) => (
                <li key={entry.id}>
                  <Link href={`/journal/${entry.id}`} className="group block border-t border-line py-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h2 className="font-semibold text-fg">{entry.title}</h2>
                      <time dateTime={entry.entryDate} className="text-xs text-fg-subtle">
                        {formatDate(entry.entryDate)}
                      </time>
                    </div>
                    {entry.prompt ? <p className="mt-1 text-xs text-accent">{entry.prompt}</p> : null}
                    <p className="mt-2 line-clamp-2 text-sm text-fg-muted">{entry.body.replace(/[*#>_`]/g, "")}</p>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {entry.visibility === "friends" ? <Badge tone="info">Shared with friends</Badge> : null}
                      {symbol ? <Badge>{symbol}</Badge> : null}
                      {thesisTitle ? <Badge tone="brand">Thesis: {thesisTitle}</Badge> : null}
                      {entry.paperOrderId ? <Badge tone="warning">Paper trade</Badge> : null}
                      {entry.tags.map((t) => (
                        <Badge key={t}>#{t}</Badge>
                      ))}
                    </div>
                  </Link>
                </li>
              ))}
            </ol>
          )}
        </div>

        <aside className="space-y-5">
          <Panel
            title={new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(Date.UTC(y, m - 1, 1)))}
            actions={
              <span className="flex gap-1 text-sm">
                <Link href={`/journal?month=${prev}`} className="rounded px-2 py-1 text-fg-muted hover:bg-field" aria-label="Previous month">
                  ←
                </Link>
                <Link href={`/journal?month=${next}`} className="rounded px-2 py-1 text-fg-muted hover:bg-field" aria-label="Next month">
                  →
                </Link>
              </span>
            }
          >
            <div className="grid grid-cols-7 gap-1 text-center text-[0.6875rem] text-fg-subtle" aria-hidden>
              {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
                <span key={i}>{d}</span>
              ))}
            </div>
            <ol className="mt-1 grid grid-cols-7 gap-1" aria-label="Days with entries">
              {Array.from({ length: offset }, (_, i) => (
                <li key={`x${i}`} aria-hidden />
              ))}
              {Array.from({ length: days }, (_, i) => {
                const date = `${ym(y, m)}-${String(i + 1).padStart(2, "0")}`;
                const n = byDate.get(date) ?? 0;
                return (
                  <li key={date}>
                    <span
                      className={cn(
                        "num grid aspect-square place-items-center rounded-[var(--radius-sm)] text-xs",
                        n ? "bg-selected font-semibold text-fg" : "text-fg-subtle",
                        date === now.toISOString().slice(0, 10) && "ring-1 ring-accent",
                      )}
                      title={n ? `${n} entr${n === 1 ? "y" : "ies"}` : undefined}
                    >
                      {i + 1}
                      {n ? <span className="sr-only">, {n} entries</span> : null}
                    </span>
                  </li>
                );
              })}
            </ol>
            <p className="mt-3 text-xs text-fg-subtle">
              {byDate.size} day{byDate.size === 1 ? "" : "s"} written · longest streak {streak} day{streak === 1 ? "" : "s"}
            </p>
          </Panel>
          {tags.length ? (
            <Panel title="Tags">
              <div className="flex flex-wrap gap-1.5">
                {sp.tag ? (
                  <Link href="/journal" className="text-xs text-accent hover:underline">
                    Clear filter
                  </Link>
                ) : null}
                {tags.map((t) => (
                  <Link key={t} href={`/journal?tag=${t}`} aria-current={sp.tag === t ? "true" : undefined}>
                    <Badge tone={sp.tag === t ? "brand" : "neutral"}>#{t}</Badge>
                  </Link>
                ))}
              </div>
            </Panel>
          ) : null}
        </aside>
      </div>
    </>
  );
}
