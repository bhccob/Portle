import { AppShell } from "@/components/shell/app-shell";
import { unreadCount } from "@/server/services/notifications";
import { requireMember } from "@/server/session";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, profile } = await requireMember();
  const unread = await unreadCount(user.id);
  return (
    <AppShell me={{ displayName: profile.displayName, handle: profile.handle, avatarHue: profile.avatarHue }} unread={unread}>
      {children}
    </AppShell>
  );
}
