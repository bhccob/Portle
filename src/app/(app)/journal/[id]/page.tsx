import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Lock, PenLine } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Markdown } from "@/components/ui/markdown";
import { formatDate } from "@/lib/format";
import { UserFacingError } from "@/server/errors";
import { getEntry, titleFromBody } from "@/server/services/journal";
import { requireViewer } from "@/server/viewer-session";
import { DeleteEntryButton } from "../entry-form";

export const metadata = { title: "Journal entry" };

export default async function EntryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { viewer } = await requireViewer();
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  let row;
  try {
    row = await getEntry(viewer, id);
  } catch (e) {
    if (e instanceof UserFacingError) notFound();
    throw e;
  }
  const { entry, author, thesisTitle, symbol, isOwner } = row;
  // An entry saved without a title is titled by its first line: show that line once, as the heading.
  const lines = entry.body.split("\n");
  const first = lines.findIndex((l) => l.trim());
  const body = first >= 0 && titleFromBody(lines[first]) === entry.title ? lines.slice(first + 1).join("\n") : entry.body;
  // Older entries put the prompt into the text itself; newer ones keep it apart.
  const prompt = entry.prompt && !entry.body.includes(entry.prompt) ? entry.prompt : null;
  return (
    <>
      <Link href={isOwner ? "/journal" : `/u/${author.handle}`} className="mb-3 inline-flex items-center gap-1.5 text-sm text-fg-muted hover:text-fg">
        <ArrowLeft className="size-4" aria-hidden /> {isOwner ? "Journal" : author.displayName}
      </Link>
      <article className="mx-auto max-w-[760px]">
        <header className="mb-6 border-b border-line pb-5">
          <time dateTime={entry.entryDate} className="text-sm text-fg-subtle">
            {formatDate(entry.entryDate)}
          </time>
          {prompt ? <p className="mt-2 font-display text-[0.9375rem] font-semibold text-fg-muted">{prompt}</p> : null}
          <h1 className="mt-1 text-[1.75rem] leading-tight font-semibold tracking-[-0.025em] text-fg">{entry.title}</h1>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {!isOwner ? (
              <span className="inline-flex items-center gap-2 text-sm text-fg-muted">
                <Avatar name={author.displayName} hue={author.avatarHue} size="xs" /> {author.displayName}
              </span>
            ) : null}
            {entry.visibility === "private" ? (
              <Badge>
                <Lock className="size-3" aria-hidden /> Only you
              </Badge>
            ) : (
              <Badge tone="info">Friends can read</Badge>
            )}
            {thesisTitle && entry.thesisId ? (
              <Link href={`/theses/${entry.thesisId}`}>
                <Badge tone="brand">Thesis: {thesisTitle}</Badge>
              </Link>
            ) : null}
            {symbol ? <Badge>{symbol}</Badge> : null}
            {isOwner && entry.paperOrderId ? <Badge tone="warning">Linked paper trade</Badge> : null}
          </div>
        </header>
        {body.trim() ? <Markdown>{body}</Markdown> : entry.body.trim() ? null : <p className="text-fg-subtle">Empty entry.</p>}
        {isOwner ? (
          <footer className="mt-8 flex gap-2 border-t border-line pt-5">
            <ButtonLink href={`/journal/${entry.id}/edit`} size="sm" variant="secondary">
              <PenLine className="size-4" aria-hidden /> Edit
            </ButtonLink>
            <DeleteEntryButton id={entry.id} />
          </footer>
        ) : null}
      </article>
    </>
  );
}
