import { getDb } from "./db";
import { emailOutbox } from "./db/schema";

type Mail = { to: string; subject: string; text: string };

/**
 * Sends transactional mail through Resend when RESEND_API_KEY is set. Without a
 * provider, mail is written to the development outbox (/dev/mailbox), which is
 * only served when NODE_ENV !== "production". Links and tokens are never logged.
 */
export async function sendMail(mail: Mail) {
  const key = process.env.RESEND_API_KEY;
  if (key) {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: process.env.MAIL_FROM ?? "Portle <no-reply@example.com>",
        to: [mail.to],
        subject: mail.subject,
        text: mail.text,
      }),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) throw new Error(`Mail provider rejected the message (${res.status}${await providerReason(res)}).`);
    return;
  }
  if (process.env.NODE_ENV === "production") {
    console.warn("[mail] RESEND_API_KEY is not set; a transactional email was not delivered.");
  }
  await getDb().insert(emailOutbox).values(mail);
}

/**
 * Resend's own explanation of a refusal (its error name and message), so the log says
 * what to fix: a bad key, a bad sender, a recipient it won't deliver to. Email addresses
 * in its message are blanked; links and tokens never reach this text.
 */
async function providerReason(res: Response) {
  try {
    const body = (await res.json()) as { name?: unknown; message?: unknown };
    const name = typeof body.name === "string" ? ` ${body.name}` : "";
    const message = typeof body.message === "string" ? `: ${body.message.replace(/[^\s<>()@]+@[^\s<>()@]+/g, "[email]").slice(0, 200)}` : "";
    return name + message;
  } catch {
    return "";
  }
}
