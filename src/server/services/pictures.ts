import { eq, inArray } from "drizzle-orm";
import sharp from "sharp";
import type { Audience, Viewer } from "@/domain/permissions";
import { canSeePicture, PICTURE_MAX_BYTES, PICTURE_MAX_PIXELS, PICTURE_MIN_SIDE, PICTURE_SIZE, pictureAddress, sniffPicture } from "@/domain/profile-picture";
import { audit } from "../audit";
import { getDb } from "../db";
import { privacySettings, profilePictures, profiles } from "../db/schema";
import { UserFacingError } from "../errors";
import { buildViewer } from "./viewer";

/**
 * Members' own profile pictures. Portle never keeps what was uploaded: it checks the file is a real
 * picture, crops it square, shrinks it and saves a fresh WebP, which also drops the photo's hidden
 * details (camera, place, date).
 */

const NOT_A_PICTURE = "That file isn't a picture Portle can use. Try a JPG, PNG or WebP.";

/** Checks an upload and turns it into the stored square. Throws a message the member can act on. */
export async function makePicture(bytes: Uint8Array) {
  if (!bytes.length || !sniffPicture(bytes)) throw new UserFacingError(NOT_A_PICTURE);
  if (bytes.length > PICTURE_MAX_BYTES) throw new UserFacingError("That picture is too big. Try a smaller one.");
  let meta;
  try {
    meta = await sharp(bytes, { limitInputPixels: PICTURE_MAX_PIXELS }).metadata();
  } catch {
    throw new UserFacingError(NOT_A_PICTURE);
  }
  if (!meta.width || !meta.height) throw new UserFacingError(NOT_A_PICTURE);
  if (Math.min(meta.width, meta.height) < PICTURE_MIN_SIDE) throw new UserFacingError(`That picture is too small. Use one at least ${PICTURE_MIN_SIDE} pixels wide.`);
  try {
    // rotate() turns phone photos upright from their EXIF tag before the tag is dropped.
    return await sharp(bytes, { limitInputPixels: PICTURE_MAX_PIXELS })
      .rotate()
      .resize(PICTURE_SIZE, PICTURE_SIZE, { fit: "cover", position: "centre" })
      .flatten({ background: "#ffffff" })
      .webp({ quality: 82 })
      .toBuffer();
  } catch {
    throw new UserFacingError(NOT_A_PICTURE);
  }
}

/** Saves a new picture in place of any old one and returns its id. */
export async function setPicture(userId: string, upload: Uint8Array) {
  const webp = await makePicture(upload);
  return getDb().transaction(async (tx) => {
    await tx.delete(profilePictures).where(eq(profilePictures.userId, userId));
    const [row] = await tx.insert(profilePictures).values({ userId, data: webp.toString("base64"), contentType: "image/webp" }).returning({ id: profilePictures.id });
    await tx.update(profiles).set({ picture: row.id, updatedAt: new Date() }).where(eq(profiles.userId, userId));
    await audit(tx, { userId, action: "profile.picture_set" });
    return row.id;
  });
}

/** Deletes their picture, so everyone sees their letters again. */
export async function removePicture(userId: string) {
  await getDb().transaction(async (tx) => {
    await tx.delete(profilePictures).where(eq(profilePictures.userId, userId));
    await tx.update(profiles).set({ picture: null, updatedAt: new Date() }).where(eq(profiles.userId, userId));
    await audit(tx, { userId, action: "profile.picture_removed" });
  });
}

/** The stored picture for the picture route, or null when it's gone or this member may not see it. */
export async function pictureFile(viewerId: string, id: string) {
  const [row] = await getDb()
    .select({ ownerId: profilePictures.userId, data: profilePictures.data, contentType: profilePictures.contentType, visibility: privacySettings.profileVisibility })
    .from(profilePictures)
    .leftJoin(privacySettings, eq(privacySettings.userId, profilePictures.userId))
    .where(eq(profilePictures.id, id));
  if (!row) return null;
  if (row.ownerId !== viewerId && !canSeePicture(await buildViewer(viewerId), row.ownerId, (row.visibility ?? "friends") as Audience)) return null;
  return { bytes: Buffer.from(row.data, "base64"), contentType: row.contentType };
}

/** The columns an avatar needs. Rows with them go through pictureLookup before they reach a page. */
export const personColumns = { userId: profiles.userId, handle: profiles.handle, displayName: profiles.displayName, avatarHue: profiles.avatarHue, picture: profiles.picture };

type HasPicture = { userId: string; picture: string | null };
/** A person as a page gets them: the picture's address this viewer may load, never its stored id. */
export type WithPicture<T extends HasPicture> = Omit<T, "picture"> & { pictureUrl: string | null };

/**
 * Works out, for a list of people, which pictures this viewer may see. Returns a function that swaps
 * a person's stored picture id for `pictureUrl`: its address, or null for their letters. The id
 * itself never reaches the page.
 */
export async function pictureLookup(viewer: Viewer | string, people: HasPicture[]) {
  const viewerId = typeof viewer === "string" ? viewer : viewer.userId;
  const others = [...new Set(people.filter((p) => p.picture && p.userId !== viewerId).map((p) => p.userId))];
  const db = getDb();
  // Pages that only know the member's id get their friends and Guilds loaded here, and only when someone has a picture.
  const [rows, full] = others.length
    ? await Promise.all([
        db.select({ userId: privacySettings.userId, visibility: privacySettings.profileVisibility }).from(privacySettings).where(inArray(privacySettings.userId, others)),
        typeof viewer === "string" ? buildViewer(viewer) : viewer,
      ])
    : [[], null];
  const visibility = new Map(rows.map((r) => [r.userId, r.visibility as Audience]));
  const sees = (ownerId: string) => ownerId === viewerId || canSeePicture(full, ownerId, visibility.get(ownerId) ?? "friends");
  return <T extends HasPicture>({ picture, ...rest }: T) => ({ ...rest, pictureUrl: picture && sees(rest.userId) ? pictureAddress(picture) : null }) as WithPicture<T>;
}

/** The same lookup for a plain list of people. */
export async function withPictures<T extends HasPicture>(viewer: Viewer | string, people: T[]) {
  return people.map(await pictureLookup(viewer, people));
}

/** The same lookup for rows that carry their person as `author`. */
export async function withAuthorPictures<T extends { author: HasPicture }>(viewer: Viewer | string, rows: T[]) {
  const face = await pictureLookup(viewer, rows.map((r) => r.author));
  return rows.map((r) => ({ ...r, author: face(r.author) })) as (Omit<T, "author"> & { author: WithPicture<T["author"]> })[];
}
