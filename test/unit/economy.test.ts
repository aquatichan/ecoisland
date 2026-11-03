import { describe, expect, it } from "vitest";
import {
  MAX_FLORA,
  REWARD,
  STAGES,
  dailySetReward,
  floraCount,
  frqReward,
  islandHealth,
  legacyLifetimeXp,
  legacyRefund,
  masteredUnits,
  quizReward,
  stageForXp,
  stageProgress,
} from "../../src/shared/economy";
import { DECOR, SKIES, itemPrice } from "../../src/shared/catalog";

describe("rewards", () => {
  it("pays the daily set by correct answers and streak", () => {
    expect(dailySetReward(0, 10, 1)).toEqual({ tc: 10, xp: 20 });
    expect(dailySetReward(10, 10, 1)).toEqual({ tc: 20, xp: 40 });
    expect(dailySetReward(7, 10, 3)).toEqual({ tc: 10 + 7 + REWARD.DAILY_SET_STREAK_BONUS_TC, xp: 34 });
    expect(dailySetReward(99, 10, 1)).toEqual({ tc: 20, xp: 40 }); // clamped
  });

  it("scales quiz rewards and caps XP", () => {
    expect(quizReward(0, 10)).toEqual({ tc: 3, xp: 0 });
    expect(quizReward(10, 10)).toEqual({ tc: 15, xp: 20 });
    expect(quizReward(40, 40).xp).toBe(REWARD.QUIZ_MAX_XP);
    expect(quizReward(1, 0)).toEqual({ tc: 0, xp: 0 });
  });

  it("scales FRQ rewards", () => {
    expect(frqReward(0, 10)).toEqual({ tc: 5, xp: 0 });
    expect(frqReward(10, 10)).toEqual({ tc: 20, xp: 30 });
    expect(frqReward(20, 10)).toEqual({ tc: 20, xp: 30 });
  });
});

describe("island growth", () => {
  it("has increasing stage thresholds", () => {
    for (let i = 1; i < STAGES.length; i++) expect(STAGES[i].minXp).toBeGreaterThan(STAGES[i - 1].minXp);
    expect(stageForXp(0).n).toBe(0);
    expect(stageForXp(20).n).toBe(1);
    expect(stageForXp(1499).n).toBe(4);
    expect(stageForXp(99999).n).toBe(5);
  });

  it("reports progress toward the next stage", () => {
    expect(stageProgress(85)).toMatchObject({ stage: { n: 1 }, next: { n: 2 }, toNext: 65 });
    expect(stageProgress(5000)).toMatchObject({ pct: 100, toNext: 0 });
  });

  it("adds plants steadily and never removes them", () => {
    expect(floraCount(0)).toBe(0);
    expect(floraCount(20)).toBe(2);
    // A first daily set (20-40 XP) already shows new life.
    expect(floraCount(34)).toBeGreaterThan(floraCount(19));
    let prev = 0;
    for (let xp = 0; xp <= 6000; xp += 7) {
      const n = floraCount(xp);
      expect(n).toBeGreaterThanOrEqual(prev);
      prev = n;
    }
    expect(floraCount(100000)).toBe(MAX_FLORA);
  });

  it("wilts after missed days and never punishes a new island", () => {
    expect(islandHealth(undefined, "2026-11-02").label).toBe("Thriving");
    expect(islandHealth("2026-11-02", "2026-11-02").label).toBe("Thriving");
    expect(islandHealth("2026-11-01", "2026-11-02").label).toBe("Thriving");
    expect(islandHealth("2026-10-31", "2026-11-02")).toMatchObject({ label: "Thirsty", daysMissed: 1 });
    expect(islandHealth("2026-10-30", "2026-11-02").label).toBe("Wilting");
    expect(islandHealth("2026-10-01", "2026-11-02").label).toBe("Withered");
  });

  it("marks units mastered at 70%", () => {
    expect(masteredUnits({ u1: 70, u2: 69, u9: 100 })).toEqual([1, 9]);
    expect(masteredUnits(undefined)).toEqual([]);
  });
});

describe("legacy migration", () => {
  it("refunds retired items once each and never the ambassador badge", () => {
    expect(legacyRefund([{ item_id: "nuke" }, { item_id: "nuke" }, { item_id: "forest" }])).toBe(410);
    expect(legacyRefund([{ item_id: "ambassador_badge" }])).toBe(0);
    expect(legacyRefund("junk")).toBe(0);
  });

  it("converts the old level curve to lifetime XP", () => {
    expect(legacyLifetimeXp(1, 10)).toBe(10);
    expect(legacyLifetimeXp(2, 0)).toBe(25);
    expect(legacyLifetimeXp(3, 5)).toBe(25 + 30 + 5);
    expect(legacyLifetimeXp(undefined, undefined)).toBe(0);
  });
});

describe("catalog", () => {
  it("has unique ids and positive prices for everything but the free sky", () => {
    const ids = [...SKIES.map((s) => s.id), ...DECOR.map((d) => d.id)];
    expect(new Set(ids).size).toBe(ids.length);
    expect(itemPrice("day")).toBeUndefined();
    for (const s of SKIES.filter((s) => s.id !== "day")) expect(itemPrice(s.id)).toBeGreaterThan(0);
    for (const d of DECOR) expect(itemPrice(d.id)).toBe(d.price);
    expect(itemPrice("ambassador_badge")).toBeUndefined();
  });
});
