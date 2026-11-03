// Server-side answer key. Question ids look like "U4_12" (unit 4 bank,
// question 12) or "L1_10_3" (lesson 1.10, question 3).

import { ANSWERS } from "./generated/content";

export function answerFor(qid: string): number | undefined {
  return Object.prototype.hasOwnProperty.call(ANSWERS, qid) ? ANSWERS[qid] : undefined;
}

export function unitOfQid(qid: string): number | null {
  const m = /^[LU](\d)_/.exec(qid);
  return m ? Number(m[1]) : null;
}

/** True when `qid` belongs to the lesson with key `lessonKey` (e.g. "L1_4"). */
export function inLesson(qid: string, lessonKey: string): boolean {
  return qid.startsWith(`${lessonKey}_`) && /^\d+$/.test(qid.slice(lessonKey.length + 1));
}
