import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, BookOpen, ExternalLink, ScrollText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { PageHeader, Panel } from "@/components/ui/panel";
import { formatDate } from "@/lib/format";
import { UserFacingError } from "@/server/errors";
import { getCollection } from "@/server/services/archives";
import { requireViewer } from "@/server/viewer-session";
import { AddLinkForm, DeleteCollectionButton, RemoveItemButton } from "../../archive-client";

export const metadata = { title: "Collection" };

export default async function CollectionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { viewer } = await requireViewer();
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  let c;
  try {
    c = await getCollection(viewer, id);
  } catch (e) {
    if (e instanceof UserFacingError) notFound();
    throw e;
  }
  const href = (it: (typeof c.items)[number]) =>
    it.itemType === "link" ? it.url! : it.itemType === "guide" ? `/archives/guides/${it.itemId}` : it.itemType === "thesis" ? `/theses/${it.itemId}` : it.itemType === "post" ? `/feed/${it.itemId}` : "#";
  return (
    <>
      <Link href="/archives" className="mb-3 inline-flex items-center gap-1.5 text-sm text-fg-muted hover:text-fg">
        <ArrowLeft className="size-4" aria-hidden /> Archives
      </Link>
      <PageHeader
        title={c.collection.title}
        description={c.collection.description || (c.isOwner ? "Add links below, or add guides and theses from their pages." : `Collected by ${c.owner.displayName}`)}
        actions={c.isOwner ? <DeleteCollectionButton id={c.collection.id} /> : <Badge>{c.owner.displayName}</Badge>}
      />
      <div className="space-y-5">
        <Panel bodyClassName="px-0 pb-2">
          {c.items.length === 0 ? (
            <p className="px-5 py-4 text-sm text-fg-muted">This collection is empty.</p>
          ) : (
            <ul>
              {c.items.map((it) => (
                <li key={it.id} className="flex items-start justify-between gap-3 border-t border-line px-5 py-3 first:border-t-0">
                  <div className="flex min-w-0 gap-3">
                    {it.itemType === "link" ? <ExternalLink className="mt-0.5 size-4 shrink-0 text-fg-subtle" aria-hidden /> : it.itemType === "guide" ? <BookOpen className="mt-0.5 size-4 shrink-0 text-accent" aria-hidden /> : <ScrollText className="mt-0.5 size-4 shrink-0 text-accent" aria-hidden />}
                    <div className="min-w-0">
                      <a href={href(it)} target={it.itemType === "link" ? "_blank" : undefined} rel={it.itemType === "link" ? "noopener noreferrer nofollow" : undefined} className="font-medium text-fg hover:underline">
                        {it.title}
                      </a>
                      <p className="text-xs text-fg-subtle">
                        {it.itemType === "link" ? `${it.sourceName || "External source"} · ` : ""}added {formatDate(it.addedAt)}
                      </p>
                      {it.note ? <p className="mt-1 text-sm text-fg-muted">{it.note}</p> : null}
                    </div>
                  </div>
                  {c.isOwner ? <RemoveItemButton id={it.id} label={it.title} /> : null}
                </li>
              ))}
            </ul>
          )}
        </Panel>
        {c.isOwner ? (
          <Panel title="Add a link">
            <AddLinkForm collectionId={c.collection.id} />
          </Panel>
        ) : null}
      </div>
    </>
  );
}
