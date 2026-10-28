"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import type { ActionResult } from "@/server/errors";

/**
 * Announces a server action's outcome. Success is only toasted after the
 * server confirmed it; failures show the server's user-facing message.
 * Each result is handled once, even if the component re-renders.
 */
export function useResultToast<T>(state: ActionResult<T> | null, opts: { onSuccess?: (data: T) => void; silentSuccess?: boolean } = {}) {
  const handled = useRef<ActionResult<T> | null>(null);
  const { onSuccess, silentSuccess } = opts;
  useEffect(() => {
    if (!state || state === handled.current) return;
    handled.current = state;
    if (state.ok) {
      if (state.message && !silentSuccess) toast.success(state.message);
      onSuccess?.(state.data);
    } else if (!state.fieldErrors) {
      toast.error(state.error);
    }
  }, [state, onSuccess, silentSuccess]);
}

/** A key that changes after each successful submit, used to reset an uncontrolled form. */
export function useResetKey() {
  const [key, setKey] = useState(0);
  return [key, () => setKey((k) => k + 1)] as const;
}

export function fieldError(state: ActionResult<unknown> | null, name: string) {
  return state && !state.ok ? state.fieldErrors?.[name] : undefined;
}
