"use client";

import { useActionState, useState } from "react";
import { CalendarClock, ChevronDown, Globe, Lock, Plus, ShieldAlert, Users, UsersRound, X } from "lucide-react";
import { addMonths } from "@/domain/review";
import { ChoiceChips, chipClass, HeadlineInput, Question, WriteArea } from "@/components/forms/compose";
import { InstrumentPicker, type PickedInstrument } from "@/components/forms/instrument-picker";
import { fieldError } from "@/components/forms/use-result";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/field";
import { Callout } from "@/components/ui/states";
import { cn } from "@/lib/cn";
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
  reviewOn: string | null;
};

const STATUSES = [
  ["researching", "Researching"],
  ["active", "Active"],
  ["under_review", "Under review"],
  ["validated", "Validated"],
  ["invalidated", "Invalidated"],
  ["archived", "Archived"],
] as const;

const QUICK_PICKS = [
  [3, "3 months"],
  [6, "6 months"],
  [12, "A year"],
] as const;

type Audience = "private" | "friends" | "guild" | "public";
const AUDIENCE_NOTE: Record<Audience, string> = {
  private: "Only you can see it until you share it.",
  friends: "Your friends will be able to read it.",
  guild: "Members of the Guild you pick will be able to read it.",
  public: "All Portle members will be able to read it.",
};

/** The optional parts of a thesis, offered one tap at a time behind "Add more detail". */
const EXTRAS = [
  { key: "bullCase", label: "Bull case", hint: "What has to go right", max: 4000 },
  { key: "bearCase", label: "Bear case", hint: "The best argument against you", max: 4000 },
  { key: "risks", label: "Risks", hint: "", max: 4000 },
  { key: "catalysts", label: "Catalysts", hint: "What could move it", max: 4000 },
  { key: "assumptions", label: "Assumptions", hint: "", max: 4000 },
  { key: "valuation", label: "Valuation", hint: "", max: 4000 },
  { key: "summary", label: "Short summary", hint: "The idea in two sentences", max: 400 },
  { key: "sources", label: "Sources", hint: "Links you relied on", max: 0 },
  { key: "timeHorizon", label: "Time horizon", hint: "e.g. 3–5 years", max: 60 },
  { key: "tags", label: "Tags", hint: "e.g. semiconductors, moat", max: 200 },
] as const;
type ExtraKey = (typeof EXTRAS)[number]["key"];

function filled(draft: ThesisDraft, key: ExtraKey) {
  if (key === "sources") return draft.sources.length > 0;
  if (key === "tags") return draft.tags.length > 0;
  return draft[key].trim().length > 0;
}

/**
 * A thesis asks three things up front: the claim, why, and what would prove it
 * wrong, then when to look again. Everything else waits behind "Add more detail".
 */
