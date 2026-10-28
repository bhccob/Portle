import { PGlite } from "@electric-sql/pglite";
import { drizzle as drizzlePglite } from "drizzle-orm/pglite";
import { drizzle as drizzlePostgres } from "drizzle-orm/postgres-js";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import postgres from "postgres";
import * as schema from "./schema";

export type Db = PgDatabase<PgQueryResultHKT, typeof schema>;
/** A transaction handle has the same query surface as the database. */
export type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];
export type DbOrTx = Db | Tx;

declare global {
  var __porfaelDb: Db | undefined;
}

/**
 * Production and staging connect to Postgres through DATABASE_URL.
 * Without it, an embedded PGlite (real Postgres compiled to WASM) persists to
 * .data/pglite so the app runs locally with zero setup.
 */
export function createDb(): Db {
  const url = process.env.DATABASE_URL;
  if (url) {
    const client = postgres(url, { max: Number(process.env.DATABASE_POOL_MAX ?? 10) });
    return drizzlePostgres({ client, schema, casing: "snake_case" }) as unknown as Db;
  }
  const client = new PGlite(process.env.PGLITE_DATA_DIR ?? ".data/pglite");
  return drizzlePglite({ client, schema, casing: "snake_case" }) as unknown as Db;
}

/** One instance per process, shared across Next.js module graphs via globalThis. */
export function getDb(): Db {
  globalThis.__porfaelDb ??= createDb();
  return globalThis.__porfaelDb;
}

/** Test hook: swap the process-wide database (e.g. for an in-memory PGlite). */
export function setDb(db: Db | undefined) {
  globalThis.__porfaelDb = db;
}

export { schema };
