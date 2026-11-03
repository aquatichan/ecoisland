// Keeps each student's assignment submissions in step with their study
// record. Runs after every activity; idempotent, so it is safe to call twice.

import { evaluateAssignment, isAssignmentType, type AssignmentType } from "../src/shared/assignments";
import { daysBetween, isDayKey, type DayKey } from "../src/shared/dates";
import type { Data, Firestore, Write } from "./firestore";
import { num } from "./http";
import { displayName, readRecord } from "./state";

export type CompletedAssignment = { classId: string; assignmentId: string; title: string };

export async function syncAssignments(
  fs: Firestore,
  uid: string,
  userData: Data,
  today: DayKey,
  onlyClassIds?: string[],
): Promise<CompletedAssignment[]> {
  const record = readRecord(userData);
  const classIds = (onlyClassIds ?? record.class_ids).slice(0, 8);
  const completed: CompletedAssignment[] = [];
  const writes: Write[] = [];
  const nowIso = new Date().toISOString();

  for (const classId of classIds) {
    const member = await fs.get(`classes/${classId}/members/${uid}`);
    if (!member) continue;
    const assignments = await fs.list(`classes/${classId}/assignments`, { max: 300 });
    if (assignments.length === 0) continue;
    const subPaths = assignments.map((a) => `classes/${classId}/assignments/${a.id}/submissions/${uid}`);
    const existing = await fs.getAll(subPaths);

    assignments.forEach((a, i) => {
      const type = a.data.type;
      if (!isAssignmentType(type)) return;
      const due = isDayKey(a.data.due_day) ? (a.data.due_day as DayKey) : today;
      const created = isDayKey(a.data.created_day) ? (a.data.created_day as DayKey) : due;
      const status = evaluateAssignment(
        {
          type: type as AssignmentType,
          ref: typeof a.data.ref === "string" ? a.data.ref : "",
          count: num(a.data.count, 1),
          min_pct: num(a.data.min_pct, 0),
          created_day: created,
          due_day: due,
        },
        record,
      );
      const prev = existing.get(subPaths[i])?.data;
      const unchanged =
        prev &&
        prev.done === status.done &&
        num(prev.progress) === status.progress &&
        (prev.score ?? null) === status.score &&
        prev.username === displayName(userData);
      if (unchanged) return;
      if (!prev && status.progress === 0 && status.score === null) return; // nothing to report yet

      const wasDone = prev?.done === true;
      const completedDay = status.done ? (wasDone && isDayKey(prev?.completed_day) ? (prev?.completed_day as DayKey) : today) : null;
      writes.push(
        fs.set(subPaths[i], {
          uid,
          username: displayName(userData),
          done: status.done,
          progress: status.progress,
          target: status.target,
          score: status.score,
          completed_at: status.done ? (wasDone && typeof prev?.completed_at === "string" ? prev.completed_at : nowIso) : null,
          completed_day: completedDay,
          late: completedDay ? daysBetween(due, completedDay) > 0 : false,
          updated_at: nowIso,
        }),
      );
      if (status.done && !wasDone) {
        completed.push({ classId, assignmentId: a.id, title: typeof a.data.title === "string" ? a.data.title : "Assignment" });
      }
    });
  }

  await fs.commit(writes);
  return completed;
}