export function ThesisForm({ draft, guilds, today }: { draft: ThesisDraft; guilds: { id: string; name: string }[]; today: string }) {
  const [state, action, pending] = useActionState(saveThesisAction, null);
  const editing = !!draft.id;
  const [visibility, setVisibility] = useState<Audience>(draft.visibility as Audience);
  const [status, setStatus] = useState(draft.status);
  const [sources, setSources] = useState(draft.sources.length ? draft.sources : [{ label: "", url: "" }]);
  const [reviewOn, setReviewOn] = useState(draft.reviewOn ?? "");
  const [shown, setShown] = useState<ExtraKey[]>(() => EXTRAS.filter((x) => filled(draft, x.key)).map((x) => x.key));
  const [justAdded, setJustAdded] = useState<ExtraKey | null>(null);
  const [more, setMore] = useState(editing || shown.length > 0 || draft.visibility !== "private");
  const quickDays: string[] = QUICK_PICKS.map(([months]) => addMonths(today, months));
  const [customDate, setCustomDate] = useState(!!draft.reviewOn && !quickDays.includes(draft.reviewOn));
  const e = (k: string) => fieldError(state, k);
  const closing = status === "validated" || status === "invalidated";
  const open = status === "researching" || status === "active" || status === "under_review";
  const passed = !!reviewOn && reviewOn < today && reviewOn === draft.reviewOn;

  const add = (key: ExtraKey) => {
    setShown((s) => [...s, key]);
    setJustAdded(key);
  };

  return (
    <form action={action} className="mx-auto max-w-[640px]">
      {draft.id ? <input type="hidden" name="id" value={draft.id} /> : null}
      <input type="hidden" name="reviewOn" value={open ? reviewOn : ""} />

      <HeadlineInput
        name="title"
        aria-label="What do you believe?"
        defaultValue={draft.title}
        required
        minLength={3}
        maxLength={120}
        placeholder="What do you believe?"
        aria-invalid={e("title") ? true : undefined}
        aria-describedby="thesis-title-hint"
        autoFocus={!editing}
      />
      {e("title") ? (
        <p id="thesis-title-hint" className="mt-1.5 text-[0.8125rem] text-negative" role="alert">
          {e("title")}
        </p>
      ) : (
        <p id="thesis-title-hint" className="mt-1.5 text-[0.8125rem] text-fg-subtle">
          A claim you could be wrong about, like &ldquo;ASML stays the only EUV supplier&rdquo;.
        </p>
      )}

      <div className="mt-6 space-y-5">
        <Question label="About a stock or fund?" htmlFor="thesis-instrument" hint="Optional. Leave it empty for a theme or a view on the economy.">
          <InstrumentPicker name="instrumentId" id="thesis-instrument" defaultValue={draft.instrument} placeholder="Search by name or ticker" />
        </Question>

        <Question label="Why do you believe it?" htmlFor="thesis-why">
          <WriteArea
            id="thesis-why"
            name="rationale"
            defaultValue={draft.rationale}
            maxLength={8000}
            placeholder="Your reasons, in your own words."
            className="min-h-20"
          />
        </Question>

        <Question label="What would prove you wrong?" htmlFor="thesis-wrong" icon={<ShieldAlert aria-hidden />} error={e("invalidationCriteria")}>
          <WriteArea
            id="thesis-wrong"
            name="invalidationCriteria"
            defaultValue={draft.invalidationCriteria}
            maxLength={2000}
            placeholder="Something you could actually see happen, e.g. orders fall two quarters in a row."
          />
        </Question>

        {editing ? (
          <Question label="Status" htmlFor="thesis-status">
            <Select id="thesis-status" name="status" value={status} onChange={(ev) => setStatus(ev.target.value)} className="h-11 max-w-60">
              {STATUSES.map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </Select>
          </Question>
        ) : null}

        {open ? (
          <Question
            label="Look again in"
            icon={<CalendarClock aria-hidden />}
            error={e("reviewOn")}
            hint={
              passed
                ? "This day has passed. Saving counts as looking again, so it clears unless you pick a new date."
                : "Portle reminds you on the day. Only you see the date."
            }
          >
            <div role="group" aria-label="Look again in" className="flex flex-wrap gap-2">
              {QUICK_PICKS.map(([months, label], i) => (
                <button
                  key={months}
                  type="button"
                  aria-pressed={!customDate && reviewOn === quickDays[i]}
                  onClick={() => {
                    setCustomDate(false);
                    setReviewOn(reviewOn === quickDays[i] && !customDate ? "" : quickDays[i]);
                  }}
                  className={chipClass}
                >
                  {label}
                </button>
              ))}
              <button
                type="button"
                aria-pressed={customDate}
                onClick={() => {
                  setCustomDate(!customDate);
                  if (customDate) setReviewOn("");
                }}
                className={chipClass}
              >
                Pick a date
              </button>
            </div>
            {customDate ? (
              <Input
                type="date"
                aria-label="Look again on"
                value={reviewOn}
                min={passed ? undefined : today}
                max="2100-12-31"
                onChange={(ev) => setReviewOn(ev.target.value)}
                className="mt-3 h-11 w-52"
              />
            ) : null}
          </Question>
        ) : null}

        {editing || closing ? (
          <Question
            label={closing ? "What happened, and what you learned" : "What changed in this revision?"}
            htmlFor="thesis-change"
            error={e("changeNote")}
            hint={
              closing
                ? "Needed when you close a thesis. Was the reasoning sound, whatever the outcome?"
                : "Optional. Saved with the revision, so you can see how your thinking moved."
            }
          >
            <WriteArea id="thesis-change" name="changeNote" maxLength={1000} required={closing} placeholder={closing ? "What happened…" : "What changed…"} />
          </Question>
        ) : null}
      </div>

      <div className="mt-6 border-t border-line">
        <button
          type="button"
          aria-expanded={more}
          aria-controls="thesis-more"
          onClick={() => setMore(!more)}
          className="flex w-full items-center gap-3 py-4 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)]"
        >
          <span className="min-w-0 flex-1">
            <span className="block font-display text-[0.9375rem] font-semibold text-fg">{more ? "More detail" : "Add more detail"}</span>
            <span className="mt-0.5 block text-[0.8125rem] text-fg-subtle">Bull and bear case, risks, sources, who can read it</span>
          </span>
          <ChevronDown className={cn("size-5 shrink-0 text-fg-subtle transition-transform duration-[var(--dur)]", more && "rotate-180")} aria-hidden />
        </button>

        <div id="thesis-more" className={more ? "space-y-5 pb-2" : "hidden"}>
          {shown.map((key) => {
            const x = EXTRAS.find((x) => x.key === key)!;
            const remove = (
              <button
                type="button"
                onClick={() => setShown((s) => s.filter((k) => k !== key))}
                aria-label={`Remove ${x.label.toLowerCase()}`}
                className="grid size-7 place-items-center rounded-full text-fg-subtle hover:bg-field hover:text-fg"
              >
                <X className="size-4" aria-hidden />
              </button>
            );
            if (key === "sources")
              return (
                <Question key={key} label="Sources" action={remove} error={e("sources.0.url")} hint="Only https links.">
                  <div className="space-y-2">
                    {sources.map((s, i) => (
                      <div key={i} className="grid gap-2 sm:grid-cols-[1fr_1.4fr_auto]">
                        <Input
                          name="sourceLabel"
                          aria-label={`Source ${i + 1} label`}
                          defaultValue={s.label}
                          placeholder="Label, e.g. Annual report 2025"
                          maxLength={120}
                          className="h-11"
                        />
                        <Input
                          name="sourceUrl"
                          aria-label={`Source ${i + 1} link`}
                          type="url"
                          defaultValue={s.url}
                          placeholder="https://"
                          pattern="https://.*"
                          className="h-11"
                          autoFocus={justAdded === "sources" && i === 0}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          aria-label={`Remove source ${i + 1}`}
                          onClick={() => setSources(sources.filter((_, j) => j !== i))}
                        >
                          <X className="size-4" aria-hidden />
                        </Button>
                      </div>
                    ))}
                    {sources.length < 20 ? (
                      <button type="button" onClick={() => setSources([...sources, { label: "", url: "" }])} className={chipClass}>
                        <Plus aria-hidden /> Another source
                      </button>
                    ) : null}
                  </div>
                </Question>
              );
            if (key === "timeHorizon" || key === "tags")
              return (
                <Question key={key} label={x.label} action={remove} htmlFor={`thesis-${key}`} error={key === "tags" ? e("tags.0") : undefined}>
                  <Input
                    id={`thesis-${key}`}
                    name={key}
                    defaultValue={key === "tags" ? draft.tags.join(", ") : draft.timeHorizon}
                    maxLength={x.max}
                    placeholder={x.hint}
                    autoFocus={justAdded === key}
                    className="h-11"
                  />
                </Question>
              );
            return (
              <Question key={key} label={x.label} action={remove} htmlFor={`thesis-${key}`}>
                <WriteArea
                  id={`thesis-${key}`}
                  name={key}
                  defaultValue={draft[key]}
                  maxLength={x.max}
                  placeholder={x.hint || `${x.label}…`}
                  autoFocus={justAdded === key}
                />
              </Question>
            );
          })}

          {EXTRAS.some((x) => !shown.includes(x.key)) ? (
            <ul className="border-t border-line">
              {EXTRAS.filter((x) => !shown.includes(x.key)).map((x) => (
                <li key={x.key} className="border-b border-line last:border-b-0">
                  <button
                    type="button"
                    onClick={() => add(x.key)}
                    aria-label={`Add ${x.label.toLowerCase()}`}
                    className="group flex w-full items-center gap-3 py-3 text-left text-[0.9375rem] text-fg"
                  >
                    <Plus className="size-[18px] shrink-0 text-accent" aria-hidden />
                    <span className="group-hover:underline">{x.label}</span>
                    {x.hint ? <span className="ml-auto truncate pl-3 text-[0.8125rem] text-fg-subtle">{x.hint}</span> : null}
                  </button>
                </li>
              ))}
            </ul>
          ) : null}

          <Question label="Who can read it" error={e("visibility")} hint="Your private notes on a thesis are never shared.">
            <ChoiceChips
              name="visibility"
              label="Who can read it"
              value={visibility}
              onChange={setVisibility}
              options={[
                {
                  value: "private",
                  label: (
                    <>
                      <Lock aria-hidden /> Only me
                    </>
                  ),
                },
                {
                  value: "friends",
                  label: (
                    <>
                      <UsersRound aria-hidden /> Friends
                    </>
                  ),
                },
                {
                  value: "guild",
                  label: (
                    <>
                      <Users aria-hidden /> A Guild
                    </>
                  ),
                  disabled: !guilds.length,
                },
                {
                  value: "public",
                  label: (
                    <>
                      <Globe aria-hidden /> Everyone
                    </>
                  ),
                },
              ]}
            />
            {visibility === "guild" ? (
              <Select name="guildId" aria-label="Which Guild" defaultValue={draft.guildId ?? guilds[0]?.id} className="mt-3 h-11 max-w-72">
                {guilds.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </Select>
            ) : null}
            {e("guildId") ? <p className="mt-1.5 text-[0.8125rem] text-negative">{e("guildId")}</p> : null}
          </Question>
        </div>
      </div>

      {state && !state.ok ? (
        <Callout tone="negative" className="mt-4">
          {state.error}
        </Callout>
      ) : null}
      <div className="mt-6">
        <Button type="submit" size="lg" loading={pending} className="h-13 w-full sm:w-auto sm:px-8">
          {editing ? "Save revision" : "Save thesis"}
        </Button>
        <p className="mt-3 flex items-center gap-1.5 text-[0.8125rem] text-fg-subtle">
          {editing ? (
            "Earlier revisions are kept unchanged."
          ) : (
            <>
              {visibility === "private" ? <Lock className="size-3.5 shrink-0" aria-hidden /> : null}
              {AUDIENCE_NOTE[visibility]} You can revise it any time.
            </>
          )}
        </p>
      </div>
    </form>
  );
}
