// Teacher assignments: what can be assigned, and how completion is decided.
//
// Completion is computed from the student's study record (lessons read, best
// quiz scores, daily sets, quests). Doing the work completes the assignment;
// there is no separate "submit" step to forget. The server runs
// evaluateAssignment after every activity and stores the result where the
// teacher can see it.

import { findLesson, lessonKey, safeKey } from "./curriculum";
import { daysBetween, isDayKey, type DayKey } from "./dates";

export type AssignmentType = "lesson" | "lesson_quiz" | "unit_quiz" | "frq" | "daily_sets" | "field_quest";

export const ASSIGNMENT_TYPES: { type: AssignmentType; label: string; verb: string }[] = [
  { type: "lesson", label: "Read a lesson", verb: "Read" },
  { type: "lesson_quiz", label: "Lesson quiz", verb: "Take quiz" },
  { type: "unit_quiz", label: "Unit practice quiz", verb: "Take quiz" },
  { type: "frq", label: "Free-response question", verb: "Write FRQ" },
  { type: "daily_sets", label: "Daily sets", verb: "Practice" },
  { type: "field_quest", label: "Field quest", verb: "Start quest" },
];

export function isAssignmentType(v: unknown): v is AssignmentType {
  return ASSIGNMENT_TYPES.some((t) => t.type === v);
}

export type Assignment = {
  id: string;
  type: AssignmentType;
  /** Lesson id, "u<n>" for unit quizzes and quests, FRQ id, or "" for daily sets. */
  ref: string;
  title: string;
  unit: number;
  /** Daily sets required (daily_sets only). */
  count?: number;
  /** Minimum score in percent for quiz and FRQ assignments (0 = any attempt). */
  min_pct?: number;
  notes?: string;
  created_day: DayKey;
  due_day: DayKey;
  created_by: string;
};

/** The parts of a student's record that assignment completion depends on. */
export type StudyRecord = {
  lessons_done?: string[];
  quiz_best?: Record<string, number>;
  unit_best?: Record<string, number>;
  frq_best?: Record<string, number>;
  quests_done?: number[];
  set_days?: DayKey[];
};

export type AssignmentStatus = {
  done: boolean;
  /** Units of progress toward `target` (sets completed, or 1/0). */
  progress: number;
  target: number;
  /** Best score in percent for quiz/FRQ assignments, when attempted. */
  score: number | null;
};

export function evaluateAssignment(a: Pick<Assignment, "type" | "ref" | "count" | "min_pct" | "created_day" | "due_day">, r: StudyRecord): AssignmentStatus {
  const minPct = Math.max(0, Math.min(100, a.min_pct ?? 0));
  const scored = (score: number | undefined): AssignmentStatus => {
    if (typeof score !== "number") return { done: false, progress: 0, target: 1, score: null };
    return { done: score >= minPct, progress: score >= minPct ? 1 : 0, target: 1, score };
  };

  switch (a.type) {
    case "lesson": {
      const done = (r.lessons_done ?? []).includes(a.ref);
      return { done, progress: done ? 1 : 0, target: 1, score: null };
    }
    case "lesson_quiz":
      return scored(r.quiz_best?.[lessonKey(a.ref)]);
    case "unit_quiz":
      return scored(r.unit_best?.[a.ref]);
    case "frq":
      return scored(r.frq_best?.[safeKey(a.ref)]);
    case "field_quest": {
      const unit = Number(a.ref.replace(/^u/, ""));
      const done = (r.quests_done ?? []).includes(unit);
      return { done, progress: done ? 1 : 0, target: 1, score: null };
    }
    case "daily_sets": {
      const target = Math.max(1, Math.min(30, Math.round(a.count ?? 1)));
      const from = a.created_day;
      const to = a.due_day;
      const progress = (r.set_days ?? []).filter(
        (d) => isDayKey(d) && isDayKey(from) && isDayKey(to) && daysBetween(from, d) >= 0 && daysBetween(d, to) >= 0,
      ).length;
      return { done: progress >= target, progress: Math.min(progress, target), target, score: null };
    }
  }
}

/** Where a student goes to do an assignment. */
export function assignmentHref(a: Pick<Assignment, "type" | "ref" | "unit">): string {
  switch (a.type) {
    case "lesson": {
      const unit = findLesson(a.ref)?.unit.n ?? a.unit;
      return `/study/unit/${unit}/${encodeURIComponent(a.ref)}`;
    }
    case "lesson_quiz":
      return `/practice?mode=lesson&lesson=${encodeURIComponent(a.ref)}`;
    case "unit_quiz":
      return `/practice?mode=unit&unit=${a.ref.replace(/^u/, "")}`;
    case "frq":
      return `/study/frq/${encodeURIComponent(a.ref)}`;
    case "daily_sets":
      return "/practice?mode=daily";
    case "field_quest":
      return `/study/unit/${a.ref.replace(/^u/, "")}?quest=1`;
  }
}

/** Default title a teacher can edit. */
export function defaultAssignmentTitle(type: AssignmentType, ref: string, opts: { count?: number; frqTitle?: string } = {}): string {
  switch (type) {
    case "lesson": {
      const l = findLesson(ref)?.lesson;
      return l ? `Read ${l.code} ${l.title}` : "Read a lesson";
    }
    case "lesson_quiz": {
      const l = findLesson(ref)?.lesson;
      return l ? `Quiz: ${l.code} ${l.title}` : "Lesson quiz";
    }
    case "unit_quiz":
      return `Unit ${ref.replace(/^u/, "")} practice quiz`;
    case "frq":
      return opts.frqTitle ? `FRQ: ${opts.frqTitle}` : "Free-response question";
    case "daily_sets": {
      const n = opts.count ?? 1;
      return `${n} daily ${n === 1 ? "set" : "sets"}`;
    }
    case "field_quest":
      return `Unit ${ref.replace(/^u/, "")} field quest`;
  }
}

