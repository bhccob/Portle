import Link from "next/link";
import { notFound } from "next/navigation";
import { BriefcaseBusiness, CalendarDays, EyeOff, Link2, Lock, MapPin, Pencil } from "lucide-react";
import { FriendButton } from "@/app/(app)/feed/feed-client";
import { AuthorTag } from "@/components/badges/author-tag";
import { RelicRow } from "@/components/badges/relics-panel";
import { AllocationRing } from "@/components/charts/allocation";
import { ProfileBanner } from "@/components/profile/banner";
import { ShareProfileButton } from "@/components/profile/share-button";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { LinkTabs } from "@/components/ui/tabs";
import { displayHost, LINK_KEYS, LINKS, SECTION_LABEL, type SectionKey } from "@/domain/profile-layout";
import { topicLabel } from "@/domain/topics";
import { formatPercent, relativeTime } from "@/lib/format";
import { UserFacingError } from "@/server/errors";
import { listBadges } from "@/server/services/badges";
import { getProfileView } from "@/server/services/profile";
import { requireViewer } from "@/server/viewer-session";
import { STATUS_LABEL, STATUS_TONE } from "../../theses/page";

const DIM_LABEL: Record<string, string> = { assetClass: "Asset class", region: "Region", sector: "Sector" };

export async function generateMetadata({ params }: { params: Promise<{ handle: string }> }) {
  return { title: `@${(await params).handle}` };
}

function Section({ title, aside, children }: { title: string; aside?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="border-t border-line pt-5">
      <h2 className="flex items-baseline justify-between gap-3 font-display text-lg font-bold text-fg">
        {title}
        {aside ? <span className="text-[0.8125rem] font-semibold text-fg-subtle">{aside}</span> : null}
      </h2>
      <div className="mt-2.5">{children}</div>
    </section>
  );
}

/** A nudge on your own profile for a section you haven't filled in yet; nobody else sees it. */
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

