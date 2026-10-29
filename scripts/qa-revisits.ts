/**
 * Local QA for thesis revisits: makes one of ada's theses due today, then
 * screenshots the form, the thesis page, Home and Notifications. Dev only.
 * Usage: tsx scripts/qa-revisits.ts <out-dir>
 */
import "./local-db-env";
import { chromium } from "@playwright/test";
import { and, eq, sql } from "drizzle-orm";
import { TEST_PASSWORD } from "../e2e/fixtures";
import { getDb } from "../src/server/db";
import { profiles, theses } from "../src/server/db/schema";

const out = process.argv[2] ?? ".";
const base = process.env.QA_BASE ?? "http://localhost:3000";

(async () => {
  const db = getDb();
  const [ada] = await db.select().from(profiles).where(eq(profiles.handle, "ada"));
  if (!ada) throw new Error("Run pnpm db:seed-dev first.");
  const [t] = await db.select().from(theses).where(eq(theses.userId, ada.userId)).limit(1);
  if (!t) throw new Error("ada has no thesis.");
  await db
    .update(theses)
    .set({ status: "active", reviewOn: sql`current_date`, reviewRemindedOn: null })
    .where(and(eq(theses.id, t.id)));

  const browser = await chromium.launch({ args: ["--disable-lcd-text"] });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, colorScheme: "dark", reducedMotion: "reduce" });
  await page.goto(`${base}/sign-in`);
  await page.getByLabel("Email", { exact: true }).fill("ada@example.test");
  await page.getByLabel("Password", { exact: true }).fill(TEST_PASSWORD);
  await page.getByRole("button", { name: /sign in/i }).click();
  await page.waitForURL(/\/home/);
  await page.reload({ waitUntil: "networkidle" });
  await page.screenshot({ path: `${out}/rv-home.png` });
  await page.goto(`${base}/theses/${t.id}`, { waitUntil: "networkidle" });
  await page.screenshot({ path: `${out}/rv-thesis.png` });
  await page.goto(`${base}/notifications`, { waitUntil: "networkidle" });
  await page.screenshot({ path: `${out}/rv-notifications.png` });
  await page.goto(`${base}/theses/new`, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "In 6 months" }).click();
  await page.getByRole("heading", { name: "When to look again" }).scrollIntoViewIfNeeded();
  await page.screenshot({ path: `${out}/rv-form.png` });
  await browser.close();
  process.exit(0);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
