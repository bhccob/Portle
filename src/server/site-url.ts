/**
 * The site's public address, used for links in emails and auth checks:
 * BETTER_AUTH_URL when set, otherwise the production address Vercel provides.
 */
export function siteUrl(env: Record<string, string | undefined> = process.env) {
  if (env.BETTER_AUTH_URL) return env.BETTER_AUTH_URL;
  if (env.VERCEL_PROJECT_PRODUCTION_URL) return `https://${env.VERCEL_PROJECT_PRODUCTION_URL}`;
  return undefined;
}

/**
 * This deployment's own other addresses on Vercel (its one-off URL and its branch URL),
 * which auth also accepts requests from. The "Visit" button after a redeploy opens the
 * one-off address, and without this, sign-up there fails with "invalid origin".
 */
export function deploymentOrigins(env: Record<string, string | undefined> = process.env) {
  const hosts = [env.VERCEL_URL, env.VERCEL_BRANCH_URL].filter((h): h is string => !!h);
  return [...new Set(hosts)].map((h) => `https://${h}`);
}
