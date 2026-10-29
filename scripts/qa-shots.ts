/**
 * Visual QA: signs in as a local test account and captures routes at phone
 * and desktop widths. Usage: tsx scripts/qa-shots.ts <outDir> <email> /route ...
 * Dev-only tooling; never point it at a production host.
 */
import { chromium } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { TEST_PASSWORD } from "../e2e/fixtures";

const [outDir, email, ...routes] = process.argv.slice(2);
const base = process.env.QA_BASE ?? "http://localhost:3000";
const theme = process.env.QA_THEME;

async function main() {
  if (!/^http:\/\/(localhost|127\.0\.0\.1)/.test(base)) throw new Error("QA shots only run against localhost.");
  mkdirSync(outDir, { recursive: true });
  const browser = await chromium.launch();
  for (const [label, viewport] of [
    ["desktop", { width: 1440, height: 900 }],
    ["mobile", { width: 390, height: 844 }],
  ] as const) {
    const ctx = await browser.newContext({ viewport, deviceScaleFactor: 1, colorScheme: theme === "light" ? "light" : "dark", reducedMotion: "reduce" });
    if (email !== "-") {
      const res = await ctx.request.post(`${base}/api/auth/sign-in/email`, { data: { email, password: TEST_PASSWORD }, headers: { origin: base } });
      if (!res.ok()) throw new Error(`sign-in failed: ${res.status()} ${await res.text()}`);
    }
    if (theme) await ctx.addCookies([{ name: "portle-theme", value: theme, url: base }]);
    const page = await ctx.newPage();
    for (const route of routes) {
      await page.goto(`${base}${route}`, { waitUntil: "networkidle" });
      await page.waitForTimeout(400);
      const name = `${route.replace(/[^a-z0-9]+/gi, "_").replace(/^_|_$/g, "") || "root"}-${label}${theme ? `-${theme}` : ""}.png`;
      await page.screenshot({ path: `${outDir}/${name}`, fullPage: true });
      console.log(`${outDir}/${name}`);
    }
    await ctx.close();
  }
  await browser.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
