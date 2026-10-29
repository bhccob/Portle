import { expect, test } from "@playwright/test";

test.describe("landing page", () => {
  test("the hero form carries the email into sign-up", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Know why you own what you own.");

    const hero = page.locator("form").first();
    await hero.getByLabel("Email address").fill("new-visitor@example.test");
    await hero.getByRole("button", { name: "Start your archive" }).click();

    await expect(page).toHaveURL(/\/sign-up\?email=new-visitor%40example\.test$/);
    await expect(page.getByLabel("Email", { exact: true })).toHaveValue("new-visitor@example.test");
  });

  test("navigation jumps to each part of the page, and sample data is labelled", async ({ page }) => {
    await page.goto("/");
    for (const [link, heading] of [
      ["Portfolio", "Add your accounts"],
      ["Theses", "Write down why"],
      ["Paper Lab", "Practise without the pressure."],
      ["Guilds", "Share ideas, not your balance."],
    ] as const) {
      await page.getByRole("navigation", { name: "Product" }).getByRole("link", { name: link }).click();
      await expect(page.getByRole("heading", { name: heading })).toBeInViewport();
    }

    await expect(page.getByRole("article", { name: "Sample portfolio" })).toContainText("Sample");
    await expect(page.getByRole("article", { name: "Sample comment from a friend" })).toContainText("Bob:");
  });

  test("the FAQ answers open and close", async ({ page }) => {
    await page.goto("/");
    const question = page.getByText("Do I need to connect my broker?");
    const answer = page.getByText("Porfael never asks for your broker password.");
    await expect(answer).toBeHidden();
    await question.click();
    await expect(answer).toBeVisible();
  });
});
