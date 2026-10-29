import { SearchX } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/states";

/** Inside the app shell, which already provides the <main> landmark. */
export default function AppNotFound() {
  return (
    <div className="mx-auto max-w-lg">
      <EmptyState icon={SearchX} title="Not found, or not shared with you" action={<ButtonLink href="/home">Back to Overview</ButtonLink>}>
        Portle shows the same page whether something doesn&apos;t exist or simply isn&apos;t visible to you, so private items can&apos;t be discovered by guessing links.
      </EmptyState>
    </div>
  );
}
