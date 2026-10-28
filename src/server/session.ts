import "server-only";
import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { auth } from "./auth";
import { getDb } from "./db";
import { profiles } from "./db/schema";

/** Reads and validates the session cookie once per request. */
export const getSession = cache(async () => auth.api.getSession({ headers: await headers() }));

export type CurrentUser = { id: string; name: string; email: string };

export async function requireUser(): Promise<CurrentUser> {
  const s = await getSession();
  if (!s) redirect("/sign-in");
  return { id: s.user.id, name: s.user.name, email: s.user.email };
}

export const getProfileFor = cache(async (userId: string) => {
  const [p] = await getDb().select().from(profiles).where(eq(profiles.userId, userId));
  return p ?? null;
});

/** For app routes: signed in and finished onboarding. */
export async function requireMember() {
  const user = await requireUser();
  const profile = await getProfileFor(user.id);
  if (!profile?.onboardedAt) redirect("/onboarding");
  return { user, profile };
}
