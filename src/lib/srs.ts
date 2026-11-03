// Spaced repetition for the daily set (a Leitner system).
//
// Every question a student answers gets a box. Correct answers move it up a
// box and push the next review further out (1, 2, 4, 8, 16, 32 days); a
// wrong answer drops it back to box 1 for tomorrow. Each daily set mixes due
// reviews with new questions from the student's current unit.
import { doc, getDoc, setDoc } from "firebase/firestore";
import { dayNumber, type DayKey } from "@/shared/dates";
import { DAILY_SET_SIZE } from "@/shared/economy";
import type { Question } from "./content";
import { db } from "./firebase";
import { shuffle } from "./utils";

/** [box 1-6, due day number] */
export type Card = [number, number];
export type SrsState = Record<string, Card>;

const INTERVALS = [0, 1, 2, 4, 8, 16, 32];
export const MAX_REVIEWS_PER_SET = 4;

export function nextCard(card: Card | undefined, correct: boolean, today: DayKey): Card {
  const t = dayNumber(today);
  if (!correct) return [1, t + 1];
  const box = Math.min(INTERVALS.length - 1, (card?.[0] ?? 0) + 1);
  return [box, t + INTERVALS[box]];
}

export function isDue(card: Card | undefined, today: DayKey): boolean {
  return !!card && card[1] <= dayNumber(today);
}

export function dueCount(state: SrsState, today: DayKey): number {
  const t = dayNumber(today);
  return Object.values(state).filter((c) => c[1] <= t).length;
}

/**
 * Builds today's set: up to four due reviews (weakest first), then new
 * questions from the focus unit, then the least-known seen questions.
 */
export function buildDailySet(opts: {
  focusPool: Question[];
  reviewPool: Question[];
  state: SrsState;
  today: DayKey;
  size?: number;
  rng?: () => number;
}): Question[] {
  const { focusPool, reviewPool, state, today, size = DAILY_SET_SIZE, rng = Math.random } = opts;
  const t = dayNumber(today);
  const picked = new Map<string, Question>();

  const due = reviewPool
    .filter((q) => state[q.id] && state[q.id][1] <= t)
    .sort((a, b) => state[a.id][0] - state[b.id][0] || state[a.id][1] - state[b.id][1]);
  for (const q of due) {
    if (picked.size >= Math.min(MAX_REVIEWS_PER_SET, size)) break;
    picked.set(q.id, q);
  }

  for (const q of shuffle(focusPool.filter((q) => !state[q.id]), rng)) {
    if (picked.size >= size) break;
    picked.set(q.id, q);
  }

  if (picked.size < size) {
    const seen = shuffle(focusPool.filter((q) => state[q.id] && !picked.has(q.id)), rng).sort((a, b) => state[a.id][0] - state[b.id][0]);
    for (const q of seen) {
      if (picked.size >= size) break;
      picked.set(q.id, q);
    }
  }

  return shuffle([...picked.values()], rng);
}

/** Share of a pool the student has answered correctly and not forgotten (box ≥ 2). */
export function readiness(pool: Question[], state: SrsState): number {
  if (pool.length === 0) return 0;
  const known = pool.filter((q) => (state[q.id]?.[0] ?? 0) >= 2).length;
  return Math.round((known / pool.length) * 100);
}

function sanitize(raw: unknown): SrsState {
  const out: SrsState = {};
  if (!raw || typeof raw !== "object") return out;
  for (const [id, v] of Object.entries(raw as Record<string, unknown>)) {
    if (Array.isArray(v) && typeof v[0] === "number" && typeof v[1] === "number") out[id] = [v[0], v[1]];
  }
  return out;
}

export async function loadSrs(uid: string): Promise<SrsState> {
  try {
    const snap = await getDoc(doc(db, "users", uid, "srs", "state"));
    return sanitize(snap.data()?.cards);
  } catch {
    return {};
  }
}

/** Merge updated cards into the stored state. */
export async function saveSrs(uid: string, updates: SrsState): Promise<void> {
  if (Object.keys(updates).length === 0) return;
  await setDoc(doc(db, "users", uid, "srs", "state"), { cards: updates, updated_at: new Date().toISOString() }, { merge: true });
}
