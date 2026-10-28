import { redirect } from "next/navigation";
import { ButtonLink } from "@/components/ui/button";
import { PorfaelWordmark } from "@/components/brand/logo";
import { getSession } from "@/server/session";

// Temporary entry point; the comp-led landing page replaces this.
export default async function Root() {
  if (await getSession()) redirect("/home");
  return (
    <main className="mx-auto flex min-h-dvh max-w-xl flex-col justify-center px-6">
      <PorfaelWordmark className="text-2xl text-fg" />
      <h1 className="mt-8 text-4xl font-semibold tracking-[-0.03em] text-fg">Keep the reasoning behind every position.</h1>
      <p className="mt-4 text-fg-muted">A private archive for your portfolio, your theses, and the friends you trust with them.</p>
      <div className="mt-8 flex gap-3">
        <ButtonLink href="/sign-up" size="lg">
          Open your archive
        </ButtonLink>
        <ButtonLink href="/sign-in" size="lg" variant="secondary">
          Sign in
        </ButtonLink>
      </div>
    </main>
  );
}
