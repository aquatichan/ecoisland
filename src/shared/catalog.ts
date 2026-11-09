// The island market: names, prices and where each item's art sits. When items
// open up (minXp) is in ISLAND_UNLOCKS in economy.ts. The server reads prices
// from here when a student buys something.

export type SkyId = "day" | "dawn" | "sunset" | "rain" | "night" | "aurora" | "cosmos";

export type Sky = {
  id: SkyId;
  name: string;
  price: number;
  description: string;
  /** Animated skies render a WebGL background behind the island. */
  animated?: boolean;
};

/** The point of a sprite, in 0..1 of its own size, that lands on the item's scene position. */
export type Anchor = { x: number; y: number };

/** Most items stand on the ground, so their anchor is the middle of their base. */
export const FOOT: Anchor = { x: 0.5, y: 0.92 };

export type GrowthId =
  | "sprouts"
  | "wildflowers"
  | "meadow"
  | "shrubs"
  | "saplings"
  | "grove"
  | "pond"
  | "forest"
  | "songbirds"
  | "heart-tree";

export type Growth = {
  id: GrowthId;
  name: string;
  price: number;
  description: string;
  /** Painted art id (see src/components/island/assets.ts). */
  art: string;
  anchor: Anchor;
  /** Where its anchor sits on the island, in scene units (0..1 across, 0..1 down). Fixed: growth isn't moved. */
  x: number;
  y: number;
  /** Sprite width as a fraction of the scene's width. */
  w: number;
};

export type DecorId =
  | "bench"
  | "kite"
  | "campfire"
  | "hammock"
  | "dock"
  | "lanterns"
  | "tidepool"
  | "hut"
  | "telescope"
  | "sailboat"
  | "stones"
  | "lighthouse"
  | "treehouse"
  | "balloon";

export type Decor = {
  id: DecorId;
  name: string;
  price: number;
  description: string;
  /** Painted art id (see src/components/island/assets.ts). */
  art: string;
  anchor: Anchor;
  /** Sprite width as a fraction of the scene's width. */
  w: number;
  /** Default position in scene coordinates (0..1 across, 0..1 down). */
  x: number;
  y: number;
};

export const GROWTH: Growth[] = [
  { id: "sprouts", name: "First sprouts", price: 15, description: "Grass takes hold along the shore.", art: "growth-sprouts", anchor: FOOT, x: 0.45, y: 0.775, w: 0.085 },
  { id: "wildflowers", name: "Wildflowers", price: 25, description: "Splashes of color, and the pollinators that follow.", art: "growth-wildflowers", anchor: FOOT, x: 0.575, y: 0.77, w: 0.1 },
  { id: "meadow", name: "Meadow", price: 40, description: "Wildflowers and young shrubs cover the hills.", art: "growth-meadow", anchor: FOOT, x: 0.5, y: 0.72, w: 0.225 },
  { id: "shrubs", name: "Shrubland", price: 50, description: "Dense shrubs shelter small animals.", art: "growth-shrubs", anchor: FOOT, x: 0.633, y: 0.75, w: 0.12 },
  { id: "saplings", name: "Young grove", price: 70, description: "Saplings have become a grove. Birds are visiting.", art: "growth-saplings", anchor: FOOT, x: 0.375, y: 0.75, w: 0.125 },
  { id: "grove", name: "Mature grove", price: 100, description: "Taller trees and a closing canopy.", art: "growth-grove", anchor: FOOT, x: 0.59, y: 0.68, w: 0.16 },
  { id: "pond", name: "Freshwater pond", price: 120, description: "A pond with reeds, frogs and dragonflies.", art: "growth-pond", anchor: FOOT, x: 0.517, y: 0.745, w: 0.125 },
  { id: "forest", name: "Forest", price: 170, description: "A real forest, layered from the floor to the canopy.", art: "growth-forest", anchor: FOOT, x: 0.417, y: 0.69, w: 0.195 },
  { id: "songbirds", name: "Songbirds", price: 190, description: "A flock that nests in the canopy.", art: "growth-songbirds", anchor: { x: 0.5, y: 0.5 }, x: 0.5, y: 0.46, w: 0.11 },
  { id: "heart-tree", name: "Heart tree", price: 260, description: "The old tree at the center of a thriving ecosystem.", art: "growth-heart-tree", anchor: FOOT, x: 0.5, y: 0.65, w: 0.17 },
];

