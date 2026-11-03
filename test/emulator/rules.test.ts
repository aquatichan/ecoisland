// Firestore and Storage security rules, tested against the emulators.
// Run with: pnpm test:emulator

import { readFileSync } from "node:fs";
import { assertFails, assertSucceeds, initializeTestEnvironment, type RulesTestEnvironment } from "@firebase/rules-unit-testing";
import { collection, deleteDoc, doc, getDoc, getDocs, setDoc, updateDoc, writeBatch } from "firebase/firestore";
import { ref, uploadBytes } from "firebase/storage";
import { afterAll, beforeAll, beforeEach, describe, it } from "vitest";

let env: RulesTestEnvironment;

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: "demo-ecoisland",
    firestore: { rules: readFileSync("firestore.rules", "utf8"), host: "127.0.0.1", port: 8080 },
    storage: { rules: readFileSync("storage.rules", "utf8"), host: "127.0.0.1", port: 9199 },
  });
});

afterAll(async () => {
  await env.cleanup();
});

const student = (uid = "alice") => env.authenticatedContext(uid).firestore();

async function seed() {
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, "users/alice"), {
      id: "alice",
      email: "alice@school.org",
      username: "alice",
      username_lower: "alice",
      treecoins: 100,
      xp_total: 40,
      owned_items: ["night"],
      class_ids: ["c1"],
    });
    await setDoc(doc(db, "users/bob"), { id: "bob", email: "bob@school.org", treecoins: 5, owned_items: [] });
    await setDoc(doc(db, "usernames/alice"), { uid: "alice" });
    await setDoc(doc(db, "classes/c1"), { name: "APES P3", code: "K7Q2MX", teacher_id: "teach", member_count: 1 });
    await setDoc(doc(db, "classes/c1/members/alice"), { uid: "alice", username: "alice", xp_total: 40 });
    await setDoc(doc(db, "classes/c1/assignments/a1"), {
      type: "lesson",
      ref: "1.4_The_Carbon_Cycle",
      title: "Read 1.4",
      unit: 1,
      created_day: "2026-11-02",
      due_day: "2026-11-06",
      created_by: "teach",
    });
    await setDoc(doc(db, "classes/c1/assignments/a1/submissions/alice"), { uid: "alice", done: true });
    await setDoc(doc(db, "classes/c1/assignments/a1/submissions/carol"), { uid: "carol", done: false });
    await setDoc(doc(db, "classes/c1/notes/n1"), { uid: "alice", text: "Found 12 species" });
    await setDoc(doc(db, "class_codes/K7Q2MX"), { class_id: "c1" });
    await setDoc(doc(db, "posts/p1"), { userId: "bob", title: "old post" });
  });
}

beforeEach(async () => {
  await env.clearFirestore();
  await seed();
});

describe("users", () => {
  it("lets a student read only their own profile", async () => {
    await assertSucceeds(getDoc(doc(student(), "users/alice")));
    await assertFails(getDoc(doc(student(), "users/bob")));
    await assertFails(getDoc(doc(env.unauthenticatedContext().firestore(), "users/alice")));
  });

  it("never lets the browser create or delete a profile", async () => {
    await assertFails(setDoc(doc(student("carol"), "users/carol"), { id: "carol", treecoins: 0 }));
    await assertFails(deleteDoc(doc(student(), "users/alice")));
  });

  it("allows profile and cosmetic changes", async () => {
    const db = student();
    await assertSucceeds(updateDoc(doc(db, "users/alice"), { role: "student", island_name: "Kelp Key", focus_unit: 4 }));
    await assertSucceeds(updateDoc(doc(db, "users/alice"), { island_skybox: "night" })); // owned
    await assertSucceeds(updateDoc(doc(db, "users/alice"), { island_skybox: "day" }));
    await assertSucceeds(updateDoc(doc(db, "users/alice"), { "preferences.theme": "dark" }));
  });

  it("blocks every economy and progress field", async () => {
    const db = student();
    for (const patch of [
      { treecoins: 1_000_000 },
      { xp_total: 9999 },
      { streak: 99 },
      { owned_items: ["cosmos"] },
      { class_ids: ["c2"] },
      { teaching_ids: ["c1"] },
      { unit_best: { u1: 100 } },
      { lessons_done: ["1.4_The_Carbon_Cycle"] },
      { email: "fake@x.com" },
      { verification_status: "ambassador" },
    ]) {
      await assertFails(updateDoc(doc(db, "users/alice"), patch));
    }
  });

  it("rejects bad profile values and unowned skies", async () => {
    const db = student();
    await assertFails(updateDoc(doc(db, "users/alice"), { role: "admin" }));
    await assertFails(updateDoc(doc(db, "users/alice"), { focus_unit: 12 }));
    await assertFails(updateDoc(doc(db, "users/alice"), { island_skybox: "cosmos" }));
    await assertFails(updateDoc(doc(db, "users/alice"), { island_name: "x".repeat(40) }));
  });

  it("requires a username claim to change usernames", async () => {
    const db = student();
    await assertFails(updateDoc(doc(db, "users/alice"), { username: "alice2", username_lower: "alice2" }));

    const ok = writeBatch(db);
    ok.update(doc(db, "users/alice"), { username: "Alice2", username_lower: "alice2" });
    ok.set(doc(db, "usernames/alice2"), { uid: "alice" });
    ok.delete(doc(db, "usernames/alice"));
    await assertSucceeds(ok.commit());

    // Bob cannot take Alice's name.
    const bobDb = student("bob");
    const steal = writeBatch(bobDb);
    steal.update(doc(bobDb, "users/bob"), { username: "alice2", username_lower: "alice2" });
    await assertFails(steal.commit());
    await assertFails(setDoc(doc(bobDb, "usernames/alice2"), { uid: "bob" }));
  });

  it("protects username claims", async () => {
    await assertSucceeds(getDoc(doc(student("bob"), "usernames/alice")));
    await assertFails(getDocs(collection(student("bob"), "usernames")));
    await assertFails(deleteDoc(doc(student("bob"), "usernames/alice")));
  });

  it("keeps study history read-only and srs writable", async () => {
    const db = student();
    await assertSucceeds(setDoc(doc(db, "users/alice/srs/state"), { cards: { L1_4_0: [2, 20400] } }));
    await assertFails(setDoc(doc(db, "users/alice/srs/other"), { cards: {} }));
    await assertFails(setDoc(doc(db, "users/alice/apes_sessions/s1"), { score: 10, total: 10 }));
    await assertFails(setDoc(doc(student("bob"), "users/alice/srs/state"), { cards: {} }));
    await assertSucceeds(getDoc(doc(db, "users/alice/apes_sessions/s1")));
  });
});

