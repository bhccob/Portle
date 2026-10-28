import { Panel } from "@/components/ui/panel";
import { INTERESTS } from "@/server/services/profile";
import { requireMember } from "@/server/session";
import { ProfileForm } from "./settings-forms";

export const metadata = { title: "Profile settings" };

export default async function ProfileSettingsPage() {
  const { profile } = await requireMember();
  return (
    <Panel title="Profile" description="How you appear to members you share with.">
      <ProfileForm interests={INTERESTS} profile={{ displayName: profile.displayName, bio: profile.bio, interests: profile.interests, avatarHue: profile.avatarHue, handle: profile.handle }} />
    </Panel>
  );
}
