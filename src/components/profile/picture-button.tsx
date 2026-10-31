"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { Camera, Lock, Move, Trash2, Upload, ZoomIn, ZoomOut } from "lucide-react";
import { toast } from "sonner";
import { removePictureAction, uploadPictureAction } from "@/app/actions/picture";
import { Button } from "@/components/ui/button";
import { Dialog, Menu, MenuItem, MenuSeparator } from "@/components/ui/overlay";
import { cropSquare, PICTURE_UPLOAD_SIZE } from "@/domain/profile-picture";
import { cn } from "@/lib/cn";

const ACCEPT = "image/jpeg,image/png,image/webp,image/gif";
const NOT_A_PICTURE = "That file isn't a picture Portle can use. Try a JPG, PNG or WebP.";
const MAX_ZOOM = 4;

type Photo = { url: string; img: HTMLImageElement };
type View = { zoom: number; x: number; y: number };

const clampZoom = (z: number) => Math.min(Math.max(z, 1), MAX_ZOOM);

/** Pulls the middle back inside the photo, so the square never shows anything past an edge. */
function settle(photo: Photo, view: View): View {
  const { naturalWidth: w, naturalHeight: h } = photo.img;
  const zoom = clampZoom(view.zoom);
  const c = cropSquare(w, h, { zoom, x: view.x, y: view.y });
  return { zoom, x: (c.left + c.side / 2) / w, y: (c.top + c.side / 2) / h };
}

/** The crop step: drag (or the arrow keys) to move, the slider, a pinch or the mouse wheel to zoom. */
function CropStep({ photo, onCancel, onDone }: { photo: Photo; onCancel: () => void; onDone: () => void }) {
  const box = useRef<HTMLDivElement>(null);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const [view, setView] = useState<View>({ zoom: 1, x: 0.5, y: 0.5 });
  const [saving, start] = useTransition();
  const { naturalWidth: w, naturalHeight: h } = photo.img;
  const crop = cropSquare(w, h, view);

  const update = useCallback((next: (v: View) => View) => setView((v) => settle(photo, next(v))), [photo]);
  // Moves by screen pixels: the square on screen is `crop.side` photo pixels wide.
  const moveBy = (dx: number, dy: number) => {
    const scale = crop.side / (box.current?.clientWidth || 1);
    update((v) => ({ ...v, x: v.x - (dx * scale) / w, y: v.y - (dy * scale) / h }));
  };

  // The wheel zooms instead of scrolling the sheet, which needs a listener that may cancel the scroll.
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      update((v) => ({ ...v, zoom: v.zoom * Math.exp(-e.deltaY * 0.0015) }));
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [update]);

  const onPointerMove = (e: React.PointerEvent) => {
    const map = pointers.current;
    const before = map.get(e.pointerId);
    if (!before) return;
    if (map.size === 2) {
      const [a, b] = [...map.values()];
      const other = a === before ? b : a;
      const ratio = Math.hypot(e.clientX - other.x, e.clientY - other.y) / (Math.hypot(before.x - other.x, before.y - other.y) || 1);
      update((v) => ({ ...v, zoom: v.zoom * ratio }));
    } else {
      moveBy(e.clientX - before.x, e.clientY - before.y);
    }
    map.set(e.pointerId, { x: e.clientX, y: e.clientY });
  };
  const release = (e: React.PointerEvent) => pointers.current.delete(e.pointerId);

  const save = () =>
    start(async () => {
      // The phone sends a small square; the server checks it and makes the picture everyone sees.
      const out = Math.min(PICTURE_UPLOAD_SIZE, crop.side);
      const canvas = document.createElement("canvas");
      canvas.width = canvas.height = out;
      const ctx = canvas.getContext("2d");
      if (!ctx) return void toast.error(NOT_A_PICTURE);
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, out, out);
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(photo.img, crop.left, crop.top, crop.side, crop.side, 0, 0, out, out);
      const blob = await new Promise<Blob | null>((done) => canvas.toBlob(done, "image/jpeg", 0.9));
      if (!blob) return void toast.error(NOT_A_PICTURE);
      const form = new FormData();
      form.append("picture", blob, "picture.jpg");
      const res = await uploadPictureAction(form);
      if (!res.ok) return void toast.error(res.error);
      toast.success(res.message ?? "Photo saved.");
      onDone();
    });

  const pct = (v: number) => `${(v / crop.side) * 100}%`;
  return (
    <div>
      <div
        ref={box}
        tabIndex={0}
        role="group"
        aria-label="Photo position. Drag it, or use the arrow keys to move it and plus or minus to zoom."
        className="relative mx-auto aspect-square w-full max-w-[400px] cursor-grab touch-none overflow-hidden rounded-[20px] bg-black outline-none select-none focus-visible:ring-2 focus-visible:ring-[var(--focus)] active:cursor-grabbing"
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
        }}
        onPointerMove={onPointerMove}
        onPointerUp={release}
        onPointerCancel={release}
        onKeyDown={(e) => {
          const step = e.shiftKey ? 40 : 10;
          const keys: Record<string, () => void> = {
            ArrowLeft: () => moveBy(step, 0),
            ArrowRight: () => moveBy(-step, 0),
            ArrowUp: () => moveBy(0, step),
            ArrowDown: () => moveBy(0, -step),
            "+": () => update((v) => ({ ...v, zoom: v.zoom * 1.1 })),
            "=": () => update((v) => ({ ...v, zoom: v.zoom * 1.1 })),
            "-": () => update((v) => ({ ...v, zoom: v.zoom / 1.1 })),
          };
          if (keys[e.key]) {
            e.preventDefault();
            keys[e.key]();
          }
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- a local blob of the member's own file, never sent anywhere as is */}
        <img src={photo.url} alt="" draggable={false} className="pointer-events-none absolute max-w-none" style={{ width: pct(w), left: `-${pct(crop.left)}`, top: `-${pct(crop.top)}` }} />
        <svg viewBox="0 0 100 100" className="pointer-events-none absolute inset-0 size-full" aria-hidden>
          <defs>
            <mask id="picture-circle">
              <rect width="100" height="100" fill="#fff" />
              <circle cx="50" cy="50" r="50" fill="#000" />
            </mask>
          </defs>
          <rect width="100" height="100" fill="rgb(10 10 12 / 0.62)" mask="url(#picture-circle)" />
          <circle cx="50" cy="50" r="49.7" fill="none" stroke="rgb(255 255 255 / 0.7)" strokeWidth="0.4" />
        </svg>
        <span className="pointer-events-none absolute bottom-3 left-1/2 inline-flex h-7 -translate-x-1/2 items-center gap-1.5 rounded-full bg-black/60 px-3 text-xs whitespace-nowrap text-white/85 backdrop-blur">
          <Move className="size-3.5" aria-hidden /> Drag to move
        </span>
      </div>

      <div className="mt-4 flex items-center gap-3 text-fg-subtle">
        <button type="button" onClick={() => update((v) => ({ ...v, zoom: v.zoom / 1.25 }))} aria-label="Zoom out" className="rounded-full p-1 hover:text-fg">
          <ZoomOut className="size-5" />
        </button>
        <input
          type="range"
          min={1}
          max={MAX_ZOOM}
          step={0.01}
          value={view.zoom}
          onChange={(e) => update((v) => ({ ...v, zoom: Number(e.target.value) }))}
          aria-label="Zoom"
          className="flex-1 accent-[var(--primary)]"
        />
        <button type="button" onClick={() => update((v) => ({ ...v, zoom: v.zoom * 1.25 }))} aria-label="Zoom in" className="rounded-full p-1 hover:text-fg">
          <ZoomIn className="size-5" />
        </button>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-2.5">
        <Button type="button" variant="secondary" size="lg" onClick={onCancel} disabled={saving}>
          Cancel
        </Button>
        <Button type="button" size="lg" onClick={save} loading={saving}>
          Save photo
        </Button>
      </div>
      <p className="mt-4 flex items-start gap-2 text-[0.8125rem] leading-snug text-fg-subtle">
        <Lock className="mt-0.5 size-3.5 shrink-0" aria-hidden />
        Only people who can see your profile see your photo. Everyone else sees your letters.
      </p>
    </div>
  );
}