export default async function ProfilePage({ params, searchParams }: { params: Promise<{ handle: string }>; searchParams: Promise<{ dim?: string }> }) {
  const [{ handle }, sp] = await Promise.all([params, searchParams]);
  const { viewer } = await requireViewer();
  let view;
  try {
    view = await getProfileView(viewer, handle);
  } catch (e) {
    if (e instanceof UserFacingError) notFound();
    throw e;
  }
  const { profile: p, access, relationship } = view;
  const dim = view.allocation?.find((a) => a.dimension === sp.dim) ?? view.allocation?.[0];
  // Your own profile lists every Relic you've earned, hidden ones too, so you can switch them back on.
  const mine = relationship === "self";
  const own = mine ? await listBadges(p.userId) : null;
  const relics = own ? own.earned : view.relics;
  const links = LINK_KEYS.filter((k) => p.links[k]);
  const invest = [
    ["Investing since", p.investingSince ? String(p.investingSince) : null],
    ["Approach", p.approach],
    ["Time horizon", p.horizon],
  ].filter((r): r is [string, string] => !!r[1]);
  const guilds = access.guilds ? view.guilds : [];

  const render: Record<SectionKey, () => React.ReactNode> = {
    about: () =>
      p.bio ? (
        <Section title="About">
          <p className="max-w-[68ch] text-[0.9375rem] leading-relaxed whitespace-pre-line text-fg-muted">{p.bio}</p>
        </Section>
      ) : mine ? (
        <Section title="About">
          <Empty>Say a little about yourself and how you invest.</Empty>
        </Section>
      ) : null,
    invest: () =>
      invest.length || p.interests.length ? (
        <Section title="How I invest">
          {invest.length ? (
            <dl className="grid grid-cols-[minmax(0,9rem)_1fr] gap-x-3 gap-y-1.5 text-[0.9375rem]">
              {invest.map(([k, v]) => (
                <div key={k} className="contents">
                  <dt className="text-fg-subtle">{k}</dt>
                  <dd className="font-medium text-fg">{v}</dd>
                </div>
              ))}
            </dl>
          ) : null}
          {p.interests.length ? (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {p.interests.map((i) => (
                <Badge key={i}>{topicLabel(i)}</Badge>
              ))}
            </div>
          ) : null}
        </Section>
      ) : mine ? (
        <Section title="How I invest">
          <Empty>Add since when you invest, your approach and your time horizon.</Empty>
        </Section>
      ) : null,
    featured: () =>
      view.featured.length ? (
        <Section title="Featured" aside={`${view.featured.length} pinned`}>
          <ul className="grid gap-2.5 sm:grid-cols-2">
            {view.featured.map((t) => (
              <li key={t.id}>
                <Link
                  href={`/theses/${t.id}`}
                  className="block h-full rounded-[18px] bg-bg-elevated p-4 shadow-[inset_0_0_0_1px_var(--line)] hover:shadow-[inset_0_0_0_1.5px_var(--line-strong)]"
                >
                  <span className="block font-medium text-fg">{t.title}</span>
                  {t.summary ? <span className="mt-1 line-clamp-2 block text-sm text-fg-muted">{t.summary}</span> : null}
                  <Badge tone={STATUS_TONE[t.status]} className="mt-2.5">
                    {STATUS_LABEL[t.status]}
                  </Badge>
                </Link>
              </li>
            ))}
          </ul>
        </Section>
      ) : mine ? (
        <Section title="Featured">
          <Empty>Pin up to three theses to show first.</Empty>
        </Section>
      ) : null,
    experience: () =>
      view.experience.length ? (
        <Section title="Experience">
          <ul className="space-y-4">
            {view.experience.map((x) => (
              <li key={x.id} className="flex gap-3">
                <span className="grid size-10 shrink-0 place-items-center rounded-[12px] bg-selected text-accent">
                  <BriefcaseBusiness className="size-[18px]" aria-hidden />
                </span>
                <div className="min-w-0">
                  <p className="font-medium text-fg">{x.title}</p>
                  <p className="text-[0.8125rem] text-fg-subtle">{[x.organisation, `${x.startYear} – ${x.endYear ?? "now"}`].filter(Boolean).join(" · ")}</p>
                  {x.description ? <p className="mt-1 text-sm text-fg-muted">{x.description}</p> : null}
                </div>
              </li>
            ))}
          </ul>
        </Section>
      ) : mine ? (
        <Section title="Experience">
          <Empty>Add your work or study, the way you would on LinkedIn.</Empty>
        </Section>
      ) : null,
    theses: () => (
      <Section title="Theses" aside={mine ? "Others see only what you shared with them" : undefined}>
        {view.theses.length === 0 ? (
          <p className="text-sm text-fg-muted">{mine ? "You haven't written a thesis yet." : `${p.displayName} hasn't shared any theses with you.`}</p>
        ) : (
          <ul className="divide-y divide-line">
            {view.theses.map((t) => (
              <li key={t.id}>
                <Link href={`/theses/${t.id}`} className="flex items-start justify-between gap-3 py-3 hover:underline">
                  <span className="min-w-0">
                    <span className="block font-medium text-fg">{t.title}</span>
                    {t.summary ? <span className="line-clamp-1 text-sm text-fg-muted">{t.summary}</span> : null}
                    <span className="text-xs text-fg-subtle">updated {relativeTime(t.updatedAt)}</span>
                  </span>
                  <Badge tone={STATUS_TONE[t.status]}>{STATUS_LABEL[t.status]}</Badge>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Section>
    ),
    allocation: () => (
      <Section title="Allocation" aside={<Lock className="size-4" aria-label="Percentages only, values are never shown" />}>
        {view.allocation && dim ? (
          <>
            <LinkTabs
              className="mb-4 w-fit"
              label="Allocation dimension"
              current={dim.dimension}
              items={view.allocation.map((a) => ({ value: a.dimension, label: DIM_LABEL[a.dimension], href: `/u/${p.handle}?dim=${a.dimension}` }))}
            />
            {dim.slices.length ? (
              <AllocationRing label={`${p.displayName}'s allocation`} slices={dim.slices} />
            ) : (
              <p className="text-sm text-fg-muted">No priced holdings.</p>
            )}
            {view.holdings?.length ? (
              <ul className="mt-5 space-y-1.5 border-t border-line pt-4 text-sm">
                {view.holdings.slice(0, 12).map((h) => (
                  <li key={h.symbol} className="flex justify-between gap-2">
                    <span className="truncate">
                      <span className="font-medium text-fg">{h.symbol}</span> <span className="text-xs text-fg-subtle">{h.name}</span>
                    </span>
                    <span className="num text-fg-muted">{formatPercent(h.percent)}</span>
                  </li>
                ))}
              </ul>
            ) : null}
          </>
        ) : (
          <p className="flex items-center gap-2 text-sm text-fg-muted">
            <EyeOff className="size-4" aria-hidden /> Not shared with you.
          </p>
        )}
      </Section>
    ),
    guilds: () =>
      guilds.length ? (
        <Section title="Guilds">
          <ul className="flex flex-wrap gap-x-4 gap-y-1.5 text-[0.9375rem]">
            {guilds.map((g) => (
              <li key={g.id}>
                <Link href={`/guilds/${g.slug}`} className="text-fg hover:underline">
                  {g.name}
                </Link>
              </li>
            ))}
          </ul>
        </Section>
      ) : null,
  };

  return (
    <article className="mx-auto max-w-[760px]">
      <ProfileBanner style={p.bannerStyle} className="-mx-5 -mt-3 h-32 sm:mx-0 sm:mt-0 sm:h-44 sm:rounded-[var(--radius-xl)]" />
      <header className="px-1 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <Avatar
            name={p.displayName}
            hue={p.avatarHue}
            size="xl"
            className="relative z-10 -mt-12 size-24 text-[1.75rem] ring-4 ring-bg sm:-mt-14 sm:size-28"
          />
          <div className="flex flex-wrap gap-2 pt-3">
            {mine ? (
              <>
                <ShareProfileButton handle={p.handle} />
                <ButtonLink href="/settings" size="sm">
                  <Pencil className="size-4" aria-hidden /> Edit profile
                </ButtonLink>
              </>
            ) : relationship === "none" ? (
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
            {!mine && relationship !== "blocked" ? <FriendButton kind="block" userId={p.userId} name={p.displayName} /> : null}
          </div>
        </div>

        <h1 className="mt-3 font-display text-[1.75rem] leading-tight font-bold tracking-[-0.02em] text-fg">{p.displayName}</h1>
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
          <AuthorTag userId={p.userId} size="md" all />
        </div>
        {p.headline ? <p className="mt-2 max-w-[60ch] text-[0.9375rem] text-fg">{p.headline}</p> : null}
        <p className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[0.8125rem] text-fg-subtle">
          <span>@{p.handle}</span>
          {p.location ? (
            <span className="inline-flex items-center gap-1">
              <MapPin className="size-3.5" aria-hidden /> {p.location}
            </span>
          ) : null}
          <span className="inline-flex items-center gap-1">
            <CalendarDays className="size-3.5" aria-hidden /> Joined{" "}
            {new Intl.DateTimeFormat("en-GB", { month: "short", year: "numeric" }).format(p.memberSince)}
          </span>
        </p>
        {links.length ? (
          <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 font-display text-[0.8125rem] font-semibold" aria-label="Links">
            {links.map((k) => (
              <li key={k}>
                <a href={p.links[k]} target="_blank" rel="noopener noreferrer nofollow" className="inline-flex items-center gap-1 text-accent hover:underline">
                  {k === "website" ? <Link2 className="size-3.5" aria-hidden /> : null}
                  {k === "website" ? displayHost(p.links[k]!) : LINKS[k].label}
                </a>
              </li>
            ))}
          </ul>
        ) : null}
        <RelicRow relics={relics} locked={own?.locked} mine={mine} ownerName={p.displayName} />
        <dl className="mt-4 flex gap-6 text-[0.8125rem] text-fg-subtle">
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
      </header>

      <div className="mt-6 space-y-6 px-1 sm:px-6">
        {view.sections
          .filter((s) => s.visible)
          .map((s) => (
            <div key={s.key} data-section={s.key} aria-label={SECTION_LABEL[s.key]}>
              {render[s.key]()}
            </div>
          ))}
      </div>
    </article>
  );
}
