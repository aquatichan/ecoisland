// Spaced repetition for the daily set (a Leitner system), as pure functions.
//
// Every answered question gets a box. A wrong answer puts it in box 1 (back
// tomorrow). A right answer moves it up a box (a first-time right answer
// starts in box 2), pushing the next review further out: 1, 2, 4, 8, 16 or
// 32 days. Each daily set mixes due reviews with new questions.

import { dayNumber, type DayKey } from "./dates";
import { DAILY_SET_SIZE } from "./economy";

/** [box 1-6, due day number] */
export type Card = [number, number];
export type SrsState = Record<string, Card>;

const INTERVALS = [0, 1, 2, 4, 8, 16, 32];
export const MAX_BOX = INTERVALS.length - 1;
export const MAX_REVIEWS_PER_SET = 4;

export function nextCard(card: Card | undefined, correct: boolean, today: DayKey): Card {
  const t = dayNumber(today);
  if (!correct) return [1, t + INTERVALS[1]];
  const box = Math.min(MAX_BOX, (card?.[0] ?? 1) + 1);
  return [box, t + INTERVALS[box]];
}

export function dueCount(state: SrsState, today: DayKey): number {
  const t = dayNumber(today);
  return Object.values(state).filter((c) => c[1] <= t).length;
}

function shuffled<T>(items: readonly T[], rng: () => number): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Today's set: up to four due reviews (weakest first), then new questions
 * from the focus unit, then the least-known questions already seen.
 */
export function buildDailySet<Q extends { id: string }>(opts: {
  focusPool: Q[];
  reviewPool: Q[];
  state: SrsState;
  today: DayKey;
  size?: number;
  rng?: () => number;
}): Q[] {
  const { focusPool, reviewPool, state, today, size = DAILY_SET_SIZE, rng = Math.random } = opts;
  const t = dayNumber(today);
  const picked = new Map<string, Q>();

  const due = reviewPool
    .filter((q) => state[q.id] && state[q.id][1] <= t)
    .sort((a, b) => state[a.id][0] - state[b.id][0] || state[a.id][1] - state[b.id][1]);
  for (const q of due) {
    if (picked.size >= Math.min(MAX_REVIEWS_PER_SET, size)) break;
    picked.set(q.id, q);
  }

  for (const q of shuffled(focusPool.filter((q) => !state[q.id]), rng)) {
    if (picked.size >= size) break;
    picked.set(q.id, q);
  }

  if (picked.size < size) {
    const seen = shuffled(focusPool.filter((q) => state[q.id] && !picked.has(q.id)), rng).sort((a, b) => state[a.id][0] - state[b.id][0]);
    for (const q of seen) {
      if (picked.size >= size) break;
      picked.set(q.id, q);
    }
  }

  return shuffled([...picked.values()], rng);
}

/** Share of a pool answered correctly and not since forgotten (box 2 or higher). */
export function readiness(pool: Array<{ id: string }>, state: SrsState): number {
  if (pool.length === 0) return 0;
  const known = pool.filter((q) => (state[q.id]?.[0] ?? 0) >= 2).length;
  return Math.round((known / pool.length) * 100);
}

export function sanitizeSrs(raw: unknown): SrsState {
  const out: SrsState = {};
  if (!raw || typeof raw !== "object") return out;
  for (const [id, v] of Object.entries(raw as Record<string, unknown>)) {
    if (Array.isArray(v) && typeof v[0] === "number" && typeof v[1] === "number") {
      out[id] = [Math.max(1, Math.min(MAX_BOX, Math.round(v[0]))), Math.round(v[1])];
    }
  }
  return out;
}
