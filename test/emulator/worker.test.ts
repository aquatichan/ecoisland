// End-to-end tests of the Worker API against the Firestore emulator.
// Run with: pnpm test:emulator

import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import { handleApi } from "../../worker/index";
import { Firestore } from "../../worker/firestore";
import type { Env } from "../../worker/env";

const PROJECT = "demo-ecoisland";
const HOST = "127.0.0.1:8080";
const admin = new Firestore({ projectId: PROJECT, emulatorHost: HOST });

const assets: Env["ASSETS"] = {
  async fetch(req: Request) {
    const path = decodeURIComponent(new URL(req.url).pathname);
    try {
      return new Response(await readFile(join(__dirname, "../../public", path)));
    } catch {
      return new Response("not found", { status: 404 });
    }
  },
};

let geminiReply: unknown = null;
let geminiCalls = 0;

const testFetch: typeof fetch = async (input, init) => {
  const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
  if (url.startsWith("https://generativelanguage.googleapis.com/")) {
    geminiCalls++;
    return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify(geminiReply) }] } }] }), { status: 200 });
  }
  return fetch(input, init);
};

const env: Env = {
  ASSETS: assets,
  DEV_EMULATORS: "true",
  FIRESTORE_EMULATOR_HOST: HOST,
  FIREBASE_PROJECT_ID: PROJECT,
  GEMINI_API_KEY: "test-key",
};

function b64url(s: string) {
  return Buffer.from(s).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function token(uid: string, extra: Record<string, unknown> = {}) {
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: `https://securetoken.google.com/${PROJECT}`,
    aud: PROJECT,
    sub: uid,
    iat: now,
    auth_time: now,
    exp: now + 3600,
    email: `${uid}@school.org`,
    name: uid.toUpperCase(),
    ...extra,
  };
  return `${b64url(JSON.stringify({ alg: "none", typ: "JWT" }))}.${b64url(JSON.stringify(payload))}.`;
}

// "now" is pinned so day keys are deterministic.
let now = new Date("2026-11-02T18:00:00Z");
const day = (offset = 0) => new Date(now.getTime() + offset * 86_400_000).toISOString().slice(0, 10);

async function call(uid: string | null, route: string, body: Record<string, unknown> = {}, e: Env = env) {
  const req = new Request(`http://localhost/api/${route}`, {
    method: "POST",
    headers: { "content-type": "application/json", ...(uid ? { authorization: `Bearer ${token(uid)}` } : {}) },
    body: JSON.stringify(body),
  });
  const res = await handleApi(req, e, { fetch: testFetch, now: () => now });
  return { status: res.status, body: (await res.json()) as any };
}

async function user(uid: string) {
  return (await admin.get(`users/${uid}`))?.data as any;
}

const answers = (correct: number, total = 10) =>
  Array.from({ length: total }, (_, i) => ({ qid: `L1_1_${i}`, correct: i < correct }));

beforeEach(async () => {
  await fetch(`http://${HOST}/emulator/v1/projects/${PROJECT}/databases/(default)/documents`, { method: "DELETE" });
  now = new Date("2026-11-02T18:00:00Z");
  geminiCalls = 0;
});

describe("auth and config", () => {
  it("requires a token", async () => {
    expect((await call(null, "sync")).status).toBe(401);
  });

  it("refuses to run in production without a service account", async () => {
    const prod: Env = { ASSETS: assets };
    const res = await call("alice", "sync", {}, prod);
    expect(res.status).toBe(503);
    expect(res.body.error.code).toBe("server_not_configured");
  });

  it("never trusts unsigned tokens outside local emulator mode", async () => {
    const req = new Request("https://ecoisland.xyz/api/sync", {
      method: "POST",
      headers: { authorization: `Bearer ${token("alice")}` },
    });
    // Emulator flags are set, but the request is not local, so a real
    // signature is required and the unsigned token is refused.
    const fakeSa = JSON.stringify({ client_email: "sa@demo.iam.gserviceaccount.com", private_key: "unused" });
    const res = await handleApi(req, { ...env, FIREBASE_SERVICE_ACCOUNT: fakeSa }, { fetch: testFetch, getKeys: async () => [] });
    expect(res.status).toBe(401);
  });

  it("only accepts POST", async () => {
    const res = await handleApi(new Request("http://localhost/api/sync"), env);
    expect(res.status).toBe(405);
  });
});

