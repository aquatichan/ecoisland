// "Act": eco actions, volunteer events and service hours. Shared by the app
// and the server so both agree on limits, timing and rewards.
//
// Two kinds of listing:
//   event   A volunteer opportunity at a place and time, run by an
//           organization (a park cleanup, a tree planting). Students RSVP,
//           contact the organizer, go, then log their hours for their
//           teacher to verify.
//   action  A do-it-yourself eco action with a window of days (a trash audit,
//           a home energy hunt). Students do it and write what they found.
//
// Two scopes:
//   community  events/{id}, visible to everyone. Posted by admins and
//              approved ambassadors; anyone else's post waits for review.
//   class      classes/{cid}/events/{id}, visible to one class. Posted by
//              its teacher.

import { addDays, isDayKey, localDayKey, type DayKey } from "./dates";

export type EventKind = "event" | "action";
export type EventScope = "community" | "class";
export type EventStatus = "published" | "pending" | "rejected" | "cancelled";

export const CATEGORIES = {
  cleanup: "Cleanup",
  planting: "Planting and restoration",
  waste: "Waste and recycling",
  energy: "Energy",
  water: "Water",
  wildlife: "Wildlife and biodiversity",
  air: "Air and climate",
  food: "Food",
  advocacy: "Advocacy",
  other: "Other",
} as const;
export type Category = keyof typeof CATEGORIES;
export const CATEGORY_IDS = Object.keys(CATEGORIES) as Category[];

/** events/{id} and classes/{cid}/events/{id}. Written by the server only. */
export type EcoEvent = {
  id: string;
  kind: EventKind;
  scope: EventScope;
  status: EventStatus;
  class_id?: string | null;
  class_name?: string | null;
  title: string;
  summary: string;
  details: string;
  category: Category;
  /** Events: ISO date-times. */
  starts_at?: string | null;
  ends_at?: string | null;
  /** Actions: a window of local days. */
  start_day?: DayKey | null;
  end_day?: DayKey | null;
  location?: string;
  region?: string;
  org_name?: string;
  org_email?: string;
  org_url?: string;
  org_phone?: string;
  signup_url?: string;
  /** Expected volunteer hours (events). */
  hours?: number | null;
  capacity?: number | null;
  unit?: number | null;
  action_id?: string | null;
  going_count?: number;
  done_count?: number;
  created_by: string;
  created_by_name: string;
  created_at: string;
  updated_at?: string;
  review_note?: string | null;
};

export type HoursStatus = "pending" | "verified" | "rejected" | "self";

/** hours/{id}. A volunteer hours entry. Written by the server only. */
export type HoursLog = {
  id: string;
  uid: string;
  name: string;
  event_key?: string | null;
  title: string;
  org_name: string;
  date: DayKey;
  hours: number;
  text: string;
  class_id?: string | null;
  class_name?: string | null;
  teacher_uid?: string | null;
  teacher_name?: string | null;
  status: HoursStatus;
  /** Checks the server ran when the entry was logged, for the teacher to look at. */
  flags?: HoursFlag[];
  review_note?: string | null;
  reviewed_at?: string | null;
  reviewed_by?: string | null;
  /** Append-only trail: submitted, then verified or declined. */
  history?: Array<{ at: string; action: "submitted" | "verified" | "declined"; by: string }>;
  created_at: string;
};

export type HoursFlag = "possible_duplicate" | "long_day" | "high_weekly_total" | "longer_than_event" | "logged_late";

export const HOURS_FLAG_LABEL: Record<HoursFlag, string> = {
  possible_duplicate: "Looks like another entry on the same day",
  long_day: "More than 8 hours logged for one day",
  high_weekly_total: "More than 30 hours logged in a week",
  longer_than_event: "More hours than the event lasted",
  logged_late: "Logged more than 60 days afterwards",
};

export type AmbassadorStatus = "pending" | "approved" | "declined";

