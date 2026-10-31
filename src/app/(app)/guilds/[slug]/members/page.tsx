import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { PageHeader, Panel } from "@/components/ui/panel";
import { canRemoveMember, guildCan, type GuildRole } from "@/domain/permissions";
import { formatDate } from "@/lib/format";
import { UserFacingError } from "@/server/errors";
import { getGuild, listMembers, listPendingRequests, moderationLog } from "@/server/services/guilds";
import { requireViewer } from "@/server/viewer-session";
import { GuildOpButton, InviteForm } from "../../guild-client";

export const metadata = { title: "Guild members" };

export default async function MembersPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { user, viewer } = await requireViewer();
  let g;
  try {
    g = await getGuild(viewer, slug);
  } catch (e) {
    if (e instanceof UserFacingError) notFound();
    throw e;
  }
  if (!g.role) notFound();
  const role = g.role as GuildRole;
  const [members, requests, log] = await Promise.all([
    listMembers(user.id, g.guild.id),
    listPendingRequests(user.id, g.guild.id),
    guildCan(role, "remove_member") ? moderationLog(user.id, g.guild.id) : Promise.resolve([]),
  ]);

  return (
    <>
      <Link href={`/guilds/${slug}`} className="mb-3 inline-flex items-center gap-1.5 text-sm text-fg-muted hover:text-fg">
        <ArrowLeft className="size-4" aria-hidden /> {g.guild.name}
      </Link>
      <PageHeader title="Members" description="Activity counts cover the last 30 days in this Guild only." />
      <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
        <Panel bodyClassName="px-0 pb-2">
          <ul>
            {members.map((m) => (
              <li key={m.userId} className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-5 py-3 first:border-t-0">
                <Link href={`/u/${m.handle}`} className="flex min-w-0 items-center gap-3 hover:underline">
                  <Avatar name={m.displayName} hue={m.avatarHue} src={m.pictureUrl} size="sm" />
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium text-fg">{m.displayName}</span>
                    <span className="block text-xs text-fg-subtle">
                      joined {formatDate(m.joinedAt)} · {m.posts30d} posts · {m.theses} theses shared
                    </span>
                  </span>
                </Link>
                <span className="flex flex-wrap items-center gap-1.5">
                  <Badge tone={m.role === "member" ? "neutral" : "brand"} className="capitalize">
                    {m.role}
                  </Badge>
                  {role === "owner" && m.userId !== user.id ? (
                    <>
                      <GuildOpButton input={{ op: "role", guildId: g.guild.id, userId: m.userId, role: m.role === "admin" ? "member" : "admin" }} label={m.role === "admin" ? "Make member" : "Make admin"} variant="ghost" />
                      <GuildOpButton input={{ op: "transfer", guildId: g.guild.id, userId: m.userId }} label="Make owner" variant="ghost" confirmText={`Transfer ownership to ${m.displayName}? You'll become an admin.`} />
                    </>
                  ) : null}
                  {m.userId !== user.id && canRemoveMember(role, m.role as GuildRole) ? (
                    <GuildOpButton input={{ op: "remove", guildId: g.guild.id, userId: m.userId }} label="Remove" variant="danger" confirmText={`Remove ${m.displayName} from the Guild?`} />
                  ) : null}
                </span>
              </li>
            ))}
          </ul>
        </Panel>

        <aside className="space-y-5">
          {guildCan(role, "invite") ? (
            <Panel title="Invite">
              <InviteForm guildId={g.guild.id} />
            </Panel>
          ) : null}
          {guildCan(role, "approve_request") ? (
            <Panel title="Requests to join">
              {requests.length === 0 ? (
                <p className="text-sm text-fg-muted">No pending requests.</p>
              ) : (
                <ul className="space-y-3">
                  {requests.map((r) => (
                    <li key={r.invite.id} className="flex flex-wrap items-center justify-between gap-2">
                      <span className="flex items-center gap-2 text-sm text-fg">
                        <Avatar name={r.displayName} hue={r.avatarHue} src={r.pictureUrl} size="xs" /> {r.displayName}
                      </span>
                      <span className="flex gap-1">
                        <GuildOpButton input={{ op: "respond", inviteId: r.invite.id, accept: true }} label="Approve" variant="primary" />
                        <GuildOpButton input={{ op: "respond", inviteId: r.invite.id, accept: false }} label="Decline" variant="ghost" />
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
          ) : null}
          {log.length ? (
            <Panel title="Moderation log">
              <ul className="space-y-1.5 text-xs text-fg-muted">
                {log.slice(0, 20).map((l) => (
                  <li key={l.id}>
                    {formatDate(l.createdAt)} · {l.action.replace(/_/g, " ")}
                    {l.reason ? ` · ${l.reason}` : ""}
                  </li>
                ))}
              </ul>
            </Panel>
          ) : null}
          {role === "owner" ? (
            <Panel title="Danger zone">
              <GuildOpButton input={{ op: "delete", guildId: g.guild.id }} label="Delete Guild" variant="danger" confirmText={`Delete ${g.guild.name} and its discussion for everyone? This can't be undone.`} />
            </Panel>
          ) : null}
        </aside>
      </div>
    </>
  );
}
