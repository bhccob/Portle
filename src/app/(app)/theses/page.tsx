import Link from "next/link";
import { Plus, ScrollText } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { PageHeader, Panel } from "@/components/ui/panel";
import { EmptyState } from "@/components/ui/states";
import { LinkTabs } from "@/components/ui/tabs";
import { relativeTime } from "@/lib/format";
import { listOwnTheses, listSharedTheses, type ThesisStatus } from "@/server/services/theses";
import { requireViewer } from "@/server/viewer-session";

export const metadata = { title: "Theses" };

export const STATUS_TONE: Record<string, "neutral" | "brand" | "positive" | "negative" | "warning" | "info"> = {
  researching: "neutral",
  active: "brand",
  under_review: "warning",
  validated: "positive",
  invalidated: "negative",
  archived: "neutral",
};
export const STATUS_LABEL: Record<string, string> = {
  researching: "Researching",
  active: "Active",
  under_review: "Under review",
  validated: "Validated",
  invalidated: "Invalidated",
  archived: "Archived",
};
const VIS_LABEL: Record<string, string> = { private: "Only you", friends: "Friends", guild: "Guild", public: "All members" };

export default async function ThesesPage({ searchParams }: { searchParams: Promise<{ view?: string; status?: string }> }) {
  const sp = await searchParams;
  const { user, viewer } = await requireViewer();
  const view = sp.view === "shared" ? "shared" : "mine";
  const status = sp.status && sp.status in STATUS_LABEL ? (sp.status as ThesisStatus) : undefined;
  const rows = view === "mine" ? await listOwnTheses(user.id, { status }) : await listSharedTheses(viewer);

  return (
    <>
      <PageHeader
        title="Theses"
        description="What you believe, why, and what would prove you wrong. Every revision is kept."
        actions={
          <ButtonLink href="/theses/new">
            <Plus className="size-4" aria-hidden /> New thesis
          </ButtonLink>
        }
      />
      <div className="mb-5 flex flex-wrap gap-3">
        <LinkTabs
          label="Whose theses"
          current={view}
          items={[
            { value: "mine", label: "Mine", href: "/theses" },
            { value: "shared", label: "Shared with me", href: "/theses?view=shared" },
          ]}
        />
        {view === "mine" ? (
          <LinkTabs
            label="Filter by status"
            current={status ?? "all"}
            items={[{ value: "all", label: "All", href: "/theses" }, ...Object.entries(STATUS_LABEL).map(([v, l]) => ({ value: v, label: l, href: `/theses?status=${v}` }))]}
          />
        ) : null}
      </div>

      {rows.length === 0 ? (
        <Panel>
          <EmptyState
            icon={ScrollText}
            title={view === "mine" ? (status ? `No ${STATUS_LABEL[status].toLowerCase()} theses` : "Write your first thesis") : "Nothing shared with you yet"}
            action={view === "mine" ? <ButtonLink href="/theses/new">New thesis</ButtonLink> : <ButtonLink href="/feed" variant="secondary">Find friends</ButtonLink>}
          >
            {view === "mine"
              ? "A good thesis names the claim, the strongest argument against it, and the specific evidence that would make you change your mind."
              : "When friends or Guild members share a thesis with you, it appears here."}
          </EmptyState>
        </Panel>
      ) : (
        <ul className="grid gap-3 md:grid-cols-2">
          {rows.map(({ thesis: t, instrument, author }) => (
            <li key={t.id}>
              <Link href={`/theses/${t.id}`} className="glass-1 group block h-full rounded-[var(--radius-xl)] p-5 transition-[border-color,transform] duration-[var(--dur)] hover:-translate-y-0.5 hover:border-line-strong">
                <div className="flex items-start justify-between gap-3">
                  <h2 className="text-[1rem] font-semibold text-fg group-hover:underline">{t.title}</h2>
                  <Badge tone={STATUS_TONE[t.status]}>{STATUS_LABEL[t.status]}</Badge>
                </div>
                {t.summary ? <p className="mt-2 line-clamp-2 text-sm text-fg-muted">{t.summary}</p> : null}
                <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-fg-subtle">
                  {view === "shared" ? (
                    <span className="inline-flex items-center gap-1.5">
                      <Avatar name={author.displayName} hue={author.avatarHue} size="xs" /> {author.displayName}
                    </span>
                  ) : (
                    <span>{VIS_LABEL[t.visibility]}</span>
                  )}
                  {instrument ? <span className="font-medium text-fg-muted">{instrument.symbol}</span> : null}
                  <span>Rev {t.currentRevision}</span>
                  <span>updated {relativeTime(t.updatedAt)}</span>
                  {t.tags.slice(0, 3).map((tag) => (
                    <span key={tag}>#{tag}</span>
                  ))}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
