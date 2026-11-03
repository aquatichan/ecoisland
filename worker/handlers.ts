// API handlers. Each receives a verified user (ctx.uid) and the parsed JSON
// body. Every write to Treecoins, XP, streaks, progress, classes and
// submissions happens here, never in the browser.

import { findLesson, lessonKey, safeKey } from "../src/shared/curriculum";
import { itemPrice } from "../src/shared/catalog";
import { daysBetween, isDayKey, isPlausibleClientDay, utcDayKey, type DayKey } from "../src/shared/dates";
import {
  MASTERY_MIN_QUESTIONS,
  MASTERY_PCT,
  REWARD,
  dailySetReward,
  frqReward,
  legacyLifetimeXp,
  legacyRefund,
  pct,
  quizReward,
} from "../src/shared/economy";
import { QUEST_MAX_CHARS, QUEST_MIN_CHARS, questForUnit } from "../src/shared/quests";
import { deleteActData, dropRsvps } from "./act";
import { syncAssignments, type CompletedAssignment } from "./assignments";
import type { Ctx } from "./env";
import type { Data, Doc, Write } from "./firestore";
import { findFrq, gradeWithGemini, type FrqGrade } from "./frq";
import { HttpError, asStringArray, int, num, str } from "./http";
import { activityWrites, displayName, memberPayload, memberPaths, randomId, readRecord } from "./state";

type Body = Record<string, unknown>;
type Tx = { get: (path: string) => Promise<Doc | null>; getAll: (paths: string[]) => Promise<Map<string, Doc | null>> };

export const ECONOMY_VERSION = 2;
const USERNAME_RE = /^[A-Za-z0-9._-]{3,20}$/;
const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const MAX_CLASSES_JOINED = 8;
const MAX_CLASSES_TAUGHT = 12;

// ─── helpers ────────────────────────────────────────────────────────────────

export function clientDay(body: Body, now: Date): DayKey {
  if (!isPlausibleClientDay(body.day, now)) {
    throw new HttpError(400, "bad_day", "Your computer's date looks off. Check the clock, then try again.");
  }
  return body.day as DayKey;
}

export function optionalDay(body: Body, now: Date): DayKey {
  return isPlausibleClientDay(body.day, now) ? (body.day as DayKey) : utcDayKey(now);
}

export async function requireUser(tx: Tx, uid: string): Promise<Doc> {
  const doc = await tx.get(`users/${uid}`);
  if (!doc) throw new HttpError(404, "no_profile", "Your profile is still being set up. Refresh the page and try again.");
  return doc;
}

export function publicState(data: Data) {
  const r = readRecord(data);
  return {
    treecoins: r.treecoins,
    xp_total: r.xp_total,
    streak: r.streak,
    last_set_day: r.last_set_day ?? null,
  };
}

async function safeSync(ctx: Ctx, data: Data, day: DayKey, classIds?: string[]): Promise<CompletedAssignment[]> {
  try {
    return await syncAssignments(ctx.fs, ctx.uid, data, day, classIds);
  } catch (err) {
    console.error("assignment sync failed", err);
    return [];
  }
}

function lastActive(data: Data): DayKey | null {
  if (isDayKey(data.last_active_day)) return data.last_active_day as DayKey;
  const r = readRecord(data);
  return r.last_set_day ?? null;
}

// ─── /api/sync ──────────────────────────────────────────────────────────────

