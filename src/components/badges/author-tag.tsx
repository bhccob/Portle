import { founderIds } from "@/server/services/access";
import { OWNER_ROLES, RoleTag } from "./badge-icon";

/**
 * The owner's titles beside their name. Profiles show all of them; posts and comments
 * show only Founder, so a busy feed stays calm.
 */
export async function AuthorTag({ userId, size = "sm", all = false }: { userId: string; size?: "sm" | "md"; all?: boolean }) {
  if (!(await founderIds()).has(userId)) return null;
  return all ? (
    <>
      {OWNER_ROLES.map((role) => (
        <RoleTag key={role} role={role} size={size} />
      ))}
    </>
  ) : (
    <RoleTag role="Founder" size={size} />
  );
}
