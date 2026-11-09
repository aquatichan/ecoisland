// The landing page's section plates: opaque painted backdrops that sit behind a whole section
// (never inside a card), one entry per picture in public/landing/. How they were made is in
// design/landing-art/README.md; test/unit/landing-plates.test.ts checks this manifest against the
// files and against the page.
//
// Files are versioned (-v1) and served with an immutable cache (public/_headers), so a changed
// picture gets a new filename and a new entry here.
//
// Each plate says how text is kept readable over it (`scrim`). A plate never carries text of its
// own, and anything that does sit on it is either under a tint at least SCRIM_FLOOR opaque, or
// on a glass card that is itself that opaque:
//
//   start  text sits in the left of the section; the tint holds from the left edge to `hold` of the
//          width (past where the text column ends), then clears over `fade`, so the picture shows
//          on the right, behind a card
//   all    text anywhere on the section; one tint across the whole plate
//   card   all the text sits on a glass card (the band, the footer bar); `alpha` only softens the picture
//
// Only relative imports, so the node tests can load it.
import type { ArtAsset } from "../island/assets";

/** The least opacity a scrim may have where text sits over it (the same floor as the glass fills in src/index.css). */
export const SCRIM_FLOOR = 0.84;

export type PlateScrim =
  | { kind: "start"; alpha: number; hold: number; fade: number }
  | { kind: "all"; alpha: number }
  | { kind: "card"; alpha: number };

export type Plate = ArtAsset & {
  scrim: PlateScrim;
  /** object-position for the crop (the picture is shown `cover`). */
  position: string;
  /** How much of the top and bottom edges (0..0.5 of the height) fades into the page color, so neighbouring sections blend. */
  edge: { top: number; bottom: number };
};

export const PLATES = {
  // A dim meadow under a canopy. The section's text is on the left; the roster card is on the right.
  "bg-teachers": { src: "/landing/bg-teachers-v1.webp", w: 1536, h: 864, source: "generated", scrim: { kind: "start", alpha: 0.92, hold: 0.52, fade: 0.3 }, position: "center", edge: { top: 0.14, bottom: 0.14 } },
  // A coastal trail. Same layout: text on the left, example listings on the right.
  "bg-act": { src: "/landing/bg-act-v1.webp", w: 1536, h: 864, source: "generated", scrim: { kind: "start", alpha: 0.92, hold: 0.52, fade: 0.3 }, position: "center", edge: { top: 0.14, bottom: 0.14 } },
  // A faint sky behind the numbers band, which is a glass card.
  "bg-stats": { src: "/landing/bg-stats-v1.webp", w: 1536, h: 512, source: "generated", scrim: { kind: "card", alpha: 0.45 }, position: "center", edge: { top: 0.25, bottom: 0.25 } },
  // A shoreline strip behind the footer bar (glass). Its sea is the sea the closing call to action ends on, so it has no top fade.
  "bg-footer": { src: "/landing/bg-footer-v1.webp", w: 1536, h: 512, source: "generated", scrim: { kind: "card", alpha: 0 }, position: "center 45%", edge: { top: 0, bottom: 0 } },
} as const satisfies Record<string, Plate>;

export type PlateId = keyof typeof PLATES;

const pct = (n: number) => `${Math.round(n * 1000) / 10}%`;
/** The page color at `alpha`, from the --bg token. */
const tint = (alpha: number) => `color-mix(in srgb, var(--bg) ${pct(alpha)}, transparent)`;

/** The scrim's gradient, or null when it adds no tint. */
export function scrimGradient(scrim: PlateScrim): string | null {
  if (scrim.alpha <= 0) return null;
  if (scrim.kind === "start") return `linear-gradient(90deg, ${tint(scrim.alpha)} 0%, ${tint(scrim.alpha)} ${pct(scrim.hold)}, transparent ${pct(Math.min(1, scrim.hold + scrim.fade))})`;
  return `linear-gradient(${tint(scrim.alpha)}, ${tint(scrim.alpha)})`;
}

/** The top and bottom fades into the page color, or null when there are none. */
export function edgeGradient({ top, bottom }: Plate["edge"]): string | null {
  if (top <= 0 && bottom <= 0) return null;
  return `linear-gradient(180deg, var(--bg) 0%, transparent ${pct(top)}, transparent ${pct(1 - bottom)}, var(--bg) 100%)`;
}
