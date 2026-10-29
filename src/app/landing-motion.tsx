"use client";

import { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(useGSAP);

/**
 * The hero's one interaction: the three notes drift a few pixels with a mouse
 * pointer, each at its own depth, like paper on a desk catching a draught.
 * The load-in settle is CSS (landing.css), so the notes are in place from the
 * first paint; this only adds the pointer response, and not under reduced motion.
 */
export function NotesMotion() {
  const marker = useRef<HTMLSpanElement>(null);

  useGSAP(() => {
    const stack = marker.current?.parentElement;
    if (!stack) return;
    const notes = gsap.utils.toArray<HTMLElement>(".l-memo", stack);
    const depth = [10, 16, 22];

    const mm = gsap.matchMedia();
    mm.add("(prefers-reduced-motion: no-preference) and (pointer: fine) and (min-width: 1180px)", () => {
      const movers = notes.map((note) => ({
        x: gsap.quickTo(note, "--px", { duration: 0.9, ease: "power3.out", unit: "px" }),
        y: gsap.quickTo(note, "--py", { duration: 0.9, ease: "power3.out", unit: "px" }),
      }));
      const frame = stack.closest<HTMLElement>(".l-frame") ?? stack;
      const move = (e: PointerEvent) => {
        const box = frame.getBoundingClientRect();
        const nx = (e.clientX - box.left) / box.width - 0.5;
        const ny = (e.clientY - box.top) / box.height - 0.5;
        movers.forEach((m, i) => {
          m.x(nx * depth[i]);
          m.y(ny * depth[i]);
        });
      };
      const leave = () => movers.forEach((m) => (m.x(0), m.y(0)));
      frame.addEventListener("pointermove", move);
      frame.addEventListener("pointerleave", leave);
      return () => {
        frame.removeEventListener("pointermove", move);
        frame.removeEventListener("pointerleave", leave);
      };
    });
    return () => mm.revert();
  });

  return <span ref={marker} hidden />;
}
