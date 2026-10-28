import { desc } from "drizzle-orm";
import { notFound } from "next/navigation";
import { getDb } from "@/server/db";
import { emailOutbox } from "@/server/db/schema";
import { formatDate } from "@/lib/format";

export const metadata = { title: "Development mailbox" };

/** Local-only view of outgoing mail. Returns 404 in production. */
export default async function DevMailbox() {
  if (process.env.NODE_ENV === "production") notFound();
  const mails = await getDb().select().from(emailOutbox).orderBy(desc(emailOutbox.createdAt)).limit(30);
  const linkify = (text: string) =>
    text.split(/(https?:\/\/\S+)/g).map((part, i) =>
      part.startsWith("http") ? (
        <a key={i} href={part} className="break-all text-accent underline">
          {part}
        </a>
      ) : (
        part
      ),
    );
  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="text-2xl font-semibold text-fg">Development mailbox</h1>
      <p className="mt-1 text-sm text-fg-muted">Set RESEND_API_KEY to send real email. This page does not exist in production.</p>
      <ul className="mt-6 space-y-3">
        {mails.length === 0 ? <li className="text-sm text-fg-subtle">No messages yet.</li> : null}
        {mails.map((m) => (
          <li key={m.id} className="glass-1 rounded-[var(--radius-lg)] p-4">
            <p className="text-xs text-fg-subtle">
              To {m.to} · {formatDate(m.createdAt, { withTime: true })}
            </p>
            <p className="mt-1 font-medium text-fg">{m.subject}</p>
            <p className="mt-2 text-sm whitespace-pre-wrap text-fg-muted">{linkify(m.text)}</p>
          </li>
        ))}
      </ul>
    </main>
  );
}
