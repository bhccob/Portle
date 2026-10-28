"use client";

import { useActionState, useOptimistic, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Bookmark, BookmarkCheck, Flag, HelpCircle, Lightbulb, MoreHorizontal, Swords, ThumbsUp } from "lucide-react";
import { toast } from "sonner";
import { bookmarkAction, commentAction, reactAction, reportAction } from "@/app/(app)/theses/actions";
import { useResetKey, useResultToast } from "@/components/forms/use-result";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/field";
import { Menu, MenuItem, MenuLabel } from "@/components/ui/overlay";
import { cn } from "@/lib/cn";

type Target = { type: "post" | "thesis"; id: string };

const KINDS = [
  { kind: "insightful", label: "Insightful", Icon: Lightbulb },
  { kind: "agree", label: "Agree", Icon: ThumbsUp },
  { kind: "challenge", label: "Challenge", Icon: Swords },
  { kind: "question", label: "Question", Icon: HelpCircle },
] as const;

/** Reactions describe the reasoning ("Challenge", "Question"), not popularity. */
export function Reactions({ target, counts, mine }: { target: Target; counts: Record<string, number>; mine: string[] }) {
  const [, start] = useTransition();
  const [state, apply] = useOptimistic({ counts, mine }, (s, kind: string) => {
    const has = s.mine.includes(kind);
    return {
      counts: { ...s.counts, [kind]: (s.counts[kind] ?? 0) + (has ? -1 : 1) },
      mine: has ? s.mine.filter((k) => k !== kind) : [...s.mine, kind],
    };
  });
  const router = useRouter();
  return (
    <div className="flex flex-wrap gap-1.5" role="group" aria-label="Reactions">
      {KINDS.map(({ kind, label, Icon }) => {
        const active = state.mine.includes(kind);
        const n = state.counts[kind] ?? 0;
        return (
          <button
            key={kind}
            type="button"
            aria-pressed={active}
            onClick={() =>
              start(async () => {
                apply(kind);
                const r = await reactAction(target, kind);
                if (!r.ok) toast.error(r.error);
                router.refresh();
              })
            }
            className={cn(
              "inline-flex h-8 items-center gap-1.5 rounded-full border px-2.5 text-xs transition-colors",
              active ? "border-transparent bg-selected text-fg" : "border-line text-fg-muted hover:border-line-strong hover:text-fg",
            )}
          >
            <Icon className={cn("size-3.5", active && "text-accent")} aria-hidden />
            {label}
            {n > 0 ? <span className="num text-fg-subtle">{n}</span> : null}
          </button>
        );
      })}
    </div>
  );
}

export function BookmarkButton({ target, saved }: { target: Target; saved: boolean }) {
  const [pending, start] = useTransition();
  const [on, set] = useOptimistic(saved, (_: boolean, v: boolean) => v);
  return (
    <Button
      variant="ghost"
      size="icon"
      aria-pressed={on}
      aria-label={on ? "Remove from Archives" : "Save to Archives"}
      disabled={pending}
      onClick={() =>
        start(async () => {
          set(!on);
          const r = await bookmarkAction(target);
          if (r.ok) toast.success(r.data ? "Saved to Archives." : "Removed from Archives.");
          else toast.error(r.error);
        })
      }
    >
      {on ? <BookmarkCheck className="size-4 text-accent" /> : <Bookmark className="size-4" />}
    </Button>
  );
}

export function ReportMenu({ target }: { target: Target }) {
  const [, start] = useTransition();
  return (
    <Menu
      trigger={
        <Button variant="ghost" size="icon" aria-label="More actions">
          <MoreHorizontal className="size-4" />
        </Button>
      }
    >
      <MenuLabel>Report this</MenuLabel>
      {(["misleading financial claim", "spam", "harassment", "impersonation", "other"] as const).map((reason) => (
        <MenuItem
          key={reason}
          onSelect={() =>
            start(async () => {
              const r = await reportAction(target, reason);
              if (r.ok) toast.success(r.message);
              else toast.error(r.error);
            })
          }
        >
          <Flag className="size-4" /> {reason[0].toUpperCase() + reason.slice(1)}
        </MenuItem>
      ))}
    </Menu>
  );
}

export function CommentForm({ target, placeholder = "Add to the discussion. Evidence beats opinion." }: { target: Target; placeholder?: string }) {
  const [state, action, pending] = useActionState(commentAction.bind(null, target), null);
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
      className="flex flex-col gap-2 sm:flex-row sm:items-end"
    >
      <Textarea name="body" required maxLength={2000} placeholder={placeholder} aria-label="Write a comment" className="min-h-[44px] flex-1" rows={2} />
      <Button type="submit" loading={pending} className="shrink-0">
        Comment
      </Button>
    </form>
  );
}
