"use client";

import { useActionState, useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { InstrumentPicker, type PickedInstrument } from "@/components/forms/instrument-picker";
import { fieldError } from "@/components/forms/use-result";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { Callout } from "@/components/ui/states";
import { cn } from "@/lib/cn";
import { today } from "@/lib/format";
import { deleteEntryAction, saveEntryAction } from "./actions";

export type EntryDraft = {
  id?: string;
  entryDate: string;
  title: string;
  body: string;
  prompt: string | null;
  visibility: string;
  thesisId: string | null;
  instrument: PickedInstrument | null;
  paperOrderId: string | null;
  tags: string[];
};

export function EntryForm({
  draft,
  prompts,
  theses,
  orders,
}: {
  draft: EntryDraft;
  prompts: readonly string[];
  theses: { id: string; title: string }[];
  orders: { id: string; label: string }[];
}) {
  const [state, action, pending] = useActionState(saveEntryAction, null);
  const [prompt, setPrompt] = useState<string | null>(draft.prompt);
  const [body, setBody] = useState(draft.body);
  const e = (k: string) => fieldError(state, k);

  return (
    <form action={action} className="space-y-6">
      {draft.id ? <input type="hidden" name="id" value={draft.id} /> : null}
      <input type="hidden" name="prompt" value={prompt ?? ""} />
      <div>
        <p className="mb-2 text-[0.8125rem] font-medium text-fg-muted">Reflect with a prompt (optional)</p>
        <div className="flex flex-wrap gap-2">
          {prompts.map((p) => (
            <button
              key={p}
              type="button"
              aria-pressed={prompt === p}
              onClick={() => {
                setPrompt(prompt === p ? null : p);
                if (prompt !== p && !body.includes(p)) setBody((b) => `${b ? `${b}\n\n` : ""}**${p}**\n\n`);
              }}
              className={cn(
                "rounded-full border px-3 py-1.5 text-[0.8125rem] transition-colors",
                prompt === p ? "border-transparent bg-selected text-fg" : "border-line text-fg-muted hover:border-line-strong hover:text-fg",
              )}
            >
              {p}
            </button>
          ))}
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-[1fr_180px]">
        <Field label="Title" error={e("title")}>
          {(p) => <Input {...p} name="title" defaultValue={draft.title} required maxLength={120} placeholder="What's on your mind about your investments today?" />}
        </Field>
        <Field label="Date" error={e("entryDate")}>
          {(p) => <Input {...p} type="date" name="entryDate" defaultValue={draft.entryDate || today()} max={today()} required />}
        </Field>
      </div>
      <Field label="Entry" hint="Markdown supported: **bold**, lists, links." error={e("body")}>
        {(p) => <Textarea {...p} name="body" value={body} onChange={(ev) => setBody(ev.target.value)} className="min-h-64 font-[inherit] leading-relaxed" maxLength={20000} />}
      </Field>
      <fieldset className="grid gap-4 sm:grid-cols-2">
        <legend className="mb-2 text-[0.9375rem] font-semibold text-fg">Links</legend>
        <Field label="Thesis" optional>
          {(p) => (
            <Select {...p} name="thesisId" defaultValue={draft.thesisId ?? ""}>
              <option value="">None</option>
              {theses.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.title}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Field label="Security" optional>
          {(p) => <InstrumentPicker name="instrumentId" id={p.id} defaultValue={draft.instrument} />}
        </Field>
        <Field label="Paper order" optional hint="Reflect on a simulated trade after the fact.">
          {(p) => (
            <Select {...p} name="paperOrderId" defaultValue={draft.paperOrderId ?? ""}>
              <option value="">None</option>
              {orders.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Field label="Tags" optional hint="Comma separated">
          {(p) => <Input {...p} name="tags" defaultValue={draft.tags.join(", ")} maxLength={200} />}
        </Field>
      </fieldset>
      <Field label="Who can read it" hint="Entries are private unless you choose otherwise. Links to your trades are never shown to others.">
        {(p) => (
          <Select {...p} name="visibility" defaultValue={draft.visibility}>
            <option value="private">Only me</option>
            <option value="friends">Friends</option>
          </Select>
        )}
      </Field>
      {state && !state.ok ? <Callout tone="negative">{state.error}</Callout> : null}
      <div className="flex gap-3">
        <Button type="submit" size="lg" loading={pending}>
          {draft.id ? "Save changes" : "Save entry"}
        </Button>
      </div>
    </form>
  );
}

export function DeleteEntryButton({ id }: { id: string }) {
  const [pending, start] = useTransition();
  return (
    <Button
      variant="danger"
      size="sm"
      loading={pending}
      onClick={() => {
        if (!confirm("Delete this journal entry permanently?")) return;
        start(async () => {
          const r = await deleteEntryAction(id);
          if (r && !r.ok) toast.error(r.error);
        });
      }}
    >
      <Trash2 className="size-4" aria-hidden /> Delete
    </Button>
  );
}
