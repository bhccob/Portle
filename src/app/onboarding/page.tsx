import { redirect } from "next/navigation";
import { SUPPORTED_CURRENCIES } from "@/domain/money";
import { getProfileFor, requireUser } from "@/server/session";
import { OnboardingForm } from "./onboarding-form";

export const metadata = { title: "Set up your archive" };

const currencyName = new Intl.DisplayNames(["en"], { type: "currency" });

export default async function OnboardingPage() {
  const user = await requireUser();
  const profile = await getProfileFor(user.id);
  if (profile?.onboardedAt) redirect("/home");
  // Named on the server so the browser's own currency names can't differ from the first render.
  const currencies = SUPPORTED_CURRENCIES.map((code) => ({ code, name: `${currencyName.of(code)} (${code})` }));
  return <OnboardingForm name={user.name} currencies={currencies} />;
}