/** Creates the profile on first sign-in and migrates older accounts once. */
export async function handleSync(ctx: Ctx): Promise<unknown> {
  const { fs, uid, claims, now } = ctx;
  const path = `users/${uid}`;
  const out = await fs.runTransaction(async (tx) => {
    const doc = await tx.get(path);
    if (!doc) {
      const data: Data = {
        id: uid,
        email: claims.email ?? "",
        full_name: (claims.name ?? "").slice(0, 80),
        username: "",
        avatar_url: claims.picture ?? "",
        onboarding_complete: false,
        preferences: { theme: "system" },
        treecoins: REWARD.WELCOME_TC,
        lifetime_tc: REWARD.WELCOME_TC,
        xp_total: 0,
        streak: 0,
        streak_best: 0,
        set_days: [],
        lessons_done: [],
        unit_best: {},
        quiz_best: {},
        frq_best: {},
        quests_done: [],
        owned_items: [],
        class_ids: [],
        teaching_ids: [],
        island_skybox: "day",
        island_decor: [],
        economy_version: ECONOMY_VERSION,
        created_date: now.toISOString(),
      };
      return { writes: [fs.create(path, data)], result: { created: true, migrated: false, refund: 0, data } };
    }
    if (num(doc.data.economy_version) >= ECONOMY_VERSION) {
      return { writes: [], result: { created: false, migrated: false, refund: 0, data: doc.data } };
    }
    // One-time migration from the old economy: refund retired PNG items,
    // convert level+XP to lifetime XP, and give the welcome gift to anyone
    // who never finished the old onboarding.
    const refund = legacyRefund(doc.data.island_items);
    const welcome = doc.data.onboarding_complete === true ? 0 : REWARD.WELCOME_TC;
    const treecoins = Math.max(0, num(doc.data.treecoins)) + refund + welcome;
    const patch: Data = {
      treecoins,
      lifetime_tc: Math.max(num(doc.data.lifetime_tc), treecoins),
      xp_total: Math.max(num(doc.data.xp_total), legacyLifetimeXp(doc.data.eco_level, doc.data.xp)),
      owned_items: asStringArray(doc.data.owned_items),
      class_ids: asStringArray(doc.data.class_ids),
      teaching_ids: asStringArray(doc.data.teaching_ids),
      island_items: [],
      legacy_refund: refund,
      economy_version: ECONOMY_VERSION,
    };
    if (!doc.data.email && claims.email) patch.email = claims.email;
    return { writes: [fs.patch(path, patch, true)], result: { created: false, migrated: true, refund, data: { ...doc.data, ...patch } } };
  });

  await backfillUsername(ctx, out.data);
  return { created: out.created, migrated: out.migrated, refund: out.refund };
}

/** Reserve the username of accounts created before usernames were unique. */
async function backfillUsername(ctx: Ctx, data: Data): Promise<void> {
  const name = typeof data.username === "string" ? data.username.trim() : "";
  if (!name || data.username_lower || !USERNAME_RE.test(name)) return;
  const lower = name.toLowerCase();
  try {
    await ctx.fs.runTransaction(async (tx) => {
      const claim = await tx.get(`usernames/${lower}`);
      if (claim && claim.data.uid !== ctx.uid) return { writes: [], result: null };
      const writes: Write[] = [];
      if (!claim) writes.push(ctx.fs.create(`usernames/${lower}`, { uid: ctx.uid }));
      writes.push(ctx.fs.patch(`users/${ctx.uid}`, { username_lower: lower }, true));
      return { writes, result: null };
    });
  } catch (err) {
    console.error("username backfill failed", err);
  }
}

// ─── /api/reward ────────────────────────────────────────────────────────────

// Daily sets and quizzes are scored by the server from checked answers (see
// worker/attempts.ts); the browser never reports a score. Reading a lesson is
// the only activity rewarded directly.
export async function handleReward(ctx: Ctx, body: Body): Promise<unknown> {
  const day = clientDay(body, ctx.now);
  if (body.kind === "lesson_read") return lessonRead(ctx, body, day);
  throw new HttpError(400, "unknown_kind", "Unknown activity");
}

/** Fails the transaction unless the attempt exists and is still open. */
async function claimAttempt(tx: Tx, attemptPath: string): Promise<void> {
  const attempt = await tx.get(attemptPath);
  if (!attempt) throw new HttpError(404, "no_attempt", "That practice session has expired. Start a new one.");
  if (attempt.data.finished === true) throw new HttpError(409, "already_finished", "These results were already saved.");
}

export type Score = { correct: number; total: number };

export async function rewardDailySet(ctx: Ctx, { correct, total }: Score, day: DayKey, attemptPath: string) {
  const { fs, uid } = ctx;

  const out = await fs.runTransaction(async (tx) => {
    await claimAttempt(tx, attemptPath);
    const user = await requireUser(tx, uid);
    const r = readRecord(user.data);
    const close = (result: Data) => fs.patch(attemptPath, { finished: true, finished_at: ctx.now.toISOString(), correct, total, result }, true);
    if (r.last_set_day && daysBetween(r.last_set_day, day) <= 0) {
      const reward = { tc: 0, xp: 0 };
      return { writes: [close({ already: true, reward, streak: r.streak })], result: { already: true, data: user.data, reward, streak: r.streak } };
    }
    const streak = r.last_set_day && daysBetween(r.last_set_day, day) === 1 ? r.streak + 1 : 1;
    const reward = dailySetReward(correct, total, streak);
    const members = await tx.getAll(memberPaths(uid, user.data));
    const { writes, data } = activityWrites(
      fs,
      user,
      {
        day,
        tc: reward.tc,
        xp: reward.xp,
        sets: 1,
        patch: {
          streak,
          streak_best: Math.max(r.streak_best, streak),
          last_set_day: day,
          set_days: [...r.set_days.filter((d) => d !== day), day].slice(-120),
        },
      },
      members,
    );
    writes.push(close({ already: false, reward, streak }));
    return { writes, result: { already: false, data, reward, streak } };
  });

  const completed = out.already ? [] : await safeSync(ctx, out.data, day);
  return { already: out.already, reward: out.reward, streak: out.streak, correct, total, completed, state: publicState(out.data) };
}

