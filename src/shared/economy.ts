// Ecoisland's reward economy and island growth rules.
//
// Treecoins (TC) are spent in the island shop. XP never decreases and grows
// the island. Every number a student can earn lives here, and the server is
// the only place that applies them. The app imports the same table purely to
// show "+12 TC" previews.

import { daysBetween, isDayKey, type DayKey } from "./dates";

export const DAILY_SET_SIZE = 10;

export const REWARD = {
  DAILY_SET_BASE_TC: 10,
  DAILY_SET_STREAK_BONUS_TC: 5, // from a 3-day streak onwards
  DAILY_SET_STREAK_BONUS_FROM: 3,
  DAILY_SET_BASE_XP: 20,
  DAILY_SET_XP_PER_CORRECT: 2,

  QUIZ_MIN_QUESTIONS: 5,
  QUIZ_MAX_QUESTIONS: 60,
  QUIZ_BASE_TC: 3,
  QUIZ_MAX_BONUS_TC: 12,
  QUIZ_XP_PER_CORRECT: 2,
  QUIZ_MAX_XP: 40,
  QUIZ_DAILY_CAP: 5, // rewarded quizzes per day; extra quizzes still count for assignments

  LESSON_TC: 5,
  LESSON_XP: 10,

  FRQ_BASE_TC: 5,
  FRQ_MAX_BONUS_TC: 15,
  FRQ_XP_PER_POINT: 3,
  FRQ_MAX_XP: 30,
  FRQ_DAILY_CAP: 3, // rewarded FRQs per day
  FRQ_DAILY_GRADES: 10, // AI gradings per day (cost guard)

  QUEST_TC: 30,
  QUEST_XP: 40,

  WELCOME_TC: 50,
} as const;

/** A unit counts as mastered (and its island landmark appears) at this unit-quiz score. */
export const MASTERY_PCT = 70;
/** Unit quizzes need at least this many questions to count towards mastery. */
export const MASTERY_MIN_QUESTIONS = 10;

export type Reward = { tc: number; xp: number };

const clampInt = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, Math.round(n)));

export function dailySetReward(correct: number, total: number, streakAfter: number): Reward {
  const c = clampInt(correct, 0, total);
  const bonus = streakAfter >= REWARD.DAILY_SET_STREAK_BONUS_FROM ? REWARD.DAILY_SET_STREAK_BONUS_TC : 0;
  return {
    tc: REWARD.DAILY_SET_BASE_TC + c + bonus,
    xp: REWARD.DAILY_SET_BASE_XP + c * REWARD.DAILY_SET_XP_PER_CORRECT,
  };
}

export function quizReward(correct: number, total: number): Reward {
  if (total <= 0) return { tc: 0, xp: 0 };
  const c = clampInt(correct, 0, total);
  return {
    tc: REWARD.QUIZ_BASE_TC + Math.round((c / total) * REWARD.QUIZ_MAX_BONUS_TC),
    xp: Math.min(REWARD.QUIZ_MAX_XP, c * REWARD.QUIZ_XP_PER_CORRECT),
  };
}

export function frqReward(earned: number, possible: number): Reward {
  if (possible <= 0) return { tc: 0, xp: 0 };
  const e = Math.max(0, Math.min(possible, earned));
  return {
    tc: REWARD.FRQ_BASE_TC + Math.round((e / possible) * REWARD.FRQ_MAX_BONUS_TC),
    xp: Math.min(REWARD.FRQ_MAX_XP, Math.round(e * REWARD.FRQ_XP_PER_POINT)),
  };
}

export function pct(correct: number, total: number): number {
  return total > 0 ? Math.round((Math.max(0, Math.min(total, correct)) / total) * 100) : 0;
}

// ─── Island growth ──────────────────────────────────────────────────────────

export type Stage = { n: number; name: string; minXp: number; blurb: string };

