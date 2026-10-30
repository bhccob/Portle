import Link from "next/link";
import { notFound } from "next/navigation";
import { Link2, MessageSquare, Pencil } from "lucide-react";
import { FriendButton } from "@/app/(app)/feed/feed-client";
import { AuthorTag } from "@/components/badges/author-tag";
import { RelicRow } from "@/components/badges/relics-panel";
import { ProfileBanner } from "@/components/profile/banner";
import { ShareProfileButton } from "@/components/profile/share-button";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Markdown } from "@/components/ui/markdown";
import { displayHost, LINK_KEYS, LINKS, SECTION_LABEL, type SectionKey } from "@/domain/profile-layout";
import { topicLabel } from "@/domain/topics";
import { cn } from "@/lib/cn";
import { relativeTime } from "@/lib/format";
import { UserFacingError } from "@/server/errors";
import { listBadges } from "@/server/services/badges";
import { getProfileView } from "@/server/services/profile";
import { requireViewer } from "@/server/viewer-session";
import { STATUS_LABEL } from "../../theses/page";
import { CommentMenu, ProfileCommentForm } from "./comments-client";
import { ProfileMenu } from "./profile-menu";

/** One colour per thesis status, for the bar and its dots. */
const STATUS_DOT: Record<string, string> = {
  researching: "bg-[var(--chart-1)]",
  active: "bg-[var(--chart-3)]",
  under_review: "bg-[var(--chart-4)]",
  validated: "bg-positive",
  invalidated: "bg-negative",
  archived: "bg-[var(--chart-7)]",
};
const STATUS_ORDER = Object.keys(STATUS_DOT);
const RECENT = 5;

export async function generateMetadata({ params }: { params: Promise<{ handle: string }> }) {
  return { title: `@${(await params).handle}` };
}

