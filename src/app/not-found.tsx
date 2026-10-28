import { SearchX } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/states";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-[70dvh] max-w-lg items-center px-4">
      <div className="glass-1 w-full rounded-[var(--radius-xl)]">
        <EmptyState icon={SearchX} title="Not found, or not shared with you" action={<ButtonLink href="/home">Back to Overview</ButtonLink>}>
          Porfael shows the same page whether something doesn&apos;t exist or simply isn&apos;t visible to you, so private items can&apos;t be discovered by guessing links.
        </EmptyState>
      </div>
    </main>
  );
}
