import { PageHeader } from "@/components/ui/panel";
import { SettingsNav } from "./settings-nav";

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <PageHeader title="Settings" description="Your profile, what others can see, your data, and connections." />
      <div className="grid gap-5 lg:grid-cols-[220px_1fr]">
        <SettingsNav />
        <div className="min-w-0">{children}</div>
      </div>
    </>
  );
}
