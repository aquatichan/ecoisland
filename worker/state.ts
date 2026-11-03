// Reading a student's record and writing activity, shared by every handler
// that changes Treecoins, XP or progress.

import { isDayKey, type DayKey } from "../src/shared/dates";
import { masteredUnits } from "../src/shared/economy";
import { rollWeek } from "../src/shared/stats";
import type { Data, Doc, Firestore, Write } from "./firestore";
import { asNumberArray, asRecord, asStringArray, num } from "./http";

export type Record_ = ReturnType<typeof readRecord>;

export function readRecord(data: Data) {
  return {
    treecoins: Math.max(0, num(data.treecoins)),
    lifetime_tc: Math.max(0, num(data.lifetime_tc)),
    xp_total: Math.max(0, num(data.xp_total)),
    streak: Math.max(0, num(data.streak)),
    streak_best: Math.max(0, num(data.streak_best)),
    last_set_day: isDayKey(data.last_set_day) ? (data.last_set_day as DayKey) : undefined,
    set_days: asStringArray(data.set_days).filter(isDayKey),
    lessons_done: asStringArray(data.lessons_done),
    unit_best: asRecord(data.unit_best),
    quiz_best: asRecord(data.quiz_best),
    frq_best: asRecord(data.frq_best),
    quests_done: asNumberArray(data.quests_done),
    owned_items: asStringArray(data.owned_items),
    class_ids: asStringArray(data.class_ids),
    teaching_ids: asStringArray(data.teaching_ids),
    week_key: typeof data.week_key === "string" ? data.week_key : undefined,
    week_xp: num(data.week_xp),
    last_week_xp: num(data.last_week_xp),
    week_sets: num(data.week_sets),
  };
}

export function displayName(data: Data): string {
  const name = typeof data.username === "string" && data.username.trim() ? data.username : data.full_name;
  return typeof name === "string" && name.trim() ? name.trim().slice(0, 40) : "Student";
}

/** The public slice of a student copied into each class they belong to. */
export function memberPayload(uid: string, data: Data, lastActiveDay: DayKey | null): Data {
  const r = readRecord(data);
  return {
    uid,
    username: displayName(data),
    avatar_url: typeof data.avatar_url === "string" ? data.avatar_url : "",
    xp_total: r.xp_total,
    streak: r.streak,
    last_set_day: r.last_set_day ?? null,
    last_active_day: lastActiveDay,
    week_key: r.week_key ?? null,
    week_xp: r.week_xp,
    last_week_xp: r.last_week_xp,
    week_sets: r.week_sets,
    unit_best: r.unit_best,
    lessons_count: r.lessons_done.length,
    masteries: masteredUnits(r.unit_best),
    island_skybox: typeof data.island_skybox === "string" ? data.island_skybox : "day",
    island_decor: Array.isArray(data.island_decor) ? data.island_decor.slice(0, 24) : [],
    island_name: typeof data.island_name === "string" ? data.island_name.slice(0, 32) : "",
  };
}

export type Activity = {
  day: DayKey;
  tc: number;
  xp: number;
  sets?: number;
  /** Extra user fields to write alongside the economy fields. */
  patch?: Data;
};

/**
 * Builds the writes for one activity: the user's economy fields, and the
 * mirrored stats in every class they belong to. Call inside a transaction
 * after reading `user` and the member docs.
 */
export function activityWrites(
  fs: Firestore,
  user: Doc,
  activity: Activity,
  memberDocs: Map<string, Doc | null>,
): { writes: Write[]; data: Data } {
  const r = readRecord(user.data);
  const week = rollWeek(r, activity.day, { xp: activity.xp, sets: activity.sets ?? 0 });
  const economy: Data = {
    treecoins: r.treecoins + activity.tc,
    lifetime_tc: r.lifetime_tc + activity.tc,
    xp_total: r.xp_total + activity.xp,
    ...week,
    last_active_day: activity.day,
  };
  const patch: Data = { ...economy, ...(activity.patch ?? {}) };
  const data: Data = { ...user.data, ...patch };
  const writes: Write[] = [fs.patch(user.path, patch, true)];
  for (const [path, doc] of memberDocs) {
    if (doc) writes.push(fs.patch(path, memberPayload(user.id, data, activity.day), true));
  }
  return { writes, data };
}

export function memberPaths(uid: string, data: Data): string[] {
  return readRecord(data).class_ids.map((cid) => `classes/${cid}/members/${uid}`);
}

export function randomId(len = 20): string {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const bytes = crypto.getRandomValues(new Uint8Array(len));
  let out = "";
  for (const b of bytes) out += alphabet[b % alphabet.length];
  return out;
}
