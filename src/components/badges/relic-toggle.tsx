"use client";

import { useOptimistic, useTransition } from "react";
import { toast } from "sonner";
import { Switch } from "@/components/ui/overlay";
import { setRelicDisplayAction } from "@/app/actions/relics";

export function RelicDisplayToggle({ relicKey, displayed }: { relicKey: string; displayed: boolean }) {
  const [, start] = useTransition();
  const [on, set] = useOptimistic(displayed, (_: boolean, v: boolean) => v);
  return (
    <label className="flex items-center justify-between gap-4 text-sm text-fg">
      Show on my profile
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
