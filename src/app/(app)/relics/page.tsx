import { redirect } from "next/navigation";
import { requireMember } from "@/server/session";

/** Relics live on your profile now; old links and notifications land there. */
export default async function RelicsPage() {
  const { profile } = await requireMember();
  redirect(`/u/${profile.handle}`);
}
