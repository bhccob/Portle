import { PageHeader } from "@/components/ui/panel";
import { getAccess } from "@/server/services/access";
import { requireMember } from "@/server/session";
import { SettingsNav } from "./settings-nav";

export default async function SettingsLayout({ children }: { children: React.ReactNode }) {
  const { user } = await requireMember();
  const { owner } = await getAccess(user.id);
  return (
    <>
      <PageHeader title="Settings" description="Your profile, what others can see, your data, and connections." />
      <div className="grid gap-5 lg:grid-cols-[220px_1fr]">
        <SettingsNav owner={owner} />
        <div className="min-w-0">{children}</div>
      </div>
    </>
  );
}
