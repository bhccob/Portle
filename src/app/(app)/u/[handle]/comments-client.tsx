"use client";

import { useActionState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { MoreHorizontal, Send, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useResetKey, useResultToast } from "@/components/forms/use-result";
import { Button } from "@/components/ui/button";
import { Menu, MenuItem } from "@/components/ui/overlay";
import { COMMENT_MAX } from "@/domain/profile-layout";
import { addProfileCommentAction, deleteProfileCommentAction } from "./actions";

/** The box at the top of a profile's comments, with Post tucked into its corner. */
export function ProfileCommentForm({ profileUserId, placeholder }: { profileUserId: string; placeholder: string }) {
  const [state, action, pending] = useActionState(addProfileCommentAction.bind(null, profileUserId), null);
  const router = useRouter();
  const [key, reset] = useResetKey();
  useResultToast(state, {
    onSuccess: () => {
      reset();
      router.refresh();
    },
  });
  return (
    <form
      action={action}
      key={key}
      className="flex min-w-0 flex-1 flex-col rounded-[18px] bg-field shadow-[inset_0_0_0_1px_var(--line)] focus-within:shadow-[inset_0_0_0_1.5px_var(--focus)]"
    >
      <textarea
        name="body"
        required
        maxLength={COMMENT_MAX}
        rows={2}
        placeholder={placeholder}
        aria-label="Write a comment"
        className="min-h-[3.25rem] w-full resize-none bg-transparent px-4 pt-3 text-[0.9375rem] text-fg outline-none placeholder:text-fg-subtle"
      />
      <Button type="submit" size="sm" loading={pending} className="mr-2 mb-2 self-end">
        <Send className="size-3.5" aria-hidden /> Post
      </Button>
    </form>
  );
}

/** "…" on a comment you wrote, or on any comment on your own profile. */
export function CommentMenu({ id }: { id: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <Menu
      trigger={
        <button
          type="button"
          aria-label="Comment options"
          disabled={pending}
          className="grid size-8 shrink-0 place-items-center rounded-full text-fg-subtle hover:bg-field hover:text-fg"
        >
          <MoreHorizontal className="size-4" aria-hidden />
        </button>
      }
    >
      <MenuItem
        destructive
        onSelect={() =>
          start(async () => {
            const r = await deleteProfileCommentAction(id);
            if (r.ok) {
              toast.success("Comment deleted.");
              router.refresh();
            } else toast.error(r.error);
          })
        }
      >
        <Trash2 className="size-4" aria-hidden /> Delete comment
      </MenuItem>
    </Menu>
  );
}
