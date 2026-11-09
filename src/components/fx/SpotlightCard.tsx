// A glass card whose edge lights up where the cursor is (the .spotlight rule in src/index.css).
// Off on touch screens and when motion is reduced: data-spotlight says which, and the stylesheet
// hides the highlight for the same two cases, so it never shows even before this runs.
import type { HTMLAttributes, PointerEvent } from "react";
import { cn } from "../../lib/utils";
import { FINE_POINTER, useMediaQuery, usePrefersReducedMotion } from "./motion";

export function SpotlightCard({ className, onPointerMove, onPointerLeave, ...props }: HTMLAttributes<HTMLDivElement>) {
  const reduced = usePrefersReducedMotion();
  const hover = useMediaQuery(FINE_POINTER);
  const on = hover && !reduced;

  const move = (e: PointerEvent<HTMLDivElement>) => {
    onPointerMove?.(e);
    if (!on || e.pointerType !== "mouse") return;
    const el = e.currentTarget;
    const box = el.getBoundingClientRect();
    el.style.setProperty("--mx", `${e.clientX - box.left}px`);
    el.style.setProperty("--my", `${e.clientY - box.top}px`);
    el.dataset.lit = "";
  };
  const leave = (e: PointerEvent<HTMLDivElement>) => {
    onPointerLeave?.(e);
    delete e.currentTarget.dataset.lit;
  };

  return <div {...props} data-spotlight={on ? "on" : "off"} className={cn("card spotlight", className)} onPointerMove={move} onPointerLeave={leave} />;
}
