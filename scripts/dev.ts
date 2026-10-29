/**
 * Local development entry point (`pnpm dev`).
 *
 * Without DATABASE_URL it runs a real PostgreSQL server from the
 * embedded-postgres package, bound to localhost, with data in .data/postgres.
 * (An in-process PGlite loses recent writes whenever Next.js restarts its dev
 * server, so it is reserved for tests.) Then it migrates, seeds reference data
 * and starts `next dev`.
 */
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import EmbeddedPostgres from "embedded-postgres";
import postgres from "postgres";
import { setupDatabase } from "./db-setup";

// The local database keeps its pre-rename "porfael" name and user so existing dev data stays put.
const PORT = Number(process.env.PORTLE_DEV_PG_PORT ?? process.env.PORFAEL_DEV_PG_PORT ?? 54329);
// Loopback-only development database; not a secret and never used outside this machine.
const LOCAL_URL = `postgres://porfael:porfael-local-dev@localhost:${PORT}/porfael`;

async function reachable(url: string) {
  const sql = postgres(url, { max: 1, connect_timeout: 2, onnotice: () => {} });
  try {
    await sql`select 1`;
    return true;
  } catch {
    return false;
  } finally {
    await sql.end({ timeout: 1 });
  }
}

async function main() {
  let pg: EmbeddedPostgres | null = null;
  if (!process.env.DATABASE_URL) {
    if (await reachable(LOCAL_URL)) {
      console.log(`Reusing local Postgres on port ${PORT}.`);
    } else {
      // Postgres's log stays quiet; its last lines are shown only if start-up fails,
      // because embedded-postgres rejects without a reason (e.g. when the port is taken).
      const pgLog: string[] = [];
      pg = new EmbeddedPostgres({
        databaseDir: ".data/postgres",
        port: PORT,
        user: "porfael",
        password: "porfael-local-dev",
        persistent: true,
        postgresFlags: ["-c", "listen_addresses=localhost"],
        onLog: (m) => {
          if (pgLog.push(String(m).trim()) > 20) pgLog.shift();
        },
        onError: (e) => console.error("[postgres]", e instanceof Error ? e.message : String(e).trim()),
      });
      if (!existsSync(".data/postgres/PG_VERSION")) {
        console.log("Initialising local Postgres in .data/postgres (first run only)…");
        await pg.initialise();
      }
      await pg.start().catch(() => {
        throw new Error(
          `Local Postgres did not start on port ${PORT}. If another Postgres holds the port, stop it or set PORTLE_DEV_PG_PORT.\n` + pgLog.slice(-6).join("\n"),
        );
      });
      await pg.createDatabase("porfael").catch(() => {
        /* already exists */
      });
      console.log(`Local Postgres running on localhost:${PORT}.`);
    }
    process.env.DATABASE_URL = LOCAL_URL;
  }

  await setupDatabase();

  const next = spawn(process.platform === "win32" ? "next.cmd" : "next", ["dev", ...process.argv.slice(2)], {
    stdio: "inherit",
    env: process.env,
    shell: process.platform === "win32",
  });

  let stopping = false;
  const stop = async (code = 0) => {
    if (stopping) return;
    stopping = true;
    next.kill();
    if (pg) await pg.stop().catch(() => {});
    process.exit(code);
  };
  next.on("exit", (code) => void stop(code ?? 0));
  for (const sig of ["SIGINT", "SIGTERM", "SIGHUP"] as const) process.on(sig, () => void stop(0));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