describe("sync", () => {
  it("creates a profile with the welcome gift exactly once", async () => {
    expect((await call("alice", "sync")).body).toMatchObject({ created: true });
    expect((await call("alice", "sync")).body).toMatchObject({ created: false, migrated: false });
    const u = await user("alice");
    expect(u).toMatchObject({ treecoins: 50, xp_total: 0, email: "alice@school.org", economy_version: 2, onboarding_complete: false });
  });

  it("migrates an old account: refunds items, converts XP, reserves the username", async () => {
    await admin.commit([
      admin.set("users/old", {
        id: "old",
        username: "maya.r",
        treecoins: 30,
        eco_level: 3,
        xp: 5,
        onboarding_complete: true,
        island_items: [{ item_id: "nuke" }, { item_id: "ambassador_badge" }],
      }),
    ]);
    const res = await call("old", "sync");
    expect(res.body).toMatchObject({ migrated: true, refund: 350 });
    const u = await user("old");
    expect(u).toMatchObject({ treecoins: 380, xp_total: 60, island_items: [], economy_version: 2, username_lower: "maya.r" });
    expect((await admin.get("usernames/maya.r"))?.data).toEqual({ uid: "old" });
    // A second sync changes nothing.
    await call("old", "sync");
    expect((await user("old")).treecoins).toBe(380);
  });
});

describe("daily set", () => {
  it("rewards once per day and builds a streak", async () => {
    await call("alice", "sync");
    const first = await call("alice", "reward", { kind: "daily_set", day: day(), answers: answers(7) });
    expect(first.body).toMatchObject({ already: false, streak: 1, reward: { tc: 17, xp: 34 } });
    expect((await user("alice")).treecoins).toBe(67);

    const again = await call("alice", "reward", { kind: "daily_set", day: day(), answers: answers(10) });
    expect(again.body).toMatchObject({ already: true, reward: { tc: 0 } });
    expect((await user("alice")).treecoins).toBe(67);

    now = new Date(now.getTime() + 86_400_000);
    const d2 = await call("alice", "reward", { kind: "daily_set", day: day(), answers: answers(10) });
    expect(d2.body.streak).toBe(2);
    now = new Date(now.getTime() + 86_400_000);
    const d3 = await call("alice", "reward", { kind: "daily_set", day: day(), answers: answers(10) });
    expect(d3.body).toMatchObject({ streak: 3, reward: { tc: 25 } }); // streak bonus

    // Skipping a day resets the streak.
    now = new Date(now.getTime() + 2 * 86_400_000);
    const d5 = await call("alice", "reward", { kind: "daily_set", day: day(), answers: answers(5) });
    expect(d5.body.streak).toBe(1);
    const u = await user("alice");
    expect(u.streak_best).toBe(3);
    expect(u.set_days).toHaveLength(4);
  });

  it("rejects implausible dates and backdating", async () => {
    await call("alice", "sync");
    expect((await call("alice", "reward", { kind: "daily_set", day: "2026-10-01", answers: answers(5) })).status).toBe(400);
    await call("alice", "reward", { kind: "daily_set", day: day(), answers: answers(5) });
    const back = await call("alice", "reward", { kind: "daily_set", day: day(-1), answers: answers(5) });
    expect(back.body.already).toBe(true);
    expect((await call("alice", "reward", { kind: "daily_set", day: day(), answers: [{ qid: "x", correct: true }] })).status).toBe(400);
  });
});

