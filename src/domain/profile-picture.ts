import { canView, type Audience, type Viewer } from "./permissions";

/** What Portle makes of every upload: a square this many pixels wide. */
export const PICTURE_SIZE = 256;
/** The phone shrinks a photo to this before sending it, which keeps uploads far under the 1 MB action limit. */
export const PICTURE_UPLOAD_SIZE = 512;
export const PICTURE_MAX_BYTES = 900_000;
export const PICTURE_MIN_SIDE = 96;
/** Bigger than any real photo; a tiny file that claims more pixels than this is a trick, not a picture. */
export const PICTURE_MAX_PIXELS = 40_000_000;

export type PictureFormat = "jpeg" | "png" | "webp" | "gif";

/**
 * What kind of picture the file really is, from its first bytes, never from its name or the browser's word.
 * Anything else (HEIC, SVG, a PDF renamed .jpg) is null.
 */
export function sniffPicture(bytes: Uint8Array): PictureFormat | null {
  const at = (offset: number, ...sig: number[]) => sig.every((b, i) => bytes[offset + i] === b);
  const ascii = (offset: number, text: string) => at(offset, ...[...text].map((c) => c.charCodeAt(0)));
  if (at(0, 0xff, 0xd8, 0xff)) return "jpeg";
  if (at(0, 0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a)) return "png";
  if (ascii(0, "RIFF") && ascii(8, "WEBP")) return "webp";
  if (ascii(0, "GIF87a") || ascii(0, "GIF89a")) return "gif";
  return null;
}

/** Where a picture is served. A new upload gets a new id, so browsers never show an old one. */
export function pictureAddress(id: string) {
  return `/api/pictures/${id}`;
}

/**
 * A picture follows its profile: only people who may see the profile see it,
 * and everyone else gets the letters. Blocks hide it both ways.
 */
export function canSeePicture(viewer: Viewer | null, ownerId: string, profileVisibility: Audience) {
  return canView(viewer, { ownerId, audience: profileVisibility });
}

/**
 * The square the crop step cuts from a photo, in the photo's own pixels. `zoom` 1 fits the
 * photo's short side in the circle; `x` and `y` move the middle of the square, as a share of the
 * photo, and are kept inside it so the square never runs off an edge.
 */
export function cropSquare(width: number, height: number, view: { zoom: number; x: number; y: number }) {
  const side = Math.min(width, height) / Math.max(1, view.zoom);
  const clamp = (v: number, max: number) => Math.min(Math.max(v, 0), max);
  const left = clamp(view.x * width - side / 2, width - side);
  const top = clamp(view.y * height - side / 2, height - side);
  return { left: Math.round(left), top: Math.round(top), side: Math.round(side) };
}
