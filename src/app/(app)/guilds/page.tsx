import Link from "next/link";
import { Lock, Search, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { PageHeader, Panel } from "@/components/ui/panel";
import { EmptyState } from "@/components/ui/states";
import { discoverGuilds, myGuilds } from "@/server/services/guilds";
import { requireViewer } from "@/server/viewer-session";
import { CreateGuildDialog, GuildOpButton } from "./guild-client";

export const metadata = { title: "Guilds" };
const POLICY = { open: "Open", request: "Request to join", invite: "Invite only" } as const;

export default async function GuildsPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q = "" } = await searchParams;
  const { user, viewer } = await requireViewer();
  const [mine, discover] = await Promise.all([myGuilds(user.id), discoverGuilds(viewer, q)]);
  const others = discover.filter((g) => !g.isMember);

  return (
    <>
      <PageHeader title="Guilds" description="Small, focused groups around an investing interest. Joining a Guild never shares your portfolio." actions={<CreateGuildDialog />} />
      <div className="grid gap-5 lg:grid-cols-[320px_1fr]">
        <Panel title="Your Guilds" className="h-fit">
          {mine.length === 0 ? (
            <p className="text-sm text-fg-muted">You haven&apos;t joined a Guild yet.</p>
          ) : (
            <ul className="space-y-1">
              {mine.map(({ guild, role }) => (
                <li key={guild.id}>
                  <Link href={`/guilds/${guild.slug}`} className="flex items-center justify-between gap-2 rounded-[var(--radius-md)] px-2 py-2 text-sm hover:bg-field">
                    <span className="flex min-w-0 items-center gap-2">
                      {guild.visibility === "private" ? <Lock className="size-3.5 shrink-0 text-fg-subtle" aria-label="Private" /> : null}
                      <span className="truncate font-medium text-fg">{guild.name}</span>
                    </span>
                    {role !== "member" ? <Badge className="h-5 capitalize">{role}</Badge> : null}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel
          title="Discover"
          actions={
            <form role="search" className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-fg-subtle" aria-hidden />
              <input name="q" defaultValue={q} placeholder="Name or topic" aria-label="Search Guilds" className="h-9 w-52 rounded-[var(--radius-md)] border border-line bg-field pr-3 pl-8 text-sm text-fg placeholder:text-fg-subtle focus:border-accent focus:outline-none" />
            </form>
          }
        >
          {others.length === 0 ? (
            <EmptyState icon={Users} title={q ? "No Guilds match" : "No other Guilds yet"} action={<CreateGuildDialog />}>
              {q ? "Try a broader topic, or start the Guild you were looking for." : "Be the first to found one around what you care about."}
            </EmptyState>
          ) : (
            <ul className="grid gap-x-10 md:grid-cols-2">
              {others.map(({ guild, members }) => (
                <li key={guild.id} className="flex flex-col border-t border-line py-4">
                  <Link href={`/guilds/${guild.slug}`} className="font-semibold text-fg hover:underline">
                    {guild.name}
                  </Link>
                  {guild.topic ? <p className="text-xs text-accent">{guild.topic}</p> : null}
                  {guild.description ? <p className="mt-2 line-clamp-2 text-sm text-fg-muted">{guild.description}</p> : null}
                  <div className="mt-auto flex items-center justify-between gap-2 pt-3">
                    <span className="text-xs text-fg-subtle">
                      {members} member{members === 1 ? "" : "s"} · {POLICY[guild.joinPolicy]}
                    </span>
                    {guild.joinPolicy !== "invite" ? <GuildOpButton input={{ op: "join", guildId: guild.id }} label={guild.joinPolicy === "open" ? "Join" : "Ask to join"} /> : null}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </>
  );
}
