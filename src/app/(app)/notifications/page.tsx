import Link from "next/link";
import { Bell, CalendarClock, FlaskConical, Gem, MessageSquare, UserPlus, Users } from "lucide-react";
import { revalidatePath } from "next/cache";
import { Button } from "@/components/ui/button";
import { PageHeader, Panel } from "@/components/ui/panel";
import { EmptyState } from "@/components/ui/states";
import { cn } from "@/lib/cn";
import { relativeTime } from "@/lib/format";
import { listNotifications, markAllRead } from "@/server/services/notifications";
import { requireMember } from "@/server/session";

export const metadata = { title: "Notifications" };

const ICON: Record<string, typeof Bell> = {
  friend_request: UserPlus,
  friend_accepted: UserPlus,
  comment: MessageSquare,
  reaction: MessageSquare,
  guild_request: Users,
  guild_invite: Users,
  guild_joined: Users,
  relic: Gem,
  paper_fill: FlaskConical,
  thesis_review: CalendarClock,
};

async function markAll() {
  "use server";
  const { user } = await requireMember();
  await markAllRead(user.id);
  revalidatePath("/", "layout");
}

export default async function NotificationsPage() {
  const { user } = await requireMember();
  const items = await listNotifications(user.id);
  const unread = items.filter((n) => !n.readAt).length;
  return (
    <>
      <PageHeader
        title="Notifications"
        description="Friend requests, replies to your reasoning, Guild activity, Relics, and the revisit dates you set yourself. No engagement nudges."
        actions={
          unread ? (
            <form action={markAll}>
              <Button type="submit" variant="secondary" size="sm">
                Mark all as read
              </Button>
            </form>
          ) : null
        }
      />
      <Panel bodyClassName="px-0 pb-2">
        {items.length === 0 ? (
          <EmptyState icon={Bell} title="You're all caught up">
            When someone comments on your thesis, sends a friend request or a Guild needs you, it shows up here.
          </EmptyState>
        ) : (
          <ul>
            {items.map((n) => {
              const Icon = ICON[n.kind] ?? Bell;
              const body = (
                <>
                  <span
                    className={cn(
                      "grid size-9 shrink-0 place-items-center rounded-full border border-line",
                      n.readAt ? "text-fg-subtle" : "bg-selected text-accent",
                    )}
                  >
                    <Icon className="size-4" aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className={cn("block text-sm", n.readAt ? "text-fg-muted" : "font-medium text-fg")}>{n.title}</span>
                    {n.body ? <span className="line-clamp-1 block text-sm text-fg-subtle">{n.body}</span> : null}
                  </span>
                  <span className="shrink-0 text-xs text-fg-subtle">{relativeTime(n.createdAt)}</span>
                  {!n.readAt ? <span className="sr-only">Unread</span> : null}
                </>
              );
              return (
                <li key={n.id} className="border-t border-line first:border-t-0">
                  {n.href ? (
                    <Link href={n.href} className="flex items-center gap-3 px-5 py-3 hover:bg-field/60">
                      {body}
                    </Link>
                  ) : (
                    <div className="flex items-center gap-3 px-5 py-3">{body}</div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </Panel>
    </>
  );
}
