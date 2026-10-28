import { describe, expect, it } from "vitest";
import { canRemoveMember, canView, guildCan, profileAccess, type Viewer } from "./permissions";

const viewer = (userId: string, opts: Partial<Omit<Viewer, "userId">> = {}): Viewer => ({
  userId,
  friendIds: new Set(),
  guildIds: new Set(),
  blockedIds: new Set(),
  ...opts,
});

describe("canView", () => {
  it("lets owners see everything", () => {
    expect(canView(viewer("a"), { ownerId: "a", audience: "private" })).toBe(true);
  });

  it("hides private content from friends", () => {
    expect(canView(viewer("b", { friendIds: new Set(["a"]) }), { ownerId: "a", audience: "private" })).toBe(false);
  });

  it("shows friends-only content to friends only", () => {
    expect(canView(viewer("b", { friendIds: new Set(["a"]) }), { ownerId: "a", audience: "friends" })).toBe(true);
    expect(canView(viewer("c"), { ownerId: "a", audience: "friends" })).toBe(false);
  });

  it("scopes guild content to that guild's members", () => {
    const member = viewer("b", { guildIds: new Set(["g1"]) });
    expect(canView(member, { ownerId: "a", audience: "guild", guildId: "g1" })).toBe(true);
    expect(canView(member, { ownerId: "a", audience: "guild", guildId: "g2" })).toBe(false);
    expect(canView(member, { ownerId: "a", audience: "guild", guildId: null })).toBe(false);
  });

  it("never shows anything to anonymous visitors", () => {
    expect(canView(null, { ownerId: "a", audience: "public" })).toBe(false);
  });

  it("blocks override every audience", () => {
    expect(canView(viewer("b", { blockedIds: new Set(["a"]), friendIds: new Set(["a"]) }), { ownerId: "a", audience: "public" })).toBe(
      false,
    );
  });
});

describe("guild permissions", () => {
  it("follows the role matrix", () => {
    expect(guildCan("member", "post")).toBe(true);
    expect(guildCan("member", "remove_member")).toBe(false);
    expect(guildCan("admin", "remove_post")).toBe(true);
    expect(guildCan("admin", "change_role")).toBe(false);
    expect(guildCan("owner", "leave")).toBe(false);
    expect(guildCan(null, "post")).toBe(false);
  });

  it("protects owners and peers from removal", () => {
    expect(canRemoveMember("admin", "admin")).toBe(false);
    expect(canRemoveMember("admin", "owner")).toBe(false);
    expect(canRemoveMember("owner", "admin")).toBe(true);
    expect(canRemoveMember("member", "member")).toBe(false);
  });
});

describe("profileAccess", () => {
  it("applies each privacy setting independently", () => {
    const access = profileAccess(viewer("b", { friendIds: new Set(["a"]) }), "a", {
      profileVisibility: "friends",
      allocationVisibility: "friends",
      holdingsVisibility: "private",
      activityVisibility: "private",
      thesesDefaultVisibility: "private",
      journalDefaultVisibility: "private",
      guildsVisibility: "public",
      relicsVisibility: "friends",
    });
    expect(access).toMatchObject({ profile: true, allocation: true, holdings: false, activity: false, guilds: true, relics: true });
  });
});
