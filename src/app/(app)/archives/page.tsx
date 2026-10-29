import Link from "next/link";
import { BookMarked, BookOpen, FolderOpen, Library } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { PageHeader, Panel } from "@/components/ui/panel";
import { EmptyState } from "@/components/ui/states";
import { GUIDES } from "@/content/guides";
import { relativeTime } from "@/lib/format";
import { listBookmarks, listCollections } from "@/server/services/archives";
import { requireViewer } from "@/server/viewer-session";
import { NewCollectionDialog } from "./archive-client";

export const metadata = { title: "Archives" };

export default async function ArchivesPage() {
  const { user, viewer } = await requireViewer();
  const [collections, saved] = await Promise.all([listCollections(user.id), listBookmarks(viewer)]);
  const savedCount = saved.posts.length + saved.theses.length;

  return (
    <>
      <PageHeader title="Archives" description="What you've saved, what you've collected, and guides worth rereading." actions={<NewCollectionDialog />} />

      <section aria-labelledby="guides-title" className="mb-8">
        <h2 id="guides-title" className="mb-3 text-[0.9375rem] font-semibold text-fg">
          Guides
        </h2>
        <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {GUIDES.map((g) => (
            <li key={g.slug}>
              <Link href={`/archives/guides/${g.slug}`} className="glass-1 group flex h-full flex-col rounded-[var(--radius-xl)] p-5 transition-[border-color,transform] duration-[var(--dur)] hover:-translate-y-0.5 hover:border-line-strong">
                <BookOpen className="mb-3 size-5 text-accent" aria-hidden />
                <span className="font-semibold text-fg group-hover:underline">{g.title}</span>
                <span className="mt-1 text-sm text-fg-muted">{g.summary}</span>
                <span className="mt-auto pt-3 text-xs text-fg-subtle">{g.minutes} min read · Portle guide</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <div className="grid gap-5 lg:grid-cols-2">
        <Panel title="Collections" description="Private unless you share them">
          {collections.length === 0 ? (
            <EmptyState icon={FolderOpen} title="No collections yet" className="py-6" action={<NewCollectionDialog />}>
              Gather filings, articles and guides around a research theme.
            </EmptyState>
          ) : (
            <ul className="divide-y divide-line">
              {collections.map(({ collection: c, items }) => (
                <li key={c.id}>
                  <Link href={`/archives/collections/${c.id}`} className="flex items-center justify-between gap-3 py-3 hover:underline">
                    <span className="min-w-0">
                      <span className="block font-medium text-fg">{c.title}</span>
                      <span className="text-xs text-fg-subtle">
                        {items} item{items === 1 ? "" : "s"} · updated {relativeTime(c.updatedAt)}
                      </span>
                    </span>
                    {c.visibility !== "private" ? <Badge tone="info">{c.visibility === "friends" ? "Friends" : "All members"}</Badge> : null}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="Saved" description={`${savedCount} item${savedCount === 1 ? "" : "s"} you bookmarked`}>
          {savedCount === 0 ? (
            <EmptyState icon={BookMarked} title="Nothing saved yet" className="py-6">
              Use the bookmark on any post or thesis to keep it here.
            </EmptyState>
          ) : (
            <ul className="divide-y divide-line">
              {saved.theses.map((t) => (
                <li key={t.thesis.id} className="py-3">
                  <Link href={`/theses/${t.thesis.id}`} className="font-medium text-fg hover:underline">
                    {t.thesis.title}
                  </Link>
                  <p className="text-xs text-fg-subtle">Thesis by {t.author.displayName}</p>
                </li>
              ))}
              {saved.posts.map((p) => (
                <li key={p.post.id} className="py-3">
                  <Link href={`/feed/${p.post.id}`} className="line-clamp-2 text-sm text-fg hover:underline">
                    {p.post.body}
                  </Link>
                  <p className="text-xs text-fg-subtle">Post by {p.author.displayName}</p>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
      <p className="mt-6 flex items-center gap-2 text-xs text-fg-subtle">
        <Library className="size-3.5" aria-hidden /> Saved items are re-checked against their current visibility, so anything since made private disappears from here.
      </p>
    </>
  );
}
