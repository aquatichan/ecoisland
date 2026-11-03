// Profile edits the browser is allowed to make (see firestore.rules).
import { doc, getDoc, updateDoc, writeBatch } from "firebase/firestore";
import type { UserDoc } from "@/shared/types";
import { db, getStorageLazy } from "./firebase";

export const USERNAME_RE = /^[A-Za-z0-9._-]{3,20}$/;

export function usernameProblem(raw: string): string | null {
  const name = raw.trim();
  if (name.length < 3) return "At least 3 characters.";
  if (name.length > 20) return "20 characters at most.";
  if (!USERNAME_RE.test(name)) return "Letters, numbers, periods, dashes and underscores only.";
  return null;
}

/** null = available (or already yours). */
export async function usernameTaken(name: string, uid: string): Promise<boolean> {
  const snap = await getDoc(doc(db, "usernames", name.trim().toLowerCase()));
  return snap.exists() && snap.data()?.uid !== uid;
}

export type ProfilePatch = Partial<
  Pick<UserDoc, "full_name" | "avatar_url" | "role" | "onboarding_complete" | "preferences" | "email_reminders" | "focus_unit" | "last_lesson" | "island_name" | "island_skybox" | "island_decor">
>;

export async function updateProfile(uid: string, patch: ProfilePatch): Promise<void> {
  await updateDoc(doc(db, "users", uid), { ...patch, updated_date: new Date().toISOString() });
}

/** Reserve a username and set it in one atomic write. */
export async function setUsername(uid: string, current: UserDoc, desired: string, extra: ProfilePatch = {}): Promise<void> {
  const username = desired.trim();
  const problem = usernameProblem(username);
  if (problem) throw new Error(problem);
  const lower = username.toLowerCase();
  if (await usernameTaken(lower, uid)) throw new Error("That username is taken. Try another.");

  const batch = writeBatch(db);
  if (current.username_lower !== lower) {
    batch.set(doc(db, "usernames", lower), { uid });
    if (current.username_lower) {
      const old = await getDoc(doc(db, "usernames", current.username_lower));
      if (old.exists() && old.data()?.uid === uid) batch.delete(old.ref);
    }
  }
  batch.update(doc(db, "users", uid), { ...extra, username, username_lower: lower, updated_date: new Date().toISOString() });
  await batch.commit();
}

const MAX_AVATAR_BYTES = 2 * 1024 * 1024;

export async function uploadAvatar(uid: string, file: File): Promise<string> {
  if (!/^image\/(png|jpeg|webp|gif)$/.test(file.type)) throw new Error("Use a PNG, JPG, WebP or GIF image.");
  if (file.size > MAX_AVATAR_BYTES) throw new Error("That image is over 2 MB. Choose a smaller one.");
  const ext = file.type.split("/")[1].replace("jpeg", "jpg");
  const { storage, mod } = await getStorageLazy();
  const r = mod.ref(storage, `avatars/${uid}/${Date.now()}.${ext}`);
  await mod.uploadBytes(r, file, { contentType: file.type });
  return mod.getDownloadURL(r);
}
