import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { setDb, type Db } from "@/server/db";
import * as schema from "@/server/db/schema";
import { seedInstruments } from "@/server/db/seed-instruments";

/** A fresh, migrated, in-memory Postgres for one test file. */
export async function createTestDb(): Promise<Db> {
  const client = new PGlite();
  const db = drizzle({ client, schema, casing: "snake_case" }) as unknown as Db;
  await migrate(drizzle({ client, schema, casing: "snake_case" }), { migrationsFolder: "./drizzle" });
  await seedInstruments(db);
  setDb(db);
  return db;
}

let counter = 0;
/** Inserts a bare user row (bypassing auth) for service-level tests. */
export async function createTestUser(db: Db, name = "Test User") {
  counter += 1;
  const id = `user_${counter}_${Math.random().toString(36).slice(2, 8)}`;
  await db.insert(schema.user).values({ id, name, email: `${id}@example.test`, emailVerified: true });
  return { id, name };
}

/** Lets a test member use real prices and broker linking, as if the owner had let them in. */
export async function grantFullAccess(db: Db, userId: string) {
  await db.insert(schema.fullAccess).values({ userId, status: "granted", decidedAt: new Date() }).onConflictDoNothing();
}