export type QuizSource = { source: "unit" | "lesson" | "mixed"; unit: number | null; lessonId: string | null };

export async function rewardQuiz(ctx: Ctx, { source, unit, lessonId }: QuizSource, { correct, total }: Score, day: DayKey, attemptPath: string) {
  const { fs, uid } = ctx;
  const label = source === "unit" ? `Unit ${unit}` : source === "lesson" ? `Lesson ${lessonId ? findLesson(lessonId)?.lesson.code : ""}` : "All units";
  const score = pct(correct, total);
  const usagePath = `users/${uid}/usage/${day}`;
  const sessionPath = `users/${uid}/apes_sessions/${randomId()}`;

  const out = await fs.runTransaction(async (tx) => {
    await claimAttempt(tx, attemptPath);
    const user = await requireUser(tx, uid);
    const r = readRecord(user.data);
    const usage = await tx.get(usagePath);
    const used = num(usage?.data.quiz_rewards);
    const capped = used >= REWARD.QUIZ_DAILY_CAP;
    const reward = capped ? { tc: 0, xp: 0 } : quizReward(correct, total);
    const patch: Data = {};
    let newLandmark: number | null = null;
    if (source === "unit" && unit && total >= MASTERY_MIN_QUESTIONS) {
      const key = `u${unit}`;
      const before = r.unit_best[key] ?? 0;
      patch.unit_best = { ...r.unit_best, [key]: Math.max(before, score) };
      if (before < MASTERY_PCT && score >= MASTERY_PCT) newLandmark = unit;
    }
    if (source === "lesson" && lessonId) {
      const key = lessonKey(lessonId);
      patch.quiz_best = { ...r.quiz_best, [key]: Math.max(r.quiz_best[key] ?? 0, score) };
    }
    const members = await tx.getAll(memberPaths(uid, user.data));
    const { writes, data } = activityWrites(fs, user, { day, tc: reward.tc, xp: reward.xp, patch }, members);
    writes.push(fs.patch(usagePath, { day, quiz_rewards: used + (capped ? 0 : 1) }));
    writes.push(
      fs.create(sessionPath, {
        unit: label,
        source,
        ref: lessonId ?? (unit ? `u${unit}` : "all"),
        score: correct,
        total,
        pct: score,
        date: day,
        rewarded: !capped,
        createdAt: ctx.now.toISOString(),
      }),
    );
    writes.push(fs.patch(attemptPath, { finished: true, finished_at: ctx.now.toISOString(), correct, total, result: { reward, capped, score, newLandmark } }, true));
    return { writes, result: { data, reward, capped, newLandmark } };
  });

  const completed = await safeSync(ctx, out.data, day);
  return { reward: out.reward, capped: out.capped, score, newLandmark: out.newLandmark, completed, state: publicState(out.data) };
}

async function lessonRead(ctx: Ctx, body: Body, day: DayKey) {
  const { fs, uid } = ctx;
  const lessonId = str(body, "lesson", { max: 120 });
  if (!findLesson(lessonId)) throw new HttpError(400, "invalid_input", "Unknown lesson");
  const out = await fs.runTransaction(async (tx) => {
    const user = await requireUser(tx, uid);
    const r = readRecord(user.data);
    if (r.lessons_done.includes(lessonId)) {
      return { writes: [] as Write[], result: { already: true, data: user.data, reward: { tc: 0, xp: 0 } } };
    }
    const reward = { tc: REWARD.LESSON_TC, xp: REWARD.LESSON_XP };
    const members = await tx.getAll(memberPaths(uid, user.data));
    const { writes, data } = activityWrites(fs, user, { day, ...reward, patch: { lessons_done: [...r.lessons_done, lessonId] } }, members);
    return { writes, result: { already: false, data, reward } };
  });
  const completed = out.already ? [] : await safeSync(ctx, out.data, day);
  return { already: out.already, reward: out.reward, completed, state: publicState(out.data) };
}

