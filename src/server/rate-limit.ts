/**
 * Sliding-window limiter for server actions (auth endpoints use Better Auth's
 * database-backed limiter). In-memory, so limits are per server instance; a
 * shared store (e.g. Redis) is required before horizontal scaling.
 */
const hits = new Map<string, number[]>();

export class RateLimitError extends Error {
  constructor(public readonly retryAfterSeconds: number) {
    super(`Too many requests. Try again in ${retryAfterSeconds} seconds.`);
  }
}

export function assertRateLimit(key: string, max: number, windowMs: number, now = Date.now()) {
  const list = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  if (list.length >= max) {
    hits.set(key, list);
    throw new RateLimitError(Math.ceil((windowMs - (now - list[0])) / 1000));
  }
  list.push(now);
  hits.set(key, list);
}

export function resetRateLimits() {
  hits.clear();
}
