"use server";

import { revalidatePath } from "next/cache";
import { runAction } from "@/server/action";
import { UserFacingError, type ActionResult } from "@/server/errors";
import { assertRateLimit } from "@/server/rate-limit";
import { removePicture, setPicture } from "@/server/services/pictures";
import { requireMember } from "@/server/session";

/** Saves the picture from the crop step. The server checks and remakes it; nothing from the browser is trusted. */
export async function uploadPictureAction(form: FormData): Promise<ActionResult> {
  const { user } = await requireMember();
  const res = await runAction(async () => {
    assertRateLimit(`picture:${user.id}`, 20, 3600_000);
    const file = form.get("picture");
    if (!(file instanceof File)) throw new UserFacingError("Choose a picture first.");
    await setPicture(user.id, new Uint8Array(await file.arrayBuffer()));
  }, "Photo saved.");
  if (res.ok) revalidatePath("/", "layout");
  return res;
}

export async function removePictureAction(): Promise<ActionResult> {
  const { user } = await requireMember();
  const res = await runAction(() => removePicture(user.id), "Photo removed.");
  if (res.ok) revalidatePath("/", "layout");
  return res;
}
