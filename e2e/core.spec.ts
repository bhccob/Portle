import { expect, test, type Browser, type Page } from "@playwright/test";
import { TEST_PASSWORD, testUser, watchCsp } from "./fixtures";

/** Reads the newest link for `email` from the development mailbox. */
async function mailLink(page: Page, email: string, contains: string) {
  await page.goto("/dev/mailbox");
  const item = page.locator("li", { hasText: `To ${email}` }).first();
  await expect(item).toBeVisible();
  const href = await item.locator(`a[href*="${contains}"]`).first().getAttribute("href");
  expect(href).toBeTruthy();
  return href!;
}

test.describe.serial("a new member's core journey", () => {
  const me = testUser("Erin");
  let thesisUrl = "";
  let page: Page;
  let cspViolations: string[] = [];

  // One browser session for the whole journey, as a real member would have.
  test.beforeAll(async ({ browser }: { browser: Browser }) => {
    page = await browser.newPage();
    cspViolations = watchCsp(page);
  });
  test.afterAll(async () => {
    await page.close();
  });

  test("registers, verifies email and completes onboarding", async () => {
    await page.goto("/sign-up");
    await page.getByLabel("Your name").fill(me.name);
    await page.getByLabel("Email").fill(me.email);
    await page.getByLabel("Password").fill(me.password);
    await page.getByRole("button", { name: "Create account" }).click();
    await expect(page.getByRole("heading", { name: "Check your inbox" })).toBeVisible();

    await page.goto(await mailLink(page, me.email, "verify-email"));
    await expect(page).toHaveURL(/\/onboarding/);
    // Four short screens: only the handle and the terms need an answer, and no money question.
    await page.getByLabel("Handle").fill(me.handle);
    await expect(page.getByText("Available")).toBeVisible();
    await page.getByRole("button", { name: "Continue" }).click();
    await expect(page.getByRole("heading", { name: "What are you into?" })).toBeVisible();
    await page.getByText("ETFs", { exact: true }).click();
    await page.getByText("Market news", { exact: true }).click();
    await expect(page.getByText("2 picked")).toBeVisible();
    await page.getByRole("button", { name: "Continue" }).click();
    await page.getByLabel("How long have you been investing?").selectOption({ label: "Just starting" });
    await page.getByRole("button", { name: "Continue" }).click();
    await expect(page.getByRole("heading", { name: "Private by default" })).toBeVisible();
    await page.getByRole("checkbox", { name: /I agree/ }).check();
    await page.getByRole("button", { name: "Open my archive" }).click();
    await expect(page).toHaveURL(/\/home/);
    await expect(page.getByRole("heading", { name: /Erin/ })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Start here" })).toBeVisible();
  });

  test("creates an account and records a holding", async () => {
    await page.goto("/portfolio");
    await page.getByLabel("Account name").fill("Test broker");
    await page.getByRole("button", { name: "Add account" }).click();
    await expect(page.getByRole("heading", { name: "Record your first position" })).toBeVisible();

    await page.getByRole("button", { name: "Add transaction" }).first().click();
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("Type").selectOption("buy");
    await dialog.getByRole("combobox", { name: /Security/ }).fill("ASML");
    await dialog.getByRole("option", { name: /ASML/ }).first().click();
    await dialog.getByLabel("Quantity").fill("3");
    await dialog.getByLabel("Price per unit").fill("650");
    await dialog.getByRole("button", { name: "Save transaction" }).click();
    await expect(page.getByRole("rowheader", { name: /ASML/ })).toBeVisible();
    await expect(page.getByText("Demo prices · synthetic")).toBeVisible();
  });

  test("writes a private thesis and tests it in the Paper Lab", async () => {
    await page.goto("/theses/new");
    // Three questions up front; the rest waits behind "Add more detail".
    await page.getByLabel("What do you believe?").fill("Index core stays the default");
    await page.getByLabel(/What would prove you wrong/).fill("Fees on global trackers rise above 0.4% a year.");
    await page.getByRole("button", { name: "6 months" }).click();
    await page.getByRole("button", { name: /Add more detail/ }).click();
    await page.getByRole("button", { name: "Add bear case" }).click();
    await page.getByLabel("Bear case", { exact: true }).fill("Active funds win after fees for a decade.");
    await expect(page.getByRole("radio", { name: "Only me" })).toBeChecked();
    await page.getByRole("button", { name: "Save thesis" }).click();
    await expect(page).toHaveURL(/\/theses\/[0-9a-f-]{36}/);
    thesisUrl = new URL(page.url()).pathname;
    await expect(page.locator("article header").getByText(/Revisit \d/)).toBeVisible();
    await expect(page.getByLabel("Revisit on")).not.toHaveValue("");

    await page.goto("/lab");
    await page.getByRole("combobox", { name: "Security" }).fill("MSFT");
    await page.getByRole("option", { name: /MSFT/ }).first().click();
    await page.getByLabel("Quantity").fill("2");
    await page.getByLabel(/Linked thesis/).selectOption({ label: "Index core stays the default" });
    await page.getByRole("button", { name: "Place simulated buy" }).click();
    await expect(page.getByText("Simulated order filled.")).toBeVisible();
    await expect(page.getByRole("rowheader", { name: /MSFT/ })).toBeVisible();
  });

  test("keeps a journal entry", async () => {
    await page.goto("/journal/new");
    // No title field: the first line becomes the title.
    await page.getByRole("button", { name: "Write without a prompt" }).click();
    await page.getByLabel("Entry").fill("First reflection\n\nI wrote the thesis before looking at the chart.");
    await page.getByRole("button", { name: "Save entry" }).click();
    await expect(page.getByRole("heading", { name: "First reflection" })).toBeVisible();
    await expect(page.getByText("I wrote the thesis before looking at the chart.")).toBeVisible();
    await expect(page.locator("article").getByText("First reflection")).toHaveCount(1);
  });

  test("founds a Guild and posts to friends", async () => {
    await page.goto("/guilds");
    await page.getByRole("button", { name: "New Guild" }).click();
    await page
      .getByRole("dialog")
      .getByLabel("Name")
      .fill(`Erin's circle ${Date.now().toString(36)}`);
    await page.getByRole("dialog").getByRole("button", { name: "Dividends" }).click();
    await page.getByRole("dialog").getByText("Anyone", { exact: true }).click();
    await expect(page.getByRole("dialog").getByRole("radio", { name: "Anyone" })).toBeChecked();
    await page.getByRole("dialog").getByRole("button", { name: "Start Guild" }).click();
    await expect(page.getByText("owner", { exact: true })).toBeVisible();

    await page.goto("/feed");
    await page.getByLabel("Share something").fill("Reading annual reports this week.");
    await page.getByRole("button", { name: "Share" }).click();
    await expect(page.getByText("Reading annual reports this week.")).toBeVisible();
  });

  test("hides private records from other members", async ({ browser }) => {
    const other = await browser.newPage();
    await signIn(other, "cleo@example.test");
    const page = other;
    // The shell streams first, so the status can be 200; what matters is that the
    // response (HTML and RSC payload) never contains the private thesis.
    const raw = await page.request.get(thesisUrl);
    expect(await raw.text()).not.toContain("Index core stays the default");
    await page.goto(thesisUrl);
    await expect(page.getByText("Not found, or not shared with you")).toBeVisible();
    const exported = await page.request.get("/api/export");
    const body = await exported.text();
    expect(body).not.toContain("Index core stays the default");
    await other.close();
  });

  test("blocks anonymous access to app routes and APIs", async ({ page }) => {
    const res = await page.goto("/portfolio");
    await expect(page).toHaveURL(/\/sign-in/);
    expect(res?.ok()).toBeTruthy();
    expect((await page.request.get("/api/export")).status()).toBe(401);
    expect((await page.request.get("/api/instruments?q=a")).status()).toBe(401);
  });

  test("deletes the account", async () => {
    await page.goto("/settings/account");
    await page.getByRole("button", { name: "Delete account…" }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("Your password").fill(TEST_PASSWORD);
    await dialog.getByLabel(/Type/).fill("delete my archive");
    await dialog.getByRole("button", { name: "Permanently delete" }).click();
    await expect(page).toHaveURL(/\/$|\/sign-in/);
    const res = await page.request.post("/api/auth/sign-in/email", { data: { email: me.email, password: TEST_PASSWORD } });
    expect(res.status()).toBe(401);
  });

  test("met no Content Security Policy violations on the way", () => {
    expect(cspViolations).toEqual([]);
  });
});

async function signIn(page: Page, email: string) {
  const res = await page.request.post("/api/auth/sign-in/email", { data: { email, password: TEST_PASSWORD } });
  expect(res.ok()).toBeTruthy();
}