// ─── /api/frq/grade ─────────────────────────────────────────────────────────

export async function handleFrq(ctx: Ctx, body: Body): Promise<unknown> {
  const { fs, uid, env } = ctx;
  const day = clientDay(body, ctx.now);
  const frqId = str(body, "frq", { max: 40 });
  const frq = findFrq(frqId);
  if (!frq) throw new HttpError(404, "unknown_frq", "That FRQ doesn't exist");

  const raw = body.responses;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new HttpError(400, "invalid_input", "Missing answers");
  const responses: Record<string, string> = {};
  for (const part of frq.parts) {
    const v = (raw as Body)[part.label];
    if (typeof v !== "string" || v.trim().length < 8) {
      throw new HttpError(400, "answer_every_part", `Write an answer for part ${part.label} before submitting.`);
    }
    if (v.length > 2500) throw new HttpError(400, "too_long", `Part ${part.label} is too long (2,500 characters max).`);
    responses[part.label] = v.trim();
  }

  if (env.AI_LIMITER) {
    const { success } = await env.AI_LIMITER.limit({ key: uid });
    if (!success) throw new HttpError(429, "slow_down", "Too many gradings at once. Wait a minute and try again.");
  }

  const usagePath = `users/${uid}/usage/${day}`;
  await fs.runTransaction(async (tx) => {
    const usage = await tx.get(usagePath);
    const used = num(usage?.data.frq_grades);
    if (used >= REWARD.FRQ_DAILY_GRADES) {
      throw new HttpError(429, "daily_limit", `You've used today's ${REWARD.FRQ_DAILY_GRADES} FRQ gradings. More tomorrow.`);
    }
    return { writes: [fs.patch(usagePath, { day, frq_grades: used + 1 })], result: null };
  });

  let grade: FrqGrade;
  try {
    grade = await gradeWithGemini(env, ctx.fetch, frq, responses);
  } catch (err) {
    // Give the grading back; it wasn't the student's fault.
    await fs
      .runTransaction(async (tx) => {
        const usage = await tx.get(usagePath);
        return { writes: [fs.patch(usagePath, { frq_grades: Math.max(0, num(usage?.data.frq_grades) - 1) })], result: null };
      })
      .catch(() => undefined);
    throw err;
  }

  const key = safeKey(frq.id);
  const score = pct(grade.totalEarned, grade.totalPossible);
  const out = await fs.runTransaction(async (tx) => {
    const user = await requireUser(tx, uid);
    const r = readRecord(user.data);
    const usage = await tx.get(usagePath);
    const rewardedIds = asStringArray(usage?.data.frq_ids);
    const rewardedCount = num(usage?.data.frq_rewards);
    const eligible = !rewardedIds.includes(key) && rewardedCount < REWARD.FRQ_DAILY_CAP;
    const reward = eligible ? frqReward(grade.totalEarned, grade.totalPossible) : { tc: 0, xp: 0 };
    const members = await tx.getAll(memberPaths(uid, user.data));
    const { writes, data } = activityWrites(
      fs,
      user,
      { day, tc: reward.tc, xp: reward.xp, patch: { frq_best: { ...r.frq_best, [key]: Math.max(r.frq_best[key] ?? 0, score) } } },
      members,
    );
    if (eligible) writes.push(fs.patch(usagePath, { frq_rewards: rewardedCount + 1, frq_ids: [...rewardedIds, key] }));
    writes.push(
      fs.create(`users/${uid}/apes_frq_sessions/${randomId()}`, {
        frqId: frq.id,
        unit: `Unit ${frq.unit}`,
        pointsEarned: grade.totalEarned,
        pointsPossible: grade.totalPossible,
        pct: score,
        date: day,
        createdAt: ctx.now.toISOString(),
      }),
    );
    return { writes, result: { data, reward, capped: !eligible } };
  });

  const completed = await safeSync(ctx, out.data, day);
  return { grade, reward: out.reward, capped: out.capped, completed, state: publicState(out.data) };
}

// ─── /api/quest/submit ──────────────────────────────────────────────────────

