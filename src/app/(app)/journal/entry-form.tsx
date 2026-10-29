"use client";

import { useActionState, useState, useTransition } from "react";
import { ChevronDown, Link2, Lock, RefreshCw, Sparkles, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { chipClass, HeadlineInput, Question, WriteArea } from "@/components/forms/compose";
import { InstrumentPicker, type PickedInstrument } from "@/components/forms/instrument-picker";
import { fieldError } from "@/components/forms/use-result";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/field";
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

/** The native control inside a pill: no fill or edge of its own, a small arrow at the end. */
const inChip = "select-chevron h-full appearance-none bg-transparent bg-[length:14px] bg-[position:right_center] pr-6 font-medium text-fg focus:outline-none";

/**
 * A journal entry is a page to write on: an optional prompt to start from, then
 * the text. The first line becomes the title. Links and sharing wait at the bottom.
 */
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
  const editing = !!draft.id;
  const [prompt, setPrompt] = useState<string | null>(draft.prompt);
  const [links, setLinks] = useState(!!(draft.thesisId || draft.instrument || draft.paperOrderId || draft.tags.length));
  const e = (k: string) => fieldError(state, k);
  const anotherPrompt = () => setPrompt(prompts[(prompts.indexOf(prompt ?? "") + 1) % prompts.length]);

  return (
    <form action={action} className="mx-auto max-w-[680px]">
      {draft.id ? <input type="hidden" name="id" value={draft.id} /> : null}
      <input type="hidden" name="prompt" value={prompt ?? ""} />

      <div className="flex flex-wrap items-center gap-2">
        <label className={chipClass}>
          <span className="sr-only">Date</span>
          <input
            type="date"
            name="entryDate"
            defaultValue={draft.entryDate || today()}
            max={today()}
            required
            className="bg-transparent text-sm text-fg focus:outline-none"
          />
        </label>
        {prompt ? null : (
          <button type="button" onClick={anotherPrompt} className={chipClass}>
            <Sparkles aria-hidden /> Give me a prompt
          </button>
        )}
      </div>
      {e("entryDate") ? <p className="mt-1.5 text-[0.8125rem] text-negative">{e("entryDate")}</p> : null}

      {prompt ? (
        <div className="mt-6">
          <div className="flex items-center gap-1">
            <p className="flex-1 font-display text-[0.8125rem] font-semibold text-fg-subtle">Prompt</p>
            <button
              type="button"
              onClick={anotherPrompt}
              className="inline-flex h-8 items-center gap-1.5 rounded-full px-2.5 font-display text-[0.8125rem] font-semibold text-accent hover:bg-field"
            >
              <RefreshCw className="size-3.5" aria-hidden /> Another
            </button>
            <button
              type="button"
              onClick={() => setPrompt(null)}
              aria-label="Write without a prompt"
              className="grid size-8 place-items-center rounded-full text-fg-subtle hover:bg-field hover:text-fg"
            >
              <X className="size-4" aria-hidden />
            </button>
          </div>
          <p className="mt-1 font-display text-[1.5rem] leading-[1.2] font-bold tracking-[-0.01em] text-fg">{prompt}</p>
        </div>
      ) : null}

      {editing ? (
        <HeadlineInput
          name="title"
          aria-label="Title"
          defaultValue={draft.title}
          maxLength={120}
          placeholder="Title (optional)"
          className="mt-6"
        />
      ) : null}

      <WriteArea
        name="body"
        aria-label={prompt ? `Your answer to: ${prompt}` : "Entry"}
        defaultValue={draft.body}
        maxLength={20000}
        required={!editing}
        autoFocus={!editing}
        placeholder={prompt ? "Your answer…" : "Write freely. The first line becomes the title."}
        className="mt-4 min-h-[38dvh] text-[1.0625rem] leading-[1.65]"
      />
      {e("body") ? <p className="mt-1.5 text-[0.8125rem] text-negative">{e("body")}</p> : null}

      <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-line pt-4">
        <button type="button" aria-expanded={links} aria-controls="entry-links" onClick={() => setLinks(!links)} className={chipClass}>
          <Link2 aria-hidden /> Link a thesis or stock
          <ChevronDown className={cn("transition-transform duration-[var(--dur)]", links && "rotate-180")} aria-hidden />
        </button>
        <label className={chipClass}>
          <Lock aria-hidden />
          <span className="sr-only">Who can read it</span>
          <select name="visibility" defaultValue={draft.visibility} className={inChip}>
            <option value="private">Only me</option>
            <option value="friends">Friends</option>
          </select>
        </label>
      </div>

      <div id="entry-links" className={links ? "mt-5 space-y-5" : "hidden"}>
        <Question label="Thesis" htmlFor="entry-thesis" hint="Connects this entry to one of your theses.">
          <Select id="entry-thesis" name="thesisId" defaultValue={draft.thesisId ?? ""} className="h-11">
            <option value="">None</option>
            {theses.map((t) => (
              <option key={t.id} value={t.id}>
                {t.title}
              </option>
            ))}
          </Select>
        </Question>
        <Question label="Stock or fund" htmlFor="entry-instrument">
          <InstrumentPicker name="instrumentId" id="entry-instrument" defaultValue={draft.instrument} placeholder="Search by name or ticker" />
        </Question>
        {orders.length ? (
          <Question label="Practice trade" htmlFor="entry-order" hint="Look back on a pretend trade after the fact.">
            <Select id="entry-order" name="paperOrderId" defaultValue={draft.paperOrderId ?? ""} className="h-11">
              <option value="">None</option>
              {orders.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
            </Select>
          </Question>
        ) : (
          <input type="hidden" name="paperOrderId" value={draft.paperOrderId ?? ""} />
        )}
        <Question label="Tags" htmlFor="entry-tags" hint="Comma separated">
          <Input id="entry-tags" name="tags" defaultValue={draft.tags.join(", ")} maxLength={200} className="h-11" />
        </Question>
      </div>

      {state && !state.ok ? (
        <Callout tone="negative" className="mt-4">
          {state.error}
        </Callout>
      ) : null}
      <Button type="submit" size="lg" loading={pending} className="mt-6 h-13 w-full sm:w-auto sm:px-8">
        {editing ? "Save changes" : "Save entry"}
      </Button>
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
