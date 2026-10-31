import { cookies } from "next/headers";
import { AppShell } from "@/components/shell/app-shell";
import { pictureAddress } from "@/domain/profile-picture";
import { unreadCount } from "@/server/services/notifications";
import { remindDueReviews } from "@/server/services/theses";
import { requireMember } from "@/server/session";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, profile } = await requireMember();
  // Revisit reminders are created as pages load; a failure here must never block the app.
  await remindDueReviews(user.id).catch((e) => console.error("[revisits] reminder check failed:", e instanceof Error ? e.name : "unknown"));
  const unread = await unreadCount(user.id);
  const hideAmounts = (await cookies()).get("portle-hide-amounts")?.value === "1";
  return (
    <AppShell
      me={{ displayName: profile.displayName, handle: profile.handle, avatarHue: profile.avatarHue, pictureUrl: profile.picture ? pictureAddress(profile.picture) : null }}
      unread={unread}
      hideAmounts={hideAmounts}
    >
      {children}
    </AppShell>
  );
}
