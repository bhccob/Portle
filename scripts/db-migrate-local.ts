/**
 * Applies pending migrations to the local Postgres that `pnpm dev` runs, without
 * restarting it. Usage: pnpm db:migrate-local
 */
import "./local-db-env";
import { setupDatabase } from "./db-setup";

setupDatabase().catch((e) => {
  console.error(e);
  process.exit(1);
});
