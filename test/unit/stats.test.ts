import { describe, expect, it } from "vitest";
import { rollWeek, weekStats } from "../../src/shared/stats";

describe("weekly stats", () => {
  it("rolls into a new week and remembers last week", () => {
    const w1 = rollWeek({}, "2026-11-02", { xp: 30, sets: 1 });
    expect(w1).toEqual({ week_key: "2026-W45", week_xp: 30, last_week_xp: 0, week_sets: 1 });
    const w1b = rollWeek(w1, "2026-11-04", { xp: 20, sets: 1 });
    expect(w1b).toMatchObject({ week_xp: 50, week_sets: 2 });
    const w2 = rollWeek(w1b, "2026-11-09", { xp: 10, sets: 0 });
    expect(w2).toEqual({ week_key: "2026-W46", week_xp: 10, last_week_xp: 50, week_sets: 0 });
    const gap = rollWeek(w1b, "2026-11-23", { xp: 5, sets: 1 });
    expect(gap.last_week_xp).toBe(0);
  });

  it("never discards a later recorded week", () => {
    const w = rollWeek({ week_key: "2026-W46", week_xp: 40, last_week_xp: 10, week_sets: 2 }, "2026-11-08", { xp: 5, sets: 1 });
    expect(w).toEqual({ week_key: "2026-W46", week_xp: 45, last_week_xp: 10, week_sets: 3 });
  });

  it("reads stale member stats relative to today", () => {
    const m = { week_key: "2026-W45", week_xp: 80, last_week_xp: 20, week_sets: 3, streak: 4, last_set_day: "2026-11-04", last_active_day: "2026-11-04" };
    expect(weekStats(m, "2026-11-05")).toMatchObject({ weekXp: 80, lastWeekXp: 20, growth: 60, weekSets: 3, streak: 4, idleDays: 1 });
    expect(weekStats(m, "2026-11-10")).toMatchObject({ weekXp: 0, lastWeekXp: 80, growth: -80, weekSets: 0, streak: 0, idleDays: 6 });
    expect(weekStats(m, "2026-11-30")).toMatchObject({ weekXp: 0, lastWeekXp: 0 });
  });
});
