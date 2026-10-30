"use client";

import { useActionState, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { chipClass } from "@/components/forms/compose";
import { fieldError, useResultToast } from "@/components/forms/use-result";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { Dialog, Switch } from "@/components/ui/overlay";
import { Callout } from "@/components/ui/states";
import { INTERESTS, topicLabel } from "@/domain/topics";
import { createGuildAction, guildOpAction, inviteAction } from "./actions";

/** Starting a Guild: a name, an optional topic from the onboarding list, and who can join. */
export function CreateGuildDialog() {
  const [state, action, pending] = useActionState(createGuildAction, null);
  const [join, setJoin] = useState<Join>("request");
  const [listed, setListed] = useState(true);
  const [describe, setDescribe] = useState(false);
  return (
    <Dialog
      title="Start a Guild"
      description="A small group around one interest. Joining never shares anyone's portfolio."
      trigger={
        <Button>
          <Plus className="size-4" aria-hidden /> New Guild
        </Button>
      }
    >
      <form action={action} className="space-y-5">
        <Field label="Name" error={fieldError(state, "name")}>
          {(p) => <Input {...p} name="name" required minLength={3} maxLength={48} placeholder="e.g. Dividend Gardeners" className="h-12 text-base" />}
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Topic" optional>
            {(p) => (
              <Select {...p} name="topic" defaultValue="" className="h-11">
                <option value="">No topic</option>
                {INTERESTS.map((t) => (
                  <option key={t} value={topicLabel(t)}>
                    {topicLabel(t)}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field label="Who can join">
            {(p) => (
              <Select {...p} name="joinPolicy" value={join} onChange={(e) => setJoin(e.target.value as Join)} className="h-11">
                {JOIN.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
            )}
          </Field>
        </div>
        <p className="-mt-2 text-[0.8125rem] text-fg-subtle">{JOIN_HINT[join]}</p>

        <label className="flex items-center justify-between gap-4">
          <span>
            <span className="block text-[0.9375rem] text-fg">Show in Discover</span>
            <span className="block text-[0.8125rem] text-fg-subtle">{listed ? "Others can find it by name or topic." : "Hidden: only people you invite can see it."}</span>
          </span>
          <input type="hidden" name="visibility" value={listed ? "discoverable" : "private"} />
          <Switch checked={listed} onCheckedChange={setListed} aria-label="Show in Discover" />
        </label>

        {describe ? (
          <Field label="What it's for" optional>
            {(p) => <Textarea {...p} name="description" maxLength={500} className="min-h-20" autoFocus />}
          </Field>
        ) : (
          <button type="button" onClick={() => setDescribe(true)} className={chipClass}>
            <Plus aria-hidden /> Add a description
          </button>
        )}

        {state && !state.ok && !state.fieldErrors ? <Callout tone="negative">{state.error}</Callout> : null}
        <Button type="submit" size="lg" loading={pending} className="w-full">
          Start Guild
        </Button>
      </form>
    </Dialog>
  );
}

const JOIN = [
  ["open", "Anyone"],
  ["request", "Ask first"],
  ["invite", "Invite only"],
] as const;
type Join = (typeof JOIN)[number][0];

const JOIN_HINT: Record<Join, string> = {
  open: "Anyone who finds it can join straight away.",
  request: "People ask to join, and you or your admins say yes.",
  invite: "Only people you invite can join.",
};

export function GuildOpButton({
  input,
  label,
  variant = "secondary",
  confirmText,
  size = "sm",
}: {
  input: Parameters<typeof guildOpAction>[0];
  label: React.ReactNode;
  variant?: "primary" | "secondary" | "ghost" | "danger";
  confirmText?: string;
  size?: "sm" | "md";
}) {
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <Button
      size={size}
      variant={variant}
      loading={pending}
      onClick={() => {
        if (confirmText && !confirm(confirmText)) return;
        start(async () => {
          const r = await guildOpAction(input);
          if (r.ok) {
            if (r.data) toast.success(r.data);
            if (input.op === "delete") router.push("/guilds");
            else router.refresh();
          } else toast.error(r.error);
        });
      }}
    >
      {label}
    </Button>
  );
}

export function ShareToggle({ guildId, share }: { guildId: string; share: boolean }) {
  const [on, setOn] = useState(share);
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <label className="flex items-start justify-between gap-4 text-sm">
      <span>
        <span className="block font-medium text-fg">Contribute my allocation percentages</span>
        <span className="block text-xs text-fg-subtle">Averaged with other consenting members. Nothing individual is ever shown, and nothing appears until at least 3 members opt in.</span>
      </span>
      <Switch
        checked={on}
        disabled={pending}
        onCheckedChange={(v) =>
          start(async () => {
            setOn(v);
            const r = await guildOpAction({ op: "share", guildId, share: v });
            if (r.ok) toast.success(r.data as string);
            else {
              setOn(!v);
              toast.error(r.error);
            }
            router.refresh();
          })
        }
      />
    </label>
  );
}

export function InviteForm({ guildId }: { guildId: string }) {
  const [state, action, pending] = useActionState(inviteAction.bind(null, guildId), null);
  useResultToast(state);
  return (
    <form action={action} className="flex gap-2">
      <Input name="handle" placeholder="@handle" aria-label="Handle to invite" required className="h-9" />
      <Button type="submit" size="sm" loading={pending} className="h-9">
        Invite
      </Button>
    </form>
  );
}
