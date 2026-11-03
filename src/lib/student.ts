// What a student is working on right now: their focus unit, their classes,
// every assignment in those classes, and the next unit test.
import { collection, onSnapshot } from "firebase/firestore";
import { useEffect, useMemo, useState } from "react";
import type { Assignment } from "@/shared/assignments";
import { evaluateAssignment, type AssignmentStatus } from "@/shared/assignments";
import { daysBetween, isDayKey, type DayKey } from "@/shared/dates";
import type { ClassDoc, UserDoc } from "@/shared/types";
import { unitOfLesson } from "@/shared/curriculum";
import { db } from "./firebase";
import { useClasses, type WithId } from "./data";

export type ClassAssignment = Assignment & { classId: string; className: string; status: AssignmentStatus };

/** Live assignments for a set of classes. */
export function useAssignments(classIds: string[]): { byClass: Record<string, Assignment[]>; loading: boolean } {
  const key = classIds.slice(0, 20).join(",");
  const [state, setState] = useState<Record<string, Assignment[]>>({});
  useEffect(() => {
    const ids = key ? key.split(",") : [];
    setState({});
    const unsubs = ids.map((cid) =>
      onSnapshot(
        collection(db, "classes", cid, "assignments"),
        (snap) => setState((s) => ({ ...s, [cid]: snap.docs.map((d) => ({ ...(d.data() as Omit<Assignment, "id">), id: d.id })) })),
        () => setState((s) => ({ ...s, [cid]: [] })),
      ),
    );
    return () => unsubs.forEach((u) => u());
  }, [key]);
  const ids = key ? key.split(",") : [];
  return { byClass: state, loading: !ids.every((id) => id in state) };
}

export function focusUnitFor(profile: UserDoc, classes: WithId<ClassDoc>[]): number {
  const fromClass = classes.find((c) => typeof c.current_unit === "number")?.current_unit;
  if (fromClass) return fromClass;
  if (typeof profile.focus_unit === "number") return profile.focus_unit;
  const fromLesson = profile.last_lesson?.id ? unitOfLesson(profile.last_lesson.id) : undefined;
  return fromLesson ?? 1;
}

export function useStudentContext(profile: UserDoc, today: DayKey) {
  const { classes, loading: classesLoading } = useClasses(profile.class_ids);
  const { byClass, loading: assignmentsLoading } = useAssignments(classes.map((c) => c.id));

  const assignments = useMemo<ClassAssignment[]>(() => {
    const out: ClassAssignment[] = [];
    for (const c of classes) {
      for (const a of byClass[c.id] ?? []) {
        out.push({ ...a, classId: c.id, className: c.name, status: evaluateAssignment(a, profile) });
      }
    }
    return out.sort((a, b) => Number(a.status.done) - Number(b.status.done) || a.due_day.localeCompare(b.due_day));
  }, [classes, byClass, profile]);

  const test = useMemo(() => {
    const upcoming = classes
      .filter((c) => isDayKey(c.test_day) && daysBetween(today, c.test_day as DayKey) >= 0)
      .sort((a, b) => (a.test_day as string).localeCompare(b.test_day as string))[0];
    return upcoming ? { day: upcoming.test_day as DayKey, label: upcoming.test_label || "Unit test", unit: upcoming.current_unit ?? null, className: upcoming.name } : null;
  }, [classes, today]);

  return {
    classes,
    assignments,
    focusUnit: focusUnitFor(profile, classes),
    test,
    loading: classesLoading || assignmentsLoading,
  };
}