describe("quizzes and lessons", () => {
  it("caps quiz rewards per day but always records scores and mastery", async () => {
    await call("alice", "sync");
    const rewards: number[] = [];
    for (let i = 0; i < 6; i++) {
      const r = await call("alice", "reward", { kind: "quiz", day: day(), source: "unit", unit: 4, correct: i === 5 ? 30 : 5, total: 40 });
      rewards.push(r.body.reward.tc);
      if (i === 5) expect(r.body).toMatchObject({ capped: true, newLandmark: 4, score: 75 });
    }
    expect(rewards.slice(0, 5).every((t) => t > 0)).toBe(true);
    expect(rewards[5]).toBe(0);
    expect((await user("alice")).unit_best).toEqual({ u4: 75 });
  });

  it("validates quiz input", async () => {
    await call("alice", "sync");
    expect((await call("alice", "reward", { kind: "quiz", day: day(), source: "unit", unit: 4, correct: 11, total: 10 })).status).toBe(400);
    expect((await call("alice", "reward", { kind: "quiz", day: day(), source: "lesson", lesson: "1.0_The_Living_World_Ecosystems", correct: 1, total: 10 })).status).toBe(400);
    const ok = await call("alice", "reward", { kind: "quiz", day: day(), source: "lesson", lesson: "1.4_The_Carbon_Cycle", correct: 8, total: 10 });
    expect(ok.status).toBe(200);
    expect((await user("alice")).quiz_best).toEqual({ L1_4: 80 });
  });

  it("rewards each lesson once", async () => {
    await call("alice", "sync");
    const a = await call("alice", "reward", { kind: "lesson_read", day: day(), lesson: "1.4_The_Carbon_Cycle" });
    const b = await call("alice", "reward", { kind: "lesson_read", day: day(), lesson: "1.4_The_Carbon_Cycle" });
    expect(a.body).toMatchObject({ already: false, reward: { tc: 5, xp: 10 } });
    expect(b.body.already).toBe(true);
    expect((await call("alice", "reward", { kind: "lesson_read", day: day(), lesson: "nope" })).status).toBe(400);
  });
});

describe("shop", () => {
  it("charges the catalog price and prevents double purchases", async () => {
    await call("alice", "sync"); // 50 TC
    expect((await call("alice", "purchase", { item: "lighthouse" })).status).toBe(402);
    const ok = await call("alice", "purchase", { item: "campfire" });
    expect(ok.body).toMatchObject({ treecoins: 0, owned_items: ["campfire"] });
    expect((await call("alice", "purchase", { item: "campfire" })).status).toBe(409);
    expect((await call("alice", "purchase", { item: "ambassador_badge" })).status).toBe(400);
    expect((await call("alice", "purchase", { item: "day" })).status).toBe(400);
  });
});

