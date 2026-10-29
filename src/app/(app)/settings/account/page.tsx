import { desc, eq } from "drizzle-orm";
import { Download } from "lucide-react";
import { Panel } from "@/components/ui/panel";
import { formatDate } from "@/lib/format";
import { getDb } from "@/server/db";
import { consents, session } from "@/server/db/schema";
import { requireMember } from "@/server/session";
import { DeleteAccountDialog } from "../settings-forms";

export const metadata = { title: "Data & account" };

export default async function AccountPage() {
  const { user } = await requireMember();
  const db = getDb();
  const [sessions, consentRows] = await Promise.all([
    db.select({ id: session.id, createdAt: session.createdAt, userAgent: session.userAgent, expiresAt: session.expiresAt }).from(session).where(eq(session.userId, user.id)).orderBy(desc(session.createdAt)),
    db.select().from(consents).where(eq(consents.userId, user.id)).orderBy(desc(consents.createdAt)),
  ]);
  return (
    <div className="space-y-5">
      <Panel title="Your data" description="Everything Portle stores about you, as a JSON file you can keep or move elsewhere.">
        <a href="/api/export" download className="inline-flex h-10 items-center gap-2 rounded-[var(--radius-md)] bg-primary px-4 text-sm font-medium text-primary-fg hover:bg-primary-hover">
          <Download className="size-4" aria-hidden /> Download my data
        </a>
        <p className="mt-3 text-xs text-fg-subtle">Includes your portfolio ledger, theses with every revision, journal, Paper Lab history, posts and settings. Excludes password hashes and session tokens.</p>
      </Panel>

      <Panel title="Signed-in sessions">
        <ul className="divide-y divide-line text-sm">
          {sessions.map((s) => (
            <li key={s.id} className="flex flex-wrap justify-between gap-2 py-2.5">
              <span className="max-w-[48ch] truncate text-fg-muted">{s.userAgent ?? "Unknown device"}</span>
              <span className="text-xs text-fg-subtle">
                since {formatDate(s.createdAt)} · expires {formatDate(s.expiresAt)}
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-2 text-xs text-fg-subtle">Changing your password signs out every other session.</p>
      </Panel>

      <Panel title="Consents">
        <ul className="space-y-1 text-sm text-fg-muted">
          {consentRows.map((c) => (
            <li key={c.id}>
              {c.kind.replace("_", " ")} · version {c.version} · {c.granted ? "accepted" : "withdrawn"} {formatDate(c.createdAt)}
            </li>
          ))}
        </ul>
      </Panel>

      <Panel title="Delete account" description="Removes your data from Portle. Backups expire on their normal schedule.">
        <DeleteAccountDialog />
      </Panel>
    </div>
  );
}
