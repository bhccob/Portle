"use client";

import { useActionState, useTransition } from "react";
import { Mail } from "lucide-react";
import { toast } from "sonner";
import { cancelInviteAction, decideAccessAction, inviteAccessAction, removeAccessAction } from "@/app/actions/access";
import { useResetKey, useResultToast } from "@/components/forms/use-result";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import { Dialog, DialogClose } from "@/components/ui/overlay";

export function AccessDecision({ memberId, name }: { memberId: string; name: string }) {
  const [pending, start] = useTransition();
  const decide = (allow: boolean) =>
    start(async () => {
      const r = await decideAccessAction(memberId, allow);
      if (r.ok) toast.success(allow ? `${name} is in.` : "Request declined.");
      else toast.error(r.error);
    });
  return (
    <div className="mt-2.5 flex gap-2">
      <Button size="sm" onClick={() => decide(true)} loading={pending}>
        Let in
      </Button>
      <Button size="sm" variant="secondary" onClick={() => decide(false)} disabled={pending}>
        Not now
      </Button>
    </div>
  );
}

export function RemoveAccess({ memberId, name, brokers }: { memberId: string; name: string; brokers: number }) {
  const [pending, start] = useTransition();
  return (
    <Dialog
      title={`Take Plus away from ${name}?`}
      description={
        brokers > 1
          ? "Market prices and Practice switch off, and every broker after their first is disconnected, which frees those spots. What was already copied stays in their Portle as a record."
          : "Market prices and Practice switch off. Their first broker keeps working on the free plan, and they can ask again later."
      }
      trigger={
        <Button size="sm" variant="secondary">
          Remove
        </Button>
      }
    >
      <div className="flex justify-end gap-2">
        <DialogClose asChild>
          <Button variant="ghost">Keep</Button>
        </DialogClose>
        <Button
          variant="danger"
          loading={pending}
          onClick={() =>
            start(async () => {
              const r = await removeAccessAction(memberId);
              if (r.ok) toast.success("Plus removed.");
              else toast.error(r.error);
            })
          }
        >
          Remove Plus
        </Button>
      </div>
    </Dialog>
  );
}

export function InviteByEmail() {
  const [state, action, pending] = useActionState(inviteAccessAction, null);
  const [key, reset] = useResetKey();
  useResultToast(state, {
    silentSuccess: true,
    onSuccess: (d) => {
      toast.success(d.joined ? "They're in." : "Done. They'll have Plus when they sign up with that email.");
      reset();
    },
  });
  return (
    <form key={key} action={action} className="mt-4 flex gap-2">
      <label htmlFor="invite-email" className="sr-only">
        Email to let in
      </label>
      <div className="relative flex-1">
        <Mail className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-fg-subtle" aria-hidden />
        <Input id="invite-email" name="email" type="email" required placeholder="Let someone in by email" className="h-11 pl-9" />
      </div>
      <Button type="submit" variant="secondary" loading={pending} className="h-11">
        Let in
      </Button>
    </form>
  );
}

export function CancelInvite({ email }: { email: string }) {
  const [pending, start] = useTransition();
  return (
    <Button
      size="sm"
      variant="ghost"
      loading={pending}
      onClick={() =>
        start(async () => {
          const r = await cancelInviteAction(email);
          if (!r.ok) toast.error(r.error);
        })
      }
    >
      Cancel
    </Button>
  );
}
