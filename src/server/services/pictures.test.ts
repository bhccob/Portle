import { eq } from "drizzle-orm";
import sharp from "sharp";
import { beforeAll, describe, expect, it } from "vitest";
import { createTestDb, createTestUser } from "@/test/db";
import type { Db } from "../db";
import { privacySettings, profilePictures, profiles } from "../db/schema";
import { makePicture, pictureFile, removePicture, setPicture, withPictures } from "./pictures";
import { completeOnboarding, getProfileView } from "./profile";
import { addProfileComment } from "./profile-comments";
import { blockUser, respondFriendRequest, sendFriendRequest } from "./social";
import { buildViewer } from "./viewer";

let db: Db;
const ids: Record<"bob" | "anna" | "cleo" | "dev", string> = { bob: "", anna: "", cleo: "", dev: "" };

/** A photo of two halves, red on the left and blue on the right. */
const halves = (width: number, height: number, format: "png" | "jpeg" = "png") =>
  sharp({ create: { width, height, channels: 3, background: "#ff0000" } })
    .composite([{ input: { create: { width: width / 2, height, channels: 3, background: "#0000ff" } }, left: width / 2, top: 0 }])
    [format]()
    .toBuffer();

const pixel = async (img: Buffer, x: number, y: number) => {
  const { data, info } = await sharp(img).raw().toBuffer({ resolveWithObject: true });
  const i = (y * info.width + x) * info.channels;
  return [data[i], data[i + 1], data[i + 2]];
};

beforeAll(async () => {
  db = await createTestDb();
  for (const name of ["bob", "anna", "cleo", "dev"] as const) {
    const u = await createTestUser(db, name);
    await completeOnboarding(u.id, { handle: `${name}_pic`, displayName: name, baseCurrency: "EUR", acceptTerms: true, paperStartingCash: "10000" });
    ids[name] = u.id;
  }
  // Bob and Anna are friends. Bob's profile is friends-only (the default); Anna's is open to every member.
  await sendFriendRequest(ids.anna, ids.bob);
  await respondFriendRequest(ids.bob, ids.anna, true);
  await db.update(privacySettings).set({ profileVisibility: "public" }).where(eq(privacySettings.userId, ids.anna));
});

