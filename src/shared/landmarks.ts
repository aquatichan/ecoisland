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
 * Where each landmark stands on the island: the bottom-center of its sprite at
 * (x, y) in scene units (0..1 across, 0..1 down), w wide as a fraction of the scene.
 */
export const LANDMARK_LAYOUT: Record<number, { x: number; y: number; w: number }> = {
  1: { x: 0.3581, y: 0.775, w: 0.0761 },
  2: { x: 0.6367, y: 0.775, w: 0.0622 },
  3: { x: 0.2147, y: 0.3861, w: 0.0783 },
  4: { x: 0.5094, y: 0.8861, w: 0.1133 },
  5: { x: 0.3275, y: 0.6861, w: 0.085 },
  6: { x: 0.6739, y: 0.6444, w: 0.0667 },
  7: { x: 0.5858, y: 0.6528, w: 0.0217 },
  8: { x: 0.8197, y: 0.8898, w: 0.1028 },
  9: { x: 0.2139, y: 0.9407, w: 0.1978 },
};
