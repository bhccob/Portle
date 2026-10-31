import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarClock, FlaskConical, History, Link2, Lock, PenLine, ShieldAlert } from "lucide-react";
import { AuthorTag } from "@/components/badges/author-tag";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Markdown } from "@/components/ui/markdown";
import { Panel } from "@/components/ui/panel";
import { Callout, PrivateNote } from "@/components/ui/states";
import { BookmarkButton, CommentForm, Reactions, ReportMenu } from "@/components/social/interactions";
import { formatDate, formatMoney, formatQuantity, relativeTime } from "@/lib/format";
import { getDb } from "@/server/db";
import { bookmarks, reactions } from "@/server/db/schema";
import { and, eq } from "drizzle-orm";
import { ordersForThesis } from "@/server/services/paper";
import { listComments } from "@/server/services/social";
import { getThesis } from "@/server/services/theses";
import { requireViewer } from "@/server/viewer-session";
import { UserFacingError } from "@/server/errors";
import { reviewState, utcToday } from "@/domain/review";
import { STATUS_LABEL, STATUS_TONE } from "../page";
import { DeleteThesisButton, PrivateNoteForm, ReviewDateForm } from "./thesis-owner-controls";

const UUID = /^[0-9a-f-]{36}$/i;
const VIS_LABEL: Record<string, string> = { private: "Only you", friends: "Friends", guild: "Guild members", public: "All members" };

async function load(id: string) {
  const { viewer } = await requireViewer();
  if (!UUID.test(id)) notFound();
  try {
    return { viewer, t: await getThesis(viewer, id) };
  } catch (e) {
    if (e instanceof UserFacingError) notFound();
    throw e;
  }
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { t } = await load(id);
  return { title: t.thesis.title };
}

function Section({ title, body, icon }: { title: string; body: string; icon?: React.ReactNode }) {
  if (!body.trim()) return null;
  return (
    <section>
      <h3 className="mb-1 flex items-center gap-1.5 text-[0.8125rem] font-semibold text-fg-muted">
        {icon}
        {title}
      </h3>
      <Markdown>{body}</Markdown>
    </section>
  );
}

