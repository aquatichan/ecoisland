// What a student's island shows. Only items they own are drawn: everything
// that renders an island (the app, and the mirror classmates see) goes through
// these, so an unowned item can never appear.

import { GROWTH, findDecor, type GrowthId } from "./catalog";
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