export async function handleQuest(ctx: Ctx, body: Body): Promise<unknown> {
  const { fs, uid } = ctx;
  const day = clientDay(body, ctx.now);
  const unit = int(body, "unit", 1, 9);
  const text = str(body, "text", { min: QUEST_MIN_CHARS, max: QUEST_MAX_CHARS });
  const quest = questForUnit(unit);
  if (!quest) throw new HttpError(400, "invalid_input", "Unknown quest");
  const nowIso = ctx.now.toISOString();

  const out = await fs.runTransaction(async (tx) => {
    const user = await requireUser(tx, uid);
    const r = readRecord(user.data);
    if (r.quests_done.includes(unit)) throw new HttpError(409, "already_done", "You've already completed this field quest.");
    const members = await tx.getAll(memberPaths(uid, user.data));
    const { writes, data } = activityWrites(
      fs,
      user,
      { day, tc: REWARD.QUEST_TC, xp: REWARD.QUEST_XP, patch: { quests_done: [...r.quests_done, unit] } },
      members,
    );
    writes.push(fs.set(`users/${uid}/quests/u${unit}`, { unit, title: quest.title, text, day, created_at: nowIso }));
    return { writes, result: { data, members } };
  });

  // Share the field note with each class (teacher and classmates can read it).
  const noteWrites: Write[] = [];
  for (const [path, member] of out.members) {
    if (!member) continue;
    const classId = path.split("/")[1];
    noteWrites.push(
      fs.set(`classes/${classId}/notes/${uid}_u${unit}`, {
        uid,
        username: displayName(out.data),
        avatar_url: typeof out.data.avatar_url === "string" ? out.data.avatar_url : "",
        unit,
        title: quest.title,
        text,
        created_at: nowIso,
      }),
    );
  }
  await fs.commit(noteWrites).catch((err) => console.error("note share failed", err));

  const completed = await safeSync(ctx, out.data, day);
  return { reward: { tc: REWARD.QUEST_TC, xp: REWARD.QUEST_XP }, completed, state: publicState(out.data) };
}

// ─── /api/purchase ──────────────────────────────────────────────────────────

export async function handlePurchase(ctx: Ctx, body: Body): Promise<unknown> {
  const { fs, uid } = ctx;
  const itemId = str(body, "item", { max: 40 });
  const price = itemPrice(itemId);
  if (price === undefined) throw new HttpError(400, "unknown_item", "That item isn't in the shop");
  return fs.runTransaction(async (tx) => {
    const user = await requireUser(tx, uid);
    const r = readRecord(user.data);
    if (r.owned_items.includes(itemId)) throw new HttpError(409, "already_owned", "You already own this");
    if (r.treecoins < price) throw new HttpError(402, "not_enough", `You need ${price - r.treecoins} more Treecoins`);
    const patch = { treecoins: r.treecoins - price, owned_items: [...r.owned_items, itemId] };
    return { writes: [fs.patch(user.path, patch, true)], result: patch };
  });
}

// ─── classes ────────────────────────────────────────────────────────────────

function newCode(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  let code = "";
  for (const b of bytes) code += CODE_ALPHABET[b % CODE_ALPHABET.length];
  return code;
}

