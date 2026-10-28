import "server-only";
import { z } from "zod";
import { UserFacingError, type ActionResult } from "./errors";
import { RateLimitError } from "./rate-limit";

/**
 * Wraps a server action body so every failure becomes a predictable result.
 * Validation and user-facing errors are shown; anything unexpected is logged
 * by name only (never with its payload) and reported generically.
 */
export async function runAction<T>(fn: () => Promise<T>, success?: string): Promise<ActionResult<T>> {
  try {
    const data = await fn();
    return { ok: true, data, message: success };
  } catch (e) {
    if (e && typeof e === "object" && "digest" in e && String((e as { digest: unknown }).digest).startsWith("NEXT_")) throw e;
    if (e instanceof z.ZodError) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of e.issues) fieldErrors[issue.path.join(".") || "form"] ??= issue.message;
      return { ok: false, error: "Some fields need attention.", fieldErrors };
    }
    if (e instanceof UserFacingError || e instanceof RateLimitError) return { ok: false, error: e.message };
    console.error("[action] unexpected failure:", e instanceof Error ? e.name + ": " + e.message.slice(0, 200) : "unknown");
    return { ok: false, error: "Something went wrong on our side. Nothing was changed; please try again." };
  }
}