export default async function ThesisPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ rev?: string }> }) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const { viewer, t } = await load(id);
  const shown = t.revisions.find((r) => String(r.revision) === sp.rev) ?? t.current;
  const target = { type: "thesis" as const, id: t.thesis.id };
  const db = getDb();
  const [comments, reactionRows, [saved], lab] = await Promise.all([
    listComments(viewer, target),
    db
      .select()
      .from(reactions)
      .where(and(eq(reactions.targetType, "thesis"), eq(reactions.targetId, t.thesis.id))),
    db
      .select()
      .from(bookmarks)
      .where(and(eq(bookmarks.userId, viewer.userId), eq(bookmarks.targetType, "thesis"), eq(bookmarks.targetId, t.thesis.id))),
    ordersForThesis(viewer.userId, t.thesis.id),
  ]);
  const counts: Record<string, number> = {};
  for (const r of reactionRows) counts[r.kind] = (counts[r.kind] ?? 0) + 1;
  const isLatest = shown.revision === t.current.revision;
  const today = utcToday();
  const review = t.isOwner ? reviewState(t.thesis.reviewOn, t.thesis.status, today) : "none";

  return (
    <>
      <Link href="/theses" className="mb-3 inline-flex items-center gap-1.5 text-sm text-fg-muted hover:text-fg">
        <ArrowLeft className="size-4" aria-hidden /> Theses
      </Link>

      <div className="grid gap-5 xl:grid-cols-[1fr_320px]">
        <article className="min-w-0">
          <header className="border-b border-line pb-5">
            <div className="flex flex-wrap items-center gap-2 text-xs text-fg-subtle">
              <Badge tone={STATUS_TONE[shown.status]}>{STATUS_LABEL[shown.status]}</Badge>
              {t.instrument ? (
                <Link href={`/markets/${t.instrument.id}`} className="font-medium text-fg-muted hover:underline">
                  {t.instrument.symbol} · {t.instrument.name}
                </Link>
              ) : null}
              {shown.timeHorizon ? <span>Horizon {shown.timeHorizon}</span> : null}
              {review !== "none" ? (
                <span className={`inline-flex items-center gap-1 ${review === "due" ? "font-medium text-warning" : ""}`}>
                  <CalendarClock className="size-3" aria-hidden /> {review === "due" ? "Revisit due" : "Revisit"} {formatDate(t.thesis.reviewOn)}
                </span>
              ) : null}
              <span className="inline-flex items-center gap-1">
                <Lock className="size-3" aria-hidden /> {VIS_LABEL[t.thesis.visibility]}
              </span>
            </div>
            <h1 className="mt-3 text-[1.75rem] leading-tight font-semibold tracking-[-0.025em] text-fg">{shown.title}</h1>
            {shown.summary ? <p className="mt-2 max-w-[68ch] text-[1.0625rem] text-fg-muted">{shown.summary}</p> : null}
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <span className="inline-flex items-center gap-2 text-sm text-fg-muted">
                <Avatar name={t.author.displayName} hue={t.author.avatarHue} src={t.author.pictureUrl} size="sm" />
                <Link href={`/u/${t.author.handle}`} className="font-medium text-fg hover:underline">
                  {t.isOwner ? "You" : t.author.displayName}
                </Link>
                <AuthorTag userId={t.thesis.userId} />
                <span className="text-fg-subtle">
                  · Rev {shown.revision} · {formatDate(shown.createdAt)}
                </span>
              </span>
              <div className="flex items-center gap-1">
                <BookmarkButton target={target} saved={!!saved} />
                {!t.isOwner ? <ReportMenu target={target} /> : null}
              </div>
            </div>
          </header>

          {review === "due" && isLatest ? (
            <Callout tone="warning" className="mt-5" icon={CalendarClock} title="Time to revisit this thesis">
              You planned to look at it again on {formatDate(t.thesis.reviewOn)}. Has anything changed? Revise it with what you&apos;ve learned, or pick a new
              date in your controls.
            </Callout>
          ) : null}

          {!isLatest ? (
            <Callout tone="info" className="mt-5" icon={History}>
              You&apos;re reading revision {shown.revision} of {t.current.revision}.{" "}
              <Link href={`/theses/${t.thesis.id}`} className="font-medium text-fg underline">
                Go to the latest
              </Link>
            </Callout>
          ) : null}

          <div className="mt-6 space-y-6">
            <Section title="Why" body={shown.rationale} />
            {shown.bullCase || shown.bearCase ? (
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-[var(--radius-lg)] bg-positive-soft p-4">
                  <Section title="Bull case" body={shown.bullCase || "_Not written yet._"} />
                </div>
                <div className="rounded-[var(--radius-lg)] bg-negative-soft p-4">
                  <Section title="Bear case" body={shown.bearCase || "_Not written yet._"} />
                </div>
              </div>
            ) : null}
            <Section title="Key assumptions" body={shown.assumptions} />
            <Section title="Catalysts" body={shown.catalysts} />
            <Section title="Risks" body={shown.risks} />
            <Section title="Valuation" body={shown.valuation} />
            {shown.invalidationCriteria ? (
              <div className="rounded-[var(--radius-lg)] bg-selected p-4">
                <Section
                  title="What would prove this wrong"
                  body={shown.invalidationCriteria}
                  icon={<ShieldAlert className="size-4 text-accent" aria-hidden />}
                />
              </div>
            ) : t.isOwner ? (
              <Callout tone="warning" title="No invalidation criteria yet">
                Without them, there&apos;s no clear moment to admit the thesis failed. Add one in your next revision.
              </Callout>
            ) : null}
            {shown.sources.length ? (
              <section>
                <h3 className="mb-2 flex items-center gap-1.5 text-[0.8125rem] font-semibold text-fg-muted">
                  <Link2 className="size-4" aria-hidden /> Sources
                </h3>
                <ul className="space-y-1 text-sm">
                  {shown.sources.map((s) => (
                    <li key={s.url}>
                      <a href={s.url} target="_blank" rel="noopener noreferrer nofollow" className="text-accent hover:underline">
                        {s.label}
                      </a>{" "}
                      <span className="text-xs text-fg-subtle">{new URL(s.url).hostname}</span>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}
            {t.thesis.tags.length ? <p className="text-sm text-fg-subtle">{t.thesis.tags.map((x) => `#${x}`).join("  ")}</p> : null}
          </div>

          <footer className="mt-8 border-t border-line pt-5">
            <Reactions target={target} counts={counts} mine={reactionRows.filter((r) => r.userId === viewer.userId).map((r) => r.kind)} />
            <h2 className="mt-6 mb-3 text-[0.9375rem] font-semibold text-fg">Discussion</h2>
            <ul className="mb-4 space-y-4">
              {comments.length === 0 ? <li className="text-sm text-fg-subtle">No comments yet. Challenges with evidence are the most useful.</li> : null}
              {comments.map(({ comment, author }) => (
                <li key={comment.id} className="flex gap-3">
                  <Avatar name={author.displayName} hue={author.avatarHue} src={author.pictureUrl} size="sm" />
                  <div className="min-w-0">
                    <p className="text-sm">
                      <Link href={`/u/${author.handle}`} className="font-medium text-fg hover:underline">
                        {author.displayName}
                      </Link>{" "}
                      <AuthorTag userId={author.userId} />{" "}
                      <span className="text-xs text-fg-subtle">{relativeTime(comment.createdAt)}</span>
                    </p>
                    <p className="mt-0.5 text-sm whitespace-pre-wrap text-fg-muted">{comment.body}</p>
                  </div>
                </li>
              ))}
            </ul>
            <CommentForm target={target} />
          </footer>
        </article>

        <aside className="space-y-5">
          {t.isOwner ? (
            <Panel title="Your controls">
              <div className="flex flex-wrap gap-2">
                <ButtonLink href={`/theses/${t.thesis.id}/edit`} size="sm">
                  <PenLine className="size-4" aria-hidden /> Revise
                </ButtonLink>
                {t.instrument ? (
                  <ButtonLink href={`/lab?instrument=${t.instrument.id}&thesis=${t.thesis.id}`} size="sm" variant="secondary">
                    <FlaskConical className="size-4" aria-hidden /> Test in Lab
                  </ButtonLink>
                ) : null}
                <DeleteThesisButton id={t.thesis.id} title={t.thesis.title} />
              </div>
              {review !== "none" || ["researching", "active", "under_review"].includes(t.thesis.status) ? (
                <div className="mt-4 border-t border-line pt-4">
                  <ReviewDateForm thesisId={t.thesis.id} reviewOn={t.thesis.reviewOn} today={today} />
                </div>
              ) : null}
            </Panel>
          ) : t.instrument ? (
            <Panel>
              <ButtonLink href={`/lab?instrument=${t.instrument.id}&thesis=${t.thesis.id}`} variant="secondary" className="w-full">
                <FlaskConical className="size-4" aria-hidden /> Test this idea in the Paper Lab
              </ButtonLink>
            </Panel>
          ) : null}

          <Panel title="Revisions" description="Every version is kept">
            <ol className="relative space-y-3 border-l border-line pl-4">
              {t.revisions.map((r) => (
                <li key={r.id} className="relative">
                  <span
                    className={`absolute top-1.5 -left-[21px] size-2.5 rounded-full ${r.revision === shown.revision ? "bg-accent" : "bg-line-strong"}`}
                    aria-hidden
                  />
                  <Link
                    href={`/theses/${t.thesis.id}?rev=${r.revision}`}
                    className="block text-sm hover:underline"
                    aria-current={r.revision === shown.revision ? "true" : undefined}
                  >
                    <span className="font-medium text-fg">Rev {r.revision}</span> <span className="text-fg-subtle">· {formatDate(r.createdAt)}</span>
                    <Badge tone={STATUS_TONE[r.status]} className="ml-2 h-5">
                      {STATUS_LABEL[r.status]}
                    </Badge>
                  </Link>
                  {r.changeNote ? <p className="mt-0.5 text-xs text-fg-muted">{r.changeNote}</p> : null}
                </li>
              ))}
            </ol>
          </Panel>

          <Panel title="Paper Lab" description="Simulated trades, never real money">
            {lab.mine.length === 0 ? (
              <p className="text-sm text-fg-muted">No paper orders linked yet.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {lab.mine.slice(0, 6).map(({ order, symbol, fill }) => (
                  <li key={order.id} className="flex justify-between gap-2">
                    <span className="text-fg-muted">
                      {order.side === "buy" ? "Bought" : "Sold"} {formatQuantity(order.quantity)} {symbol}
                    </span>
                    <span className="num text-fg">{fill ? formatMoney(fill.price, "USD") : order.status}</span>
                  </li>
                ))}
              </ul>
            )}
            {lab.othersCount ? (
              <p className="mt-3 text-xs text-fg-subtle">
                {lab.othersCount} other member{lab.othersCount === 1 ? "" : "s"} tested this thesis in their Lab.
              </p>
            ) : null}
          </Panel>

          {t.isOwner ? (
            <Panel title="Private notes" actions={<PrivateNote>Never shared</PrivateNote>}>
              <ul className="mb-4 space-y-3">
                {t.notes.map((n) => (
                  <li key={n.id} className="text-sm">
                    <p className="text-xs text-fg-subtle">{formatDate(n.createdAt, { withTime: true })}</p>
                    <p className="whitespace-pre-wrap text-fg-muted">{n.body}</p>
                  </li>
                ))}
              </ul>
              <PrivateNoteForm thesisId={t.thesis.id} />
            </Panel>
          ) : null}
        </aside>
      </div>
    </>
  );
}
