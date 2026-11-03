import { describe, expect, it } from "vitest";
import { dayNumber } from "../../src/shared/dates";
import { buildDailySet, nextCard, readiness, sanitizeSrs, type SrsState } from "../../src/shared/srs";

const today = "2026-11-03";
const t = dayNumber(today);
const pool = (prefix: string, n: number) => Array.from({ length: n }, (_, i) => ({ id: `${prefix}_${i}` }));

describe("spaced repetition", () => {
  it("schedules right answers further out and wrong answers tomorrow", () => {
    expect(nextCard(undefined, true, today)).toEqual([2, t + 2]);
    expect(nextCard(undefined, false, today)).toEqual([1, t + 1]);
    expect(nextCard([2, t], true, today)).toEqual([3, t + 4]);
    expect(nextCard([5, t], false, today)).toEqual([1, t + 1]);
    expect(nextCard([6, t], true, today)).toEqual([6, t + 32]);
  });

  it("mixes at most four due reviews with new questions", () => {
    const focus = pool("U4", 30);
    const review = [...pool("U1", 8), ...focus];
    const state: SrsState = {};
    pool("U1", 8).forEach((q, i) => (state[q.id] = [1 + (i % 3), t - 1]));
    const set = buildDailySet({ focusPool: focus, reviewPool: review, state, today, rng: () => 0.42 });
    expect(set).toHaveLength(10);
    expect(new Set(set.map((q) => q.id)).size).toBe(10);
    expect(set.filter((q) => q.id.startsWith("U1")).length).toBe(4);
    expect(set.filter((q) => q.id.startsWith("U4")).length).toBe(6);
  });

  it("falls back to the weakest seen questions when nothing is new", () => {
    const focus = pool("U2", 12);
    const state: SrsState = {};
    focus.forEach((q, i) => (state[q.id] = [i < 6 ? 1 : 5, t + 10]));
    const set = buildDailySet({ focusPool: focus, reviewPool: focus, state, today, size: 6, rng: () => 0.1 });
    expect(set.every((q) => state[q.id][0] === 1)).toBe(true);
  });

  it("measures readiness from questions answered right and remembered", () => {
    const p = pool("U3", 4);
    expect(readiness(p, { U3_0: [2, t], U3_1: [1, t], U3_2: [4, t] })).toBe(50);
    expect(readiness([], {})).toBe(0);
  });

  it("ignores malformed stored state", () => {
    expect(sanitizeSrs({ a: [3, 100], b: "x", c: [99, 5.4], d: [1] })).toEqual({ a: [3, 100], c: [6, 5] });
    expect(sanitizeSrs(null)).toEqual({});
  });
});
