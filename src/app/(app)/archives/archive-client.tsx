"use client";

import { useActionState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { fieldError, useResultToast } from "@/components/forms/use-result";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { Dialog } from "@/components/ui/overlay";
import { addItemAction, createCollectionAction, deleteCollectionAction, removeItemAction } from "./actions";

export function NewCollectionDialog() {
  const [state, action, pending] = useActionState(createCollectionAction, null);
  const router = useRouter();
  useResultToast(state, { onSuccess: () => router.refresh() });
  return (
    <Dialog
      title="New collection"
      description="Group research, links and guides around a theme."
      trigger={
        <Button>
          <Plus className="size-4" aria-hidden /> New collection
        </Button>
      }
    >
      <form action={action} className="space-y-4">
        <Field label="Title" error={fieldError(state, "title")}>
          {(p) => <Input {...p} name="title" required maxLength={80} placeholder="e.g. Semiconductor supply chain" />}
        </Field>
        <Field label="Description" optional>
          {(p) => <Textarea {...p} name="description" maxLength={400} className="min-h-16" />}
        </Field>
        <Field label="Who can see it">
          {(p) => (
            <Select {...p} name="visibility" defaultValue="private">
              <option value="private">Only me</option>
              <option value="friends">Friends</option>
              <option value="public">All members</option>
            </Select>
          )}
        </Field>
        <Button type="submit" loading={pending} className="w-full">
          Create
        </Button>
      </form>
    </Dialog>
  );
}

export function AddLinkForm({ collectionId }: { collectionId: string }) {
  const [state, action, pending] = useActionState(addItemAction.bind(null, collectionId), null);
  const router = useRouter();
  useResultToast(state, { onSuccess: () => router.refresh() });
  return (
    <form action={action} key={state?.ok ? Math.random() : "f"} className="grid gap-3 sm:grid-cols-[1fr_1.3fr_auto] sm:items-end">
      <input type="hidden" name="itemType" value="link" />
      <Field label="Title" error={fieldError(state, "title")}>
        {(p) => <Input {...p} name="title" required maxLength={160} />}
      </Field>
      <Field label="Link" hint="Third-party sources are linked, never copied." error={fieldError(state, "url")}>
        {(p) => <Input {...p} name="url" type="url" required placeholder="https://" pattern="https://.*" />}
      </Field>
      <Button type="submit" loading={pending}>
        Add link
      </Button>
    </form>
  );
}

export function RemoveItemButton({ id, label }: { id: string; label: string }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label={`Remove ${label}`}
      loading={pending}
      onClick={() =>
        start(async () => {
          const r = await removeItemAction(id);
          if (!r.ok) toast.error(r.error);
          router.refresh();
        })
      }
    >
      {pending ? null : <Trash2 className="size-4" />}
    </Button>
  );
}

export function DeleteCollectionButton({ id }: { id: string }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <Button
      variant="danger"
      size="sm"
      loading={pending}
      onClick={() => {
        if (!confirm("Delete this collection? The items it links to are not affected.")) return;
        start(async () => {
          const r = await deleteCollectionAction(id);
          if (r.ok) router.push("/archives");
          else toast.error(r.error);
        });
      }}
    >
      Delete collection
    </Button>
  );
}

export function AddToCollection({ collections, item }: { collections: { id: string; title: string }[]; item: { itemType: "guide" | "thesis"; itemId: string; title: string } }) {
  const [pending, start] = useTransition();
  if (!collections.length) return null;
  return (
    <Select
      aria-label="Add to collection"
      className="h-8 w-auto text-[0.8125rem]"
      disabled={pending}
      value=""
      onChange={(e) => {
        const id = e.target.value;
        if (!id) return;
        const form = new FormData();
        Object.entries(item).forEach(([k, v]) => form.set(k, v));
        start(async () => {
          const r = await addItemAction(id, null, form);
          if (r.ok) toast.success(r.message);
          else toast.error(r.error);
        });
      }}
    >
      <option value="">Add to collection…</option>
      {collections.map((c) => (
        <option key={c.id} value={c.id}>
          {c.title}
        </option>
      ))}
    </Select>
  );
}