describe("classes and assignments", () => {
  async function setupClass() {
    await call("teach", "sync");
    await call("alice", "sync");
    await admin.commit([admin.patch("users/teach", { role: "teacher", username: "ms.rivera" }, true)]);
    const created = await call("teach", "class/create", { name: "APES Period 3" });
    expect(created.status).toBe(200);
    return created.body as { classId: string; code: string };
  }

  it("only teachers create classes", async () => {
    await call("alice", "sync");
    expect((await call("alice", "class/create", { name: "Mine" })).status).toBe(403);
  });

  it("joins by code, mirrors stats and completes assignments from real work", async () => {
    const { classId, code } = await setupClass();
    expect(code).toMatch(/^[A-HJ-NP-Z2-9]{6}$/);

    const bad = await call("alice", "class/join", { code: "ZZZZZZ" });
    expect(bad.status).toBe(404);
    const joined = await call("alice", "class/join", { code: ` ${code.slice(0, 3).toLowerCase()}-${code.slice(3)} `, day: day() });
    expect(joined.body).toMatchObject({ classId, already: false, name: "APES Period 3" });
    expect((await call("alice", "class/join", { code })).body.already).toBe(true);
    expect((await call("teach", "class/join", { code })).status).toBe(400);
    expect((await admin.get(`classes/${classId}`))?.data.member_count).toBe(1);
    expect((await user("alice")).class_ids).toEqual([classId]);

    await admin.commit([
      admin.set(`classes/${classId}/assignments/a1`, {
        type: "lesson",
        ref: "1.4_The_Carbon_Cycle",
        title: "Read 1.4",
        unit: 1,
        created_day: day(),
        due_day: day(3),
        created_by: "teach",
      }),
      admin.set(`classes/${classId}/assignments/a2`, {
        type: "daily_sets",
        ref: "",
        count: 2,
        title: "2 daily sets",
        unit: 1,
        created_day: day(),
        due_day: day(6),
        created_by: "teach",
      }),
    ]);

    const read = await call("alice", "reward", { kind: "lesson_read", day: day(), lesson: "1.4_The_Carbon_Cycle" });
    expect(read.body.completed).toEqual([{ classId, assignmentId: "a1", title: "Read 1.4" }]);
    const sub = (await admin.get(`classes/${classId}/assignments/a1/submissions/alice`))?.data;
    expect(sub).toMatchObject({ done: true, late: false, username: "ALICE" });

    await call("alice", "reward", { kind: "daily_set", day: day(), answers: answers(6) });
    let sets = (await admin.get(`classes/${classId}/assignments/a2/submissions/alice`))?.data;
    expect(sets).toMatchObject({ done: false, progress: 1, target: 2 });
    now = new Date(now.getTime() + 86_400_000);
    const second = await call("alice", "reward", { kind: "daily_set", day: day(), answers: answers(6) });
    expect(second.body.completed.map((c: any) => c.assignmentId)).toEqual(["a2"]);
    sets = (await admin.get(`classes/${classId}/assignments/a2/submissions/alice`))?.data;
    expect(sets).toMatchObject({ done: true, progress: 2 });

    const member = (await admin.get(`classes/${classId}/members/alice`))?.data;
    expect(member).toMatchObject({ streak: 2, week_sets: 2, lessons_count: 1, last_active_day: day() });
    expect(member?.week_xp).toBeGreaterThan(0);
    expect(member?.email).toBeUndefined();
  });

  it("lets students leave and teachers remove, cleaning up their work", async () => {
    const { classId, code } = await setupClass();
    await call("alice", "class/join", { code });
    await admin.commit([
      admin.set(`classes/${classId}/assignments/a1`, {
        type: "lesson",
        ref: "1.4_The_Carbon_Cycle",
        title: "Read",
        unit: 1,
        created_day: day(),
        due_day: day(1),
        created_by: "teach",
      }),
    ]);
    await call("alice", "reward", { kind: "lesson_read", day: day(), lesson: "1.4_The_Carbon_Cycle" });
    expect((await call("bob", "class/remove", { classId, uid: "alice" })).status).toBe(403);

    expect((await call("teach", "class/remove", { classId, uid: "alice" })).status).toBe(200);
    expect(await admin.get(`classes/${classId}/members/alice`)).toBeNull();
    expect(await admin.get(`classes/${classId}/assignments/a1/submissions/alice`)).toBeNull();
    expect((await user("alice")).class_ids).toEqual([]);
    expect((await admin.get(`classes/${classId}`))?.data.member_count).toBe(0);
  });

  it("deletes a class completely", async () => {
    const { classId, code } = await setupClass();
    await call("alice", "class/join", { code });
    expect((await call("alice", "class/delete", { classId })).status).toBe(403);
    expect((await call("teach", "class/delete", { classId })).status).toBe(200);
    expect(await admin.get(`classes/${classId}`)).toBeNull();
    expect(await admin.get(`class_codes/${code}`)).toBeNull();
    expect((await user("alice")).class_ids).toEqual([]);
    expect((await user("teach")).teaching_ids).toEqual([]);
  });
});

