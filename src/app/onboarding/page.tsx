import { redirect } from "next/navigation";
import { PortleMark } from "@/components/brand/logo";
import { INTERESTS } from "@/server/services/profile";
import { getProfileFor, requireUser } from "@/server/session";
import { OnboardingForm } from "./onboarding-form";

export const metadata = { title: "Set up your archive" };

export default async function OnboardingPage() {
  const user = await requireUser();
  const profile = await getProfileFor(user.id);
  if (profile?.onboardedAt) redirect("/home");
  return (
    <div className="mx-auto max-w-[640px] px-4 py-10 sm:py-16">
      <PortleMark className="mb-6 size-9" />
      <h1 className="text-[1.75rem] font-semibold tracking-[-0.025em] text-fg">Set up your archive</h1>
      <p className="mt-2 text-fg-muted">Three short choices. Everything here can be changed later.</p>
      <div className="glass-1 mt-8 rounded-[var(--radius-xl)] p-6 sm:p-8">
        <OnboardingForm name={user.name} interests={INTERESTS} />
      </div>
    </div>
  );
}
