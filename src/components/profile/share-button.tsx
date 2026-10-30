"use client";

import { Share2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

/** Shares your profile link with the phone's share sheet, or copies it on a computer. */
export function ShareProfileButton({ handle }: { handle: string }) {
  const share = async () => {
    const url = `${window.location.origin}/u/${handle}`;
    try {
      if (navigator.share) await navigator.share({ url, title: "My Portle profile" });
      else {
        await navigator.clipboard.writeText(url);
        toast.success("Profile link copied.");
      }
    } catch {
      // Closing the share sheet isn't an error worth telling anyone about.
    }
  };
  return (
    <Button variant="secondary" size="sm" onClick={share}>
      <Share2 className="size-4" aria-hidden /> Share
    </Button>
  );
}
