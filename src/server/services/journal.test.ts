import { beforeAll, describe, expect, it } from "vitest";
import { createTestDb, createTestUser } from "@/test/db";
import type { Db } from "../db";
import { createEntry, titleFromBody, updateEntry } from "./journal";
import { createThesis } from "./theses";

let db: Db;
const today = new Date().toISOString().slice(0, 10);

beforeAll(async () => {
  db = await createTestDb();
});

describe("journal entries without a title", () => {
  it("take their title from the first line of what was written", async () => {
    const u = await createTestUser(db, "Writer");
    const e = await createEntry(u.id, { entryDate: today, title: "", body: "Mostly rate news this week.\n\nI keep checking my tech ETF." });
    expect(e.title).toBe("Mostly rate news this week.");
  });

  it("keep a title the member typed", async () => {
    const u = await createTestUser(db, "Titled");
    const e = await createEntry(u.id, { entryDate: today, title: "Rates", body: "Mostly rate news." });
    expect(e.title).toBe("Rates");
    const edited = await updateEntry(u.id, e.id, { entryDate: today, title: "", body: "Calmer today." });
    expect(edited.title).toBe("Calmer today.");
  });

  it("need something written", async () => {
    const u = await createTestUser(db, "Blank");
    await expect(createEntry(u.id, { entryDate: today, title: "", body: "  \n " })).rejects.toThrow(/Write something/);
  });

  it("keep the prompt they answered, apart from the text", async () => {
    const u = await createTestUser(db, "Prompted");
    const e = await createEntry(u.id, { entryDate: today, title: "", body: "Rates.", prompt: "What am I paying attention to this week, and why?" });
    expect(e.prompt).toBe("What am I paying attention to this week, and why?");
    expect(e.body).toBe("Rates.");
  });
});

describe("titleFromBody", () => {
  it("drops markdown marks and blank lines", () => {
    expect(titleFromBody("\n\n## **Sold half** my _ETF_\nmore")).toBe("Sold half my ETF");
    expect(titleFromBody("- a list item first")).toBe("a list item first");
  });

  it("shortens a long first line at a word", () => {
    const t = titleFromBody(`${"word ".repeat(40)}end`);
    expect(t.length).toBeLessThanOrEqual(80);
    expect(t.endsWith("…")).toBe(true);
    expect(t).not.toMatch(/\s…$/);
  });
});

describe("theses", () => {
  it("start as Researching when the form sends no status", async () => {
    const u = await createTestUser(db, "Thinker");
    const t = await createThesis(u.id, { title: "ASML stays the only EUV supplier", rationale: "No one else can build them.", visibility: "private" });
    expect(t.status).toBe("researching");
  });
});
