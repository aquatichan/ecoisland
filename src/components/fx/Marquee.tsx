// A strip of items that slides sideways forever, with faded ends. Pauses while hovered.
// With reduced motion (see .fx-marquee in src/index.css) it stops, lays every item out
// centred and wrapped, and drops the second copy and the edge fade.
//
// Decorative: it is hidden from assistive tech, because what it shows (landmark art, unit
// names) is on the page in full elsewhere. Put nothing in it that is the only copy of a fact,
// and never place text or other content over it.
import type { CSSProperties, ReactNode } from "react";
import { cn } from "../../lib/utils";

export function Marquee({ children, seconds = 60, className }: { children: ReactNode; seconds?: number; className?: string }) {
  return (
    <div aria-hidden className={cn("fx-marquee", className)} data-marquee style={{ "--marquee-seconds": `${seconds}s` } as CSSProperties}>
      <div className="fx-marquee-track">
        <ul className="fx-marquee-copy">{children}</ul>
        <ul className="fx-marquee-copy" data-clone>
          {children}
        </ul>
      </div>
    </div>
  );
}
