import Link from "next/link";
import { MessagesSquare, Search, UserRoundSearch } from "lucide-react";
import { PostCard } from "@/components/social/post-card";
import { Avatar } from "@/components/ui/avatar";
import { PageHeader, Panel } from "@/components/ui/panel";
import { EmptyState } from "@/components/ui/states";
import { LinkTabs } from "@/components/ui/tabs";
import { myGuilds } from "@/server/services/guilds";
import { searchMembers } from "@/server/services/profile";
import { listFeed, listFriends, type FeedFilter } from "@/server/services/social";
import { listOwnTheses } from "@/server/services/theses";
import { requireViewer } from "@/server/viewer-session";
import { Composer, FriendButton } from "./feed-client";

export const metadata = { title: "Circle" };

export default async function FeedPage({ searchParams }: { searchParams: Promise<{ tab?: string; q?: string; before?: string }> }) {
  const sp = await searchParams;
  const { user, viewer } = await requireViewer();
  const tab = (["all", "friends", "guilds", "mine", "people"].includes(sp.tab ?? "") ? sp.tab : "all") as FeedFilter | "people";
  const [guilds, theses, friends] = await Promise.all([myGuilds(user.id), listOwnTheses(user.id), listFriends(user.id)]);
  const guildNames = new Map(guilds.map((g) => [g.guild.id, g.guild.name]));

  return (
    <>
      <PageHeader title="Circle" description="What your friends and Guilds share: theses, questions and their mix as percentages. Friends first, not price predictions." />
      <LinkTabs
        className="mb-5 w-fit max-w-full"
        label="Feed filter"
        current={tab}
        items={[
          { value: "all", label: "Everything", href: "/feed" },
          { value: "friends", label: "Friends", href: "/feed?tab=friends" },
          { value: "guilds", label: "Guilds", href: "/feed?tab=guilds" },
          { value: "mine", label: "Mine", href: "/feed?tab=mine" },
          { value: "people", label: `People${friends.incoming.length ? ` (${friends.incoming.length})` : ""}`, href: "/feed?tab=people" },
        ]}
      />
      {tab === "people" ? <People q={sp.q ?? ""} viewer={viewer} friends={friends} /> : <Stream tab={tab} before={sp.before} />}
    </>
  );

  async function Stream({ tab, before }: { tab: FeedFilter; before?: string }) {
    const items = await listFeed(viewer, { filter: tab, before, limit: 20 });
    const last = items.at(-1)?.post.createdAt.toISOString();
    return (
      <div className="grid gap-5 lg:grid-cols-[1fr_300px]">
        <div className="min-w-0 space-y-4">
          <Panel>
            <Composer theses={theses.map((t) => ({ id: t.thesis.id, title: t.thesis.title, visibility: t.thesis.visibility }))} guilds={guilds.map((g) => ({ id: g.guild.id, name: g.guild.name }))} />
          </Panel>
          {items.length === 0 ? (
            <Panel>
              <EmptyState icon={MessagesSquare} title={before ? "That's everything" : "Nothing here yet"} action={!before ? <Link href="/feed?tab=people" className="text-sm font-medium text-accent hover:underline">Find people you know</Link> : undefined}>
                {before ? "You've reached the start of the feed." : "Posts from friends and your Guilds appear here, newest first. There's no algorithm deciding what you see."}
              </EmptyState>
            </Panel>
          ) : (
            items.map((it) => <PostCard key={it.post.id} item={it} viewerId={user.id} guildName={it.post.guildId ? guildNames.get(it.post.guildId) : undefined} />)
          )}
          {items.length === 20 && last ? (
            <Link href={`/feed?${new URLSearchParams({ ...(tab !== "all" ? { tab } : {}), before: last })}`} className="block text-center text-sm text-accent hover:underline">
              Older posts
            </Link>
          ) : null}
        </div>
        <aside className="space-y-5">
          <Panel title="Friends" actions={<Link href="/feed?tab=people" className="text-sm text-accent hover:underline">Manage</Link>}>
            {friends.friends.length === 0 ? (
              <p className="text-sm text-fg-muted">No friends yet. Search for people you know by name or handle.</p>
            ) : (
              <ul className="space-y-2">
                {friends.friends.slice(0, 8).map((f) => (
                  <li key={f.userId}>
                    <Link href={`/u/${f.handle}`} className="flex items-center gap-2 text-sm hover:underline">
                      <Avatar name={f.displayName} hue={f.avatarHue} size="xs" /> {f.displayName}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
          <Panel title="House rules">
            <ul className="space-y-1.5 text-sm text-fg-muted">
              <li>Share reasoning and evidence, not tips.</li>
              <li>Disagree with ideas, not people.</li>
              <li>Never post account numbers or balances.</li>
              <li>Report misleading financial claims.</li>
            </ul>
          </Panel>
        </aside>
      </div>
    );
  }
}

async function People({ q, viewer, friends }: { q: string; viewer: Awaited<ReturnType<typeof requireViewer>>["viewer"]; friends: Awaited<ReturnType<typeof listFriends>> }) {
  const results = q ? await searchMembers(viewer, q) : [];
  const status = (id: string) =>
    friends.friends.some((f) => f.userId === id) ? "friends" : friends.outgoing.some((f) => f.userId === id) ? "pending" : friends.incoming.some((f) => f.userId === id) ? "incoming" : "none";
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <Panel title="Find people">
        <form role="search" className="relative mb-4">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-fg-subtle" aria-hidden />
          <input type="hidden" name="tab" value="people" />
          <input
            name="q"
            defaultValue={q}
            minLength={2}
            placeholder="Name or @handle"
            aria-label="Search members"
            className="h-10 w-full rounded-[var(--radius-md)] border border-line bg-field pr-3 pl-9 text-sm text-fg placeholder:text-fg-subtle focus:border-accent focus:outline-none"
          />
        </form>
        {q && results.length === 0 ? <EmptyState icon={UserRoundSearch} title="No members found" className="py-6">People who turned off discoverability only appear to existing friends.</EmptyState> : null}
        <ul className="space-y-3">
          {results.map((r) => (
            <li key={r.userId} className="flex items-center justify-between gap-3">
              <Link href={`/u/${r.handle}`} className="flex min-w-0 items-center gap-3 hover:underline">
                <Avatar name={r.displayName} hue={r.avatarHue} size="sm" />
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium text-fg">{r.displayName}</span>
                  <span className="block text-xs text-fg-subtle">@{r.handle}</span>
                </span>
              </Link>
              {status(r.userId) === "none" ? <FriendButton kind="request" userId={r.userId} /> : <span className="text-xs text-fg-subtle">{status(r.userId) === "friends" ? "Friends" : status(r.userId) === "pending" ? "Requested" : "Wants to connect"}</span>}
            </li>
          ))}
        </ul>
      </Panel>
      <div className="space-y-5">
        <Panel title="Requests for you">
          {friends.incoming.length === 0 ? (
            <p className="text-sm text-fg-muted">No pending requests.</p>
          ) : (
            <ul className="space-y-3">
              {friends.incoming.map((f) => (
                <li key={f.userId} className="flex flex-wrap items-center justify-between gap-2">
                  <Link href={`/u/${f.handle}`} className="flex items-center gap-2 text-sm font-medium text-fg hover:underline">
                    <Avatar name={f.displayName} hue={f.avatarHue} size="sm" /> {f.displayName}
                  </Link>
                  <span className="flex gap-1">
                    <FriendButton kind="accept" userId={f.userId} />
                    <FriendButton kind="decline" userId={f.userId} />
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
        <Panel title={`Friends (${friends.friends.length})`}>
          {friends.friends.length === 0 ? (
            <p className="text-sm text-fg-muted">Friends can see what you share with “Friends”. Nothing else.</p>
          ) : (
            <ul className="space-y-3">
              {friends.friends.map((f) => (
                <li key={f.userId} className="flex items-center justify-between gap-2">
                  <Link href={`/u/${f.handle}`} className="flex items-center gap-2 text-sm text-fg hover:underline">
                    <Avatar name={f.displayName} hue={f.avatarHue} size="sm" /> {f.displayName}
                  </Link>
                  <FriendButton kind="remove" userId={f.userId} name={f.displayName} />
                </li>
              ))}
            </ul>
          )}
          {friends.outgoing.length ? <p className="mt-4 text-xs text-fg-subtle">Waiting on {friends.outgoing.map((f) => f.displayName).join(", ")}.</p> : null}
        </Panel>
      </div>
    </div>
  );
}