export const SKIES: Sky[] = [
  { id: "day", name: "Clear day", price: 0, description: "Blue sky and a light breeze." },
  { id: "dawn", name: "Dawn", price: 60, description: "Soft pink light before first period." },
  { id: "rain", name: "Spring rain", price: 90, description: "A gentle shower. The plants love it." },
  { id: "sunset", name: "Golden hour", price: 120, description: "Warm light over the water." },
  { id: "night", name: "Starry night", price: 200, description: "A clear night, a full moon and fireflies." },
  { id: "aurora", name: "Northern lights", price: 400, description: "Curtains of light that move across the sky.", animated: true },
  { id: "cosmos", name: "Deep space", price: 650, description: "Your island, drifting through a galaxy.", animated: true },
];

export const DECOR: Decor[] = [
  { id: "bench", name: "Driftwood bench", price: 0, description: "A good spot to review flashcards.", art: "decor-bench", anchor: { x: 0.5, y: 0.754 }, w: 0.0433, x: 0.6, y: 0.62 },
  { id: "kite", name: "Kite", price: 0, description: "Rides the onshore wind.", art: "decor-kite", anchor: { x: 0.5, y: 0.306 }, w: 0.03, x: 0.7, y: 0.36 },
  { id: "campfire", name: "Campfire", price: 50, description: "Crackles softly at night.", art: "decor-campfire", anchor: { x: 0.5, y: 0.872 }, w: 0.03, x: 0.45, y: 0.66 },
  { id: "hammock", name: "Hammock", price: 60, description: "Strung between two palms.", art: "decor-hammock", anchor: { x: 0.5, y: 0.846 }, w: 0.0667, x: 0.33, y: 0.6 },
  { id: "dock", name: "Wooden dock", price: 70, description: "Reaches out over the lagoon.", art: "decor-dock", anchor: { x: 0.407, y: 0.438 }, w: 0.09, x: 0.73, y: 0.84 },
  { id: "lanterns", name: "String lights", price: 75, description: "Glow warmly after sunset.", art: "decor-lanterns", anchor: { x: 0.5, y: 0.973 }, w: 0.0692, x: 0.5, y: 0.5 },
  { id: "tidepool", name: "Tide pool", price: 80, description: "Anemones, snails and a hermit crab.", art: "decor-tidepool", anchor: { x: 0.504, y: 0.722 }, w: 0.0504, x: 0.3, y: 0.8 },
  { id: "hut", name: "Beach hut", price: 95, description: "Thatched roof, sandy floor.", art: "decor-hut", anchor: { x: 0.5, y: 0.859 }, w: 0.0567, x: 0.66, y: 0.58 },
  { id: "telescope", name: "Telescope", price: 110, description: "For counting seabirds, or stars.", art: "decor-telescope", anchor: { x: 0.513, y: 0.882 }, w: 0.0325, x: 0.38, y: 0.56 },
  { id: "sailboat", name: "Sailboat", price: 120, description: "Moored just offshore.", art: "decor-sailboat", anchor: { x: 0.5, y: 0.88 }, w: 0.0667, x: 0.2, y: 0.85 },
  { id: "stones", name: "Stone circle", price: 140, description: "Nobody remembers who built it.", art: "decor-stones", anchor: { x: 0.478, y: 0.681 }, w: 0.0767, x: 0.55, y: 0.6 },
  { id: "lighthouse", name: "Lighthouse", price: 180, description: "Keeps ships off the reef.", art: "decor-lighthouse", anchor: { x: 0.5, y: 0.943 }, w: 0.05, x: 0.74, y: 0.68 },
  { id: "treehouse", name: "Treehouse", price: 250, description: "A study nook high in the canopy.", art: "decor-treehouse", anchor: { x: 0.502, y: 0.94 }, w: 0.0971, x: 0.42, y: 0.46 },
  { id: "balloon", name: "Hot-air balloon", price: 320, description: "Drifts lazily over the island.", art: "decor-balloon", anchor: { x: 0.504, y: 0.946 }, w: 0.0571, x: 0.27, y: 0.44 },
];

export const FREE_SKY: SkyId = "day";

export function findSky(id: unknown): Sky | undefined {
  return SKIES.find((s) => s.id === id);
}

export function findDecor(id: unknown): Decor | undefined {
  return DECOR.find((d) => d.id === id);
}

export function findGrowth(id: unknown): Growth | undefined {
  return GROWTH.find((g) => g.id === id);
}

/** Price for any purchasable item id, or undefined if the id is not in the shop. */
export function itemPrice(id: unknown): number | undefined {
  const sky = findSky(id);
  if (sky) return sky.id === FREE_SKY ? undefined : sky.price;
  return findDecor(id)?.price ?? findGrowth(id)?.price;
}

/** Free items are claimed once they open, not bought: the market shows "Free" and takes no Treecoins. */
export function isFreeItem(id: unknown): boolean {
  return itemPrice(id) === 0;
}

/** Most decorations a single island can show at once. */
export const MAX_PLACED_DECOR = 24;
