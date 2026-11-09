// Development-only: draws one of the original SVG island pieces on a
// transparent page, so a tool can screenshot it into a placeholder sprite.
//
//   /dev/sprites?decor=bench        a decoration, drawn around its foot at the origin
//   /dev/sprites?landmark=4         a unit landmark, drawn where it stands on the island
//
// Placeholders stand in for items whose painted art isn't made yet; they are
// labeled `source: "placeholder"` in src/components/island/assets.ts. The SVG
// modules (Decor, Landmarks, Flora, palette) are kept for exactly this.
import { useEffect } from "react";
import { DecorShape } from "@/components/island/Decor";
import { Landmark } from "@/components/island/Landmarks";
import { islandPalette } from "@/components/island/palette";
import { findDecor } from "@/shared/catalog";

export default function SpriteLab() {
  const params = new URLSearchParams(window.location.search);
  const palette = islandPalette(1);

  useEffect(() => {
    for (const el of [document.documentElement, document.body, document.getElementById("root")]) if (el) el.style.background = "transparent";
  }, []);

  const decor = findDecor(params.get("decor"));
  if (decor) {
    // 2x: the foot of the decoration (its origin) is at (220, 360) in the 440 x 420 view.
    return (
      <svg id="sprite" width={880} height={840} viewBox="-220 -360 440 420">
        <DecorShape id={decor.id} p={palette} night={false} />
      </svg>
    );
  }

  const unit = Number(params.get("landmark"));
  if (unit >= 1 && unit <= 9) {
    // 1.5x of the whole 1200 x 720 scene, so the landmark keeps its scene position.
    return (
      <svg id="sprite" width={1800} height={1080} viewBox="0 0 1200 720">
        <Landmark unit={unit} p={palette} night={false} animate={false} />
      </svg>
    );
  }

  return <p className="p-6 text-sm text-fg-3">Use ?decor=bench or ?landmark=4</p>;
}
