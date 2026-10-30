import { founderIds } from "@/server/services/access";
import { FounderTag } from "./badge-icon";

/** The Founder tag beside a name on posts and comments, when that member runs this Portle. */
export async function AuthorTag({ userId, size = "sm" }: { userId: string; size?: "sm" | "md" }) {
  return (await founderIds()).has(userId) ? <FounderTag size={size} /> : null;
}
