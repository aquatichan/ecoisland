// The island shop. Every item is drawn in code (src/components/island), so
// the catalog is just ids, names and prices. The server reads prices from here
// when a student buys something.

export type SkyId = "day" | "dawn" | "sunset" | "rain" | "night" | "aurora" | "cosmos";

export type Sky = {
  id: SkyId;
  name: string;
  price: number;
  description: string;
  /** Animated skies render a WebGL background behind the island. */
  animated?: boolean;
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
  /** Default position in scene coordinates (0..1 across, 0..1 down). */
  x: number;
  y: number;
};

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
  { id: "bench", name: "Driftwood bench", price: 30, description: "A good spot to review flashcards.", x: 0.6, y: 0.62 },
  { id: "kite", name: "Kite", price: 40, description: "Rides the onshore wind.", x: 0.7, y: 0.36 },
  { id: "campfire", name: "Campfire", price: 50, description: "Crackles softly at night.", x: 0.45, y: 0.66 },
  { id: "hammock", name: "Hammock", price: 60, description: "Strung between two palms.", x: 0.33, y: 0.6 },
  { id: "dock", name: "Wooden dock", price: 70, description: "Reaches out over the lagoon.", x: 0.73, y: 0.84 },
  { id: "lanterns", name: "String lights", price: 75, description: "Glow warmly after sunset.", x: 0.5, y: 0.5 },
  { id: "tidepool", name: "Tide pool", price: 80, description: "Anemones, snails and a hermit crab.", x: 0.3, y: 0.8 },
  { id: "hut", name: "Beach hut", price: 95, description: "Thatched roof, sandy floor.", x: 0.66, y: 0.58 },
  { id: "telescope", name: "Telescope", price: 110, description: "For counting seabirds, or stars.", x: 0.38, y: 0.56 },
  { id: "sailboat", name: "Sailboat", price: 120, description: "Moored just offshore.", x: 0.2, y: 0.85 },
  { id: "stones", name: "Stone circle", price: 140, description: "Nobody remembers who built it.", x: 0.55, y: 0.6 },
  { id: "lighthouse", name: "Lighthouse", price: 180, description: "Keeps ships off the reef.", x: 0.74, y: 0.68 },
  { id: "treehouse", name: "Treehouse", price: 250, description: "A study nook high in the canopy.", x: 0.42, y: 0.46 },
  { id: "balloon", name: "Hot-air balloon", price: 320, description: "Drifts lazily over the island.", x: 0.27, y: 0.44 },
];

export const FREE_SKY: SkyId = "day";

export function findSky(id: unknown): Sky | undefined {
  return SKIES.find((s) => s.id === id);
}

export function findDecor(id: unknown): Decor | undefined {
  return DECOR.find((d) => d.id === id);
}

/** Price for any purchasable item id, or undefined if the id is not in the shop. */
export function itemPrice(id: unknown): number | undefined {
  const sky = findSky(id);
  if (sky) return sky.id === FREE_SKY ? undefined : sky.price;
  return findDecor(id)?.price;
}

/** Most decorations a single island can show at once. */
export const MAX_PLACED_DECOR = 24;
