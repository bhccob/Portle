/**
 * Applies migrations and seeds reference data. Idempotent; used by `pnpm dev`,
 * CI and deploys. Uses DATABASE_URL when set, otherwise a PGlite directory.
 */
import { PGlite } from "@electric-sql/pglite";
import { drizzle as drizzlePglite } from "drizzle-orm/pglite";
import { migrate as migratePglite } from "drizzle-orm/pglite/migrator";
import { drizzle as drizzlePg } from "drizzle-orm/postgres-js";
import { migrate as migratePg } from "drizzle-orm/postgres-js/migrator";
import { mkdirSync } from "node:fs";
import { pathToFileURL } from "node:url";
import postgres from "postgres";
import * as schema from "../src/server/db/schema";
import { seedInstruments } from "../src/server/db/seed-instruments";
import type { Db } from "../src/server/db";

export async function setupDatabase() {
  const url = process.env.DATABASE_URL;
  if (url) {
    const client = postgres(url, { max: 1, onnotice: () => {} });
    const db = drizzlePg({ client, schema, casing: "snake_case" });
    await migratePg(db, { migrationsFolder: "./drizzle" });
    await seedInstruments(db as unknown as Db);
    await client.end();
    console.log("Database migrated and seeded.");
    return;
  }
  const dir = process.env.PGLITE_DATA_DIR ?? ".data/pglite";
  mkdirSync(dir, { recursive: true });
  const client = new PGlite(dir);
  const db = drizzlePglite({ client, schema, casing: "snake_case" });
  await migratePglite(db, { migrationsFolder: "./drizzle" });
  await seedInstruments(db as unknown as Db);
  await client.close();
  console.log(`PGlite database ready at ${dir}.`);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  setupDatabase().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