export function normalizeCode(input: string): string {
  return input.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export async function handleClassCreate(ctx: Ctx, body: Body): Promise<unknown> {
  const { fs, uid } = ctx;
  const name = str(body, "name", { min: 2, max: 60 });
  for (let attempt = 0; attempt < 6; attempt++) {
    const code = newCode();
    const classId = randomId();
    const result = await fs.runTransaction(async (tx) => {
      const user = await requireUser(tx, uid);
      if (user.data.role !== "teacher") {
        throw new HttpError(403, "teachers_only", "Only teacher accounts can create classes. You can switch in Settings.");
      }
      const r = readRecord(user.data);
      if (r.teaching_ids.length >= MAX_CLASSES_TAUGHT) throw new HttpError(400, "too_many_classes", `You can teach up to ${MAX_CLASSES_TAUGHT} classes.`);
      if (await tx.get(`class_codes/${code}`)) return { writes: [] as Write[], result: null };
      const cls: Data = {
        name,
        code,
        teacher_id: uid,
        teacher_name: displayName(user.data),
        current_unit: null,
        test_day: null,
        test_label: null,
        member_count: 0,
        created_at: ctx.now.toISOString(),
      };
      return {
        writes: [
          fs.create(`classes/${classId}`, cls),
          fs.create(`class_codes/${code}`, { class_id: classId }),
          fs.patch(user.path, { teaching_ids: [...r.teaching_ids, classId] }, true),
        ],
        result: { classId, code },
      };
    });
    if (result) return result;
  }
  throw new HttpError(500, "code_failed", "Couldn't generate a class code. Try again.");
}

export async function handleClassJoin(ctx: Ctx, body: Body): Promise<unknown> {
  const { fs, uid } = ctx;
  const code = normalizeCode(str(body, "code", { max: 20 }));
  if (code.length !== 6) throw new HttpError(400, "bad_code", "Class codes are 6 characters, like K7Q2MX.");
  const out = await fs.runTransaction(async (tx) => {
    const codeDoc = await tx.get(`class_codes/${code}`);
    if (!codeDoc) throw new HttpError(404, "bad_code", "No class uses that code. Double-check it with your teacher.");
    const classId = String(codeDoc.data.class_id);
    const cls = await tx.get(`classes/${classId}`);
    if (!cls) throw new HttpError(404, "bad_code", "That class no longer exists.");
    const user = await requireUser(tx, uid);
    if (cls.data.teacher_id === uid) throw new HttpError(400, "own_class", "You teach this class, so you can't join it as a student.");
    if (await tx.get(`classes/${classId}/removed/${uid}`)) {
      throw new HttpError(403, "removed", "Your teacher removed you from this class. Ask them if you think that's a mistake.");
    }
    const muted = !!(await tx.get(`classes/${classId}/mutes/${uid}`));
    const r = readRecord(user.data);
    if (r.class_ids.includes(classId)) {
      return { writes: [] as Write[], result: { classId, already: true, name: String(cls.data.name ?? ""), data: user.data } };
    }
    if (r.class_ids.length >= MAX_CLASSES_JOINED) throw new HttpError(400, "too_many", `You can be in up to ${MAX_CLASSES_JOINED} classes.`);
    const class_ids = [...r.class_ids, classId];
    const data = { ...user.data, class_ids };
    return {
      writes: [
        fs.set(`classes/${classId}/members/${uid}`, { ...memberPayload(uid, data, lastActive(user.data)), muted, joined_at: ctx.now.toISOString() }),
        fs.patch(user.path, { class_ids }, true),
        fs.patch(cls.path, { member_count: num(cls.data.member_count) + 1 }, true),
      ],
      result: { classId, already: false, name: String(cls.data.name ?? ""), data },
    };
  });
  if (!out.already) await safeSync(ctx, out.data, optionalDay(body, ctx.now), [out.classId]);
  return { classId: out.classId, already: out.already, name: out.name };
}

/** Removes `targetUid` from a class. Used for leaving and for teacher removal. */
async function removeMember(ctx: Ctx, classId: string, targetUid: string, asTeacher: boolean): Promise<void> {
  const { fs } = ctx;
  const classRsvps = await fs.runTransaction(async (tx) => {
    const cls = await tx.get(`classes/${classId}`);
    if (asTeacher && (!cls || cls.data.teacher_id !== ctx.uid)) throw new HttpError(403, "not_teacher", "Only this class's teacher can do that.");
    const member = await tx.get(`classes/${classId}/members/${targetUid}`);
    const target = await tx.get(`users/${targetUid}`);
    const writes: Write[] = [];
    if (member) writes.push(fs.delete(member.path));
    let dropped: string[] = [];
    if (target) {
      const r = readRecord(target.data);
      dropped = r.rsvp_events.filter((k) => k.startsWith(`c_${classId}_`));
      if (r.class_ids.includes(classId) || dropped.length) {
        writes.push(
          fs.patch(target.path, { class_ids: r.class_ids.filter((c) => c !== classId), rsvp_events: r.rsvp_events.filter((k) => !dropped.includes(k)) }, true),
        );
      }
    }
    if (cls && member) writes.push(fs.patch(cls.path, { member_count: Math.max(0, num(cls.data.member_count) - 1) }, true));
    return { writes, result: dropped };
  });
  await dropRsvps(ctx, targetUid, classRsvps);
  // Their submissions, field notes and chat messages leave with them.
  const assignments = await fs.list(`classes/${classId}/assignments`, { max: 300 });
  const cleanup: Write[] = assignments.map((a) => fs.delete(`${a.path}/submissions/${targetUid}`));
  const notes = await fs.query(`classes/${classId}`, "notes", [["uid", targetUid]], 50);
  for (const n of notes) cleanup.push(fs.delete(n.path));
  const messages = await fs.query(`classes/${classId}`, "messages", [["uid", targetUid]], 2000);
  for (const m of messages) cleanup.push(fs.delete(m.path));
  // Hours waiting for this class's teacher can't be verified any more.
  for (const h of await fs.query("", "hours", [["uid", targetUid], ["class_id", classId]], 500).catch(() => [] as Doc[])) {
    if (h.data.status === "pending") cleanup.push(fs.patch(h.path, { status: "self", review_note: "You left the class before your teacher verified this." }, true));
  }
  await fs.commit(cleanup);
}

export async function handleClassLeave(ctx: Ctx, body: Body): Promise<unknown> {
  const classId = str(body, "classId", { max: 40 });
  await removeMember(ctx, classId, ctx.uid, false);
  return { ok: true };
}

export async function handleClassRemove(ctx: Ctx, body: Body): Promise<unknown> {
  const classId = str(body, "classId", { max: 40 });
  const target = str(body, "uid", { max: 128 });
  const member = await ctx.fs.get(`classes/${classId}/members/${target}`);
  await removeMember(ctx, classId, target, true);
  // A removed student can't rejoin with the code until the teacher allows it.
  const targetUser = await ctx.fs.get(`users/${target}`);
  const removedFrom = Array.isArray(targetUser?.data.removed_from) ? (targetUser?.data.removed_from as string[]) : [];
  const writes: Write[] = [
    ctx.fs.set(`classes/${classId}/removed/${target}`, { uid: target, username: String(member?.data.username ?? ""), at: ctx.now.toISOString(), by: ctx.uid }),
  ];
  // Remembered on the student so deleting their account can clean this up.
  if (targetUser) writes.push(ctx.fs.patch(targetUser.path, { removed_from: [...new Set([...removedFrom, classId])].slice(-50) }, true));
  await ctx.fs.commit(writes);
  return { ok: true };
}

async function requireTeacher(ctx: Ctx, classId: string): Promise<Doc> {
  if (!/^[A-Za-z0-9]{1,40}$/.test(classId)) throw new HttpError(400, "invalid_input", "Unknown class");
  const cls = await ctx.fs.get(`classes/${classId}`);
  if (!cls) throw new HttpError(404, "not_found", "Class not found");
  if (cls.data.teacher_id !== ctx.uid) throw new HttpError(403, "not_teacher", "Only this class's teacher can do that.");
  return cls;
}

/** Lets a removed student join again. */
export async function handleClassUnblock(ctx: Ctx, body: Body): Promise<unknown> {
  const classId = str(body, "classId", { max: 40 });
  const target = str(body, "uid", { max: 128 });
  await requireTeacher(ctx, classId);
  await ctx.fs.commit([ctx.fs.delete(`classes/${classId}/removed/${target}`)]);
  return { ok: true };
}

/** Replaces the join code, so an old or leaked code stops working. Current students stay. */
export async function handleClassResetCode(ctx: Ctx, body: Body): Promise<unknown> {
  const { fs } = ctx;
  const classId = str(body, "classId", { max: 40 });
  await requireTeacher(ctx, classId);
  for (let attempt = 0; attempt < 6; attempt++) {
    const code = newCode();
    const done = await fs.runTransaction(async (tx) => {
      const cls = await tx.get(`classes/${classId}`);
      if (!cls || cls.data.teacher_id !== ctx.uid) throw new HttpError(403, "not_teacher", "Only this class's teacher can do that.");
      if (await tx.get(`class_codes/${code}`)) return { writes: [] as Write[], result: false };
      const old = String(cls.data.code ?? "");
      const writes: Write[] = [fs.create(`class_codes/${code}`, { class_id: classId }), fs.patch(cls.path, { code, updated_at: ctx.now.toISOString() }, true)];
      if (old) writes.push(fs.delete(`class_codes/${old}`));
      return { writes, result: true };
    });
    if (done) return { code };
  }
  throw new HttpError(500, "code_failed", "Couldn't generate a new code. Try again.");
}

async function deleteClassData(ctx: Ctx, classId: string, code: string): Promise<void> {
  const { fs } = ctx;
  const members = await fs.list(`classes/${classId}/members`);
  for (const m of members) {
    await fs.runTransaction(async (tx) => {
      const u = await tx.get(`users/${m.id}`);
      if (!u) return { writes: [] as Write[], result: null };
      const r = readRecord(u.data);
      return { writes: [fs.patch(u.path, { class_ids: r.class_ids.filter((c) => c !== classId) }, true)], result: null };
    });
  }
  const writes: Write[] = [];
  const assignments = await fs.list(`classes/${classId}/assignments`, { max: 500 });
  for (const a of assignments) {
    const subs = await fs.list(`${a.path}/submissions`);
    for (const s of subs) writes.push(fs.delete(s.path));
    writes.push(fs.delete(a.path));
  }
  for (const n of await fs.list(`classes/${classId}/notes`)) writes.push(fs.delete(n.path));
  for (const m of await fs.list(`classes/${classId}/messages`, { max: 20000 })) writes.push(fs.delete(m.path));
  for (const h of await fs.query("", "hours", [["class_id", classId]], 2000).catch(() => [] as Doc[])) {
    if (h.data.status === "pending") writes.push(fs.patch(h.path, { status: "self", review_note: "The class was deleted before your teacher verified this." }, true));
  }
  for (const sub of ["moderation", "mutes", "removed"]) {
    for (const d of await fs.list(`classes/${classId}/${sub}`, { max: 20000 })) writes.push(fs.delete(d.path));
  }
  for (const e of await fs.list(`classes/${classId}/events`, { max: 1000 })) {
    for (const r of await fs.list(`${e.path}/rsvps`)) writes.push(fs.delete(r.path));
    writes.push(fs.delete(e.path));
  }
  for (const m of members) writes.push(fs.delete(m.path));
  if (code) writes.push(fs.delete(`class_codes/${code}`));
  writes.push(fs.delete(`classes/${classId}`));
  await fs.commit(writes);
}

export async function handleClassDelete(ctx: Ctx, body: Body): Promise<unknown> {
  const { fs, uid } = ctx;
  const classId = str(body, "classId", { max: 40 });
  const cls = await fs.get(`classes/${classId}`);
  if (!cls) throw new HttpError(404, "not_found", "Class not found");
  if (cls.data.teacher_id !== uid) throw new HttpError(403, "not_teacher", "Only this class's teacher can delete it.");
  await deleteClassData(ctx, classId, String(cls.data.code ?? ""));
  await fs.runTransaction(async (tx) => {
    const user = await tx.get(`users/${uid}`);
    if (!user) return { writes: [] as Write[], result: null };
    const r = readRecord(user.data);
    return { writes: [fs.patch(user.path, { teaching_ids: r.teaching_ids.filter((c) => c !== classId) }, true)], result: null };
  });
  return { ok: true };
}

export async function handleAssignmentsSync(ctx: Ctx, body: Body): Promise<unknown> {
  const user = await ctx.fs.get(`users/${ctx.uid}`);
  if (!user) return { completed: [] };
  const completed = await syncAssignments(ctx.fs, ctx.uid, user.data, optionalDay(body, ctx.now));
  return { completed };
}

// ─── /api/account/delete ────────────────────────────────────────────────────

export async function handleAccountDelete(ctx: Ctx): Promise<unknown> {
  const { fs, uid } = ctx;
  const user = await fs.get(`users/${uid}`);
  if (user) {
    const r = readRecord(user.data);
    const removedFrom = Array.isArray(user.data.removed_from) ? (user.data.removed_from as string[]) : [];
    await fs
      .commit([...new Set([...r.class_ids, ...removedFrom])].flatMap((cid) => [fs.delete(`classes/${cid}/mutes/${uid}`), fs.delete(`classes/${cid}/removed/${uid}`)]))
      .catch((err) => console.error("mute cleanup failed", err));
    for (const classId of r.class_ids) {
      await removeMember(ctx, classId, uid, false).catch((err) => console.error("leave on delete failed", err));
    }
    for (const classId of r.teaching_ids) {
      const cls = await fs.get(`classes/${classId}`);
      if (cls && cls.data.teacher_id === uid) await deleteClassData(ctx, classId, String(cls.data.code ?? ""));
    }
    const lower = typeof user.data.username_lower === "string" ? user.data.username_lower : "";
    if (lower) {
      const claim = await fs.get(`usernames/${lower}`);
      if (claim && claim.data.uid === uid) await fs.commit([fs.delete(claim.path)]);
    }
  }
  await deleteActData(ctx, uid, user?.data ?? null);
  // Posts from the retired community feed, with their comment threads.
  const posts = await fs.query("", "posts", [["userId", uid]], 500).catch(() => [] as Doc[]);
  const writes: Write[] = [];
  for (const p of posts) {
    for (const c of await fs.list(`${p.path}/comments`).catch(() => [] as Doc[])) writes.push(fs.delete(c.path));
    writes.push(fs.delete(p.path));
  }
  // Everything under users/{uid}.
  // (attempts and answers grow by about ten documents per daily set.)
  for (const collectionId of await fs.listCollectionIds(`users/${uid}`).catch(() => [] as string[])) {
    for (const d of await fs.list(`users/${uid}/${collectionId}`, { max: 100_000 })) writes.push(fs.delete(d.path));
  }
  writes.push(fs.delete(`users/${uid}`));
  await fs.commit(writes);
  return { ok: true };
}
