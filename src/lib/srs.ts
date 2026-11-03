// Loading and saving a student's spaced-repetition state. The scheduling
// rules live in src/shared/srs.ts.
import { doc, getDoc, setDoc } from "firebase/firestore";
import { sanitizeSrs, type SrsState } from "@/shared/srs";
import { db } from "./firebase";

export { buildDailySet, dueCount, nextCard, readiness, type Card, type SrsState } from "@/shared/srs";

export async function loadSrs(uid: string): Promise<SrsState> {
  try {
    const snap = await getDoc(doc(db, "users", uid, "srs", "state"));
    return sanitizeSrs(snap.data()?.cards);
  } catch {
    return {};
  }
}

/** Merge updated cards into the stored state. */
export async function saveSrs(uid: string, updates: SrsState): Promise<void> {
  if (Object.keys(updates).length === 0) return;
  await setDoc(doc(db, "users", uid, "srs", "state"), { cards: updates, updated_at: new Date().toISOString() }, { merge: true });
}
