// The island's art: one entry per picture in public/island/.
//
// Files are versioned (-v1, -v2) and served with an immutable cache (public/_headers),
// so a changed picture gets a new filename and a new entry here.
//
//   generated    made with gpt-image-2.6-flare (see design/island-art/README.md): cut out to
//                transparency and slot-sized for sprites, or horizon-aligned 5:3 for skies.
//   placeholder  the original SVG piece, rasterized (src/pages/dev/SpriteLab.tsx), standing in until
//                art is made. None are in use now; the type stays for the next item that needs one.
export type ArtSource = "generated" | "placeholder";
export type ArtAsset = { src: string; w: number; h: number; source: ArtSource };

export const ART: Record<string, ArtAsset> = {
  "island-base": { src: "/island/base-v1.webp", w: 1080, h: 690, source: "generated" },
  "growth-sprouts": { src: "/island/growth/sprouts-v1.webp", w: 204, h: 153, source: "generated" },
  "growth-wildflowers": { src: "/island/growth/wildflowers-v1.webp", w: 240, h: 188, source: "generated" },
  "growth-meadow": { src: "/island/growth/meadow-v1.webp", w: 540, h: 389, source: "generated" },
  "growth-shrubs": { src: "/island/growth/shrubs-v1.webp", w: 288, h: 259, source: "generated" },
  "growth-saplings": { src: "/island/growth/saplings-v1.webp", w: 300, h: 304, source: "generated" },
  "growth-grove": { src: "/island/growth/grove-v1.webp", w: 384, h: 379, source: "generated" },
  "growth-pond": { src: "/island/growth/pond-v1.webp", w: 300, h: 276, source: "generated" },
  "growth-forest": { src: "/island/growth/forest-v1.webp", w: 468, h: 460, source: "generated" },
  "growth-songbirds": { src: "/island/growth/songbirds-v1.webp", w: 264, h: 275, source: "generated" },
  "growth-heart-tree": { src: "/island/growth/heart-tree-v1.webp", w: 408, h: 400, source: "generated" },
  "sky-day": { src: "/island/skies/day-v1.webp", w: 1200, h: 720, source: "generated" },
  "sky-day-thumb": { src: "/island/skies/day-thumb-v1.webp", w: 320, h: 192, source: "generated" },
  "sky-dawn": { src: "/island/skies/dawn-v1.webp", w: 1200, h: 720, source: "generated" },
  "sky-dawn-thumb": { src: "/island/skies/dawn-thumb-v1.webp", w: 320, h: 192, source: "generated" },
  "sky-rain": { src: "/island/skies/rain-v1.webp", w: 1200, h: 720, source: "generated" },
  "sky-rain-thumb": { src: "/island/skies/rain-thumb-v1.webp", w: 320, h: 192, source: "generated" },
  "sky-sunset": { src: "/island/skies/sunset-v1.webp", w: 1200, h: 720, source: "generated" },
  "sky-sunset-thumb": { src: "/island/skies/sunset-thumb-v1.webp", w: 320, h: 192, source: "generated" },
  "sky-night": { src: "/island/skies/night-v1.webp", w: 1200, h: 720, source: "generated" },
  "sky-night-thumb": { src: "/island/skies/night-thumb-v1.webp", w: 320, h: 192, source: "generated" },
  "sky-aurora": { src: "/island/skies/aurora-v1.webp", w: 1200, h: 720, source: "generated" },
  "sky-aurora-thumb": { src: "/island/skies/aurora-thumb-v1.webp", w: 320, h: 192, source: "generated" },
  "sky-cosmos": { src: "/island/skies/cosmos-v1.webp", w: 1200, h: 720, source: "generated" },
  "sky-cosmos-thumb": { src: "/island/skies/cosmos-thumb-v1.webp", w: 320, h: 192, source: "generated" },
  "decor-bench": { src: "/island/decor/bench-v2.webp", w: 156, h: 151, source: "generated" },
  "decor-kite": { src: "/island/decor/kite-v2.webp", w: 131, h: 190, source: "generated" },
  "decor-campfire": { src: "/island/decor/campfire-v2.webp", w: 124, h: 150, source: "generated" },
  "decor-hammock": { src: "/island/decor/hammock-v2.webp", w: 250, h: 169, source: "generated" },
  "decor-dock": { src: "/island/decor/dock-v2.webp", w: 300, h: 207, source: "generated" },
  "decor-lanterns": { src: "/island/decor/lanterns-v2.webp", w: 280, h: 194, source: "generated" },
  "decor-tidepool": { src: "/island/decor/tidepool-v2.webp", w: 250, h: 167, source: "generated" },
  "decor-hut": { src: "/island/decor/hut-v2.webp", w: 196, h: 192, source: "generated" },
  "decor-telescope": { src: "/island/decor/telescope-v2.webp", w: 90, h: 157, source: "generated" },
  "decor-sailboat": { src: "/island/decor/sailboat-v2.webp", w: 159, h: 250, source: "generated" },
  "decor-stones": { src: "/island/decor/stones-v2.webp", w: 240, h: 192, source: "generated" },
  "decor-lighthouse": { src: "/island/decor/lighthouse-v2.webp", w: 169, h: 371, source: "generated" },
  "decor-treehouse": { src: "/island/decor/treehouse-v2.webp", w: 324, h: 330, source: "generated" },
  "decor-balloon": { src: "/island/decor/balloon-v2.webp", w: 180, h: 270, source: "generated" },
  "landmark-1": { src: "/island/landmarks/u1-v2.webp", w: 224, h: 150, source: "generated" },
  "landmark-2": { src: "/island/landmarks/u2-v2.webp", w: 200, h: 185, source: "generated" },
  "landmark-3": { src: "/island/landmarks/u3-v2.webp", w: 340, h: 226, source: "generated" },
  "landmark-4": { src: "/island/landmarks/u4-v2.webp", w: 161, h: 300, source: "generated" },
  "landmark-5": { src: "/island/landmarks/u5-v2.webp", w: 310, h: 206, source: "generated" },
  "landmark-6": { src: "/island/landmarks/u6-v2.webp", w: 197, h: 301, source: "generated" },
  "landmark-7": { src: "/island/landmarks/u7-v2.webp", w: 104, h: 190, source: "generated" },
  "landmark-8": { src: "/island/landmarks/u8-v2.webp", w: 300, h: 195, source: "generated" },
  "landmark-9": { src: "/island/landmarks/u9-v2.webp", w: 370, h: 256, source: "generated" },
};

export function artFor(id: string): ArtAsset | undefined {
  return ART[id];
}
