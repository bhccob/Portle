import { afterEach, describe, expect, it, vi } from "vitest";
import { sendMail } from "./mail";

const mail = { to: "member@example.test", subject: "Confirm your email", text: "Link" };

describe("sendMail through Resend", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("names Resend's reason when the message is refused, without any email address", async () => {
    vi.stubEnv("RESEND_API_KEY", "re_test");
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json(
          { statusCode: 403, name: "validation_error", message: "You can only send testing emails to your own email address (owner@example.test)." },
          { status: 403 },
        ),
      ),
    );
    const error = await sendMail(mail).catch((e: Error) => e);
    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).toContain("403 validation_error");
    expect((error as Error).message).toContain("You can only send testing emails to your own email address");
    expect((error as Error).message).not.toMatch(/@example\.test/);
  });

  it("still reports the status when Resend sends no readable body", async () => {
    vi.stubEnv("RESEND_API_KEY", "re_test");
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("bad gateway", { status: 502 })),
    );
    await expect(sendMail(mail)).rejects.toThrow("Mail provider rejected the message (502).");
  });

  it("sends from MAIL_FROM to the member", async () => {
    vi.stubEnv("RESEND_API_KEY", "re_test");
    vi.stubEnv("MAIL_FROM", "Portle <onboarding@resend.dev>");
    const fetch = vi.fn(async () => Response.json({ id: "email_1" }));
    vi.stubGlobal("fetch", fetch);
    await sendMail(mail);
    const body = JSON.parse((fetch.mock.calls[0] as unknown as [string, RequestInit])[1].body as string);
    expect(body).toMatchObject({ from: "Portle <onboarding@resend.dev>", to: ["member@example.test"], subject: "Confirm your email" });
  });
});
