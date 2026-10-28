"use client";

import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { fieldError, useResultToast } from "@/components/forms/use-result";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { Dialog } from "@/components/ui/overlay";
import { Callout } from "@/components/ui/states";
import { authClient, authErrorMessage } from "@/lib/auth-client";
import { updatePrivacyAction, updateProfileAction } from "./actions";

export function ProfileForm({ profile, interests }: { profile: { displayName: string; bio: string; interests: string[]; avatarHue: string; handle: string }; interests: readonly string[] }) {
  const [state, action, pending] = useActionState(updateProfileAction, null);
  const [hue, setHue] = useState(profile.avatarHue);
  const [name, setName] = useState(profile.displayName);
  useResultToast(state);
  return (
    <form action={action} className="space-y-5">
      <div className="flex items-center gap-4">
        <Avatar name={name} hue={hue} size="lg" />
        <Field label="Avatar colour" className="flex-1">
          {(p) => <input {...p} type="range" name="avatarHue" min={0} max={359} value={hue} onChange={(e) => setHue(e.target.value)} className="w-full accent-[var(--primary)]" />}
        </Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Display name" error={fieldError(state, "displayName")}>
          {(p) => <Input {...p} name="displayName" value={name} onChange={(e) => setName(e.target.value)} required maxLength={40} />}
        </Field>
        <Field label="Handle" hint="Handles can't be changed yet.">
          {(p) => <Input {...p} value={`@${profile.handle}`} disabled readOnly />}
        </Field>
      </div>
      <Field label="Bio" optional hint="Up to 280 characters. Don't include account details.">
        {(p) => <Textarea {...p} name="bio" defaultValue={profile.bio} maxLength={280} className="min-h-20" />}
      </Field>
      <fieldset>
        <legend className="mb-2 text-[0.8125rem] font-medium text-fg-muted">Interests</legend>
        <div className="flex flex-wrap gap-2">
          {interests.map((i) => (
            <label
              key={i}
              className="cursor-pointer rounded-full border border-line bg-field px-3 py-1.5 text-[0.8125rem] text-fg-muted select-none hover:border-line-strong has-[:checked]:border-transparent has-[:checked]:bg-selected has-[:checked]:text-fg has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-[var(--focus)]"
            >
              <input type="checkbox" name="interests" value={i} defaultChecked={profile.interests.includes(i)} className="sr-only" />
              {i}
            </label>
          ))}
        </div>
      </fieldset>
      <Button type="submit" loading={pending}>
        Save profile
      </Button>
    </form>
  );
}

type Privacy = Record<string, string | boolean>;
const ROWS: { name: string; label: string; hint: string; options?: [string, string][] }[] = [
  { name: "profileVisibility", label: "Your profile", hint: "Name, bio and interests." },
  { name: "allocationVisibility", label: "Allocation percentages", hint: "By asset class, region and sector. Never values." },
  { name: "holdingsVisibility", label: "Holdings by weight", hint: "Symbols and percentages. Never quantities or values." },
  { name: "relicsVisibility", label: "Relics", hint: "Only the ones you choose to display." },
  { name: "guildsVisibility", label: "Guild memberships", hint: "Private Guilds stay hidden from non-members regardless." },
  { name: "activityVisibility", label: "Activity", hint: "Reserved for future activity summaries." },
  { name: "thesesDefaultVisibility", label: "Default for new theses", hint: "You can change it per thesis." },
  { name: "journalDefaultVisibility", label: "Default for new journal entries", hint: "", options: [["private", "Only me"], ["friends", "Friends"]] },
];

export function PrivacyForm({ privacy }: { privacy: Privacy }) {
  const [state, action, pending] = useActionState(updatePrivacyAction, null);
  const router = useRouter();
  useResultToast(state, { onSuccess: () => router.refresh() });
  return (
    <form action={action} className="space-y-4">
      <ul className="divide-y divide-line">
        {ROWS.map((r) => (
          <li key={r.name} className="flex flex-wrap items-center justify-between gap-3 py-3">
            <div className="min-w-0">
              <label htmlFor={r.name} className="text-sm font-medium text-fg">
                {r.label}
              </label>
              {r.hint ? <p className="text-xs text-fg-subtle">{r.hint}</p> : null}
            </div>
            <Select id={r.name} name={r.name} defaultValue={String(privacy[r.name])} className="h-9 w-40 text-[0.8125rem]">
              {(r.options ?? [["private", "Only me"], ["friends", "Friends"], ["public", "All members"]]).map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </Select>
          </li>
        ))}
        <li className="flex items-center justify-between gap-3 py-3">
          <label htmlFor="discoverable" className="min-w-0">
            <span className="block text-sm font-medium text-fg">Appear in member search</span>
            <span className="block text-xs text-fg-subtle">Friends can always find you.</span>
          </label>
          <input id="discoverable" type="checkbox" name="discoverable" defaultChecked={!!privacy.discoverable} className="size-4 accent-[var(--primary)]" />
        </li>
      </ul>
      <Button type="submit" loading={pending}>
        Save privacy settings
      </Button>
    </form>
  );
}

export function DeleteAccountDialog() {
  const [password, setPassword] = useState("");
  const [confirmText, setConfirm] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <Dialog
      title="Delete your account"
      description="This permanently deletes your profile, portfolio records, theses, journal, Paper Lab history, posts and comments. Guilds you own pass to an admin or are dissolved."
      trigger={<Button variant="danger">Delete account…</Button>}
    >
      <form
        className="space-y-4"
        onSubmit={async (e) => {
          e.preventDefault();
          setPending(true);
          setError(null);
          const { error } = await authClient.deleteUser({ password, callbackURL: "/" });
          setPending(false);
          if (error) setError(authErrorMessage(error));
          else {
            toast.success("Your account was deleted.");
            window.location.href = "/";
          }
        }}
      >
        <Callout tone="warning">Download your data first if you want a copy. This cannot be undone.</Callout>
        <Field label="Your password">{(p) => <Input {...p} type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />}</Field>
        <Field label='Type "delete my archive" to confirm'>{(p) => <Input {...p} required value={confirmText} onChange={(e) => setConfirm(e.target.value)} />}</Field>
        {error ? <Callout tone="negative">{error}</Callout> : null}
        <Button type="submit" variant="danger" loading={pending} disabled={confirmText.trim().toLowerCase() !== "delete my archive" || !password} className="w-full">
          Permanently delete
        </Button>
      </form>
    </Dialog>
  );
}
