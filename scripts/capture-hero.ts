/**
 * Captures the landing page for the impeccable build gates (signed out, motion
 * settled). Usage: tsx scripts/capture-hero.ts <out.png> <width> <height> [--full]
 */
import { chromium } from "@playwright/test";

const [out, w = "2688", h = "1520", full] = process.argv.slice(2);
const base = process.env.QA_BASE ?? "http://localhost:3000";

(async () => {
  // Grayscale text antialiasing, as in the comp; LCD subpixel fringes are a
  // platform rendering artefact, not part of the design being compared.
  const browser = await chromium.launch({ args: ["--disable-lcd-text"] });
  const page = await browser.newPage({ viewport: { width: Number(w), height: Number(h) }, deviceScaleFactor: 1, reducedMotion: "reduce", colorScheme: "dark" });
  await page.goto(`${base}/`, { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);
  if (full === "--full") {
    // Walk the page once so lazy images below the fold load before the shot.
    await page.evaluate(async () => {
      for (let y = 0; y < document.body.scrollHeight; y += window.innerHeight / 2) {
        window.scrollTo(0, y);
        await new Promise((r) => setTimeout(r, 60));
      }
      window.scrollTo(0, 0);
      await Promise.all([...document.images].map((img) => (img.complete ? null : new Promise((r) => (img.onload = img.onerror = r)))));
    });
  }
  await page.waitForTimeout(600);
  await page.screenshot({ path: out, fullPage: full === "--full" });
  await browser.close();
  console.log(out);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