describe("making a picture from an upload", () => {
  it("crops the middle square and shrinks it to 256px WebP", async () => {
    const out = await makePicture(await halves(800, 400));
    const meta = await sharp(out).metadata();
    expect([meta.format, meta.width, meta.height]).toEqual(["webp", 256, 256]);
    // The middle 400px of an 800px photo: the left half red, the right half blue.
    expect((await pixel(out, 20, 128))[0]).toBeGreaterThan(200);
    expect((await pixel(out, 236, 128))[2]).toBeGreaterThan(200);
  });

  it("drops the photo's hidden details and turns it upright", async () => {
    // Stored sideways with an EXIF tag saying "turn me a quarter", like many phone photos.
    const sideways = await sharp(await halves(400, 200, "jpeg"))
      .withMetadata({ orientation: 6, exif: { IFD0: { Copyright: "Bob's phone" } } })
      .jpeg()
      .toBuffer();
    expect((await sharp(sideways).metadata()).exif).toBeDefined();
    const out = await makePicture(sideways);
    const meta = await sharp(out).metadata();
    expect(meta.exif).toBeUndefined();
    expect(meta.orientation).toBeUndefined();
    // Turned upright, the red half is now on top.
    expect((await pixel(out, 128, 20))[0]).toBeGreaterThan(200);
    expect((await pixel(out, 128, 236))[2]).toBeGreaterThan(200);
  });

  it("refuses files that aren't pictures, even with a picture's name", async () => {
    await expect(makePicture(new TextEncoder().encode("<svg xmlns='http://www.w3.org/2000/svg'/>"))).rejects.toThrow(/isn't a picture/);
    await expect(makePicture(new Uint8Array())).rejects.toThrow(/isn't a picture/);
  });

  it("refuses a file that starts like a picture but isn't one", async () => {
    const broken = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3, 4, 5]);
    await expect(makePicture(broken)).rejects.toThrow(/isn't a picture/);
  });

  it("refuses pictures that are too small or too big", async () => {
    await expect(makePicture(await halves(80, 80))).rejects.toThrow(/too small/);
    const huge = new Uint8Array(1_000_000);
    huge.set([0xff, 0xd8, 0xff, 0xe0]);
    await expect(makePicture(huge)).rejects.toThrow(/too big/);
  });

  it("refuses a tiny file that claims a huge picture", async () => {
    const bomb = await sharp({ create: { width: 8000, height: 8000, channels: 3, background: "#000" } })
      .png({ compressionLevel: 9 })
      .toBuffer();
    expect(bomb.length).toBeLessThan(900_000);
    await expect(makePicture(bomb)).rejects.toThrow(/isn't a picture/);
  });
});

describe("saving and removing", () => {
  it("gives each new upload a new address and keeps only the newest", async () => {
    const first = await setPicture(ids.bob, await halves(400, 400));
    const second = await setPicture(ids.bob, await halves(400, 400));
    expect(second).not.toBe(first);
    const rows = await db.select().from(profilePictures).where(eq(profilePictures.userId, ids.bob));
    expect(rows.map((r) => r.id)).toEqual([second]);
    const [p] = await db.select({ picture: profiles.picture }).from(profiles).where(eq(profiles.userId, ids.bob));
    expect(p.picture).toBe(second);
    expect(await pictureFile(ids.bob, first)).toBeNull();
  });

  it("goes back to the letters when removed", async () => {
    await setPicture(ids.cleo, await halves(400, 400));
    await removePicture(ids.cleo);
    const [p] = await db.select({ picture: profiles.picture }).from(profiles).where(eq(profiles.userId, ids.cleo));
    expect(p.picture).toBeNull();
    expect(await db.select().from(profilePictures).where(eq(profilePictures.userId, ids.cleo))).toEqual([]);
  });
});

describe("who gets a picture", () => {
  it("serves it only to people who may see the profile", async () => {
    const bobs = await setPicture(ids.bob, await halves(400, 400));
    expect((await pictureFile(ids.bob, bobs))?.contentType).toBe("image/webp");
    expect(await pictureFile(ids.anna, bobs)).not.toBeNull();
    // Cleo isn't Bob's friend and his profile is friends-only.
    expect(await pictureFile(ids.cleo, bobs)).toBeNull();

    const annas = await setPicture(ids.anna, await halves(400, 400));
    expect(await pictureFile(ids.cleo, annas)).not.toBeNull();
  });

  it("swaps the stored id for an address, or null for the letters, and never hands out the id", async () => {
    const people = await db.select({ userId: profiles.userId, picture: profiles.picture, handle: profiles.handle }).from(profiles);
    const asCleo = await withPictures(await buildViewer(ids.cleo), people);
    const by = (h: string) => asCleo.find((p) => p.handle === h)!;
    expect(by("anna_pic").pictureUrl).toMatch(/^\/api\/pictures\/[0-9a-f-]{36}$/);
    expect(by("bob_pic").pictureUrl).toBeNull();
    expect(by("dev_pic").pictureUrl).toBeNull();
    expect(asCleo.every((p) => !("picture" in p))).toBe(true);
    // A page that only knows the member's id gets the same answer.
    expect((await withPictures(ids.anna, people)).find((p) => p.handle === "bob_pic")!.pictureUrl).not.toBeNull();
  });

  it("hides it from someone blocked, even on an open profile", async () => {
    const annas = (await db.select({ picture: profiles.picture }).from(profiles).where(eq(profiles.userId, ids.anna)))[0].picture!;
    await blockUser(ids.dev, ids.anna);
    expect(await pictureFile(ids.dev, annas)).toBeNull();
  });

  it("shows on a profile page and its comments the same way", async () => {
    await db.update(profiles).set({ commentAudience: "public" }).where(eq(profiles.userId, ids.anna));
    await setPicture(ids.cleo, await halves(400, 400));
    await addProfileComment(await buildViewer(ids.bob), ids.anna, "Nice notes.");
    await addProfileComment(await buildViewer(ids.cleo), ids.anna, "Agreed.");
    await addProfileComment(await buildViewer(ids.anna), ids.anna, "Thanks both.");
    const view = await getProfileView(await buildViewer(ids.cleo), "anna_pic");
    expect(view.profile.pictureUrl).toMatch(/^\/api\/pictures\//);
    const shown = Object.fromEntries(view.comments!.comments.map((c) => [c.author.displayName, !!c.author.pictureUrl]));
    // Cleo can't see Bob's friends-only profile, so his comment keeps his letters for Cleo.
    expect(shown).toEqual({ anna: true, bob: false, cleo: true });
  });
});
