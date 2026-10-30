"use client";

import { useActionState, useRef, useState, useTransition } from "react";
import { GripVertical, Pencil, Plus } from "lucide-react";
import { toast } from "sonner";
import { fieldError, useResultToast } from "@/components/forms/use-result";
import { ProfileBanner } from "@/components/profile/banner";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Field, Input, MultiSelect, Select, Textarea } from "@/components/ui/field";
import { Dialog, Switch } from "@/components/ui/overlay";
import { Callout } from "@/components/ui/states";
import { AboutEditor } from "@/components/profile/about-editor";
import {
  APPROACHES,
  BANNERS,
  BANNER_STYLES,
  COMMENT_AUDIENCES,
  HORIZONS,
  LINKS,
  LINK_KEYS,
  SECTION_LABEL,
  type BannerStyle,
  type CommentAudience,
  type LinkKey,
  type SectionSetting,
} from "@/domain/profile-layout";
import { topicLabel } from "@/domain/topics";
import { cn } from "@/lib/cn";
import { deleteExperienceAction, saveExperienceAction, updateProfileAction } from "./actions";

export type EditableProfile = {
  displayName: string;
  handle: string;
  bio: string;
  interests: string[];
  avatarHue: string;
  headline: string;
  location: string;
  bannerStyle: BannerStyle;
  links: Partial<Record<LinkKey, string>>;
  investingSince: number | null;
  approach: string | null;
  horizon: string | null;
  sections: SectionSetting[];
  featuredThesisIds: string[];
  commentAudience: CommentAudience;
};

const YEARS = (() => {
  const now = new Date().getUTCFullYear();
  return Array.from({ length: now - 1959 }, (_, i) => now - i);
})();

/**
 * Drag a section by its handle to move it; the arrow keys do the same on a focused handle.
 * Each switch shows or hides the section on your profile.
 */
function SectionOrder({ value, onChange }: { value: SectionSetting[]; onChange: (v: SectionSetting[]) => void }) {
  const list = useRef<HTMLOListElement>(null);
  const [dragging, setDragging] = useState<string | null>(null);
  const move = (from: number, to: number) => {
    if (to < 0 || to >= value.length || from === to) return;
    const next = [...value];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    onChange(next);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragging || !list.current) return;
    const rows = [...list.current.children] as HTMLElement[];
    const from = value.findIndex((s) => s.key === dragging);
    const to = rows.findIndex((r) => {
      const box = r.getBoundingClientRect();
      return e.clientY >= box.top && e.clientY <= box.bottom;
    });
    if (to >= 0) move(from, to);
  };
  return (
    <ol ref={list} onPointerMove={onPointerMove} onPointerUp={() => setDragging(null)} onPointerCancel={() => setDragging(null)} aria-label="Profile sections">
      {value.map((s, i) => (
        <li key={s.key} className={cn("flex items-center gap-3 border-b border-line py-2.5 last:border-b-0", dragging === s.key && "bg-selected")}>
          <button
            type="button"
            aria-label={`Move ${SECTION_LABEL[s.key]}. Use the arrow keys to move it up or down.`}
            className="grid size-8 cursor-grab touch-none place-items-center rounded-[10px] text-fg-subtle hover:bg-field hover:text-fg active:cursor-grabbing"
            onPointerDown={(e) => {
              (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
              setDragging(s.key);
            }}
            onKeyDown={(e) => {
              if (e.key === "ArrowUp") {
                e.preventDefault();
                move(i, i - 1);
              } else if (e.key === "ArrowDown") {
                e.preventDefault();
                move(i, i + 1);
              }
            }}
          >
            <GripVertical className="size-4" aria-hidden />
          </button>
          <span className="min-w-0 flex-1 text-[0.9375rem] text-fg">{SECTION_LABEL[s.key]}</span>
          <Switch
            checked={s.visible}
            onCheckedChange={(visible) => onChange(value.map((x) => (x.key === s.key ? { ...x, visible } : x)))}
            aria-label={`Show ${SECTION_LABEL[s.key]}`}
          />
        </li>
      ))}
    </ol>
  );
}

