import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { BASE, H, HORIZON, PLACE, VIEW, W, clamp, depthScale, pctW, pctX, pctY, sceneFromView } from "../../src/components/island/geometry";
import { healthFilter } from "../../src/components/island/health";
import { SKY_LOOKS } from "../../src/components/island/skies";
import { DECOR, GROWTH, SKIES } from "../../src/shared/catalog";
import { islandHealth } from "../../src/shared/economy";
import { marketState, visibleDecor, visibleGrowth } from "../../src/shared/island";

describe("what an island shows", () => {
  it("draws only the growth the student owns, in market order, ignoring anything else", () => {
    expect(visibleGrowth([])).toEqual([]);
    expect(visibleGrowth(undefined)).toEqual([]);
    expect(visibleGrowth(["pond", "bench", "sprouts", "night", "nope"])).toEqual(["sprouts", "pond"]);
    expect(visibleGrowth(GROWTH.map((g) => g.id))).toHaveLength(GROWTH.length);
  });

  it("draws only placed decorations the student owns", () => {
    const placed = [
      { id: "bench" as const, x: 0.6, y: 0.62 },
      { id: "lighthouse" as const, x: 0.74, y: 0.68 }, // placed, but not owned
      { id: "nope" as never, x: 0.5, y: 0.5 }, // not in the catalog
    ];
    expect(visibleDecor(["bench", "campfire"], placed).map((d) => d.id)).toEqual(["bench"]);
    expect(visibleDecor([], placed)).toEqual([]);
    expect(visibleDecor(["bench"], undefined)).toEqual([]);
    expect(visibleDecor(undefined, placed)).toEqual([]);
  });
});

describe("island health filter", () => {
  it("leaves a thriving island untouched and fades a thirsty one", () => {
    expect(healthFilter(1)).toBeUndefined();
    const filters = [0.72, 0.45, 0.2].map((h) => healthFilter(h));
    for (const f of filters) expect(f).toMatch(/^saturate\([\d.]+\) brightness\([\d.]+\)$/); // brightness and saturation only
    const sat = filters.map((f) => Number(/saturate\(([\d.]+)\)/.exec(f!)![1]));
    expect(sat[0]).toBeGreaterThan(sat[1]);
    expect(sat[1]).toBeGreaterThan(sat[2]);
    expect(sat[2]).toBeGreaterThan(0.3); // withered, not grey
  });

  it("matches the states islandHealth reports", () => {
    expect(healthFilter(islandHealth("2026-11-08", "2026-11-09").value)).toBeUndefined(); // thriving
    expect(healthFilter(islandHealth("2026-11-01", "2026-11-09").value)).toBeDefined(); // withered
  });
});

describe("island geometry", () => {
  it("maps scene points into the visible view and back", () => {
    expect(pctX(VIEW.x)).toBe(0);
    expect(pctX(VIEW.x + VIEW.w)).toBe(100);
    expect(pctY(VIEW.y)).toBe(0);
    expect(pctW(VIEW.w)).toBe(100);
    const at = sceneFromView(0.5, 0.5);
    expect(at.x * W).toBeCloseTo(VIEW.x + VIEW.w / 2);
    expect(at.y * H).toBeCloseTo(VIEW.y + VIEW.h / 2);
    for (const [fx, fy] of [[0.1, 0.9], [0.77, 0.33]]) {
      const s = sceneFromView(fx, fy);
      expect(pctX(s.x * W) / 100).toBeCloseTo(fx);
      expect(pctY(s.y * H) / 100).toBeCloseTo(fy);
    }
  });

  it("keeps the painted base, and every growth item and default decoration, inside the view", () => {
    expect(BASE.x - BASE.w / 2).toBeGreaterThanOrEqual(VIEW.x);
    expect(BASE.x + BASE.w / 2).toBeLessThanOrEqual(VIEW.x + VIEW.w);
    expect(BASE.y).toBeLessThanOrEqual(VIEW.y + VIEW.h);
    for (const g of GROWTH) {
      expect(g.x * W, g.id).toBeGreaterThan(VIEW.x);
      expect(g.x * W, g.id).toBeLessThan(VIEW.x + VIEW.w);
      expect(g.y * H, g.id).toBeGreaterThan(VIEW.y);
      expect(g.y * H, g.id).toBeLessThan(VIEW.y + VIEW.h);
    }
    for (const d of DECOR) {
      expect(d.x, d.id).toBeGreaterThanOrEqual(PLACE.x0);
      expect(d.x, d.id).toBeLessThanOrEqual(PLACE.x1);
      expect(d.y, d.id).toBeGreaterThanOrEqual(PLACE.y0 - 0.001);
      expect(d.y, d.id).toBeLessThanOrEqual(PLACE.y1);
    }
  });

  it("keeps the placement area inside the picture, so a saved layout stays valid", () => {
    expect(PLACE.y0 * H).toBeGreaterThanOrEqual(VIEW.y);
    expect(PLACE.y1 * H).toBeLessThanOrEqual(VIEW.y + VIEW.h);
    expect(PLACE.x0 * W).toBeGreaterThanOrEqual(VIEW.x);
    expect(PLACE.x1 * W).toBeLessThanOrEqual(VIEW.x + VIEW.w);
  });

  it("makes nearer decorations a little bigger and clamps", () => {
    expect(depthScale(0.3)).toBeCloseTo(0.85);
    expect(depthScale(0.9)).toBeCloseTo(1.15);
    expect(depthScale(0.7)).toBeGreaterThan(depthScale(0.6));
    expect(clamp(5, 0, 1)).toBe(1);
    expect(clamp(-5, 0, 1)).toBe(0);
  });
});

