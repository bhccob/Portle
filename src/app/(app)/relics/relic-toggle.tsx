"use client";

import { useOptimistic, useTransition } from "react";
import { toast } from "sonner";
import { Switch } from "@/components/ui/overlay";
import { setRelicDisplayAction } from "./actions";

export function RelicDisplayToggle({ relicKey, displayed }: { relicKey: string; displayed: boolean }) {
  const [, start] = useTransition();
  const [on, set] = useOptimistic(displayed, (_: boolean, v: boolean) => v);
  return (
    <label className="inline-flex items-center gap-2 text-xs text-fg-muted">
      Show on profile
      <Switch
        checked={on}
        onCheckedChange={(v) =>
          start(async () => {
            set(v);
            const r = await setRelicDisplayAction(relicKey, v);
            if (!r.ok) toast.error(r.error);
          })
        }
      />
    </label>
  );
}