describe("field quests", () => {
  it("rewards once per unit and shares the note with the class", async () => {
    await call("teach", "sync");
    await admin.commit([admin.patch("users/teach", { role: "teacher" }, true)]);
    const { classId, code } = (await call("teach", "class/create", { name: "APES" })).body;
    await call("alice", "sync");
    await call("alice", "class/join", { code });
    const text = "I walked around the park behind school and counted fourteen species of plants and birds near the pond.";
    expect((await call("alice", "quest/submit", { day: day(), unit: 2, text: "too short" })).status).toBe(400);
    const ok = await call("alice", "quest/submit", { day: day(), unit: 2, text });
    expect(ok.body.reward).toEqual({ tc: 30, xp: 40 });
    expect((await call("alice", "quest/submit", { day: day(), unit: 2, text })).status).toBe(409);
    const note = (await admin.get(`classes/${classId}/notes/alice_u2`))?.data;
    expect(note).toMatchObject({ uid: "alice", unit: 2, title: "Count the species", text });
  });
});

describe("FRQ grading", () => {
  const responses = { "(a)": "Energy transfer is 200/2000 x 100 = 10 percent.", "(b)": "Runoff adds nitrogen and phosphorus which causes algal blooms.", "(c)": "Decomposers use up dissolved oxygen when algae die.", "(d)": "Plant riparian buffer zones to absorb the nutrients." };

  it("grades on the server, clamps points and caps rewards", async () => {
    await call("alice", "sync");
    const frqs = JSON.parse(await readFile(join(__dirname, "../../public/APES/APES_FRQs.json"), "utf8"));
    const frq = frqs.find((f: any) => f.id === "u1-frq-1");
    const filled = Object.fromEntries(frq.parts.map((p: any) => [p.label, responses[p.label as keyof typeof responses] ?? "A reasonable answer here."]));
    geminiReply = {
      parts: frq.parts.map((p: any) => ({ label: p.label, pointsEarned: 99, pointsPossible: 99, feedback: "ok" })),
      overallFeedback: "Nice work.",
    };
    const res = await call("alice", "frq/grade", { day: day(), frq: "u1-frq-1", responses: filled });
    expect(res.status).toBe(200);
    const possible = frq.parts.reduce((s: number, p: any) => s + p.points, 0);
    expect(res.body.grade.totalEarned).toBe(possible); // clamped to the rubric
    expect(res.body.reward.tc).toBe(20);

    const again = await call("alice", "frq/grade", { day: day(), frq: "u1-frq-1", responses: filled });
    expect(again.body).toMatchObject({ capped: true, reward: { tc: 0 } });
    expect((await user("alice")).frq_best).toEqual({ u1_frq_1: 100 });
    expect(geminiCalls).toBe(2);

    const missing = await call("alice", "frq/grade", { day: day(), frq: "u1-frq-1", responses: { "(a)": "just one" } });
    expect(missing.status).toBe(400);
    expect(geminiCalls).toBe(2);
  });
});

describe("account deletion", () => {
  it("removes the profile, username, memberships and history", async () => {
    await call("teach", "sync");
    await admin.commit([admin.patch("users/teach", { role: "teacher" }, true)]);
    const { classId, code } = (await call("teach", "class/create", { name: "APES" })).body;
    await admin.commit([admin.set("users/alice", { id: "alice", username: "alice", economy_version: 2, treecoins: 50 })]);
    await call("alice", "sync"); // reserves the username
    await call("alice", "class/join", { code });
    await call("alice", "reward", { kind: "quiz", day: day(), source: "unit", unit: 1, correct: 9, total: 10 });
    await admin.commit([admin.set("posts/p1", { userId: "alice", title: "old" }), admin.set("posts/p1/comments/c1", { text: "hi" })]);

    expect((await call("alice", "account/delete")).status).toBe(200);
    expect(await user("alice")).toBeUndefined();
    expect(await admin.get("usernames/alice")).toBeNull();
    expect(await admin.get(`classes/${classId}/members/alice`)).toBeNull();
    expect(await admin.list("users/alice/apes_sessions")).toEqual([]);
    expect(await admin.get("posts/p1")).toBeNull();
    expect(await admin.get("posts/p1/comments/c1")).toBeNull();
  });
});