/** ambassador_applications/{uid}. Visible to the applicant and admins. */
export type AmbassadorApplication = {
  uid: string;
  email: string;
  username: string;
  full_name: string;
  school: string;
  grade: string;
  region: string;
  why: string;
  idea?: string;
  sponsor?: string;
  status: AmbassadorStatus;
  review_note?: string | null;
  created_at: string;
  reviewed_at?: string | null;
};

export const GRADES = ["9", "10", "11", "12", "college", "educator", "other"] as const;

export const LIMITS = {
  TITLE: 90,
  SUMMARY: 160,
  DETAILS: 3000,
  LOCATION: 140,
  REGION: 60,
  ORG: 80,
  URL: 300,
  EMAIL: 120,
  PHONE: 25,
  MAX_EVENT_DAYS: 14,
  MAX_ACTION_DAYS: 62,
  REFLECTION_MIN: 60,
  REFLECTION_MAX: 1200,
  HOURS_TEXT_MIN: 30,
  HOURS_TEXT_MAX: 1000,
  MAX_HOURS_PER_LOG: 12,
  /** All entries for one day together can't exceed this. */
  MAX_HOURS_PER_DAY: 12,
  FLAG_DAY_HOURS: 8,
  FLAG_WEEK_HOURS: 30,
  FLAG_LATE_DAYS: 60,
  /** Days after an action ends that it can still be marked done. */
  ACTION_GRACE_DAYS: 3,
  /** How far back volunteer hours can be logged. */
  HOURS_LOOKBACK_DAYS: 365,
  AMBASSADOR_WHY_MIN: 80,
  AMBASSADOR_WHY_MAX: 1500,
  AMBASSADOR_IDEA_MAX: 800,
  SUGGESTIONS_PER_DAY: 3,
  HOURS_LOGS_PER_DAY: 10,
} as const;

export const ACT_REWARD = {
  ACTION_TC: 20,
  ACTION_XP: 25,
  // Verified volunteer entries earn the same small bonus however many hours
  // they cover, so there's nothing to gain from rounding hours up.
  HOURS_ENTRY_TC: 10,
  HOURS_ENTRY_XP: 15,
  /** Rewarded verifications per student per day; more still count as hours. */
  HOURS_ENTRY_DAILY_CAP: 2,
  AMBASSADOR_TC: 100,
} as const;

/** The bonus for a verified volunteer entry. Deliberately not tied to the number of hours. */
export function hoursReward(): { tc: number; xp: number } {
  return { tc: ACT_REWARD.HOURS_ENTRY_TC, xp: ACT_REWARD.HOURS_ENTRY_XP };
}

/**
 * Flags for a new hours entry, given the student's other entries. The server
 * runs this when an entry is logged; teachers see the flags before verifying.
 */
export function hoursFlags(
  entry: { date: DayKey; hours: number; title: string; org_name: string; event_hours?: number | null },
  others: Array<{ date: DayKey; hours: number; title: string; org_name: string; status: HoursStatus }>,
  today: DayKey,
): HoursFlag[] {
  const live = others.filter((o) => o.status !== "rejected");
  const norm = (v: string) => v.toLowerCase().replace(/[^a-z0-9]/g, "");
  const flags: HoursFlag[] = [];
  const sameDay = live.filter((o) => o.date === entry.date);
  if (sameDay.some((o) => norm(o.title) === norm(entry.title) || norm(o.org_name) === norm(entry.org_name))) flags.push("possible_duplicate");
  if (sameDay.reduce((s, o) => s + o.hours, entry.hours) > LIMITS.FLAG_DAY_HOURS) flags.push("long_day");
  const weekStart = addDays(entry.date, -6);
  const weekEnd = addDays(entry.date, 6);
  const nearby = live.filter((o) => o.date >= weekStart && o.date <= weekEnd);
  if (nearby.reduce((s, o) => s + o.hours, entry.hours) > LIMITS.FLAG_WEEK_HOURS) flags.push("high_weekly_total");
  if (entry.event_hours && entry.hours > entry.event_hours + 0.5) flags.push("longer_than_event");
  if (entry.date < addDays(today, -LIMITS.FLAG_LATE_DAYS)) flags.push("logged_late");
  return flags;
}

