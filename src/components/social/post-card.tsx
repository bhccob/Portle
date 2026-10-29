import Link from "next/link";
import { MessageSquare, ShieldCheck, Users } from "lucide-react";
import { DeletePostButton } from "@/app/(app)/feed/feed-client";
import { AllocationRing } from "@/components/charts/allocation";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { relativeTime } from "@/lib/format";
import type { listFeed } from "@/server/services/social";
import { BookmarkButton, Reactions, ReportMenu } from "./interactions";

type FeedItem = Awaited<ReturnType<typeof listFeed>>[number];
const DIM = { assetClass: "asset class", sector: "sector", region: "region", currency: "currency" } as const;
const AUDIENCE = { friends: "Friends", guild: "Guild", public: "All members", private: "Only you" } as const;

export function PostCard({ item, viewerId, guildName, link = true }: { item: FeedItem; viewerId: string; guildName?: string; link?: boolean }) {
  const { post, author } = item;
  const target = { type: "post" as const, id: post.id };
  return (
    <article className="border-t border-line py-5 first:border-t-0">
      <header className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <Avatar name={author.displayName} hue={author.avatarHue} size="md" />
          <div className="min-w-0">
            <Link href={`/u/${author.handle}`} className="block truncate font-medium text-fg hover:underline">
              {author.displayName}
            </Link>
            <p className="flex flex-wrap items-center gap-1.5 text-xs text-fg-subtle">
              <span>@{author.handle}</span>·<time dateTime={post.createdAt.toISOString()}>{relativeTime(post.createdAt)}</time>·
              <span className="inline-flex items-center gap-1">
                <Users className="size-3" aria-hidden />
                {post.audience === "guild" && guildName ? guildName : AUDIENCE[post.audience as keyof typeof AUDIENCE]}
              </span>
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center">
          <BookmarkButton target={target} saved={item.bookmarked} />
          {author.userId === viewerId ? <DeletePostButton id={post.id} /> : <ReportMenu target={target} />}
        </div>
      </header>
      <p className="mt-3 text-[0.9375rem] whitespace-pre-wrap text-fg">{post.body}</p>

      {item.thesis ? (
        <Link href={`/theses/${item.thesis.id}`} className="group mt-3 block border-l border-line-strong py-0.5 pl-4">
          <span className="text-xs text-fg-subtle">Thesis · {item.thesis.status.replace("_", " ")}</span>
          <span className="mt-1 block font-semibold text-fg group-hover:underline">{item.thesis.title}</span>
          {item.thesis.summary ? <span className="mt-1 line-clamp-2 block text-sm text-fg-muted">{item.thesis.summary}</span> : null}
        </Link>
      ) : post.kind === "thesis" ? (
        <p className="mt-3 rounded-[var(--radius-lg)] border border-dashed border-line px-4 py-3 text-sm text-fg-subtle">The attached thesis is no longer visible to you.</p>
      ) : null}

      {post.insight ? (
        <div className="mt-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <span className="text-sm font-medium text-fg">Allocation by {DIM[post.insight.dimension]}</span>
            {post.insight.verified ? (
              <Badge tone="positive">
                <ShieldCheck className="size-3" aria-hidden /> Broker-verified
              </Badge>
            ) : (
              <Badge>Self-reported</Badge>
            )}
          </div>
          <AllocationRing label={`Shared allocation by ${DIM[post.insight.dimension]}`} slices={post.insight.slices} size={88} className="max-w-sm" />
          <p className="mt-2 text-xs text-fg-subtle">Percentages only, as of {relativeTime(post.insight.asOf)}.</p>
        </div>
      ) : null}

      <footer className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <Reactions target={target} counts={item.reactions} mine={item.myReactions} />
        {link ? (
          <Link href={`/feed/${post.id}`} className="inline-flex items-center gap-1.5 text-sm text-fg-muted hover:text-fg">
            <MessageSquare className="size-4" aria-hidden /> {item.comments ? `${item.comments} comment${item.comments === 1 ? "" : "s"}` : "Discuss"}
          </Link>
        ) : null}
      </footer>
    </article>
  );
}
