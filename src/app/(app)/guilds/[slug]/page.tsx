import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, BarChart3, Lock, Users } from "lucide-react";
import { Composer } from "@/app/(app)/feed/feed-client";
import { NewWatchlistForm } from "@/app/(app)/markets/market-controls";
import { AllocationRing } from "@/components/charts/allocation";
import { PostCard } from "@/components/social/post-card";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";
import { EmptyState } from "@/components/ui/states";
import { UserFacingError } from "@/server/errors";
import { getDb } from "@/server/db";
import { guildMembers } from "@/server/db/schema";
import { and, eq } from "drizzle-orm";
import { getGuild, guildAnalytics } from "@/server/services/guilds";
import { listGuildWatchlists } from "@/server/services/market";
import { listFeed } from "@/server/services/social";
import { listOwnTheses, listSharedTheses } from "@/server/services/theses";
import { requireViewer } from "@/server/viewer-session";
import { GuildOpButton, ShareToggle } from "../guild-client";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  return { title: `Guild · ${(await params).slug}` };
}

export default async function GuildPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { user, viewer } = await requireViewer();
  let g;
  try {
    g = await getGuild(viewer, slug);
  } catch (e) {
    if (e instanceof UserFacingError) notFound();
    throw e;
  }
  const { guild, members, role, pending } = g;

  const header = (
    <section className="mb-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-display text-[1.75rem] leading-tight font-bold tracking-[-0.02em] text-fg">{guild.name}</h1>
            {guild.visibility === "private" ? (
              <Badge>
                <Lock className="size-3" aria-hidden /> Private
              </Badge>
            ) : null}
            {role ? <Badge tone="brand" className="capitalize">{role}</Badge> : null}
          </div>
          {guild.topic ? <p className="mt-1 text-sm text-accent">{guild.topic}</p> : null}
          {guild.description ? <p className="mt-2 max-w-[68ch] text-sm text-fg-muted">{guild.description}</p> : null}
          <p className="mt-2 flex items-center gap-1.5 text-xs text-fg-subtle">
            <Users className="size-3.5" aria-hidden /> {members} member{members === 1 ? "" : "s"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {role ? (
            <>
              <ButtonLink href={`/guilds/${guild.slug}/members`} variant="secondary" size="sm">
                Members
              </ButtonLink>
              {role !== "owner" ? <GuildOpButton input={{ op: "leave", guildId: guild.id }} label="Leave" variant="ghost" confirmText={`Leave ${guild.name}?`} /> : null}
            </>
          ) : pending?.kind === "invite" ? (
            <>
              <GuildOpButton input={{ op: "join", guildId: guild.id }} label="Accept invitation" variant="primary" />
              <GuildOpButton input={{ op: "decline_invite", guildId: guild.id }} label="Decline" variant="ghost" />
            </>
          ) : pending?.kind === "request" ? (
            <Badge>Request pending</Badge>
          ) : guild.joinPolicy !== "invite" ? (
            <GuildOpButton input={{ op: "join", guildId: guild.id }} label={guild.joinPolicy === "open" ? "Join Guild" : "Ask to join"} variant="primary" />
          ) : (
            <Badge>Invitation only</Badge>
          )}
        </div>
      </div>
    </section>
  );

  if (!role) {
    return (
      <>
        <Link href="/guilds" className="mb-3 inline-flex items-center gap-1.5 text-sm text-fg-muted hover:text-fg">
          <ArrowLeft className="size-4" aria-hidden /> Guilds
        </Link>
        {header}
        <Panel>
          <EmptyState icon={Lock} title="Members only">
            Discussions, shared theses and watchlists are visible to members. Joining never shares your portfolio; analytics only include members who opt in.
          </EmptyState>
        </Panel>
      </>
    );
  }

  const [posts, lists, analytics, mineTheses, shared, [membership]] = await Promise.all([
    listFeed(viewer, { guildId: guild.id, limit: 30 }),
    listGuildWatchlists(guild.id),
    guildAnalytics(user.id, guild.id),
    listOwnTheses(user.id),
    listSharedTheses(viewer, { guildId: guild.id }),
    getDb().select().from(guildMembers).where(and(eq(guildMembers.guildId, guild.id), eq(guildMembers.userId, user.id))),
  ]);
  const guildTheses = [...mineTheses.filter((t) => t.thesis.guildId === guild.id), ...shared];

  return (
    <>
      <Link href="/guilds" className="mb-3 inline-flex items-center gap-1.5 text-sm text-fg-muted hover:text-fg">
        <ArrowLeft className="size-4" aria-hidden /> Guilds
      </Link>
      {header}
      <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
        <div className="min-w-0 space-y-4">
          <Panel>
            <Composer theses={mineTheses.filter((t) => t.thesis.visibility === "public" || t.thesis.guildId === guild.id).map((t) => ({ id: t.thesis.id, title: t.thesis.title, visibility: t.thesis.visibility }))} guilds={[{ id: guild.id, name: guild.name }]} />
            <p className="mt-2 text-xs text-fg-subtle">Choose “A Guild” as the audience to post here; only members will see it.</p>
          </Panel>
          {posts.length === 0 ? (
            <Panel>
              <EmptyState icon={Users} title="No discussion yet">
                Start with what you&apos;re researching, or a question for the group.
              </EmptyState>
            </Panel>
          ) : (
            posts.map((p) => <PostCard key={p.post.id} item={p} viewerId={user.id} guildName={guild.name} />)
          )}
        </div>

        <aside className="space-y-5">
          <Panel title="Guild allocation" description="Average of consenting members" actions={<BarChart3 className="size-4 text-fg-subtle" aria-hidden />}>
            {analytics.available ? (
              <>
                <AllocationRing label="Average allocation by asset class" slices={analytics.assetClass} />
                <p className="mt-3 text-xs text-fg-subtle">From {analytics.members} members who opted in. Percentages only.</p>
              </>
            ) : (
              <p className="text-sm text-fg-muted">
                Hidden until at least {analytics.required} members opt in ({analytics.consenting} so far), so no one can be identified.
              </p>
            )}
            <div className="mt-4 border-t border-line pt-4">
              <ShareToggle guildId={guild.id} share={!!membership?.shareAllocation} />
            </div>
          </Panel>

          <Panel title="Shared theses">
            {guildTheses.length === 0 ? (
              <p className="text-sm text-fg-muted">Share a thesis with this Guild from its visibility setting.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {guildTheses.map((t) => (
                  <li key={t.thesis.id}>
                    <Link href={`/theses/${t.thesis.id}`} className="font-medium text-fg hover:underline">
                      {t.thesis.title}
                    </Link>
                    <span className="block text-xs text-fg-subtle">{t.author.displayName}</span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel title="Shared watchlists" actions={<NewWatchlistForm guildId={guild.id} />}>
            {lists.length === 0 ? (
              <p className="text-sm text-fg-muted">Any member can start one.</p>
            ) : (
              lists.map((l) => (
                <div key={l.id} className="mb-3 last:mb-0">
                  <p className="text-xs font-medium text-fg-subtle">{l.name}</p>
                  <p className="mt-1 text-sm text-fg-muted">{l.items.length ? l.items.map((i) => i.instrument.symbol).join(" · ") : "Empty. Add securities from their page."}</p>
                </div>
              ))
            )}
          </Panel>
        </aside>
      </div>
    </>
  );
}
