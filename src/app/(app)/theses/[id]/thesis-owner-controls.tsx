"use client";

import { useActionState, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useResetKey, useResultToast } from "@/components/forms/use-result";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/field";
import { addMonths } from "@/domain/review";
import { addNoteAction, deleteThesisAction, setReviewDateAction } from "../actions";

export function PrivateNoteForm({ thesisId }: { thesisId: string }) {
  const [state, action, pending] = useActionState(addNoteAction.bind(null, thesisId), null);
  const router = useRouter();
  const [key, reset] = useResetKey();
  useResultToast(state, {
    onSuccess: () => {
      reset();
      router.refresh();
    },
  });
  return (
    <form action={action} key={key} className="space-y-2">
      <Textarea name="body" required maxLength={4000} aria-label="Private note" placeholder="Only you will ever see this." className="min-h-20" />
      <Button type="submit" size="sm" variant="secondary" loading={pending}>
        Save note
      </Button>
    </form>
  );
}

/** Sets the day to look at the thesis again, without writing a revision. */
export function ReviewDateForm({ thesisId, reviewOn, today }: { thesisId: string; reviewOn: string | null; today: string }) {
  const [state, action, pending] = useActionState(setReviewDateAction.bind(null, thesisId), null);
  const [day, setDay] = useState(reviewOn && reviewOn > today ? reviewOn : "");
  const router = useRouter();
  useResultToast(state, { onSuccess: () => router.refresh() });
  return (
    <form action={action} className="space-y-2.5">
      <label htmlFor="review-on" className="block text-[0.8125rem] font-medium text-fg-muted">
        Revisit on
      </label>
      <div className="flex gap-2">
        <Input
          id="review-on"
          type="date"
          name="reviewOn"
          value={day}
          min={today}
          max="2100-12-31"
          required
          onChange={(e) => setDay(e.target.value)}
          className="min-w-0 flex-1"
        />
        <Button type="submit" size="sm" variant="secondary" loading={pending} className="h-10">
          Save
        </Button>
      </div>
      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Quick picks">
        {(
          [
            [3, "3 months"],
            [6, "6 months"],
            [12, "1 year"],
          ] as const
        ).map(([months, label]) => (
          <Button key={months} type="button" size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => setDay(addMonths(today, months))}>
            +{label}
          </Button>
        ))}
        {reviewOn ? (
          <Button type="submit" name="intent" value="clear" size="sm" variant="ghost" className="h-7 px-2 text-xs" formNoValidate>
            Clear date
          </Button>
        ) : null}
      </div>
    </form>
  );
}

export function DeleteThesisButton({ id, title }: { id: string; title: string }) {
  const [pending, start] = useTransition();
  return (
    <Button
      variant="danger"
      size="sm"
      loading={pending}
      onClick={() => {
        if (!confirm(`Delete “${title}” and all its revisions, notes and comments? This can't be undone. Archiving keeps the history instead.`)) return;
        start(async () => {
          const r = await deleteThesisAction(id);
          if (r && !r.ok) toast.error(r.error);
        });
      }}
    >
      <Trash2 className="size-4" aria-hidden /> Delete
    </Button>
  );
}
