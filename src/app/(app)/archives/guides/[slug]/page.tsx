import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Markdown } from "@/components/ui/markdown";
import { GUIDE_BY_SLUG } from "@/content/guides";
import { listCollections } from "@/server/services/archives";
import { requireMember } from "@/server/session";
import { AddToCollection } from "../../archive-client";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  return { title: GUIDE_BY_SLUG.get((await params).slug)?.title ?? "Guide" };
}

export default async function GuidePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const guide = GUIDE_BY_SLUG.get(slug);
  if (!guide) notFound();
  const { user } = await requireMember();
  const collections = await listCollections(user.id);
  return (
    <>
      <Link href="/archives" className="mb-3 inline-flex items-center gap-1.5 text-sm text-fg-muted hover:text-fg">
        <ArrowLeft className="size-4" aria-hidden /> Archives
      </Link>
      <article className="glass-1 mx-auto max-w-[760px] rounded-[var(--radius-xl)] p-6 sm:p-10">
        <p className="text-xs text-fg-subtle">Portle guide · {guide.minutes} min read · educational, not financial advice</p>
        <h1 className="mt-2 text-[1.875rem] leading-tight font-semibold tracking-[-0.025em] text-fg">{guide.title}</h1>
        <p className="mt-2 text-[1.0625rem] text-fg-muted">{guide.summary}</p>
        <div className="mt-4">
          <AddToCollection collections={collections.map((c) => ({ id: c.collection.id, title: c.collection.title }))} item={{ itemType: "guide", itemId: guide.slug, title: guide.title }} />
        </div>
        <div className="mt-6 border-t border-line pt-6">
          <Markdown>{guide.body}</Markdown>
        </div>
      </article>
    </>
  );
}
