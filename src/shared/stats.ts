// Weekly stats for leaderboards and the teacher roster.
//
// Member documents are only rewritten when the student does something, so a
// student who has not studied this week still carries last week's numbers.
// These helpers read them relative to "today" so stale numbers never show as
// current.

import { daysBetween, effectiveStreak, isDayKey, previousWeekKey, weekKey, type DayKey } from "./dates";

export type WeekFields = {
  week_key?: string;
  week_xp?: number;
  last_week_xp?: number;
  week_sets?: number;
  streak?: number;
  last_set_day?: DayKey | null;
  last_active_day?: DayKey | null;
};

export type WeekStats = {
  weekXp: number;
  lastWeekXp: number;
  /** This week minus last week. The "Growth" leaderboard ranks by this. */
  growth: number;
  weekSets: number;
  streak: number;
  /** Days since the student last did anything, or null if never. */
  idleDays: number | null;
};

export function weekStats(m: WeekFields, today: DayKey): WeekStats {
  const thisWeek = weekKey(today);
  const lastWeek = previousWeekKey(today);
  let weekXp = 0;
  let lastWeekXp = 0;
  let weekSets = 0;
  if (m.week_key === thisWeek) {
    weekXp = m.week_xp ?? 0;
    lastWeekXp = m.last_week_xp ?? 0;
    weekSets = m.week_sets ?? 0;
  } else if (m.week_key === lastWeek) {
    lastWeekXp = m.week_xp ?? 0;
  }
  const lastActive = m.last_active_day ?? null;
  return {
    weekXp,
    lastWeekXp,
    growth: weekXp - lastWeekXp,
    weekSets,
    streak: effectiveStreak(m.streak, m.last_set_day ?? null, today),
    idleDays: lastActive && isDayKey(lastActive) ? Math.max(0, daysBetween(lastActive, today)) : null,
  };
}

/**
 * Roll a student's week counters forward to `day` and add a gain. Used by the
 * server whenever it records activity.
 */
export function rollWeek(
  prev: { week_key?: string; week_xp?: number; last_week_xp?: number; week_sets?: number },
  day: DayKey,
  gain: { xp: number; sets: number },
): { week_key: string; week_xp: number; last_week_xp: number; week_sets: number } {
  const key = weekKey(day);
  // A recorded week later than `day` (clock skew around Monday midnight)
  // is treated as the current week so its progress is never thrown away.
  if (prev.week_key === key || (prev.week_key && prev.week_key > key)) {
    return {
      week_key: prev.week_key ?? key,
      week_xp: (prev.week_xp ?? 0) + gain.xp,
      last_week_xp: prev.last_week_xp ?? 0,
      week_sets: (prev.week_sets ?? 0) + gain.sets,
    };
  }
  const carried = prev.week_key === previousWeekKey(day) ? prev.week_xp ?? 0 : 0;
  return { week_key: key, week_xp: gain.xp, last_week_xp: carried, week_sets: gain.sets };
}
