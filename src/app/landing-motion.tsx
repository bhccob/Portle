"use client";

import { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(useGSAP);

/**
 * The hero's one authored moment, layered over the vitrine plate: on load the
 * geode's glow swells and settles while a band of light crosses the case glass;
 * afterwards that light follows a mouse pointer across the case. Both layers
 * rest invisible, so the page is complete before (and without) this script.
 */
export function VitrineLight() {
  const root = useRef<HTMLDivElement>(null);

  useGSAP(
    (_ctx, contextSafe) => {
      const el = root.current;
      const frame = el?.closest<HTMLElement>(".l-frame");
      if (!el || !frame || !contextSafe) return;
      const glow = el.querySelector(".l-lamp");

      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        gsap
          .timeline({ delay: 0.35, defaults: { ease: "expo.out" } })
          .fromTo(glow, { opacity: 0 }, { opacity: 0.85, duration: 0.5, ease: "power2.out" })
          .to(glow, { opacity: 0, duration: 2.2 })
          .fromTo(el, { "--sheen-x": "-20%", "--sheen-o": 1 }, { "--sheen-x": "120%", duration: 2, ease: "power2.inOut" }, 0.15)
          .to(el, { "--sheen-o": 0, duration: 0.4, ease: "power1.out" }, ">-0.4");

        const toX = gsap.quickTo(el, "--sheen-x", { duration: 0.7, ease: "power3.out", unit: "%" });
        const toO = gsap.quickTo(el, "--sheen-o", { duration: 0.5, ease: "power2.out" });
        const move = contextSafe((e: PointerEvent) => {
          if (e.pointerType !== "mouse") return;
          const box = el.getBoundingClientRect();
          toX(((e.clientX - box.left) / box.width) * 100);
          toO(e.clientY > box.top - 120 && e.clientY < box.bottom + 80 ? 1 : 0.35);
        });
        const leave = contextSafe(() => toO(0));
        frame.addEventListener("pointermove", move);
        frame.addEventListener("pointerleave", leave);
        return () => {
          frame.removeEventListener("pointermove", move);
          frame.removeEventListener("pointerleave", leave);
        };
      });
      return () => mm.revert();
    },
    { scope: root },
  );

  return (
    <div ref={root} className="l-fx" aria-hidden>
      <div className="l-sheen" />
      <div className="l-lamp" />
    </div>
  );
}
