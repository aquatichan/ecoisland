// A picture from the art manifests, used as a backdrop behind a block of a page, with a scrim over
// the part where text sits: an island sky or sprite (src/components/island/assets.ts), or a landing
// plate such as the coastal trail (src/components/landing/plates.ts). It shares the plates' scrim and
// edge maths. Reuse only: it draws art that already exists; it makes none.
//
// Put it as the first child of a `relative isolate overflow-hidden` block. Static: nothing moves.
import { ART, type ArtAsset } from "../island/assets";
import { PLATES, edgeGradient, scrimGradient, type Plate, type PlateScrim } from "../landing/plates";

export function ArtBackdrop({ art, scrim, position = "top", edge = { top: 0, bottom: 0 } }: { art: string; scrim: PlateScrim; position?: string; edge?: Plate["edge"] }) {
  const asset: ArtAsset | undefined = ART[art] ?? (PLATES as Record<string, ArtAsset>)[art];
  if (!asset) return null;
  const tint = scrimGradient(scrim);
  const fade = edgeGradient(edge);
  return (
    <div aria-hidden data-backdrop={art} className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      <img src={asset.src} width={asset.w} height={asset.h} alt="" decoding="async" draggable={false} className="size-full object-cover" style={{ objectPosition: position }} />
      {tint && <div data-scrim={scrim.kind} data-scrim-alpha={scrim.alpha} data-scrim-hold={scrim.kind === "start" ? scrim.hold : undefined} className="absolute inset-0" style={{ backgroundImage: tint }} />}
      {fade && <div data-edge className="absolute inset-0" style={{ backgroundImage: fade }} />}
    </div>
  );
}
