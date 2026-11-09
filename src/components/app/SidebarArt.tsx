// The decorative landscape at the foot of the sidebar: the cliff and the sea from the coastal-trail plate
// (src/components/landing/plates.ts), reused as it is. It is the last thing in the sidebar and sits in
// the flow below the nav, so it can never be behind a label. Its top edge fades out through a mask, so the
// sidebar's glass shows through and it doesn't read as a picture box. It shrinks first when the window is
// short. Decorative: hidden from assistive tech, empty alt, and it never takes a click.
//
// Only relative imports, so the node tests can render it.
import { PLATES } from "../landing/plates";

/** The plate it draws, from the manifest. */
export const SIDEBAR_ART = "bg-act" as const;

/** Clear at the top, fully opaque from 55% of the way down: the alpha is what the mask reads, so any opaque token does. */
export const SIDEBAR_ART_FADE = "linear-gradient(180deg, transparent 0%, var(--fg) 55%)";

export function SidebarArt() {
  const art = PLATES[SIDEBAR_ART];
  return (
    <div aria-hidden data-sidebar-art={SIDEBAR_ART} className="pointer-events-none relative h-40 min-h-0 shrink overflow-hidden" style={{ maskImage: SIDEBAR_ART_FADE, WebkitMaskImage: SIDEBAR_ART_FADE }}>
      <img src={art.src} width={art.w} height={art.h} alt="" decoding="async" draggable={false} className="size-full object-cover" style={{ objectPosition: "70% 45%" }} />
    </div>
  );
}
