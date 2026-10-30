import { redirect } from "next/navigation";

/** Relics became Badges; old links and notifications still land in the right place. */
export default function RelicsPage() {
  redirect("/badges");
}
