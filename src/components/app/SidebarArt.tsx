// The decorative painting at the foot of the sidebar: a little cove with a pier and a palm, painted for this
// slot (design/scene-art/README.md). Its top is plain cream sky that melts into the sidebar's glass, through a
// mask as well, so it never reads as a picture box. It is the last thing in the sidebar and sits in the flow
// below the nav, so it can never be behind a label, and it shrinks first when the window is short. The picture is
// 720px wide, twice the sidebar's widest setting, and is cropped from the top (the empty sky) as it narrows.
// Decorative: hidden from assistive tech, empty alt, and it never takes a click.
//
// Only relative imports, so the node tests can render it.
import type { ArtAsset } from "../island/assets";

/** The painting, versioned and cached forever (public/_headers). */
export const SIDEBAR_ART: ArtAsset = { src: "/sidebar/cove-v1.webp", w: 720, h: 686, source: "generated" };

/** Clear at the top, fully opaque from 40% of the way down: the alpha is what the mask reads, so any opaque token does. */
export const SIDEBAR_ART_FADE = "linear-gradient(180deg, transparent 0%, var(--fg) 40%)";

export function SidebarArt() {
  const art = SIDEBAR_ART;
  return (
    <div aria-hidden data-sidebar-art="cove" className="pointer-events-none relative h-60 min-h-0 shrink overflow-hidden" style={{ maskImage: SIDEBAR_ART_FADE, WebkitMaskImage: SIDEBAR_ART_FADE }}>
      <img src={art.src} width={art.w} height={art.h} alt="" decoding="async" draggable={false} className="size-full object-cover object-bottom" />
    </div>
  );
}
