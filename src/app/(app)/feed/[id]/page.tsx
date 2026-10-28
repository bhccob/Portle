import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { CommentForm } from "@/components/social/interactions";
import { PostCard } from "@/components/social/post-card";
import { Avatar } from "@/components/ui/avatar";
import { Panel } from "@/components/ui/panel";
import { relativeTime } from "@/lib/format";
import { UserFacingError } from "@/server/errors";
import { getPost, listComments } from "@/server/services/social";
import { requireViewer } from "@/server/viewer-session";

export const metadata = { title: "Post" };

export default async function PostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { user, viewer } = await requireViewer();
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  let item;
  try {
    item = await getPost(viewer, id);
  } catch (e) {
    if (e instanceof UserFacingError) notFound();
    throw e;
  }
  const comments = await listComments(viewer, { type: "post", id });
  return (
    <div className="mx-auto max-w-[720px]">
      <Link href="/feed" className="mb-3 inline-flex items-center gap-1.5 text-sm text-fg-muted hover:text-fg">
        <ArrowLeft className="size-4" aria-hidden /> Feed
      </Link>
      <PostCard item={item} viewerId={user.id} link={false} />
      <Panel title="Discussion" className="mt-4">
        <ul className="mb-4 space-y-4">
          {comments.length === 0 ? <li className="text-sm text-fg-subtle">No comments yet.</li> : null}
          {comments.map(({ comment, author }) => (
            <li key={comment.id} className="flex gap-3">
              <Avatar name={author.displayName} hue={author.avatarHue} size="sm" />
              <div className="min-w-0 text-sm">
                <p>
                  <Link href={`/u/${author.handle}`} className="font-medium text-fg hover:underline">
                    {author.displayName}
                  </Link>{" "}
                  <span className="text-xs text-fg-subtle">{relativeTime(comment.createdAt)}</span>
                </p>
                <p className="mt-0.5 whitespace-pre-wrap text-fg-muted">{comment.body}</p>
              </div>
            </li>
          ))}
        </ul>
        <CommentForm target={{ type: "post", id }} />
      </Panel>
    </div>
  );
}
