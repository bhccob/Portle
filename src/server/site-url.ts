/**
 * The site's public address, used for links in emails and auth checks:
 * BETTER_AUTH_URL when set, otherwise the production address Vercel provides.
 */
export function siteUrl(env: Record<string, string | undefined> = process.env) {
  if (env.BETTER_AUTH_URL) return env.BETTER_AUTH_URL;
  if (env.VERCEL_PROJECT_PRODUCTION_URL) return `https://${env.VERCEL_PROJECT_PRODUCTION_URL}`;
  return undefined;
}
