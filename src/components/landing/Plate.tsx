// A section plate (src/components/landing/plates.ts): the picture, then its scrim, filling the
// section and sitting behind everything in it. Put it as the first child of a `relative isolate`
// section or footer; the section's content goes after it.
//
// Static: a plate never moves, so there is nothing for reduced motion to change.
import { PLATES, edgeGradient, scrimGradient, type PlateId } from "./plates";

export function Plate({ id }: { id: PlateId }) {
  const plate = PLATES[id];
  const scrim = scrimGradient(plate.scrim);
  const edge = edgeGradient(plate.edge);
  return (
    <div aria-hidden data-plate={id} className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      <img src={plate.src} width={plate.w} height={plate.h} alt="" loading="lazy" decoding="async" draggable={false} className="size-full object-cover" style={{ objectPosition: plate.position }} />
      {scrim && <div data-scrim={plate.scrim.kind} data-scrim-alpha={plate.scrim.alpha} data-scrim-hold={plate.scrim.kind === "start" ? plate.scrim.hold : undefined} className="absolute inset-0" style={{ backgroundImage: scrim }} />}
      {edge && <div data-edge className="absolute inset-0" style={{ backgroundImage: edge }} />}
    </div>
  );
}
