"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/server/auth";

export async function signOutAction() {
  await auth.api.signOut({ headers: await headers() });
  redirect("/sign-in");
}

/** Hide numbers: remembered on this device only, like the theme. */
export async function setHideAmountsAction(hide: boolean) {
  const jar = await cookies();
  if (hide) jar.set("portle-hide-amounts", "1", { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax", httpOnly: false });
  else jar.delete("portle-hide-amounts");
}

export async function setThemeAction(theme: "light" | "dark" | "system") {
  const jar = await cookies();
  jar.delete("porfael-theme");
  if (theme === "system") jar.delete("portle-theme");
  else jar.set("portle-theme", theme, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax", httpOnly: false });
}
