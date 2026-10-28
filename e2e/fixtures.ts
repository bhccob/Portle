/** Test-only accounts for local development and end-to-end tests. Never used outside localhost. */
export const TEST_PASSWORD = "archive-test-passphrase-42";

export const testUser = (name: string) => {
  const stamp = Date.now().toString(36);
  return { name, email: `${name.toLowerCase()}.${stamp}@example.test`, handle: `${name.toLowerCase()}_${stamp}`.slice(0, 20), password: TEST_PASSWORD };
};
