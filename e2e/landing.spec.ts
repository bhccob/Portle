import { expect, test } from "@playwright/test";

test.describe("landing page", () => {
  test("the hero form carries the email into sign-up", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Every position, kept with the reason you bought it.");

    const hero = page.locator("form").first();
    await hero.getByLabel("Email address").fill("new-visitor@example.test");
    await hero.getByRole("button", { name: "Open your archive" }).click();

    await expect(page).toHaveURL(/\/sign-up\?email=new-visitor%40example\.test$/);
    await expect(page.getByLabel("Email", { exact: true })).toHaveValue("new-visitor@example.test");
  });

  test("navigation jumps to each section, and sample data is labelled", async ({ page }) => {
    await page.goto("/");
    for (const [link, heading] of [
      ["Portfolio", "All your accounts, kept in one register."],
      ["Theses", "Write down why, before the price tells you how to feel."],
      ["Paper Lab", "Rehearse an idea on a separate ledger."],
      ["Guilds", "Share percentages with people you trust. Never amounts."],
    ] as const) {
      await page.getByRole("navigation", { name: "Product" }).getByRole("link", { name: link }).click();
      await expect(page.getByRole("heading", { level: 2, name: heading })).toBeInViewport();
    }
    await expect(page.getByText("Illustrative figures, not market data")).toBeVisible();
    await expect(page.getByText("A sample written for illustration. Not investment advice.")).toBeVisible();
  });
});
