// Sample islands for pages that show what an island looks like (the landing
// page, onboarding, the "needs a bigger screen" page). A real student's island
// uses what they own; a demo just shows the growth that opens at `xp`.
import { GROWTH } from "@/shared/catalog";
import { isUnlocked } from "@/shared/economy";

export function demoGrowth(xp: number): string[] {
  return GROWTH.filter((g) => isUnlocked(g.id, xp)).map((g) => g.id);
}
