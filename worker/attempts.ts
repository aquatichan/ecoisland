// Practice attempts: the daily set and every quiz are scored here, never in
// the browser.
//
//   POST /api/attempt/start   { mode, unit?, lesson?, qids }      → { attemptId }
//   POST /api/attempt/answer  { attemptId, qid, choice }          → { correct, answer, choice }
//   POST /api/attempt/finish  { attemptId, day }                  → rewards
//
// The first answer to each question is final: it is stored with a
// create-only write, so asking again returns the stored result instead of
// letting a student retry until they hit the right letter. The score is the
// number of stored correct answers over the number of questions in the
// attempt; unanswered questions count as wrong.

import { findLesson, lessonKey } from "../src/shared/curriculum";
import { REWARD } from "../src/shared/economy";
import type { Ctx } from "./env";
import { FirestoreError, type Data } from "./firestore";
import { clientDay, rewardDailySet, rewardQuiz } from "./handlers";
import { HttpError, int, str } from "./http";
import { answerFor, inLesson, unitOfQid } from "./questions";
import { randomId } from "./state";

type Body = Record<string, unknown>;
type Mode = "daily" | "unit" | "lesson" | "mixed";
const MODES: Mode[] = ["daily", "unit", "lesson", "mixed"];

const DAILY_MIN = 5;
const DAILY_MAX = 15;
const ID_RE = /^[A-Za-z0-9]{20}$/;

const attemptPath = (uid: string, id: string) => `users/${uid}/attempts/${id}`;
const answerPath = (uid: string, id: string, qid: string) => `users/${uid}/answers/${id}_${qid}`;

function attemptId(body: Body): string {
  const id = str(body, "attemptId", { max: 40 });
  if (!ID_RE.test(id)) throw new HttpError(400, "invalid_input", "Unknown practice session");
  return id;
}

export async function handleAttemptStart(ctx: Ctx, body: Body): Promise<unknown> {
  const mode = body.mode as Mode;
  if (!MODES.includes(mode)) throw new HttpError(400, "invalid_input", "Unknown practice type");
  const raw = body.qids;
  const [min, max] = mode === "daily" ? [DAILY_MIN, DAILY_MAX] : [REWARD.QUIZ_MIN_QUESTIONS, REWARD.QUIZ_MAX_QUESTIONS];
  if (!Array.isArray(raw) || raw.length < min || raw.length > max) {
    throw new HttpError(400, "invalid_input", `A ${mode === "daily" ? "daily set" : "quiz"} has ${min} to ${max} questions`);
  }
  const qids = raw.map((q) => (typeof q === "string" ? q : ""));
  if (new Set(qids).size !== qids.length) throw new HttpError(400, "invalid_input", "Each question can appear once");
  if (qids.some((q) => q.length > 40 || answerFor(q) === undefined)) throw new HttpError(400, "invalid_input", "Unknown question");

  let unit: number | null = null;
  let lesson: string | null = null;
  if (mode === "unit") {
    unit = int(body, "unit", 1, 9);
    if (qids.some((q) => unitOfQid(q) !== unit)) throw new HttpError(400, "invalid_input", `Every question must come from Unit ${unit}`);
  } else if (mode === "lesson") {
    lesson = str(body, "lesson", { max: 120 });
    const found = findLesson(lesson);
    if (!found || !found.lesson.hasQuiz) throw new HttpError(400, "invalid_input", "Unknown lesson quiz");
    const key = lessonKey(lesson);
    if (qids.some((q) => !inLesson(q, key))) throw new HttpError(400, "invalid_input", "Every question must come from this lesson");
    unit = found.unit.n;
  } else if (mode === "daily" && typeof body.unit === "number") {
    unit = int(body, "unit", 1, 9);
  }

  const id = randomId();
  const doc: Data = { mode, unit, lesson, qids, finished: false, created_at: ctx.now.toISOString() };
  await ctx.fs.commit([ctx.fs.create(attemptPath(ctx.uid, id), doc)]);
  return { attemptId: id };
}

export async function handleAttemptAnswer(ctx: Ctx, body: Body): Promise<unknown> {
  const { fs, uid } = ctx;
  const id = attemptId(body);
  const qid = str(body, "qid", { max: 40 });
  const choice = int(body, "choice", 0, 3);
  const attempt = await fs.get(attemptPath(uid, id));
  if (!attempt) throw new HttpError(404, "no_attempt", "That practice session has expired. Start a new one.");
  if (attempt.data.finished === true) throw new HttpError(409, "already_finished", "This practice session is already over.");
  const qids = Array.isArray(attempt.data.qids) ? (attempt.data.qids as unknown[]) : [];
  const answer = answerFor(qid);
  if (!qids.includes(qid) || answer === undefined) throw new HttpError(400, "invalid_input", "That question isn't part of this session");

  const path = answerPath(uid, id, qid);
  try {
    await fs.commit([fs.create(path, { attempt: id, qid, choice, correct: choice === answer, at: ctx.now.toISOString() })]);
    return { correct: choice === answer, answer, choice };
  } catch (err) {
    // Already answered: the first answer stands.
    if (!(err instanceof FirestoreError) || (err.status !== 409 && err.code !== "ALREADY_EXISTS" && err.code !== "FAILED_PRECONDITION")) throw err;
    const existing = await fs.get(path);
    if (!existing) throw err;
    const first = Number(existing.data.choice);
    return { correct: first === answer, answer, choice: first };
  }
}

export async function handleAttemptFinish(ctx: Ctx, body: Body): Promise<unknown> {
  const { fs, uid } = ctx;
  const id = attemptId(body);
  const day = clientDay(body, ctx.now);
  const attempt = await fs.get(attemptPath(uid, id));
  if (!attempt) throw new HttpError(404, "no_attempt", "That practice session has expired. Start a new one.");
  if (attempt.data.finished === true) {
    // A retried request: hand back what was saved the first time.
    return { ...(attempt.data.result as Data), correct: attempt.data.correct, total: attempt.data.total, completed: [], replay: true };
  }
  const qids = (Array.isArray(attempt.data.qids) ? attempt.data.qids : []).filter((q): q is string => typeof q === "string");
  const stored = await fs.getAll(qids.map((q) => answerPath(uid, id, q)));
  let correct = 0;
  for (const doc of stored.values()) if (doc?.data.correct === true) correct++;
  const score = { correct, total: qids.length };
  const mode = attempt.data.mode as Mode;
  const path = attemptPath(uid, id);

  if (mode === "daily") return rewardDailySet(ctx, score, day, path);
  const source = mode === "unit" ? "unit" : mode === "lesson" ? "lesson" : "mixed";
  const unit = typeof attempt.data.unit === "number" ? attempt.data.unit : null;
  const lessonId = typeof attempt.data.lesson === "string" ? attempt.data.lesson : null;
  const out = await rewardQuiz(ctx, { source, unit, lessonId }, score, day, path);
  return { ...out, correct, total: qids.length };
}
