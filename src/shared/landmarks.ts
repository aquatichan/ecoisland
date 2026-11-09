// The nine unit landmarks. One appears on a student's island each time they
// score MASTERY_PCT on that unit's quiz (see masteredUnits in economy.ts), so
// they are earned, not bought. Names and descriptions are shown across the app.

export const LANDMARK_INFO: Record<number, { name: string; detail: string }> = {
  1: { name: "Food web", detail: "Deer graze while a fox watches: producers, consumers and the energy between them." },
  2: { name: "Wildflower meadow", detail: "A meadow, a beehive and pollinators: biodiversity at work." },
  3: { name: "Seabird flock", detail: "A growing population circling overhead." },
  4: { name: "River and waterfall", detail: "Water carving through soil layers on its way to the sea." },
  5: { name: "Terraced farm", detail: "Contour terraces that hold soil in place." },
  6: { name: "Wind and solar", detail: "A turbine and a solar array power the island." },
  7: { name: "Weather station", detail: "Instruments tracking the air you learned about." },
  8: { name: "Clean lagoon", detail: "Lily pads and leaping fish in clean water." },
  9: { name: "Reef and mangroves", detail: "A coral reef offshore and mangroves guarding the shore." },
};

/** Painted art id for a unit's landmark (see src/components/island/assets.ts). */
export function landmarkArt(unit: number): string {
  return `landmark-${unit}`;
}

/**
 * Where each landmark stands on the island: its sprite is held at (x, y) in scene units
 * (0..1 across, 0..1 down) by its bottom-center, or by `ay` down the sprite for ones that
 * float (the seabirds). w is its width as a fraction of the scene.
 */
export const LANDMARK_LAYOUT: Record<number, { x: number; y: number; w: number; ay?: number }> = {
  1: { x: 0.36, y: 0.775, w: 0.0933 },
  2: { x: 0.64, y: 0.775, w: 0.0833 },
  3: { x: 0.22, y: 0.4, w: 0.1417, ay: 0.5 },
  4: { x: 0.51, y: 0.86, w: 0.0671 },
  5: { x: 0.33, y: 0.69, w: 0.1292 },
  6: { x: 0.68, y: 0.65, w: 0.0819 },
  7: { x: 0.585, y: 0.655, w: 0.0432 },
  8: { x: 0.8, y: 0.89, w: 0.125 },
  9: { x: 0.21, y: 0.94, w: 0.1542 },
};
