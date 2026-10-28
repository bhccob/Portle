"use client";

import { useActionState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useResultToast } from "@/components/forms/use-result";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/field";
import { addNoteAction, deleteThesisAction } from "../actions";

export function PrivateNoteForm({ thesisId }: { thesisId: string }) {
  const [state, action, pending] = useActionState(addNoteAction.bind(null, thesisId), null);
  const router = useRouter();
  useResultToast(state, { onSuccess: () => router.refresh() });
  return (
    <form action={action} key={state?.ok ? String(Math.random()) : "note"} className="space-y-2">
      <Textarea name="body" required maxLength={4000} aria-label="Private note" placeholder="Only you will ever see this." className="min-h-20" />
      <Button type="submit" size="sm" variant="secondary" loading={pending}>
        Save note
      </Button>
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