/** Total hours already logged (and not declined) for one day. */
export function hoursOnDay(date: DayKey, others: Array<{ date: DayKey; hours: number; status: HoursStatus }>): number {
  return others.filter((o) => o.date === date && o.status !== "rejected").reduce((s, o) => s + o.hours, 0);
}

/** Valid hours: a positive multiple of a quarter hour, up to the cap. */
export function isValidHours(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v) && v > 0 && v <= LIMITS.MAX_HOURS_PER_LOG && Math.abs(v * 4 - Math.round(v * 4)) < 1e-9;
}

/** Stable key for an event across scopes, used in a student's RSVP and done lists. */
export function eventKey(e: { scope: EventScope; class_id?: string | null; id: string }): string {
  return e.scope === "class" ? `c_${e.class_id}_${e.id}` : `e_${e.id}`;
}

export function parseEventKey(key: string): { scope: EventScope; classId: string | null; id: string } | null {
  const c = /^c_([A-Za-z0-9]+)_([A-Za-z0-9]+)$/.exec(key);
  if (c) return { scope: "class", classId: c[1], id: c[2] };
  const e = /^e_([A-Za-z0-9]+)$/.exec(key);
  if (e) return { scope: "community", classId: null, id: e[1] };
  return null;
}

export function eventPath(scope: EventScope, classId: string | null | undefined, id: string): string {
  return scope === "class" ? `classes/${classId}/events/${id}` : `events/${id}`;
}

/** First and last local day an event or action covers. */
export function eventDays(e: Pick<EcoEvent, "kind" | "starts_at" | "ends_at" | "start_day" | "end_day">): { start: DayKey; end: DayKey } | null {
  if (e.kind === "action") {
    if (!isDayKey(e.start_day) || !isDayKey(e.end_day)) return null;
    return { start: e.start_day, end: e.end_day };
  }
  const s = e.starts_at ? new Date(e.starts_at) : null;
  const f = e.ends_at ? new Date(e.ends_at) : null;
  if (!s || !f || Number.isNaN(s.getTime()) || Number.isNaN(f.getTime())) return null;
  return { start: localDayKey(s), end: localDayKey(f) };
}

export type Phase = "upcoming" | "now" | "past";

/** Upcoming (starts after today), now (covers today), or past (ended before today). */
export function eventPhase(e: Pick<EcoEvent, "kind" | "starts_at" | "ends_at" | "start_day" | "end_day">, today: DayKey): Phase {
  const days = eventDays(e);
  if (!days) return "past";
  if (days.start > today) return "upcoming";
  if (days.end < today) return "past";
  return "now";
}

/** Whether an action can still be marked done on `today`. */
export function actionOpen(e: Pick<EcoEvent, "kind" | "start_day" | "end_day">, today: DayKey): boolean {
  if (e.kind !== "action" || !isDayKey(e.start_day) || !isDayKey(e.end_day)) return false;
  return today >= e.start_day && today <= addDays(e.end_day, LIMITS.ACTION_GRACE_DAYS);
}

/** Whether hours can be logged for an event: once it has started. */
export function hoursOpen(e: Pick<EcoEvent, "kind" | "starts_at">, nowMs: number = Date.now()): boolean {
  return e.kind === "event" && !!e.starts_at && Date.parse(e.starts_at) <= nowMs;
}

export const EMAIL_RE = /^[^\s@<>()"',;:]+@[^\s@<>()"',;:]+\.[A-Za-z]{2,}$/;
export const PHONE_RE = /^[0-9+().\-\s]{7,25}$/;

/** http(s) URLs only. Returns the normalized URL or null. */
export function safeUrl(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  if (!t || t.length > LIMITS.URL) return null;
  try {
    const u = new URL(/^[a-z][a-z0-9+.-]*:/i.test(t) ? t : `https://${t}`);
    if (u.protocol !== "https:" && u.protocol !== "http:") return null;
    if (!u.hostname.includes(".")) return null;
    return u.toString();
  } catch {
    return null;
  }
}