function Section({ id, title, aside, children }: { id?: string; title: string; aside?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-20">
      <h2 className="flex items-baseline justify-between gap-3 font-display text-lg font-bold text-fg">
        {title}
        {aside ? <span className="text-[0.8125rem] font-medium text-fg-subtle">{aside}</span> : null}
      </h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}

/** A small heading in the side column, with an optional count. */
function SideBlock({ title, count, children }: { title: string; count?: number; children: React.ReactNode }) {
  return (
    <div className="border-t border-line pt-4">
      <h2 className="mb-2.5 flex items-baseline justify-between font-display text-[0.9375rem] font-bold text-fg">
        {title}
        {count ? <span className="text-[0.8125rem] font-semibold text-fg-subtle">{count}</span> : null}
      </h2>
      {children}
    </div>
  );
}

/** A nudge on your own profile for a part you haven't filled in yet; nobody else sees it. */
function Empty({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-sm text-fg-subtle">
      {children}{" "}
      <Link href="/settings" className="font-medium text-accent hover:underline">
        Edit profile
      </Link>
    </p>
  );
}

function StatusLine({ status, children }: { status: string; children?: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[0.8125rem] text-fg-subtle">
      <span className={cn("size-2 shrink-0 rounded-full", STATUS_DOT[status])} aria-hidden />
      {STATUS_LABEL[status]}
      {children}
    </span>
  );
}

export default async function ProfilePage({ params, searchParams }: { params: Promise<{ handle: string }>; searchParams: Promise<{ comments?: string }> }) {
  const [{ handle }, sp] = await Promise.all([params, searchParams]);
  const { viewer, profile: me } = await requireViewer();
  let view;
  try {
    view = await getProfileView(viewer, handle, { allComments: sp.comments === "all" });
  } catch (e) {
    if (e instanceof UserFacingError) notFound();
    throw e;
  }
  const { profile: p, access, relationship } = view;
  // Your own profile lists every Relic you've earned, hidden ones too, so you can switch them back on.
  const mine = relationship === "self";
  const own = mine ? await listBadges(p.userId) : null;
  const relics = own ? own.earned : view.relics;
  const links = LINK_KEYS.filter((k) => p.links[k]);
  const first = p.displayName.split(" ")[0];
  const guilds = access.guilds ? view.guilds : [];
  const shown = new Set(view.sections.filter((s) => s.visible).map((s) => s.key));
  const facts = [
    ["Location", p.location || null],
    ["Joined", new Intl.DateTimeFormat("en-GB", { month: "short", year: "numeric" }).format(p.memberSince)],
    ["Investing since", p.investingSince ? String(p.investingSince) : null],
    ["Approach", p.approach],
    ["Horizon", p.horizon],
    ["Into", p.interests.length ? p.interests.map((i) => topicLabel(i)).join(", ") : null],
  ].filter((r): r is [string, string] => !!r[1]);
  const counts = STATUS_ORDER.map((s) => [s, view.theses.filter((t) => t.status === s).length] as const).filter(([, n]) => n > 0);

  const actions = mine ? (
    <>
      <ShareProfileButton handle={p.handle} />
      <ButtonLink href="/settings" size="sm">
        <Pencil className="size-4" aria-hidden /> Edit profile
      </ButtonLink>
    </>
  ) : (
    <>
      {relationship === "none" ? (
        <FriendButton kind="request" userId={p.userId} />
      ) : relationship === "pending_in" ? (
        <>
          <FriendButton kind="accept" userId={p.userId} />
          <FriendButton kind="decline" userId={p.userId} />
        </>
      ) : relationship === "pending_out" ? (
        <Badge>Request sent</Badge>
      ) : relationship === "friends" ? (
        <Badge tone="brand">Friends</Badge>
      ) : null}
      {view.canComment ? (
        <ButtonLink href="#comments" size="sm" variant="secondary" className="max-sm:w-8 max-sm:px-0">
          <MessageSquare className="size-4" aria-hidden /> <span className="max-sm:sr-only">Comment</span>
        </ButtonLink>
      ) : null}
      {relationship !== "blocked" ? <ProfileMenu userId={p.userId} name={p.displayName} friends={relationship === "friends"} /> : null}
    </>
  );

  const render: Partial<Record<SectionKey, () => React.ReactNode>> = {
    about: () =>
      p.bio ? (
        <section aria-label={SECTION_LABEL.about}>
          <Markdown className="prose-about" demoteHeadings>
            {p.bio}
          </Markdown>
        </section>
      ) : mine ? (
        <Section title={SECTION_LABEL.about}>
          <Empty>Write a little about yourself: who you are, how you invest, what people can ask you about.</Empty>
        </Section>
      ) : null,
    featured: () =>
      view.featured.length ? (
        <Section title={SECTION_LABEL.featured}>
          <ul className="grid gap-x-3 sm:grid-cols-3 sm:gap-y-3">
            {view.featured.map((t) => (
              <li key={t.id} className="border-t border-line first:border-t-0 sm:border-t-0">
                <Link
                  href={`/theses/${t.id}`}
                  className="group grid h-full content-start gap-2 py-3 first:pt-0 sm:rounded-[18px] sm:bg-bg-elevated sm:p-4 sm:shadow-[inset_0_0_0_1px_var(--line)] sm:hover:shadow-[inset_0_0_0_1.5px_var(--line-strong)]"
                >
                  <span className="font-display text-[0.9375rem] leading-snug font-semibold text-fg group-hover:underline sm:group-hover:no-underline">
                    {t.title}
                  </span>
                  <StatusLine status={t.status} />
                </Link>
              </li>
            ))}
          </ul>
        </Section>
      ) : mine ? (
        <Section title={SECTION_LABEL.featured}>
          <Empty>Pin up to three theses to show first.</Empty>
        </Section>
      ) : null,
    theses: () => (
      <Section title={SECTION_LABEL.theses} aside={view.theses.length ? `${view.theses.length} in total` : undefined}>
        {view.theses.length === 0 ? (
          <p className="text-sm text-fg-muted">{mine ? "You haven't written a thesis yet." : `${first} hasn't shared any theses with you.`}</p>
        ) : (
          <>
            <div className="flex h-2.5 gap-0.5 overflow-hidden rounded-full" aria-hidden>
              {counts.map(([s, n]) => (
                <span key={s} className={STATUS_DOT[s]} style={{ flexGrow: n }} />
              ))}
            </div>
            <ul className="mt-3 grid grid-cols-2 gap-x-6 gap-y-1.5 text-sm sm:grid-cols-3" aria-label="Theses by status">
              {counts.map(([s, n]) => (
                <li key={s} className="flex items-center gap-2 text-fg-muted">
                  <span className={cn("size-2 shrink-0 rounded-full", STATUS_DOT[s])} aria-hidden />
                  {STATUS_LABEL[s]}
                  <span className="ml-auto font-display font-semibold text-fg">{n}</span>
                </li>
              ))}
            </ul>
            <ThesisList theses={view.theses.slice(0, RECENT)} className="mt-4" />
            {view.theses.length > RECENT ? (
              <details className="group">
                <summary className="mt-1 inline-flex cursor-pointer list-none font-display text-sm font-semibold text-accent hover:underline group-open:hidden">
                  Show all {view.theses.length}
                </summary>
                <ThesisList theses={view.theses.slice(RECENT)} className="border-t border-line" />
              </details>
            ) : null}
            {mine ? <p className="mt-2 text-xs text-fg-subtle">Others see only the theses you shared with them.</p> : null}
          </>
        )}
      </Section>
    ),
    experience: () =>
      view.experience.length ? (
        <Section title={SECTION_LABEL.experience}>
          <ul className="space-y-4">
            {view.experience.map((x) => (
              <li key={x.id}>
                <p className="font-display font-semibold text-fg">{x.title}</p>
                <p className="text-[0.8125rem] text-fg-subtle">{[x.organisation, `${x.startYear} – ${x.endYear ?? "now"}`].filter(Boolean).join(" · ")}</p>
                {x.description ? <p className="mt-1 text-sm text-fg-muted">{x.description}</p> : null}
              </li>
            ))}
          </ul>
        </Section>
      ) : mine ? (
        <Section title={SECTION_LABEL.experience}>
          <Empty>Add your work or study, the way you would on LinkedIn.</Empty>
        </Section>
      ) : null,
    comments: () => {
      if (!view.comments) {
        return mine ? (
          <Section id="comments" title={SECTION_LABEL.comments}>
            <p className="text-sm text-fg-subtle">
              Comments are off.{" "}
              <Link href="/settings" className="font-medium text-accent hover:underline">
                Turn them on
              </Link>
            </p>
          </Section>
        ) : null;
      }
      const { comments, total } = view.comments;
      return (
        <Section id="comments" title={SECTION_LABEL.comments} aside={total ? String(total) : undefined}>
          {view.canComment ? (
            <div className="flex items-start gap-3">
              <Avatar name={me.displayName} hue={me.avatarHue} size="md" className="hidden sm:inline-grid" />
              <ProfileCommentForm profileUserId={p.userId} placeholder={mine ? "Write something on your profile…" : `Write something to ${first}…`} />
            </div>
          ) : (
            <p className="text-sm text-fg-subtle">
              {view.commentAudience === "friends" ? `Only ${first}'s friends can comment.` : `You can't comment on ${first}'s profile.`}
            </p>
          )}
          {comments.length ? (
            <ul className="mt-2">
              {comments.map((c) => (
                <li key={c.id} className="flex gap-3 border-t border-line py-3.5 first:border-t-0 sm:first:border-t">
                  <Link href={`/u/${c.author.handle}`} tabIndex={-1} aria-hidden>
                    <Avatar name={c.author.displayName} hue={c.author.avatarHue} size="md" />
                  </Link>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm">
                      <Link href={`/u/${c.author.handle}`} className="font-display font-semibold text-fg hover:underline">
                        {c.author.displayName}
                      </Link>{" "}
                      <span className="text-xs text-fg-subtle">{relativeTime(c.createdAt)}</span>
                    </p>
                    <p className="mt-0.5 text-[0.9375rem] break-words whitespace-pre-wrap text-fg-muted">{c.body}</p>
                  </div>
                  {mine || c.author.userId === viewer.userId ? <CommentMenu id={c.id} /> : null}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-fg-subtle">No comments yet.</p>
          )}
          {total > comments.length ? (
            <Link href={`/u/${p.handle}?comments=all#comments`} className="mt-1 inline-flex font-display text-sm font-semibold text-accent hover:underline">
              All {total} comments
            </Link>
          ) : null}
        </Section>
      );
    },
  };

  const main = view.sections.filter((s) => s.visible && render[s.key]).map((s) => ({ key: s.key, node: render[s.key]!() }));
  const friends = view.friends.length ? (
    <SideBlock title="Friends" count={view.friendCount}>
      <ul className="flex flex-wrap gap-2" aria-label={`${first}'s friends`}>
        {view.friends.map((f) => (
          <li key={f.userId}>
            <Link href={`/u/${f.handle}`} title={f.displayName} className="block rounded-full focus-visible:outline-2 focus-visible:outline-[var(--focus)]">
              <Avatar name={f.displayName} hue={f.avatarHue} size="md" />
              <span className="sr-only">{f.displayName}</span>
            </Link>
          </li>
        ))}
      </ul>
    </SideBlock>
  ) : null;
  const guildList =
    shown.has("guilds") && guilds.length ? (
      <SideBlock title={SECTION_LABEL.guilds} count={guilds.length}>
        <ul className="grid gap-1.5 text-[0.9375rem]">
          {guilds.map((g) => (
            <li key={g.id}>
              <Link href={`/guilds/${g.slug}`} className="text-fg hover:underline">
                {g.name}
              </Link>
            </li>
          ))}
        </ul>
      </SideBlock>
    ) : null;

  return (
    <article className="mx-auto max-w-[1120px]">
      <ProfileBanner style={p.bannerStyle} className="-mx-5 -mt-3 h-32 sm:mx-0 sm:mt-0 sm:h-44 sm:rounded-[var(--radius-xl)]" />
      <div className="grid gap-x-12 px-1 sm:px-6 lg:grid-cols-[300px_minmax(0,1fr)] lg:grid-rows-[auto_1fr]">
        {/* Who they are: on a computer the column on the left, on a phone the top of the page. */}
        <header className="min-w-0">
          <div className="flex items-end justify-between gap-3">
            <Avatar
              name={p.displayName}
              hue={p.avatarHue}
              size="xl"
              className="relative z-10 -mt-12 size-24 text-[1.75rem] ring-4 ring-bg sm:-mt-14 sm:size-28 lg:-mt-[5.5rem] lg:size-36 lg:text-[2.75rem]"
            />
            <div className="flex flex-wrap justify-end gap-2 pt-3 lg:hidden">{actions}</div>
          </div>
          <h1 className="mt-3 font-display text-[1.75rem] leading-tight font-bold tracking-[-0.02em] text-fg lg:text-[1.875rem]">{p.displayName}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-2 empty:hidden">
            <AuthorTag userId={p.userId} size="md" all />
            <RelicRow relics={relics} locked={own?.locked} mine={mine} ownerName={p.displayName} className="" />
          </div>
          {p.headline ? <p className="mt-2.5 text-[0.9375rem] leading-snug text-fg">{p.headline}</p> : null}
          <p className="mt-1 text-[0.8125rem] text-fg-subtle">@{p.handle}</p>
          <div className="mt-4 hidden flex-wrap gap-2 lg:flex">{actions}</div>

          <dl className="mt-5 flex gap-6 text-[0.8125rem] text-fg-subtle">
            <div>
              <dd className="font-display text-lg font-bold text-fg">{view.theses.length}</dd>
              <dt>{view.theses.length === 1 ? "thesis" : "theses"}</dt>
            </div>
            <div>
              <dd className="font-display text-lg font-bold text-fg">{view.friendCount}</dd>
              <dt>{view.friendCount === 1 ? "friend" : "friends"}</dt>
            </div>
            {access.guilds ? (
              <div>
                <dd className="font-display text-lg font-bold text-fg">{guilds.length}</dd>
                <dt>{guilds.length === 1 ? "Guild" : "Guilds"}</dt>
              </div>
            ) : null}
          </dl>

          <dl className="mt-5 grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-2 border-t border-line pt-4 text-sm" aria-label="Details">
            {facts.map(([k, v]) => (
              <div key={k} className="contents">
                <dt className="text-fg-subtle">{k}</dt>
                <dd className="text-right font-medium text-fg">{v}</dd>
              </div>
            ))}
          </dl>
          {mine && !p.investingSince && !p.approach && !p.horizon ? (
            <div className="mt-3">
              <Empty>Add how you invest: since when, your approach and your horizon.</Empty>
            </div>
          ) : null}
          {links.length ? (
            <ul className="mt-4 flex flex-wrap gap-x-4 gap-y-1 font-display text-[0.8125rem] font-semibold" aria-label="Links">
              {links.map((k) => (
                <li key={k}>
                  <a
                    href={p.links[k]}
                    target="_blank"
                    rel="noopener noreferrer nofollow"
                    className="inline-flex items-center gap-1 text-accent hover:underline"
                  >
                    {k === "website" ? <Link2 className="size-3.5" aria-hidden /> : null}
                    {k === "website" ? displayHost(p.links[k]!) : LINKS[k].label}
                  </a>
                </li>
              ))}
            </ul>
          ) : null}
        </header>

        {/* What they wrote, in the order they chose. */}
        <div className="mt-6 grid min-w-0 content-start gap-7 border-t border-line pt-6 lg:row-span-2 lg:mt-8 lg:border-t-0 lg:pt-0 [&>*+*]:border-t [&>*+*]:border-line [&>*+*]:pt-6">
          {main.map((s) => (s.node ? <div key={s.key}>{s.node}</div> : null))}
        </div>

        {friends || guildList ? (
          <aside className="mt-8 grid content-start gap-5 lg:mt-6">
            {friends}
            {guildList}
          </aside>
        ) : null}
      </div>
    </article>
  );
}

function ThesisList({ theses, className }: { theses: { id: string; title: string; status: string; updatedAt: Date }[]; className?: string }) {
  return (
    <ul className={cn("divide-y divide-line", className)}>
      {theses.map((t) => (
        <li key={t.id}>
          <Link href={`/theses/${t.id}`} className="group flex flex-col gap-0.5 py-3 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4">
            <span className="min-w-0 text-[0.9375rem] font-medium text-fg group-hover:underline">{t.title}</span>
            <StatusLine status={t.status}>
              <span className="text-fg-subtle"> · updated {relativeTime(t.updatedAt)}</span>
            </StatusLine>
          </Link>
        </li>
      ))}
    </ul>
  );
}
