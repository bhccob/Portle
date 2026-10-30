"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Ban, MoreHorizontal, UserMinus } from "lucide-react";
import { toast } from "sonner";
import { friendAction } from "@/app/(app)/feed/actions";
import { Menu, MenuItem } from "@/components/ui/overlay";

/** "…" beside Add friend: the rarer choices, so the row stays short enough for a phone. */
export function ProfileMenu({ userId, name, friends }: { userId: string; name: string; friends: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const run = (kind: "remove" | "block", label: string) => {
    if (!confirm(`${label} ${name}?`)) return;
    start(async () => {
      const r = await friendAction(kind, userId);
      if (r.ok) toast.success(r.message);
      else toast.error(r.error);
      router.refresh();
    });
  };
  return (
    <Menu
      trigger={
        <button
          type="button"
          aria-label="More"
          disabled={pending}
          className="grid size-8 shrink-0 place-items-center rounded-full bg-field text-fg transition-colors hover:bg-field-hover"
        >
          <MoreHorizontal className="size-4" aria-hidden />
        </button>
      }
    >
      {friends ? (
        <MenuItem onSelect={() => run("remove", "Remove friend")}>
          <UserMinus className="size-4" aria-hidden /> Remove friend
        </MenuItem>
      ) : null}
      <MenuItem destructive onSelect={() => run("block", "Block")}>
        <Ban className="size-4" aria-hidden /> Block {name.split(" ")[0]}
      </MenuItem>
    </Menu>
  );
}
