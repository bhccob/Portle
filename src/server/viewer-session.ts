import "server-only";
import { cache } from "react";
import { buildViewer } from "./services/viewer";
import { requireMember } from "./session";

/** The signed-in member plus their relationship graph, built once per request. */
export const requireViewer = cache(async () => {
  const { user, profile } = await requireMember();
  const viewer = await buildViewer(user.id);
  return { user, profile, viewer };
});