/**
 * The camera button on your own big avatar, in Settings and on your profile. It uploads a photo
 * (through the crop step) or removes the one you have.
 */
export function PictureButton({ hasPicture, className }: { hasPicture: boolean; className?: string }) {
  const input = useRef<HTMLInputElement>(null);
  const [photo, setPhoto] = useState<Photo | null>(null);
  const [removing, startRemove] = useTransition();

  const close = () => {
    if (photo) URL.revokeObjectURL(photo.url);
    setPhoto(null);
  };

  const choose = (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) return void toast.error(NOT_A_PICTURE);
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => setPhoto({ url, img });
    img.onerror = () => {
      URL.revokeObjectURL(url);
      toast.error(NOT_A_PICTURE);
    };
    img.src = url;
  };

  const remove = () =>
    startRemove(async () => {
      const res = await removePictureAction();
      if (res.ok) toast.success(res.message ?? "Photo removed.");
      else toast.error(res.error);
    });

  return (
    <>
      <input
        ref={input}
        type="file"
        accept={ACCEPT}
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        onChange={(e) => {
          choose(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
      <Menu
        align="start"
        modal={false}
        trigger={
          <button
            type="button"
            aria-label={hasPicture ? "Change or remove your photo" : "Upload a photo"}
            aria-busy={removing || undefined}
            className={cn(
              "z-20 grid size-9 place-items-center rounded-full bg-bg-elevated text-fg shadow-[0_6px_16px_-6px_rgb(0_0_0/0.6)] ring-[3px] ring-bg transition-colors duration-[var(--dur-fast)] hover:text-accent",
              className,
            )}
          >
            <Camera className="size-4" aria-hidden />
          </button>
        }
      >
        <MenuItem onSelect={() => input.current?.click()}>
          <Upload className="size-4" /> {hasPicture ? "Upload a new photo" : "Upload a photo"}
        </MenuItem>
        {hasPicture ? (
          <>
            <MenuSeparator />
            <MenuItem destructive onSelect={remove}>
              <Trash2 className="size-4" /> Remove photo
            </MenuItem>
          </>
        ) : (
          <p className="max-w-56 px-2.5 pt-1 pb-1.5 text-xs leading-snug text-fg-subtle">JPG, PNG or WebP. You can move and zoom it next.</p>
        )}
      </Menu>
      <Dialog open={!!photo} onOpenChange={(open) => !open && close()} title="Move and zoom" description="Drag the photo so your face sits in the circle." className="sm:w-[min(94vw,460px)]">
        {photo ? <CropStep photo={photo} onCancel={close} onDone={close} /> : null}
      </Dialog>
    </>
  );
}
