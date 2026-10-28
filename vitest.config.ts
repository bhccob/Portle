import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      // `server-only` throws outside the react-server condition; tests run on the server anyway.
      "server-only": fileURLToPath(new URL("./src/test/empty.ts", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    testTimeout: 30_000,
    hookTimeout: 60_000,
    env: {
      BETTER_AUTH_SECRET: "test-secret-test-secret-test-secret-0000",
      BETTER_AUTH_URL: "http://localhost:3000",
      PORFAEL_ENCRYPTION_KEY: "dGVzdC1rZXktdGVzdC1rZXktdGVzdC1rZXktMDAwMDA=",
      MARKET_DATA_PROVIDER: "demo",
      FX_PROVIDER: "demo",
    },
  },
});
