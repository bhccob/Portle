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
