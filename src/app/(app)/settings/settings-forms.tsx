"use client";

import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useResultToast } from "@/components/forms/use-result";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";
import { Dialog } from "@/components/ui/overlay";
import { Callout } from "@/components/ui/states";
import { authClient, authErrorMessage } from "@/lib/auth-client";
import { updatePrivacyAction } from "./actions";

type Privacy = Record<string, string | boolean>;
const ROWS: { name: string; label: string; hint: string; options?: [string, string][] }[] = [
  { name: "profileVisibility", label: "Your profile", hint: "Name, bio and interests." },
  { name: "allocationVisibility", label: "Allocation percentages", hint: "By asset class, region and sector. Never values." },
  { name: "holdingsVisibility", label: "Holdings by weight", hint: "Symbols and percentages. Never quantities or values." },
  { name: "relicsVisibility", label: "Relics", hint: "Only the ones you choose to show." },
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
  const router = useRouter();
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
            router.replace("/");
            router.refresh();
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
