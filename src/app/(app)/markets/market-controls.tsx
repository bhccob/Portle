"use client";

import { useActionState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { BookmarkMinus, BookmarkPlus, Plus } from "lucide-react";
import { toast } from "sonner";
import { useResultToast } from "@/components/forms/use-result";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import { Menu, MenuItem, MenuLabel } from "@/components/ui/overlay";
import { addToWatchlistAction, createWatchlistAction, removeFromWatchlistAction } from "./actions";

export function WatchButton({ instrumentId, lists }: { instrumentId: string; lists: { id: string; name: string; has: boolean }[] }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  const toggle = (l: { id: string; has: boolean }) =>
    start(async () => {
      const r = l.has ? await removeFromWatchlistAction(l.id, instrumentId) : await addToWatchlistAction(l.id, instrumentId);
      if (r.ok) toast.success(r.message);
      else toast.error(r.error);
      router.refresh();
    });
  const watched = lists.some((l) => l.has);
  if (lists.length === 1) {
    return (
      <Button variant="secondary" loading={pending} onClick={() => toggle(lists[0])}>
        {watched ? <BookmarkMinus className="size-4" aria-hidden /> : <BookmarkPlus className="size-4" aria-hidden />}
        {watched ? "Watching" : "Watch"}
      </Button>
    );
  }
  return (
    <Menu
      trigger={
        <Button variant="secondary" loading={pending}>
          <BookmarkPlus className="size-4" aria-hidden /> {watched ? "Watching" : "Watch"}
        </Button>
      }
    >
      <MenuLabel>Your watchlists</MenuLabel>
      {lists.map((l) => (
        <MenuItem key={l.id} onSelect={() => toggle(l)}>
          {l.has ? <BookmarkMinus className="size-4" /> : <BookmarkPlus className="size-4" />} {l.has ? `Remove from ${l.name}` : `Add to ${l.name}`}
        </MenuItem>
      ))}
    </Menu>
  );
}

export function RemoveWatchItem({ watchlistId, instrumentId, symbol }: { watchlistId: string; instrumentId: string; symbol: string }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label={`Remove ${symbol} from watchlist`}
      loading={pending}
      onClick={() =>
        start(async () => {
          const r = await removeFromWatchlistAction(watchlistId, instrumentId);
          if (!r.ok) toast.error(r.error);
          router.refresh();
        })
      }
    >
      {pending ? null : <BookmarkMinus className="size-4" />}
    </Button>
  );
}

export function NewWatchlistForm({ guildId }: { guildId?: string }) {
  const [state, action, pending] = useActionState(createWatchlistAction, null);
  useResultToast(state);
  return (
    <form action={action} className="flex w-full min-w-0 gap-2">
      {guildId ? <input type="hidden" name="guildId" value={guildId} /> : null}
      <Input name="name" placeholder="New watchlist name" aria-label="New watchlist name" maxLength={60} required className="h-9 min-w-0 flex-1" />
      <Button type="submit" size="sm" variant="secondary" loading={pending} className="h-9">
        <Plus className="size-4" aria-hidden /> Create
      </Button>
    </form>
  );
}
