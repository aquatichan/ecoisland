// Live Firestore reads used across the app, plus the class and assignment
// writes a teacher may make directly (validated by firestore.rules).
import {
  addDoc,
  collection,
  doc,
  getDocs,
  limit as fbLimit,
  onSnapshot,
  orderBy as fbOrderBy,
  query,
  updateDoc,
  writeBatch,
  type QueryConstraint,
} from "firebase/firestore";
import { useEffect, useMemo, useState } from "react";
import type { AssignmentType } from "@/shared/assignments";
import type { ClassDoc } from "@/shared/types";
import { db } from "./firebase";

export type WithId<T> = T & { id: string };

export function useDoc<T>(path: string | null): { data: WithId<T> | null; loading: boolean; error: boolean } {
  const [state, setState] = useState<{ data: WithId<T> | null; loading: boolean; error: boolean }>({ data: null, loading: !!path, error: false });
  useEffect(() => {
    if (!path) {
      setState({ data: null, loading: false, error: false });
      return;
    }
    setState((s) => ({ ...s, loading: true }));
    return onSnapshot(
      doc(db, path),
      (snap) => setState({ data: snap.exists() ? ({ ...(snap.data() as T), id: snap.id } as WithId<T>) : null, loading: false, error: false }),
      () => setState({ data: null, loading: false, error: true }),
    );
  }, [path]);
  return state;
}

export function useCollection<T>(
  path: string | null,
  opts: { orderBy?: [string, "asc" | "desc"]; limit?: number } = {},
): { items: WithId<T>[]; loading: boolean; error: boolean } {
  const [state, setState] = useState<{ items: WithId<T>[]; loading: boolean; error: boolean }>({ items: [], loading: !!path, error: false });
  const order = opts.orderBy?.join(":") ?? "";
  const lim = opts.limit ?? 0;
  useEffect(() => {
    if (!path) {
      setState({ items: [], loading: false, error: false });
      return;
    }
    setState((s) => ({ ...s, loading: true }));
    const constraints: QueryConstraint[] = [];
    if (order) {
      const [field, dir] = order.split(":");
      constraints.push(fbOrderBy(field, dir as "asc" | "desc"));
    }
    if (lim) constraints.push(fbLimit(lim));
    return onSnapshot(
      query(collection(db, path), ...constraints),
      (snap) => setState({ items: snap.docs.map((d) => ({ ...(d.data() as T), id: d.id })), loading: false, error: false }),
      () => setState({ items: [], loading: false, error: true }),
    );
  }, [path, order, lim]);
  return state;
}

/** Live class documents for a list of ids (a student's classes or a teacher's). */
export function useClasses(ids: string[] | undefined): { classes: WithId<ClassDoc>[]; loading: boolean } {
  const key = (ids ?? []).slice(0, 20).join(",");
  const [map, setMap] = useState<Record<string, WithId<ClassDoc> | null>>({});
  useEffect(() => {
    const list = key ? key.split(",") : [];
    setMap({});
    const unsubs = list.map((id) =>
      onSnapshot(
        doc(db, "classes", id),
        (snap) => setMap((m) => ({ ...m, [id]: snap.exists() ? ({ ...(snap.data() as ClassDoc), id } as WithId<ClassDoc>) : null })),
        () => setMap((m) => ({ ...m, [id]: null })),
      ),
    );
    return () => unsubs.forEach((u) => u());
  }, [key]);
  return useMemo(() => {
    const list = key ? key.split(",") : [];
    const loaded = list.every((id) => id in map);
    return {
      classes: list.map((id) => map[id]).filter((c): c is WithId<ClassDoc> => !!c),
      loading: !loaded,
    };
  }, [key, map]);
}

// ─── Teacher writes ─────────────────────────────────────────────────────────

export type AssignmentInput = {
  type: AssignmentType;
  ref: string;
  title: string;
  unit: number;
  count?: number;
  min_pct?: number;
  notes?: string;
  created_day: string;
  due_day: string;
};

function clean(input: AssignmentInput, uid: string) {
  const data: Record<string, unknown> = {
    type: input.type,
    ref: input.ref,
    title: input.title.trim().slice(0, 120),
    unit: input.unit,
    created_day: input.created_day,
    due_day: input.due_day,
    created_by: uid,
  };
  if (input.type === "daily_sets") data.count = Math.max(1, Math.min(30, Math.round(input.count ?? 1)));
  if (input.min_pct) data.min_pct = Math.max(0, Math.min(100, Math.round(input.min_pct)));
  if (input.notes?.trim()) data.notes = input.notes.trim().slice(0, 500);
  return data;
}

export async function createAssignment(classId: string, uid: string, input: AssignmentInput): Promise<string> {
  const ref = await addDoc(collection(db, "classes", classId, "assignments"), { ...clean(input, uid), created_at: new Date().toISOString() });
  return ref.id;
}

export async function updateAssignment(classId: string, aid: string, uid: string, input: AssignmentInput, createdAt?: string): Promise<void> {
  const data = clean(input, uid);
  await writeBatch(db)
    .set(doc(db, "classes", classId, "assignments", aid), { ...data, ...(createdAt ? { created_at: createdAt } : {}), updated_at: new Date().toISOString() })
    .commit();
}

export async function deleteAssignment(classId: string, aid: string): Promise<void> {
  const subs = await getDocs(collection(db, "classes", classId, "assignments", aid, "submissions"));
  const batch = writeBatch(db);
  subs.docs.forEach((d) => batch.delete(d.ref));
  batch.delete(doc(db, "classes", classId, "assignments", aid));
  await batch.commit();
}

export async function updateClass(
  classId: string,
  patch: Partial<Pick<ClassDoc, "name" | "current_unit" | "test_day" | "test_label">>,
): Promise<void> {
  await updateDoc(doc(db, "classes", classId), { ...patch, updated_at: new Date().toISOString() });
}
