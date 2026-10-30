import { cookies } from "next/headers";
import { HideNumbersButton } from "./hide-numbers";

/** The "Hide" / "Show" button that sits on a page's total. It reads this device's choice, so the first paint is already right. */
export async function HideTotalButton({ className }: { className?: string }) {
  const hidden = (await cookies()).get("portle-hide-amounts")?.value === "1";
  return <HideNumbersButton pill initial={hidden} className={className} />;
}