describe("market states", () => {
  it("never offers a price for something the student owns", () => {
    const all = [...GROWTH.map((g) => g.id), ...DECOR.map((d) => d.id), ...SKIES.map((s) => s.id)] as string[];
    for (const xp of [0, 10, 620, 100000]) {
      for (const id of all) {
        // Owning it, as an array or a Set, is always "owned": no "buy" and no "free", at any XP.
        expect(marketState(id, [id], xp), `${id} @ ${xp} XP`).toBe("owned");
        expect(marketState(id, new Set([id]), xp), `${id} @ ${xp} XP`).toBe("owned");
      }
    }
  });

  it("walks an item from locked to free or buyable as XP grows", () => {
    expect(marketState("bench", [], 9)).toBe("locked");
    expect(marketState("bench", [], 10)).toBe("free"); // costs nothing, but behind 10 XP
    expect(marketState("campfire", [], 19)).toBe("locked");
    expect(marketState("campfire", [], 20)).toBe("buy");
    expect(marketState("heart-tree", [], 1499)).toBe("locked");
    expect(marketState("heart-tree", [], 1500)).toBe("buy");
    expect(marketState("aurora", [], 800)).toBe("buy");
  });

  it("treats the default sky as always owned, and unknown items as locked", () => {
    expect(marketState("day", [], 0)).toBe("owned");
    expect(marketState("nope", [], 100000)).toBe("locked");
  });
});

describe("island health has one source", () => {
  const page = (name: string) => readFileSync(join(__dirname, "../../src/pages", name), "utf8");

  it("is read through useIslandHealth on Today, the Island page and the practice results", () => {
    for (const name of ["Today.tsx", "IslandPage.tsx", "Practice.tsx"]) {
      const text = page(name);
      expect(text, name).toContain("useIslandHealth(");
      // No page works it out for itself from the profile.
      expect(text, name).not.toMatch(/islandHealth\(\s*profile\./);
    }
  });
});

describe("sky discs", () => {
  it("keep the sun and moon inside the picture, above the sea", () => {
    const horizonY = VIEW.y + HORIZON * VIEW.h;
    for (const [id, look] of Object.entries(SKY_LOOKS)) {
      for (const disc of [look.sun, look.moon]) {
        if (!disc) continue;
        expect(disc.x - disc.r, `${id} left`).toBeGreaterThanOrEqual(VIEW.x);
        expect(disc.x + disc.r, `${id} right`).toBeLessThanOrEqual(VIEW.x + VIEW.w);
        expect(disc.y - disc.r, `${id} top edge (it was cut off before)`).toBeGreaterThanOrEqual(VIEW.y);
        expect(disc.y, `${id} centre above the sea`).toBeLessThanOrEqual(horizonY);
      }
    }
  });
});