describe("classes", () => {
  it("shows a class to its teacher and members only", async () => {
    await assertSucceeds(getDoc(doc(student("teach"), "classes/c1")));
    await assertSucceeds(getDoc(doc(student("alice"), "classes/c1")));
    await assertFails(getDoc(doc(student("bob"), "classes/c1")));
    await assertFails(setDoc(doc(student("teach"), "classes/c2"), { name: "x", teacher_id: "teach" }));
  });

  it("lets the teacher edit settings but not ownership or the code", async () => {
    const db = student("teach");
    await assertSucceeds(updateDoc(doc(db, "classes/c1"), { current_unit: 4, test_day: "2026-11-20", test_label: "Unit 4 test" }));
    await assertFails(updateDoc(doc(db, "classes/c1"), { teacher_id: "bob" }));
    await assertFails(updateDoc(doc(db, "classes/c1"), { code: "AAAAAA" }));
    await assertFails(updateDoc(doc(db, "classes/c1"), { current_unit: 10 }));
    await assertFails(updateDoc(doc(student("alice"), "classes/c1"), { current_unit: 2 }));
  });

  it("limits the roster to the class", async () => {
    await assertSucceeds(getDocs(collection(student("alice"), "classes/c1/members")));
    await assertSucceeds(getDocs(collection(student("teach"), "classes/c1/members")));
    await assertFails(getDocs(collection(student("bob"), "classes/c1/members")));
    await assertFails(setDoc(doc(student("alice"), "classes/c1/members/alice"), { xp_total: 99999 }));
    await assertFails(setDoc(doc(student("bob"), "classes/c1/members/bob"), { uid: "bob" }));
  });

  it("lets only the teacher create valid assignments", async () => {
    const valid = {
      type: "unit_quiz",
      ref: "u4",
      title: "Unit 4 quiz",
      unit: 4,
      min_pct: 70,
      created_day: "2026-11-02",
      due_day: "2026-11-09",
      created_by: "teach",
    };
    await assertSucceeds(setDoc(doc(student("teach"), "classes/c1/assignments/a2"), valid));
    await assertFails(setDoc(doc(student("teach"), "classes/c1/assignments/a3"), { ...valid, type: "essay" }));
    await assertFails(setDoc(doc(student("teach"), "classes/c1/assignments/a4"), { ...valid, due_day: "2026-11-01" }));
    await assertFails(setDoc(doc(student("teach"), "classes/c1/assignments/a5"), { ...valid, created_by: "alice" }));
    await assertFails(setDoc(doc(student("alice"), "classes/c1/assignments/a6"), { ...valid, created_by: "alice" }));
    await assertSucceeds(getDocs(collection(student("alice"), "classes/c1/assignments")));
    await assertFails(getDocs(collection(student("bob"), "classes/c1/assignments")));
  });

  it("shows submissions to their student and the teacher only", async () => {
    await assertSucceeds(getDoc(doc(student("alice"), "classes/c1/assignments/a1/submissions/alice")));
    await assertFails(getDoc(doc(student("alice"), "classes/c1/assignments/a1/submissions/carol")));
    await assertSucceeds(getDocs(collection(student("teach"), "classes/c1/assignments/a1/submissions")));
    await assertFails(setDoc(doc(student("alice"), "classes/c1/assignments/a1/submissions/alice"), { done: true }));
    await assertSucceeds(deleteDoc(doc(student("teach"), "classes/c1/assignments/a1/submissions/carol")));
  });

  it("moderates field notes", async () => {
    await assertSucceeds(getDocs(collection(student("alice"), "classes/c1/notes")));
    await assertFails(getDocs(collection(student("bob"), "classes/c1/notes")));
    await assertFails(setDoc(doc(student("alice"), "classes/c1/notes/n2"), { uid: "alice", text: "hi" }));
    await assertSucceeds(deleteDoc(doc(student("alice"), "classes/c1/notes/n1")));
  });

  it("hides join codes and retired collections", async () => {
    await assertFails(getDoc(doc(student("bob"), "class_codes/K7Q2MX")));
    await assertFails(getDoc(doc(student("bob"), "posts/p1")));
  });
});

describe("storage", () => {
  it("accepts small images in the student's own avatar folder only", async () => {
    const png = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);
    const mine = env.authenticatedContext("alice").storage();
    await assertSucceeds(uploadBytes(ref(mine, "avatars/alice/me.png"), png, { contentType: "image/png" }));
    await assertFails(uploadBytes(ref(mine, "avatars/bob/me.png"), png, { contentType: "image/png" }));
    await assertFails(uploadBytes(ref(mine, "avatars/alice/me.txt"), png, { contentType: "text/plain" }));
    await assertFails(uploadBytes(ref(mine, "uploads/anything.png"), png, { contentType: "image/png" }));
  });
});
