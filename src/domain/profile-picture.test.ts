import { describe, expect, it } from "vitest";
import type { Viewer } from "./permissions";
import { canSeePicture, cropSquare, pictureAddress, sniffPicture } from "./profile-picture";

const bytes = (...b: (number | string)[]) => new Uint8Array(b.flatMap((x) => (typeof x === "string" ? [...x].map((c) => c.charCodeAt(0)) : [x])));
const viewer = (over: Partial<Viewer> = {}): Viewer => ({ userId: "me", friendIds: new Set(), guildIds: new Set(), blockedIds: new Set(), ...over });

describe("profile picture files", () => {
  it("tells real pictures apart by their first bytes", () => {
    expect(sniffPicture(bytes(0xff, 0xd8, 0xff, 0xe0))).toBe("jpeg");
    expect(sniffPicture(bytes(0x89, "PNG", 0x0d, 0x0a, 0x1a, 0x0a, 0))).toBe("png");
    expect(sniffPicture(bytes("RIFF", 0, 0, 0, 0, "WEBPVP8 "))).toBe("webp");
    expect(sniffPicture(bytes("GIF89a", 1, 0))).toBe("gif");
    expect(sniffPicture(bytes("GIF87a", 1, 0))).toBe("gif");
  });

  it("refuses everything else, whatever the file is called", () => {
    expect(sniffPicture(bytes('<svg xmlns="http://www.w3.org/2000/svg">'))).toBeNull();
    expect(sniffPicture(bytes(0, 0, 0, 0x18, "ftypheic"))).toBeNull();
    expect(sniffPicture(bytes("%PDF-1.7"))).toBeNull();
    expect(sniffPicture(bytes("RIFF", 0, 0, 0, 0, "WAVE"))).toBeNull();
    expect(sniffPicture(bytes(0xff, 0xd8))).toBeNull();
    expect(sniffPicture(new Uint8Array())).toBeNull();
  });

  it("serves each picture from its own address", () => {
    expect(pictureAddress("0b7c6a52-1d2e-4c55-9a1f-3c4d5e6f7a8b")).toBe("/api/pictures/0b7c6a52-1d2e-4c55-9a1f-3c4d5e6f7a8b");
  });
});

describe("the crop step's square", () => {
  it("starts as the biggest square in the middle", () => {
    expect(cropSquare(4000, 3000, { zoom: 1, x: 0.5, y: 0.5 })).toEqual({ left: 500, top: 0, side: 3000 });
    expect(cropSquare(3000, 4000, { zoom: 1, x: 0.5, y: 0.5 })).toEqual({ left: 0, top: 500, side: 3000 });
  });

  it("gets smaller as you zoom in, around the point you moved to", () => {
    expect(cropSquare(4000, 3000, { zoom: 2, x: 0.25, y: 0.5 })).toEqual({ left: 250, top: 750, side: 1500 });
  });

  it("never runs off an edge, however far you drag", () => {
    expect(cropSquare(4000, 3000, { zoom: 2, x: -1, y: 5 })).toEqual({ left: 0, top: 1500, side: 1500 });
    expect(cropSquare(4000, 3000, { zoom: 1, x: 1, y: 0 })).toEqual({ left: 1000, top: 0, side: 3000 });
  });

  it("treats zooming out past the start as the start", () => {
    expect(cropSquare(1000, 1000, { zoom: 0.2, x: 0.5, y: 0.5 })).toEqual({ left: 0, top: 0, side: 1000 });
  });
});

describe("who sees a picture", () => {
  it("follows the profile: everyone for public, friends for friends, only you for private", () => {
    expect(canSeePicture(viewer(), "anna", "public")).toBe(true);
    expect(canSeePicture(viewer(), "anna", "friends")).toBe(false);
    expect(canSeePicture(viewer({ friendIds: new Set(["anna"]) }), "anna", "friends")).toBe(true);
    expect(canSeePicture(viewer({ friendIds: new Set(["anna"]) }), "anna", "private")).toBe(false);
    expect(canSeePicture(viewer({ userId: "anna" }), "anna", "private")).toBe(true);
  });

  it("is hidden both ways after a block, and from anyone signed out", () => {
    expect(canSeePicture(viewer({ blockedIds: new Set(["anna"]) }), "anna", "public")).toBe(false);
    expect(canSeePicture(null, "anna", "public")).toBe(false);
  });
});
