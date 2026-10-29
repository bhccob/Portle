import { eq } from "drizzle-orm";
import { beforeAll, describe, expect, it } from "vitest";
import { createTestDb } from "@/test/db";
import type { Db } from "./db";
import { emailOutbox, user } from "./db/schema";

let db: Db;
let auth: typeof import("./auth").auth;

const PASSWORD = "a-long-test-passphrase";
const confirmations = async (to: string) =>
  (await db.select().from(emailOutbox).where(eq(emailOutbox.to, to))).filter((m) => m.subject === "Confirm your email for Portle");

describe("signing up again with a registered email", () => {
  beforeAll(async () => {
    // Without a Resend key, mail lands in the outbox table, which is what these tests read.
    db = await createTestDb();
    ({ auth } = await import("./auth"));
  });

  it("sends a fresh confirmation while the account is still unconfirmed", async () => {
    const email = "waiting@example.test";
    await auth.api.signUpEmail({ body: { name: "Waiting", email, password: PASSWORD } });
    expect(await confirmations(email)).toHaveLength(1);

    await auth.api.signUpEmail({ body: { name: "Waiting", email, password: "a-different-passphrase" } });
    expect(await confirmations(email)).toHaveLength(2);
  });

  it("sends nothing once the account is confirmed", async () => {
    const email = "settled@example.test";
    await auth.api.signUpEmail({ body: { name: "Settled", email, password: PASSWORD } });
    await db.update(user).set({ emailVerified: true }).where(eq(user.email, email));

    await auth.api.signUpEmail({ body: { name: "Settled", email, password: PASSWORD } });
    expect(await confirmations(email)).toHaveLength(1);
  });
});
