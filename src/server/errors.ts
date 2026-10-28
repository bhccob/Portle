/** A failure that is safe to show the user verbatim. Anything else is reported generically. */
export class UserFacingError extends Error {
  constructor(
    message: string,
    public readonly code: "not_found" | "forbidden" | "invalid" | "conflict" | "rate_limited" = "invalid",
  ) {
    super(message);
  }
}

export const notFound = (what = "That item") => new UserFacingError(`${what} was not found or is not visible to you.`, "not_found");
export const forbidden = (message = "You do not have permission to do that.") => new UserFacingError(message, "forbidden");

export type ActionResult<T = void> = { ok: true; data: T; message?: string } | { ok: false; error: string; fieldErrors?: Record<string, string> };
