"use client";

import { useActionState, useState } from "react";
import { Plus, ShieldAlert, X } from "lucide-react";
import { InstrumentPicker, type PickedInstrument } from "@/components/forms/instrument-picker";
import { fieldError } from "@/components/forms/use-result";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { Callout } from "@/components/ui/states";
import { saveThesisAction } from "./actions";

export type ThesisDraft = {
  id?: string;
  title: string;
  summary: string;
  instrument: PickedInstrument | null;
  status: string;
  visibility: string;
  guildId: string | null;
  timeHorizon: string;
  tags: string[];
  rationale: string;
  bullCase: string;
  bearCase: string;
  assumptions: string;
  catalysts: string;
  risks: string;
  valuation: string;
  invalidationCriteria: string;
  sources: { label: string; url: string }[];
};

const STATUSES = [
  ["researching", "Researching"],
  ["active", "Active"],
  ["under_review", "Under review"],
  ["validated", "Validated"],
  ["invalidated", "Invalidated"],
  ["archived", "Archived"],
] as const;

export function ThesisForm({ draft, guilds }: { draft: ThesisDraft; guilds: { id: string; name: string }[] }) {
  const [state, action, pending] = useActionState(saveThesisAction, null);
  const [visibility, setVisibility] = useState(draft.visibility);
  const [status, setStatus] = useState(draft.status);
  const [sources, setSources] = useState(draft.sources.length ? draft.sources : [{ label: "", url: "" }]);
  const e = (k: string) => fieldError(state, k);
  const editing = !!draft.id;
  const closing = status === "validated" || status === "invalidated";

  return (
    <form action={action} className="space-y-8">
      {draft.id ? <input type="hidden" name="id" value={draft.id} /> : null}

      <section className="space-y-4" aria-labelledby="basics">
        <h2 id="basics" className="text-[0.9375rem] font-semibold text-fg">
          The idea
        </h2>
        <Field label="Title" error={e("title")} hint="A claim you could be wrong about, not a ticker.">
          {(p) => <Input {...p} name="title" defaultValue={draft.title} required minLength={3} maxLength={120} placeholder="e.g. Lithography stays a one-supplier market" />}
        </Field>
        <Field label="Summary" optional error={e("summary")}>
          {(p) => <Textarea {...p} name="summary" defaultValue={draft.summary} maxLength={400} className="min-h-16" placeholder="The thesis in two sentences." />}
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Security" optional hint="Leave empty for a theme or macro view.">
            {(p) => <InstrumentPicker name="instrumentId" id={p.id} defaultValue={draft.instrument} describedBy={p["aria-describedby"]} />}
          </Field>
          <Field label="Time horizon" optional>
            {(p) => <Input {...p} name="timeHorizon" defaultValue={draft.timeHorizon} maxLength={60} placeholder="e.g. 3–5 years" />}
          </Field>
          <Field label="Status">
            {(p) => (
              <Select {...p} name="status" value={status} onChange={(ev) => setStatus(ev.target.value)}>
                {STATUSES.map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field label="Tags" optional hint="Comma separated, e.g. semiconductors, moat" error={e("tags.0")}>
            {(p) => <Input {...p} name="tags" defaultValue={draft.tags.join(", ")} maxLength={200} />}
          </Field>
        </div>
      </section>

      <section className="space-y-4" aria-labelledby="reasoning">
        <h2 id="reasoning" className="text-[0.9375rem] font-semibold text-fg">
          The reasoning
        </h2>
        <Field label="Why you believe it" optional hint="Markdown supported.">
          {(p) => <Textarea {...p} name="rationale" defaultValue={draft.rationale} className="min-h-32" maxLength={8000} />}
        </Field>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Bull case" optional>
            {(p) => <Textarea {...p} name="bullCase" defaultValue={draft.bullCase} maxLength={4000} placeholder="What has to go right" />}
          </Field>
          <Field label="Bear case" optional>
            {(p) => <Textarea {...p} name="bearCase" defaultValue={draft.bearCase} maxLength={4000} placeholder="The strongest argument against you" />}
          </Field>
          <Field label="Key assumptions" optional>
            {(p) => <Textarea {...p} name="assumptions" defaultValue={draft.assumptions} maxLength={4000} />}
          </Field>
          <Field label="Catalysts" optional>
            {(p) => <Textarea {...p} name="catalysts" defaultValue={draft.catalysts} maxLength={4000} />}
          </Field>
          <Field label="Risks" optional>
            {(p) => <Textarea {...p} name="risks" defaultValue={draft.risks} maxLength={4000} />}
          </Field>
          <Field label="Valuation assumptions" optional>
            {(p) => <Textarea {...p} name="valuation" defaultValue={draft.valuation} maxLength={4000} />}
          </Field>
        </div>
        <div className="rounded-[var(--radius-lg)] border border-line-strong bg-selected/40 p-4">
          <Field
            label={
              <span className="inline-flex items-center gap-1.5 text-fg">
                <ShieldAlert className="size-4 text-accent" aria-hidden /> What would prove you wrong
              </span>
            }
            hint="Specific and observable. This is the most important field on the page."
            error={e("invalidationCriteria")}
          >
            {(p) => <Textarea {...p} name="invalidationCriteria" defaultValue={draft.invalidationCriteria} maxLength={2000} placeholder="e.g. EUV order intake falls for two consecutive quarters while customers guide capex up." />}
          </Field>
        </div>
      </section>

      <section className="space-y-3" aria-labelledby="sources">
        <h2 id="sources" className="text-[0.9375rem] font-semibold text-fg">
          Sources
        </h2>
        <p className="text-sm text-fg-muted">Link the filings, articles and data you relied on. Only https links.</p>
        {sources.map((s, i) => (
          <div key={i} className="grid gap-2 sm:grid-cols-[1fr_1.4fr_auto]">
            <Input name="sourceLabel" aria-label={`Source ${i + 1} label`} defaultValue={s.label} placeholder="Label, e.g. Annual report 2025" maxLength={120} />
            <Input name="sourceUrl" aria-label={`Source ${i + 1} link`} type="url" defaultValue={s.url} placeholder="https://" pattern="https://.*" />
            <Button type="button" variant="ghost" size="icon" aria-label={`Remove source ${i + 1}`} onClick={() => setSources(sources.filter((_, j) => j !== i))}>
              <X className="size-4" />
            </Button>
          </div>
        ))}
        {e("sources.0.url") ? <p className="text-xs text-negative">{e("sources.0.url")}</p> : null}
        {sources.length < 20 ? (
          <Button type="button" variant="ghost" size="sm" onClick={() => setSources([...sources, { label: "", url: "" }])}>
            <Plus className="size-4" aria-hidden /> Add source
          </Button>
        ) : null}
      </section>

      <section className="space-y-4" aria-labelledby="sharing">
        <h2 id="sharing" className="text-[0.9375rem] font-semibold text-fg">
          Who can read it
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Visibility" hint="Private notes on a thesis are never shared." error={e("visibility")}>
            {(p) => (
              <Select {...p} name="visibility" value={visibility} onChange={(ev) => setVisibility(ev.target.value)}>
                <option value="private">Only me</option>
                <option value="friends">Friends</option>
                <option value="guild" disabled={!guilds.length}>
                  One of my Guilds
                </option>
                <option value="public">All members</option>
              </Select>
            )}
          </Field>
          {visibility === "guild" ? (
            <Field label="Guild" error={e("guildId")}>
              {(p) => (
                <Select {...p} name="guildId" defaultValue={draft.guildId ?? guilds[0]?.id}>
                  {guilds.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
          ) : null}
        </div>
      </section>

      {editing || closing ? (
        <Field
          label={closing ? "What happened, and what you learned" : "What changed in this revision"}
          optional={!closing}
          hint={closing ? "Required when closing a thesis. Process over outcome: was the reasoning sound?" : "Saved with the revision so you can see how your thinking moved."}
          error={e("changeNote")}
        >
          {(p) => <Textarea {...p} name="changeNote" maxLength={1000} required={closing} />}
        </Field>
      ) : null}

      {state && !state.ok ? <Callout tone="negative">{state.error}</Callout> : null}
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" size="lg" loading={pending}>
          {editing ? "Save revision" : "Create thesis"}
        </Button>
        <p className="text-xs text-fg-subtle">{editing ? "Earlier revisions are kept unchanged." : "You can revise it any time; every version is kept."}</p>
      </div>
    </form>
  );
}
