"use client";

import { useActionState, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Ban, Check, Trash2, UserMinus, UserPlus, X } from "lucide-react";
import { toast } from "sonner";
import { useResultToast } from "@/components/forms/use-result";
import { Button } from "@/components/ui/button";
import { Select, Textarea } from "@/components/ui/field";
import { createPostAction, deletePostAction, friendAction } from "./actions";

export function Composer({ theses, guilds }: { theses: { id: string; title: string; visibility: string }[]; guilds: { id: string; name: string }[] }) {
  const [state, action, pending] = useActionState(createPostAction, null);
  const [audience, setAudience] = useState("friends");
  const [attach, setAttach] = useState<"none" | "thesis" | "insight">("none");
  const [formKey, setFormKey] = useState(0);
  const router = useRouter();
  useResultToast(state, {
    onSuccess: () => {
      setFormKey((k) => k + 1);
      setAttach("none");
      router.refresh();
    },
  });
  return (
    <form action={action} key={formKey} className="space-y-3">
      <label htmlFor="post-body" className="sr-only">
        Share something
      </label>
      <Textarea id="post-body" name="body" required maxLength={2000} placeholder="Share a thought, a question, or what you're researching. No tips, no hype." className="min-h-20" />
      <div className="flex flex-wrap items-center gap-2">
        <Select name="audience" aria-label="Audience" value={audience} onChange={(e) => setAudience(e.target.value)} className="h-9 w-auto text-[0.8125rem]">
          <option value="friends">Friends</option>
          <option value="guild" disabled={!guilds.length}>
            A Guild
          </option>
          <option value="public">All members</option>
        </Select>
        {audience === "guild" ? (
          <Select name="guildId" aria-label="Guild" className="h-9 w-auto text-[0.8125rem]">
            {guilds.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </Select>
        ) : null}
        <Select aria-label="Attach" value={attach} onChange={(e) => setAttach(e.target.value as typeof attach)} className="h-9 w-auto text-[0.8125rem]">
          <option value="none">Attach nothing</option>
          <option value="thesis" disabled={!theses.length}>
            Attach a thesis
          </option>
          <option value="insight">Attach my mix</option>
        </Select>
        <Button type="submit" size="sm" loading={pending} className="ml-auto">
          Share
        </Button>
      </div>
      {attach === "thesis" ? (
        <Select name="thesisId" aria-label="Thesis to share" className="text-[0.8125rem]">
          {theses.map((t) => (
            <option key={t.id} value={t.id}>
              {t.title} ({t.visibility})
            </option>
          ))}
        </Select>
      ) : null}
      {attach === "insight" ? (
        <div className="space-y-1">
          <Select name="insightDimension" aria-label="Allocation to share" className="text-[0.8125rem]">
            <option value="assetClass">By asset class</option>
            <option value="sector">By sector</option>
            <option value="region">By region</option>
            <option value="currency">By currency</option>
          </Select>
          <p className="text-xs text-fg-subtle">Shares percentages only, computed from your holdings at the moment you post. No values, quantities or accounts.</p>
        </div>
      ) : null}
      {state && !state.ok && state.fieldErrors ? <p className="text-sm text-negative">{Object.values(state.fieldErrors)[0]}</p> : null}
    </form>
  );
}

export function DeletePostButton({ id }: { id: string }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label="Delete post"
      loading={pending}
      onClick={() => {
        if (!confirm("Remove this post?")) return;
        start(async () => {
          const r = await deletePostAction(id);
          if (r.ok) toast.success(r.message);
          else toast.error(r.error);
          router.refresh();
        });
      }}
    >
      {pending ? null : <Trash2 className="size-4" />}
    </Button>
  );
}

type Kind = Parameters<typeof friendAction>[0];
const LABELS: Record<Kind, { label: string; Icon: typeof Check; variant: "primary" | "secondary" | "ghost" | "danger" }> = {
  request: { label: "Add friend", Icon: UserPlus, variant: "primary" },
  accept: { label: "Accept", Icon: Check, variant: "primary" },
  decline: { label: "Decline", Icon: X, variant: "ghost" },
  remove: { label: "Remove friend", Icon: UserMinus, variant: "ghost" },
  block: { label: "Block", Icon: Ban, variant: "ghost" },
  unblock: { label: "Unblock", Icon: Ban, variant: "secondary" },
};

export function FriendButton({ kind, userId, name }: { kind: Kind; userId: string; name?: string }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  const { label, Icon, variant } = LABELS[kind];
  return (
    <Button
      size="sm"
      variant={variant}
      loading={pending}
      onClick={() => {
        if ((kind === "block" || kind === "remove") && !confirm(`${label} ${name ?? "this member"}?`)) return;
        start(async () => {
          const r = await friendAction(kind, userId);
          if (r.ok) toast.success(r.message);
          else toast.error(r.error);
          router.refresh();
        });
      }}
    >
      <Icon className="size-4" aria-hidden /> {label}
    </Button>
  );
}