export const STAGES: Stage[] = [
  { n: 0, name: "Bare rock", minXp: 0, blurb: "A quiet island waiting for its first green." },
  { n: 1, name: "First sprouts", minXp: 20, blurb: "Grass is taking hold along the shore." },
  { n: 2, name: "Meadow", minXp: 150, blurb: "Wildflowers and young shrubs cover the hills." },
  { n: 3, name: "Young grove", minXp: 400, blurb: "Saplings have become a grove. Birds are visiting." },
  { n: 4, name: "Forest", minXp: 800, blurb: "A real forest, with a pond and life in the canopy." },
  { n: 5, name: "Thriving ecosystem", minXp: 1500, blurb: "A self-sustaining ecosystem. This took real work." },
];

export function stageForXp(xp: number): Stage {
  let stage = STAGES[0];
  for (const s of STAGES) if (xp >= s.minXp) stage = s;
  return stage;
}

export function stageProgress(xp: number): { stage: Stage; next?: Stage; pct: number; toNext: number } {
  const stage = stageForXp(xp);
  const next = STAGES[stage.n + 1];
  if (!next) return { stage, pct: 100, toNext: 0 };
  const span = next.minXp - stage.minXp;
  return {
    stage,
    next,
    pct: Math.max(0, Math.min(100, Math.round(((xp - stage.minXp) / span) * 100))),
    toNext: Math.max(0, next.minXp - xp),
  };
}

// ─── Island unlocks ─────────────────────────────────────────────────────────

export type UnlockKind = "growth" | "decor" | "sky";

export type Unlock = {
  id: string;
  kind: UnlockKind;
  /** Lifetime XP needed before the item can be bought in the market. */
  minXp: number;
};

/**
 * What the island market sells and when it opens. Prices live in catalog.ts;
 * the server checks this table in /api/purchase, so the browser can't skip it.
 * Owning an item never depends on XP: students keep everything they have.
 * Everything here is gated, including items that cost nothing: those are
 * claimed once they open. Only the default sky ("day") is open from the start.
 */
export const ISLAND_UNLOCKS: readonly Unlock[] = [
  // Growth: painted plants and wildlife that fill the island in. They open at
  // the stages' XP (see STAGES) and in between.
  { id: "sprouts", kind: "growth", minXp: 20 },
  { id: "wildflowers", kind: "growth", minXp: 80 },
  { id: "meadow", kind: "growth", minXp: 150 },
  { id: "shrubs", kind: "growth", minXp: 250 },
  { id: "saplings", kind: "growth", minXp: 400 },
  { id: "grove", kind: "growth", minXp: 600 },
  { id: "pond", kind: "growth", minXp: 800 },
  { id: "forest", kind: "growth", minXp: 1000 },
  { id: "songbirds", kind: "growth", minXp: 1200 },
  { id: "heart-tree", kind: "growth", minXp: 1500 },
  // Decorations.
  { id: "bench", kind: "decor", minXp: 10 },
  { id: "kite", kind: "decor", minXp: 10 },
  { id: "campfire", kind: "decor", minXp: 20 },
  { id: "hammock", kind: "decor", minXp: 20 },
  { id: "dock", kind: "decor", minXp: 60 },
  { id: "lanterns", kind: "decor", minXp: 60 },
  { id: "tidepool", kind: "decor", minXp: 100 },
  { id: "hut", kind: "decor", minXp: 150 },
  { id: "telescope", kind: "decor", minXp: 150 },
  { id: "sailboat", kind: "decor", minXp: 250 },
  { id: "stones", kind: "decor", minXp: 250 },
  { id: "lighthouse", kind: "decor", minXp: 400 },
  { id: "treehouse", kind: "decor", minXp: 600 },
  { id: "balloon", kind: "decor", minXp: 800 },
  // Skies. "day" is free and always on.
  { id: "day", kind: "sky", minXp: 0 },
  { id: "dawn", kind: "sky", minXp: 20 },
  { id: "rain", kind: "sky", minXp: 60 },
  { id: "sunset", kind: "sky", minXp: 150 },
  { id: "night", kind: "sky", minXp: 250 },
  { id: "aurora", kind: "sky", minXp: 800 },
  { id: "cosmos", kind: "sky", minXp: 1500 },
];

export function findUnlock(id: unknown): Unlock | undefined {
  return ISLAND_UNLOCKS.find((u) => u.id === id);
}

