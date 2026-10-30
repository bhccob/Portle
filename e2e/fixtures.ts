import type { Page } from "@playwright/test";

/** Collects the Content Security Policy violations the browser reports on `page` from now on. */
export function watchCsp(page: Page) {
  const violations: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error" && msg.text().includes("Content Security Policy")) violations.push(msg.text());
  });
  return violations;
}

/** Test-only accounts for local development and end-to-end tests. Never used outside localhost. */
export const TEST_PASSWORD = "archive-test-passphrase-42";

export const testUser = (name: string) => {
  const stamp = Date.now().toString(36);
  return { name, email: `${name.toLowerCase()}.${stamp}@example.test`, handle: `${name.toLowerCase()}_${stamp}`.slice(0, 20), password: TEST_PASSWORD };
};

/**
 * Switches Portle Plus on for a test member, straight in the local development database, the way the owner would.
 * Refuses anything but a local database.
 */
export async function switchPlusOn(email: string) {
  const { default: postgres } = await import("postgres");
  const url = process.env.DATABASE_URL ?? `postgres://porfael:porfael-local-dev@localhost:${process.env.PORTLE_DEV_PG_PORT ?? 54329}/porfael`;
  if (!/@(localhost|127\.0\.0\.1)[:/]/.test(url)) throw new Error("Refusing to change a non-local database.");
  const sql = postgres(url, { max: 1, onnotice: () => {} });
  try {
    const [u] = await sql`select id from "user" where lower(email) = ${email.toLowerCase()}`;
    await sql`insert into full_access (user_id, status, note, decided_at) values (${u.id}, 'granted', 'e2e', now()) on conflict (user_id) do update set status = 'granted'`;
  } finally {
    await sql.end();
  }
}
