"use client";

import { useActionState, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { fieldError, useResultToast } from "@/components/forms/use-result";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { Dialog, Switch } from "@/components/ui/overlay";
import { Callout } from "@/components/ui/states";
import { createGuildAction, guildOpAction, inviteAction } from "./actions";

export function CreateGuildDialog() {
  const [state, action, pending] = useActionState(createGuildAction, null);
  return (
    <Dialog
      title="Found a Guild"
      description="A focused group around one investing interest. You'll be its owner."
      trigger={
        <Button>
          <Plus className="size-4" aria-hidden /> New Guild
        </Button>
      }
    >
      <form action={action} className="space-y-4">
        <Field label="Name" error={fieldError(state, "name")}>
          {(p) => <Input {...p} name="name" required minLength={3} maxLength={48} placeholder="e.g. Long Horizon" />}
        </Field>
        <Field label="Topic" optional>
          {(p) => <Input {...p} name="topic" maxLength={48} placeholder="e.g. Dividend investing" />}
        </Field>
        <Field label="What it's for" optional>
          {(p) => <Textarea {...p} name="description" maxLength={500} className="min-h-20" />}
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Who can find it">
            {(p) => (
              <Select {...p} name="visibility" defaultValue="discoverable">
                <option value="discoverable">Listed in Discover</option>
                <option value="private">Private (invite only to see)</option>
              </Select>
            )}
          </Field>
          <Field label="How people join">
            {(p) => (
              <Select {...p} name="joinPolicy" defaultValue="request">
                <option value="open">Anyone can join</option>
                <option value="request">Request, admins approve</option>
                <option value="invite">Invitation only</option>
              </Select>
            )}
          </Field>
        </div>
        {state && !state.ok && !state.fieldErrors ? <Callout tone="negative">{state.error}</Callout> : null}
        <Button type="submit" loading={pending} className="w-full">
          Create Guild
        </Button>
      </form>
    </Dialog>
  );
}

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
