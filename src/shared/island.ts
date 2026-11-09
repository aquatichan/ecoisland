// What a student's island shows. Only items they own are drawn: everything
// that renders an island (the app, and the mirror classmates see) goes through
// these, so an unowned item can never appear.

import { FREE_SKY, GROWTH, findDecor, isFreeItem, type GrowthId } from "./catalog";
import { isUnlocked } from "./economy";
import type { PlacedDecor } from "./types";

/** The growth items among `owned`, in the market's order. */
export function visibleGrowth(owned: readonly string[] | undefined | null): GrowthId[] {
  const have = new Set(owned ?? []);
  return GROWTH.filter((g) => have.has(g.id)).map((g) => g.id);
}

/** The placed decorations the student actually owns (and that still exist in the catalog). */
export function visibleDecor(owned: readonly string[] | undefined | null, placed: readonly PlacedDecor[] | undefined | null): PlacedDecor[] {
  const have = new Set(owned ?? []);
  return (placed ?? []).filter((d) => d && have.has(d.id) && findDecor(d.id));
}

/**
 * What an island market card offers.
 *   owned  the student has it (the default sky always counts): never shows a price
 *   locked their XP hasn't reached its threshold
 *   free   open and costs nothing: a free claim
 *   buy    open, and costs Treecoins
 */
export type MarketState = "owned" | "locked" | "free" | "buy";

export function marketState(id: string, owned: ReadonlySet<string> | readonly string[], xp: number): MarketState {
  const have = owned instanceof Set ? owned.has(id) : (owned as readonly string[]).includes(id);
  if (have || id === FREE_SKY) return "owned";
  if (!isUnlocked(id, xp)) return "locked";
  return isFreeItem(id) ? "free" : "buy";
}