/** True once `xp` reaches the item's threshold. Unknown ids are never unlocked. */
export function isUnlocked(id: string, xp: number): boolean {
  const unlock = findUnlock(id);
  return !!unlock && xp >= unlock.minXp;
}

/** The market items that opened between two XP totals (what a session just unlocked). */
export function unlockedBetween(beforeXp: number, afterXp: number): Unlock[] {
  return ISLAND_UNLOCKS.filter((u) => u.id !== "day" && u.minXp > beforeXp && u.minXp <= afterXp);
}

export type Health = {
  /** 1 = lush, 0.2 = withered. */
  value: number;
  label: "Thriving" | "Thirsty" | "Wilting" | "Withered";
  daysMissed: number;
};

/**
 * Island health from the last day a daily set was completed. Missing one day
 * makes the island thirsty; three or more and it withers. One daily set brings
 * it straight back. A brand-new island is never punished.
 */
export function islandHealth(lastSetDay: DayKey | undefined | null, today: DayKey): Health {
  if (!lastSetDay || !isDayKey(lastSetDay)) return { value: 1, label: "Thriving", daysMissed: 0 };
  const missed = Math.max(0, daysBetween(lastSetDay, today) - 1);
  if (missed === 0) return { value: 1, label: "Thriving", daysMissed: 0 };
  if (missed === 1) return { value: 0.72, label: "Thirsty", daysMissed: 1 };
  if (missed === 2) return { value: 0.45, label: "Wilting", daysMissed: 2 };
  return { value: 0.2, label: "Withered", daysMissed: missed };
}

/** Units whose landmark has been earned (unit quiz best ≥ MASTERY_PCT). */
export function masteredUnits(unitBest: Record<string, number> | undefined | null): number[] {
  const out: number[] = [];
  for (let n = 1; n <= 9; n++) if ((unitBest?.[`u${n}`] ?? 0) >= MASTERY_PCT) out.push(n);
  return out;
}

// ─── Legacy migration ───────────────────────────────────────────────────────

/** Prices of the retired PNG island items, used once to refund what students spent. */
export const LEGACY_ITEM_PRICES: Record<string, number> = {
  aurora_dreams: 100, environment_advocate: 5, faint_snowfall: 50, futurismo: 220, glitchy: 666,
  metropolis_sunset: 210, moonshine: 130, mystic_divinity: 1111, partly_cloudy: 25, perfection: 999,
  retrowave: 380, the_cosmos: 420, desertified: 90, lush_grass: 10, magma_bed: 50, purple_mountains: 125,
  reflection: 240, sand_dunes: 75, the_end: 150, uneven_elevation: 60, rock_shower: 160, crops: 35,
  crystal_waterfall: 120, emblem_of_care: 50, environmental_orbs: 140, giant_cursor: 100, thunderstorm: 75,
  suburban_beachhouse: 125, forest: 60, renewable_energy: 120, the_grand_oak: 45, together: 70, treecoins: 65,
  trophy: 200, volcano: 240, eco_car: 95, nuke: 350,
  // "ambassador_badge" was never purchasable, so it is deliberately not refunded.
};

export function legacyRefund(items: unknown): number {
  if (!Array.isArray(items)) return 0;
  const seen = new Set<string>();
  let total = 0;
  for (const item of items) {
    const id = typeof item === "string" ? item : (item as { item_id?: unknown })?.item_id;
    if (typeof id !== "string" || seen.has(id)) continue;
    seen.add(id);
    total += LEGACY_ITEM_PRICES[id] ?? 0;
  }
  return total;
}

/** Lifetime XP implied by the old level system (25 XP for level 2, ×1.2 per level). */
export function legacyLifetimeXp(level: unknown, xp: unknown): number {
  const lvl = typeof level === "number" && level > 1 ? Math.min(200, Math.floor(level)) : 1;
  let total = typeof xp === "number" && xp > 0 ? Math.floor(xp) : 0;
  let need = 25;
  for (let l = 1; l < lvl; l++) {
    total += need;
    need = Math.floor(need * 1.2);
  }
  return total;
}
