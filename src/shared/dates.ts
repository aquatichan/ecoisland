// Calendar helpers shared by the app and the server.
//
// A "day key" is a local calendar date in the student's own timezone, written
// "YYYY-MM-DD". Streaks, daily sets and due dates all use day keys so a student
// in California and one in New York both get a fresh day at their own midnight.
// The server never trusts a day key blindly: it only accepts keys within one
// day of the current UTC date (see isPlausibleClientDay).

export type DayKey = string;

const DAY_MS = 86_400_000;
const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;

const pad = (n: number) => String(n).padStart(2, "0");

export function isDayKey(value: unknown): value is DayKey {
  if (typeof value !== "string" || !DAY_RE.test(value)) return false;
  const [y, m, d] = value.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
}

/** Today's date in the device's timezone. */
export function localDayKey(date: Date = new Date()): DayKey {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function utcDayKey(date: Date = new Date()): DayKey {
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
}

/** Whole days since 1970-01-01 for a day key. */
export function dayNumber(key: DayKey): number {
  const [y, m, d] = key.split("-").map(Number);
  return Math.round(Date.UTC(y, m - 1, d) / DAY_MS);
}

export function dayFromNumber(n: number): DayKey {
  return utcDayKey(new Date(n * DAY_MS));
}

export function addDays(key: DayKey, days: number): DayKey {
  return dayFromNumber(dayNumber(key) + days);
}

/** b - a, in days. */
export function daysBetween(a: DayKey, b: DayKey): number {
  return dayNumber(b) - dayNumber(a);
}

/** 0 = Monday … 6 = Sunday. */
export function weekday(key: DayKey): number {
  return (new Date(dayNumber(key) * DAY_MS).getUTCDay() + 6) % 7;
}

/** Monday of the week containing `key`. */
export function weekStart(key: DayKey): DayKey {
  return addDays(key, -weekday(key));
}

/** ISO-8601 week id such as "2026-W45". Weeks start on Monday. */
export function weekKey(key: DayKey): string {
  const n = dayNumber(key);
  const thursday = n - weekday(key) + 3;
  const year = new Date(thursday * DAY_MS).getUTCFullYear();
  const week = Math.floor((thursday - dayNumber(`${year}-01-01`)) / 7) + 1;
  return `${year}-W${pad(week)}`;
}

export function previousWeekKey(key: DayKey): string {
  return weekKey(addDays(key, -7));
}

/**
 * A client's "today" is plausible when it is within one day of the server's
 * UTC date. Every real timezone (UTC-12 … UTC+14) falls inside that window.
 */
export function isPlausibleClientDay(clientDay: unknown, now: Date = new Date()): clientDay is DayKey {
  if (!isDayKey(clientDay)) return false;
  return Math.abs(daysBetween(utcDayKey(now), clientDay)) <= 1;
}

/**
 * The streak as it should be shown today. A streak stays alive until the end
 * of the day after the last completed set, so it never "breaks" before the
 * student has had a chance to study today.
 */
export function effectiveStreak(streak: number | undefined, lastDay: DayKey | undefined | null, today: DayKey): number {
  if (!streak || !lastDay || !isDayKey(lastDay)) return 0;
  return daysBetween(lastDay, today) <= 1 ? streak : 0;
}

/** Human label for a due date relative to today: "Today", "Tomorrow", "In 3 days", "2 days late". */
export function dueLabel(due: DayKey, today: DayKey): string {
  const diff = daysBetween(today, due);
  if (diff === 0) return "Due today";
  if (diff === 1) return "Due tomorrow";
  if (diff > 1) return diff <= 6 ? `Due in ${diff} days` : `Due ${formatDay(due, { month: "short", day: "numeric" })}`;
  if (diff === -1) return "1 day late";
  return `${-diff} days late`;
}

/** Format a day key with Intl without timezone drift (the key is a calendar date, not an instant). */
export function formatDay(key: DayKey, options: Intl.DateTimeFormatOptions): string {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d, 12)).toLocaleDateString(undefined, { ...options, timeZone: "UTC" });
}