/** Everything on your profile page except Experience, which has its own list below. */
export function ProfileEditor({
  profile,
  interests,
  theses,
}: {
  profile: EditableProfile;
  interests: readonly string[];
  theses: { id: string; title: string }[];
}) {
  const [state, action, pending] = useActionState(updateProfileAction, null);
  const [hue, setHue] = useState(profile.avatarHue);
  const [name, setName] = useState(profile.displayName);
  const [banner, setBanner] = useState<BannerStyle>(profile.bannerStyle);
  const [sections, setSections] = useState(profile.sections);
  const [featured, setFeatured] = useState(profile.featuredThesisIds);
  useResultToast(state);
  const e = (k: string) => fieldError(state, k);

  return (
    <form action={action} className="space-y-6">
      <input type="hidden" name="sections" value={JSON.stringify(sections)} />

      <div>
        <ProfileBanner style={banner} className="h-24 rounded-[18px]" />
        <div className="-mt-9 flex items-end gap-4 px-3">
          <Avatar name={name} hue={hue} size="xl" className="relative z-10 ring-4 ring-bg" />
          <Field label="Avatar colour" className="mb-1 flex-1">
            {(p) => (
              <input
                {...p}
                type="range"
                name="avatarHue"
                min={0}
                max={359}
                value={hue}
                onChange={(ev) => setHue(ev.target.value)}
                className="w-full accent-[var(--primary)]"
              />
            )}
          </Field>
        </div>
      </div>

      <Field label="Banner">
        {(p) => (
          <Select {...p} name="bannerStyle" value={banner} onChange={(ev) => setBanner(ev.target.value as BannerStyle)} className="h-11">
            {BANNER_STYLES.map((b) => (
              <option key={b} value={b}>
                {BANNERS[b].label}
              </option>
            ))}
          </Select>
        )}
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Display name" error={e("displayName")}>
          {(p) => <Input {...p} name="displayName" value={name} onChange={(ev) => setName(ev.target.value)} required maxLength={40} className="h-11" />}
        </Field>
        <Field label="Handle" hint="Handles can't be changed yet.">
          {(p) => <Input {...p} value={`@${profile.handle}`} disabled readOnly className="h-11" />}
        </Field>
      </div>
      <Field label="Headline" optional error={e("headline")} hint="One line under your name, like Building Portle · Long-term index investor.">
        {(p) => <Input {...p} name="headline" defaultValue={profile.headline} maxLength={120} className="h-11" />}
      </Field>
      <Field label="Location" optional error={e("location")}>
        {(p) => <Input {...p} name="location" defaultValue={profile.location} maxLength={60} placeholder="Rotterdam, NL" className="h-11" />}
      </Field>
      <Field
        label="About me"
        optional
        error={e("bio")}
        hint="The buttons add headings, lists, quotes and links, or type the marks yourself. Pictures and colours aren't allowed, so every profile stays readable. Don't include account details."
      >
        {(p) => <AboutEditor {...p} name="bio" defaultValue={profile.bio} />}
      </Field>

      <fieldset className="space-y-4">
        <legend className="mb-1 font-display text-base font-bold text-fg">Links</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          {LINK_KEYS.map((k) => (
            <Field key={k} label={LINKS[k].label} optional error={e(`links.${k}`)}>
              {(p) => (
                <Input
                  {...p}
                  name={`links.${k}`}
                  type="url"
                  inputMode="url"
                  defaultValue={profile.links[k] ?? ""}
                  placeholder={LINKS[k].host ? `https://${LINKS[k].host}/…` : "https://"}
                  className="h-11"
                />
              )}
            </Field>
          ))}
        </div>
      </fieldset>

      <fieldset className="space-y-4">
        <legend className="mb-1 font-display text-base font-bold text-fg">How I invest</legend>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Investing since" optional error={e("investingSince")}>
            {(p) => (
              <Select {...p} name="investingSince" defaultValue={profile.investingSince ?? ""} className="h-11">
                <option value="">Not saying</option>
                {YEARS.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field label="Approach" optional>
            {(p) => (
              <Select {...p} name="approach" defaultValue={profile.approach ?? ""} className="h-11">
                <option value="">Not saying</option>
                {APPROACHES.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field label="Time horizon" optional>
            {(p) => (
              <Select {...p} name="horizon" defaultValue={profile.horizon ?? ""} className="h-11">
                <option value="">Not saying</option>
                {HORIZONS.map((h) => (
                  <option key={h} value={h}>
                    {h}
                  </option>
                ))}
              </Select>
            )}
          </Field>
        </div>
        <Field label="Interests" optional hint="Portle suggests Guilds around them.">
          {(p) => (
            <MultiSelect
              {...p}
              name="interests"
              defaultValue={profile.interests.filter((i) => interests.includes(i))}
              options={interests.map((i) => ({ value: i, label: topicLabel(i) }))}
              placeholder="Pick a few"
              className="h-11"
            />
          )}
        </Field>
      </fieldset>

      <Field label="Pinned theses" optional error={e("featuredThesisIds")} hint="Pin up to three. Each one is still only shown to the people it's shared with.">
        {(p) => (
          <MultiSelect
            {...p}
            name="featuredThesisIds"
            value={featured}
            onChange={(v) => (v.length <= 3 ? setFeatured(v) : toast.error("Pin up to three theses."))}
            options={theses.map((t) => ({ value: t.id, label: t.title }))}
            placeholder={theses.length ? "Pick theses to pin" : "Write a thesis first"}
            className="h-11"
          />
        )}
      </Field>

      <fieldset>
        <legend className="font-display text-base font-bold text-fg">Sections</legend>
        <p className="mt-1 mb-2 text-[0.8125rem] text-fg-subtle">
          Drag to change the order. Switch off what you&apos;d rather not show. Your privacy settings still decide who sees each one.
        </p>
        <SectionOrder value={sections} onChange={setSections} />
      </fieldset>

      <Field label="Who can comment" hint="You can delete any comment on your profile. People can delete their own.">
        {(p) => (
          <Select {...p} name="commentAudience" defaultValue={profile.commentAudience} className="h-11 sm:max-w-sm">
            {COMMENT_AUDIENCES.map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </Select>
        )}
      </Field>

      {state && !state.ok && !state.fieldErrors ? <Callout tone="negative">{state.error}</Callout> : null}
      <Button type="submit" size="lg" loading={pending}>
        Save profile
      </Button>
    </form>
  );
}

export type ExperienceRow = { id: string; title: string; organisation: string; startYear: number; endYear: number | null; description: string };

function ExperienceSheet({ entry, trigger }: { entry?: ExperienceRow; trigger: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(saveExperienceAction, null);
  const [deleting, startDelete] = useTransition();
  useResultToast(state, { onSuccess: () => setOpen(false) });
  const e = (k: string) => fieldError(state, k);
  return (
    <Dialog
      open={open}
      onOpenChange={setOpen}
      title={entry ? "Change experience" : "Add experience"}
      description="Work or study, like on LinkedIn."
      trigger={trigger}
    >
      <form action={action} className="space-y-4">
        {entry ? <input type="hidden" name="id" value={entry.id} /> : null}
        <Field label="Title" error={e("title")}>
          {(p) => <Input {...p} name="title" required maxLength={80} defaultValue={entry?.title} placeholder="Software developer" className="h-11" />}
        </Field>
        <Field label="Where" optional error={e("organisation")}>
          {(p) => <Input {...p} name="organisation" maxLength={80} defaultValue={entry?.organisation} placeholder="Company or school" className="h-11" />}
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="From" error={e("startYear")}>
            {(p) => (
              <Select {...p} name="startYear" required defaultValue={entry?.startYear ?? ""} className="h-11">
                <option value="" disabled>
                  Year
                </option>
                {YEARS.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field label="To" error={e("endYear")}>
            {(p) => (
              <Select {...p} name="endYear" defaultValue={entry ? (entry.endYear ?? "now") : "now"} className="h-11">
                <option value="now">Now</option>
                {YEARS.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </Select>
            )}
          </Field>
        </div>
        <Field label="A line about it" optional error={e("description")}>
          {(p) => <Textarea {...p} name="description" maxLength={280} defaultValue={entry?.description} className="min-h-20" />}
        </Field>
        <Button type="submit" size="lg" loading={pending} className="w-full">
          {entry ? "Save" : "Add"}
        </Button>
        {entry ? (
          <Button
            type="button"
            variant="ghost"
            loading={deleting}
            className="w-full text-negative"
            onClick={() =>
              startDelete(async () => {
                const r = await deleteExperienceAction(entry.id);
                if (r.ok) {
                  toast.success("Removed.");
                  setOpen(false);
                } else toast.error(r.error);
              })
            }
          >
            Remove
          </Button>
        ) : null}
      </form>
    </Dialog>
  );
}

/** Work or study on your profile: tap an entry to change it. */
export function ExperienceList({ entries }: { entries: ExperienceRow[] }) {
  return (
    <div>
      {entries.length ? (
        <ul>
          {entries.map((x) => (
            <li key={x.id} className="border-b border-line last:border-b-0">
              <ExperienceSheet
                entry={x}
                trigger={
                  <button type="button" className="group flex w-full items-start gap-3 py-3 text-left">
                    <span className="min-w-0 flex-1">
                      <span className="block font-medium text-fg group-hover:underline">{x.title}</span>
                      <span className="block text-[0.8125rem] text-fg-subtle">
                        {[x.organisation, `${x.startYear} – ${x.endYear ?? "now"}`].filter(Boolean).join(" · ")}
                      </span>
                    </span>
                    <Pencil className="mt-1 size-4 shrink-0 text-fg-subtle" aria-hidden />
                  </button>
                }
              />
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-fg-muted">Nothing yet. Add your work or study, the way you would on LinkedIn.</p>
      )}
      <ExperienceSheet
        trigger={
          <Button variant="secondary" className="mt-4">
            <Plus className="size-4" aria-hidden /> Add experience
          </Button>
        }
      />
    </div>
  );
}
