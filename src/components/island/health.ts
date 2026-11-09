// A thirsty island looks tired: the painted layers fade in color and brightness.
// Applied with a CSS filter on the island's image wrapper only (never on the UI
// around it), so no art has to be repainted for each state.
import { clamp } from "./geometry";

/** `health` is 1 (thriving) down to 0.2 (withered), see islandHealth in economy.ts. */
export function healthFilter(health: number): string | undefined {
  const t = clamp((1 - health) / 0.8, 0, 1);
  if (t === 0) return undefined;
  const saturate = 1 - 0.55 * t;
  const brightness = 1 - 0.12 * t;
  return `saturate(${saturate.toFixed(2)}) brightness(${brightness.toFixed(2)})`;
}
