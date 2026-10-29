/**
 * Side-effect module: import it FIRST in dev scripts. Points DATABASE_URL at the
 * Postgres that `pnpm dev` runs, before any module creates a database client,
 * and refuses to continue against anything that is not local.
 */
process.env.DATABASE_URL ??= `postgres://porfael:porfael-local-dev@localhost:${process.env.PORTLE_DEV_PG_PORT ?? process.env.PORFAEL_DEV_PG_PORT ?? 54329}/porfael`;

if (!/@(localhost|127\.0\.0\.1)[:/]/.test(process.env.DATABASE_URL)) {
  console.error("Refusing to run a development script against a non-local database.");
  process.exit(1);
}

export {};
