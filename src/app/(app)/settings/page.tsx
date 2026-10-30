import Link from "next/link";
import { Eye } from "lucide-react";
import { Panel } from "@/components/ui/panel";
import { BANNER_STYLES, profileSections, type BannerStyle, type CommentAudience, type SectionSetting } from "@/domain/profile-layout";
import { INTERESTS, listExperience } from "@/server/services/profile";
import { listOwnTheses } from "@/server/services/theses";
import { requireMember } from "@/server/session";
import { ExperienceList, ProfileEditor } from "./profile-editor";

export const metadata = { title: "Edit profile" };

/** Your profile page, edited: everything people see on it, in the order you choose. */
export default async function ProfileSettingsPage() {
  const { user, profile } = await requireMember();
  const [theses, experience] = await Promise.all([listOwnTheses(user.id), listExperience(user.id)]);
  return (
    <div className="space-y-8">
      <Panel
        title="Edit profile"
        description="How you appear to members you share with, like a LinkedIn page."
        actions={
          <Link href={`/u/${profile.handle}`} className="inline-flex items-center gap-1.5 text-sm font-medium text-accent hover:underline">
            <Eye className="size-4" aria-hidden /> View profile
          </Link>
        }
      >
        <ProfileEditor
          interests={INTERESTS}
          theses={theses.map((t) => ({ id: t.thesis.id, title: t.thesis.title }))}
          profile={{
            displayName: profile.displayName,
            handle: profile.handle,
            bio: profile.bio,
            interests: profile.interests,
            avatarHue: profile.avatarHue,
            headline: profile.headline,
            location: profile.location,
            bannerStyle: (BANNER_STYLES.includes(profile.bannerStyle as BannerStyle) ? profile.bannerStyle : "dial") as BannerStyle,
            links: profile.links,
            investingSince: profile.investingSince,
            approach: profile.approach,
            horizon: profile.horizon,
            sections: profileSections(profile.sections as SectionSetting[] | null),
            featuredThesisIds: profile.featuredThesisIds,
            commentAudience: profile.commentAudience as CommentAudience,
          }}
        />
      </Panel>
      <Panel title="Experience" description="Work or study, shown on your profile.">
        <ExperienceList entries={experience} />
      </Panel>
    </div>
  );
}
