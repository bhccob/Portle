"use client";

import { useEffect, useRef } from "react";
import { toast } from "sonner";
import type { ActionResult } from "@/server/errors";

/**
 * Announces a server action's outcome. Success is only toasted after the
 * server confirmed it; failures show the server's user-facing message.
 */
export function useResultToast<T>(state: ActionResult<T> | null, opts: { onSuccess?: (data: T) => void; silentSuccess?: boolean } = {}) {
  const last = useRef<ActionResult<T> | null>(null);
  const cb = useRef(opts.onSuccess);
  cb.current = opts.onSuccess;
  useEffect(() => {
    if (!state || state === last.current) return;
    last.current = state;
    if (state.ok) {
      if (state.message && !opts.silentSuccess) toast.success(state.message);
      cb.current?.(state.data);
    } else if (!state.fieldErrors) {
      toast.error(state.error);
    }
  }, [state, opts.silentSuccess]);
}

export function fieldError(state: ActionResult<unknown> | null, name: string) {
  return state && !state.ok ? state.fieldErrors?.[name] : undefined;
}
