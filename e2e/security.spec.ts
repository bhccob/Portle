import { expect, test } from "@playwright/test";
import { watchCsp } from "./fixtures";

const nonceOf = (policy: string | undefined) => /'nonce-([^']+)'/.exec(policy ?? "")?.[1];

test.describe("content security policy", () => {
  test("pages send a nonce that every script tag in the HTML carries", async ({ page }) => {
    const res = await page.goto("/");
    const nonce = nonceOf(res?.headers()["content-security-policy"]);
    expect(nonce).toBeTruthy();
    // Scripts that these load later need no nonce: 'strict-dynamic' trusts them.
    const tags = (await res!.text()).match(/<script\b[^>]*>/g) ?? [];
    expect(tags.length).toBeGreaterThan(0);
    expect(tags.filter((tag) => !tag.includes(`nonce="${nonce}"`))).toEqual([]);
  });

  test("each page load gets a fresh nonce", async ({ page }) => {
    const first = nonceOf((await page.goto("/"))?.headers()["content-security-policy"]);
    const second = nonceOf((await page.goto("/sign-in"))?.headers()["content-security-policy"]);
    expect(first).toBeTruthy();
    expect(second).toBeTruthy();
    expect(second).not.toBe(first);
  });

  test("the landing page runs its scripts without violations", async ({ page }) => {
    const violations = watchCsp(page);
    await page.goto("/");
    await page.getByText("Do I need to connect my broker?").click();
    await expect(page.getByText("Portle never asks for your broker password.")).toBeVisible();
    expect(violations).toEqual([]);
  });
});
