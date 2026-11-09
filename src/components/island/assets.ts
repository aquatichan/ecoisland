// The island's art: one entry per sprite in public/island/.
//
// Files are versioned (-v1) and served with an immutable cache (public/_headers),
// so a changed picture gets a new filename and a new entry here.
//
//   painted      generated with gpt-image-2.6-flare (see design/island-art/README.md),
//                cut out to transparency, trimmed and downscaled to its slot at 2x.
//   placeholder  the original SVG piece, rasterized (src/pages/dev/SpriteLab.tsx), standing in
//                until painted art is made. Replace the file and the entry, nothing else.
export type ArtSource = "painted" | "placeholder";
export type ArtAsset = { src: string; w: number; h: number; source: ArtSource };

export const ART: Record<string, ArtAsset> = {
  "island-base": { src: "/island/base-v1.webp", w: 1080, h: 690, source: "painted" },
  "growth-sprouts": { src: "/island/growth/sprouts-v1.webp", w: 204, h: 153, source: "painted" },
  "growth-wildflowers": { src: "/island/growth/wildflowers-v1.webp", w: 240, h: 188, source: "painted" },
  "growth-meadow": { src: "/island/growth/meadow-v1.webp", w: 540, h: 389, source: "painted" },
  "growth-shrubs": { src: "/island/growth/shrubs-v1.webp", w: 288, h: 259, source: "painted" },
  "growth-saplings": { src: "/island/growth/saplings-v1.webp", w: 300, h: 304, source: "painted" },
  "growth-grove": { src: "/island/growth/grove-v1.webp", w: 384, h: 379, source: "painted" },
  "growth-pond": { src: "/island/growth/pond-v1.webp", w: 300, h: 276, source: "painted" },
  "growth-forest": { src: "/island/growth/forest-v1.webp", w: 468, h: 460, source: "painted" },
  "growth-songbirds": { src: "/island/growth/songbirds-v1.webp", w: 264, h: 275, source: "painted" },
  "growth-heart-tree": { src: "/island/growth/heart-tree-v1.webp", w: 408, h: 400, source: "painted" },
  "decor-bench": { src: "/island/decor/bench-v1.webp", w: 104, h: 61, source: "placeholder" },
  "decor-kite": { src: "/island/decor/kite-v1.webp", w: 72, h: 173, source: "placeholder" },
  "decor-campfire": { src: "/island/decor/campfire-v1.webp", w: 72, h: 86, source: "placeholder" },
  "decor-hammock": { src: "/island/decor/hammock-v1.webp", w: 160, h: 143, source: "placeholder" },
  "decor-dock": { src: "/island/decor/dock-v1.webp", w: 216, h: 64, source: "placeholder" },
  "decor-lanterns": { src: "/island/decor/lanterns-v1.webp", w: 166, h: 110, source: "placeholder" },
  "decor-tidepool": { src: "/island/decor/tidepool-v1.webp", w: 121, h: 36, source: "placeholder" },
  "decor-hut": { src: "/island/decor/hut-v1.webp", w: 136, h: 135, source: "placeholder" },
  "decor-telescope": { src: "/island/decor/telescope-v1.webp", w: 78, h: 85, source: "placeholder" },
  "decor-sailboat": { src: "/island/decor/sailboat-v1.webp", w: 160, h: 183, source: "placeholder" },
  "decor-stones": { src: "/island/decor/stones-v1.webp", w: 184, h: 94, source: "placeholder" },
  "decor-lighthouse": { src: "/island/decor/lighthouse-v1.webp", w: 120, h: 280, source: "placeholder" },
  "decor-treehouse": { src: "/island/decor/treehouse-v1.webp", w: 233, h: 333, source: "placeholder" },
  "decor-balloon": { src: "/island/decor/balloon-v1.webp", w: 137, h: 221, source: "placeholder" },
  "landmark-1": { src: "/island/landmarks/u1-v1.webp", w: 137, h: 67, source: "placeholder" },
  "landmark-2": { src: "/island/landmarks/u2-v1.webp", w: 112, h: 69, source: "placeholder" },
  "landmark-3": { src: "/island/landmarks/u3-v1.webp", w: 141, h: 49, source: "placeholder" },
  "landmark-4": { src: "/island/landmarks/u4-v1.webp", w: 204, h: 284, source: "placeholder" },
  "landmark-5": { src: "/island/landmarks/u5-v1.webp", w: 153, h: 71, source: "placeholder" },
  "landmark-6": { src: "/island/landmarks/u6-v1.webp", w: 120, h: 212, source: "placeholder" },
  "landmark-7": { src: "/island/landmarks/u7-v1.webp", w: 39, h: 106, source: "placeholder" },
  "landmark-8": { src: "/island/landmarks/u8-v1.webp", w: 185, h: 54, source: "placeholder" },
  "landmark-9": { src: "/island/landmarks/u9-v1.webp", w: 356, h: 275, source: "placeholder" },
};

export function artFor(id: string): ArtAsset | undefined {
  return ART[id];
}
