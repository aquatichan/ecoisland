import { describe, expect, it } from "vitest";
import { DECOR, GROWTH, SKIES, findGrowth, isFreeItem, itemPrice } from "../../src/shared/catalog";
import { ISLAND_UNLOCKS } from "../../src/shared/economy";
import { LANDMARK_INFO, landmarkArt } from "../../src/shared/landmarks";

describe("island catalog", () => {
  const catalogIds = [...GROWTH.map((g) => g.id), ...DECOR.map((d) => d.id), ...SKIES.map((s) => s.id)] as string[];

  it("has unique ids across growth, decorations and skies", () => {
    expect(new Set(catalogIds).size).toBe(catalogIds.length);
  });

  it("keeps every id students may already own", () => {
    // These ids are stored in users' owned_items; removing or renaming one would take it away from them.
    const kept = [
      "bench", "kite", "campfire", "hammock", "dock", "lanterns", "tidepool", "hut", "telescope", "sailboat", "stones", "lighthouse", "treehouse", "balloon",
      "day", "dawn", "rain", "sunset", "night", "aurora", "cosmos",
    ];
    for (const id of kept) expect(catalogIds, id).toContain(id);
    expect(DECOR).toHaveLength(14);
    expect(SKIES).toHaveLength(7);
  });

  it("opens every catalog item through exactly one unlock entry, and nothing else", () => {
    expect(ISLAND_UNLOCKS.map((u) => u.id).sort()).toEqual([...catalogIds].sort());
    for (const g of GROWTH) expect(ISLAND_UNLOCKS.find((u) => u.id === g.id)?.kind, g.id).toBe("growth");
    for (const d of DECOR) expect(ISLAND_UNLOCKS.find((u) => u.id === d.id)?.kind, d.id).toBe("decor");
    for (const s of SKIES) expect(ISLAND_UNLOCKS.find((u) => u.id === s.id)?.kind, s.id).toBe("sky");
  });

  it("gives every growth and decor item its own art id and a usable anchor", () => {
    const items = [...GROWTH, ...DECOR];
    const art = items.map((i) => i.art);
    expect(new Set(art).size).toBe(art.length);
    for (const i of items) {
      expect(i.art, i.id).toMatch(/^(growth|decor)-[a-z-]+$/);
      expect(i.anchor.x >= 0 && i.anchor.x <= 1 && i.anchor.y >= 0 && i.anchor.y <= 1, i.id).toBe(true);
    }
  });

  it("prices every item, with a few free ones, and keeps the default sky off the market", () => {
    for (const id of catalogIds.filter((x) => x !== "day")) expect(itemPrice(id), id).toBeGreaterThanOrEqual(0);
    expect(itemPrice("day")).toBeUndefined();
    expect(itemPrice("ambassador_badge")).toBeUndefined();
    expect(findGrowth("heart-tree")?.price).toBeGreaterThan(0);
  });

  it("makes the first decorations free to claim, but still behind their XP", () => {
    const free = catalogIds.filter((id) => isFreeItem(id));
    expect(free.sort()).toEqual(["bench", "kite"]);
    for (const id of free) expect(ISLAND_UNLOCKS.find((u) => u.id === id)?.minXp, id).toBe(10);
    expect(isFreeItem("day")).toBe(false); // not on the market at all
    expect(isFreeItem("nope")).toBe(false);
    // Nothing else is free: everything past the first tier costs Treecoins.
    for (const id of catalogIds.filter((x) => x !== "day" && !free.includes(x))) expect(itemPrice(id), id).toBeGreaterThan(0);
  });

  it("opens costlier items no earlier than cheaper ones of the same kind", () => {
    for (const list of [GROWTH, DECOR]) {
      const byPrice = [...list].sort((a, b) => a.price - b.price);
      const xp = byPrice.map((i) => ISLAND_UNLOCKS.find((u) => u.id === i.id)!.minXp);
      for (let i = 1; i < xp.length; i++) expect(xp[i], byPrice[i].id).toBeGreaterThanOrEqual(xp[i - 1]);
    }
  });

  it("describes all nine landmarks, each with its own art id", () => {
    for (let n = 1; n <= 9; n++) {
      expect(LANDMARK_INFO[n]?.name, `unit ${n}`).toBeTruthy();
      expect(LANDMARK_INFO[n]?.detail, `unit ${n}`).toBeTruthy();
    }
    expect(new Set([1, 2, 3, 4, 5, 6, 7, 8, 9].map(landmarkArt)).size).toBe(9);
  });
});
