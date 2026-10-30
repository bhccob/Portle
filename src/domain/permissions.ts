export type Audience = "private" | "friends" | "guild" | "public";

/** Everything the server knows about who is asking. Built once per request. */
export type Viewer = {
  userId: string;
  friendIds: ReadonlySet<string>;
  guildIds: ReadonlySet<string>;
  /** Users this viewer blocked, or who blocked this viewer. */
  blockedIds: ReadonlySet<string>;
};

export type Resource = { ownerId: string; audience: Audience; guildId?: string | null };

/**
 * The single visibility rule for user content. "public" means every signed-in
 * member; Portle never serves user content to anonymous visitors.
 */
export function canView(viewer: Viewer | null, resource: Resource): boolean {
  if (!viewer) return false;
  if (viewer.userId === resource.ownerId) return true;
  if (viewer.blockedIds.has(resource.ownerId)) return false;
  switch (resource.audience) {
    case "private":
      return false;
    case "friends":
      return viewer.friendIds.has(resource.ownerId);
    case "guild":
      return !!resource.guildId && viewer.guildIds.has(resource.guildId);
    case "public":
      return true;
  }
}

/** Interacting (commenting, reacting) requires seeing, and is blocked both ways. */
export function canInteract(viewer: Viewer | null, resource: Resource): boolean {
  return canView(viewer, resource);
}

/**
 * Who may write on a profile. "private" switches comments off for everyone, the owner too;
 * otherwise it's the usual rule, so blocks still apply and the owner can always reply.
 */
export function canCommentOnProfile(viewer: Viewer | null, ownerId: string, audience: Audience): boolean {
  return audience !== "private" && canInteract(viewer, { ownerId, audience });
}

export type GuildRole = "owner" | "admin" | "member";

export type GuildAction =
  | "post"
  | "comment"
  | "invite"
  | "approve_request"
  | "remove_member"
  | "remove_post"
  | "change_role"
  | "edit_guild"
  | "delete_guild"
  | "leave";

const GUILD_MATRIX: Record<GuildAction, GuildRole[]> = {
  post: ["owner", "admin", "member"],
  comment: ["owner", "admin", "member"],
  leave: ["admin", "member"],
  invite: ["owner", "admin"],
  approve_request: ["owner", "admin"],
  remove_member: ["owner", "admin"],
  remove_post: ["owner", "admin"],
  change_role: ["owner"],
  edit_guild: ["owner", "admin"],
  delete_guild: ["owner"],
};

export function guildCan(role: GuildRole | null, action: GuildAction): boolean {
  return !!role && GUILD_MATRIX[action].includes(role);
}

/** Admins may remove members but never the owner or other admins; owners may remove anyone but themselves. */
export function canRemoveMember(actor: GuildRole | null, target: GuildRole): boolean {
  if (actor === "owner") return target !== "owner";
  if (actor === "admin") return target === "member";
  return false;
}

export type PrivacySettings = {
  profileVisibility: Audience;
  activityVisibility: Audience;
  thesesDefaultVisibility: Audience;
  journalDefaultVisibility: Audience;
  guildsVisibility: Audience;
  relicsVisibility: Audience;
};

/** Which profile sections a viewer may see. Exact values are never in this list. */
export function profileAccess(viewer: Viewer | null, ownerId: string, settings: PrivacySettings) {
  const can = (audience: Audience) => canView(viewer, { ownerId, audience });
  return {
    profile: can(settings.profileVisibility),
    activity: can(settings.activityVisibility),
    guilds: can(settings.guildsVisibility),
    relics: can(settings.relicsVisibility),
  };
}
