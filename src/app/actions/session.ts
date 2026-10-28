"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/server/auth";

export async function signOutAction() {
  await auth.api.signOut({ headers: await headers() });
  redirect("/sign-in");
}

export async function setThemeAction(theme: "light" | "dark" | "system") {
  const jar = await cookies();
  if (theme === "system") jar.delete("porfael-theme");
  else jar.set("porfael-theme", theme, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax", httpOnly: false });
}
