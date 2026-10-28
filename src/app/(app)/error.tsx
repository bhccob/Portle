"use client";

import { RotateCcw, TriangleAlert } from "lucide-react";
import { Button, ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/states";

export default function AppError({ reset, error }: { reset: () => void; error: Error & { digest?: string } }) {
  return (
    <div className="glass-1 rounded-[var(--radius-xl)]">
      <EmptyState
        icon={TriangleAlert}
        title="This page couldn't load"
        action={
          <>
            <Button onClick={reset}>
              <RotateCcw className="size-4" aria-hidden /> Try again
            </Button>
            <ButtonLink href="/home" variant="secondary">
              Go to Overview
            </ButtonLink>
          </>
        }
      >
        Nothing was changed. If it keeps happening, the reference below helps us find it.
        {error.digest ? <span className="mt-2 block font-mono text-xs text-fg-subtle">Ref {error.digest}</span> : null}
      </EmptyState>
    </div>
  );
}
