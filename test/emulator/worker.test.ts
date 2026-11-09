// End-to-end tests of the Worker API against the Firestore emulator.
// Run with: pnpm test:emulator

import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import { handleApi } from "../../worker/index";
import { ANSWERS } from "../../worker/generated/content";
import { runRetention } from "../../worker/retention";
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

/** The first `n` question ids matching `re`. */
const qids = (re: RegExp, n: number) => Object.keys(ANSWERS).filter((k) => re.test(k)).slice(0, n);
const wrong = (qid: string) => (ANSWERS[qid] + 1) % 4;

/** Runs a whole practice session: start, answer (first `correct` right), finish. */
async function practice(
  uid: string,
  mode: "daily" | "unit" | "lesson" | "mixed",
  opts: { qids: string[]; unit?: number; lesson?: string },
  correct: number,
  finishDay = day(),
) {
  const start = await call(uid, "attempt/start", { mode, unit: opts.unit, lesson: opts.lesson, qids: opts.qids });
  expect(start.status).toBe(200);
  const attemptId = start.body.attemptId as string;
  for (const [i, qid] of opts.qids.entries()) {
    const res = await call(uid, "attempt/answer", { attemptId, qid, choice: i < correct ? ANSWERS[qid] : wrong(qid) });
    expect(res.status).toBe(200);
  }
  const finish = await call(uid, "attempt/finish", { attemptId, day: finishDay });
  return { ...finish, attemptId };
}

const DAILY = qids(/^L1_1_/, 10);
const daily = (uid: string, correct: number, total = 10, d = day()) => practice(uid, "daily", { qids: DAILY.slice(0, total) }, correct, d);

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
    const first = await daily("alice", 7);
    expect(first.body).toMatchObject({ already: false, streak: 1, reward: { tc: 17, xp: 34 } });
    expect((await user("alice")).treecoins).toBe(67);

    const again = await daily("alice", 10);
    expect(again.body).toMatchObject({ already: true, reward: { tc: 0 } });
    expect((await user("alice")).treecoins).toBe(67);

    now = new Date(now.getTime() + 86_400_000);
    const d2 = await daily("alice", 10);
    expect(d2.body.streak).toBe(2);
    now = new Date(now.getTime() + 86_400_000);
    const d3 = await daily("alice", 10);
    expect(d3.body).toMatchObject({ streak: 3, reward: { tc: 25 } }); // streak bonus

    // Skipping a day resets the streak.
    now = new Date(now.getTime() + 2 * 86_400_000);
    const d5 = await daily("alice", 5, 5);
    expect(d5.body.streak).toBe(1);
    const u = await user("alice");
    expect(u.streak_best).toBe(3);
    expect(u.set_days).toHaveLength(4);
  });

  it("rejects implausible dates and backdating", async () => {
    await call("alice", "sync");
    expect((await daily("alice", 5, 5, "2026-10-01")).status).toBe(400);
    await daily("alice", 5, 5);
    const back = await daily("alice", 5, 5, day(-1));
    expect(back.body.already).toBe(true);
  });
});

describe("server-side scoring", () => {
  it("ignores scores claimed by the browser", async () => {
    await call("alice", "sync");
    // The old endpoints that trusted a client-reported score are gone.
    const claimed = await call("alice", "reward", { kind: "daily_set", day: day(), answers: DAILY.map((qid) => ({ qid, correct: true })) });
    expect(claimed.status).toBe(400);
    const quiz = await call("alice", "reward", { kind: "quiz", day: day(), source: "unit", unit: 4, correct: 40, total: 40 });
    expect(quiz.status).toBe(400);
    // Extra fields on finish are ignored: the score comes from stored answers.
    const start = await call("alice", "attempt/start", { mode: "unit", unit: 4, qids: qids(/^[LU]4_/, 10) });
    const fin = await call("alice", "attempt/finish", { attemptId: start.body.attemptId, day: day(), correct: 10, total: 10 });
    expect(fin.body).toMatchObject({ correct: 0, total: 10, score: 0, newLandmark: null });
    expect((await user("alice")).unit_best).toEqual({ u4: 0 });
  });

  it("keeps the first answer and never re-grades it", async () => {
    await call("alice", "sync");
    const start = await call("alice", "attempt/start", { mode: "daily", qids: DAILY });
    const attemptId = start.body.attemptId;
    const q = DAILY[0];
    const first = await call("alice", "attempt/answer", { attemptId, qid: q, choice: wrong(q) });
    expect(first.body).toEqual({ correct: false, answer: ANSWERS[q], choice: wrong(q) });
    const retry = await call("alice", "attempt/answer", { attemptId, qid: q, choice: ANSWERS[q] });
    expect(retry.body).toEqual({ correct: false, answer: ANSWERS[q], choice: wrong(q) });
    for (const qid of DAILY.slice(1)) await call("alice", "attempt/answer", { attemptId, qid, choice: ANSWERS[qid] });
    const fin = await call("alice", "attempt/finish", { attemptId, day: day() });
    expect(fin.body).toMatchObject({ correct: 9, total: 10, reward: { tc: 19, xp: 38 } });

    // Saving twice returns the same result and pays once.
    const replay = await call("alice", "attempt/finish", { attemptId, day: day() });
    expect(replay.body).toMatchObject({ replay: true, correct: 9, reward: { tc: 19 } });
    expect((await user("alice")).treecoins).toBe(69);
    // A finished attempt takes no more answers.
    expect((await call("alice", "attempt/answer", { attemptId, qid: DAILY[1], choice: 0 })).status).toBe(409);
  });

  it("validates which questions an attempt may contain", async () => {
    await call("alice", "sync");
    const bad = (body: Record<string, unknown>) => call("alice", "attempt/start", body).then((r) => r.status);
    expect(await bad({ mode: "daily", qids: DAILY.slice(0, 4) })).toBe(400); // too few
    expect(await bad({ mode: "daily", qids: [...DAILY.slice(0, 9), DAILY[0]] })).toBe(400); // duplicate
    expect(await bad({ mode: "daily", qids: [...DAILY.slice(0, 9), "U9_9999"] })).toBe(400); // unknown
    expect(await bad({ mode: "unit", unit: 4, qids: DAILY })).toBe(400); // wrong unit
    expect(await bad({ mode: "lesson", lesson: "1.4_The_Carbon_Cycle", qids: DAILY })).toBe(400); // wrong lesson
    expect(await bad({ mode: "lesson", lesson: "1.0_The_Living_World_Ecosystems", qids: DAILY })).toBe(400); // no quiz
    expect(await bad({ mode: "boss", qids: DAILY })).toBe(400);

    // Someone else's attempt is invisible.
    const mine = await call("alice", "attempt/start", { mode: "daily", qids: DAILY });
    await call("bob", "sync");
    const theirs = await call("bob", "attempt/answer", { attemptId: mine.body.attemptId, qid: DAILY[0], choice: 0 });
    expect(theirs.status).toBe(404);
    // A question outside the attempt is refused.
    const outside = await call("alice", "attempt/answer", { attemptId: mine.body.attemptId, qid: "U1_0", choice: 0 });
    expect(outside.status).toBe(400);
  });
});

describe("quizzes and lessons", () => {
  it("caps quiz rewards per day but always records scores and mastery", async () => {
    await call("alice", "sync");
    const rewards: number[] = [];
    const unit4 = qids(/^[LU]4_/, 20);
    for (let i = 0; i < 6; i++) {
      const r = await practice("alice", "unit", { unit: 4, qids: unit4 }, i === 5 ? 15 : 5);
      rewards.push(r.body.reward.tc);
      if (i === 5) expect(r.body).toMatchObject({ capped: true, newLandmark: 4, score: 75 });
    }
    expect(rewards.slice(0, 5).every((t) => t > 0)).toBe(true);
    expect(rewards[5]).toBe(0);
    expect((await user("alice")).unit_best).toEqual({ u4: 75 });
  });

  it("records lesson quiz scores", async () => {
    await call("alice", "sync");
    const ok = await practice("alice", "lesson", { lesson: "1.4_The_Carbon_Cycle", qids: qids(/^L1_4_/, 10) }, 8);
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

/** Sets fields on a student directly, the way a long stretch of study would. */
const setUser = (uid: string, fields: Record<string, unknown>) => admin.commit([admin.patch(`users/${uid}`, fields, true)]);

describe("shop", () => {
  it("charges the catalog price and prevents double purchases", async () => {
    await call("alice", "sync"); // 50 TC
    await setUser("alice", { xp_total: 500 }); // everything below 500 XP is open
    expect((await call("alice", "purchase", { item: "lighthouse" })).status).toBe(402);
    const ok = await call("alice", "purchase", { item: "campfire" });
    expect(ok.body).toMatchObject({ treecoins: 0, owned_items: ["campfire"] });
    expect((await call("alice", "purchase", { item: "campfire" })).status).toBe(409);
    expect((await call("alice", "purchase", { item: "ambassador_badge" })).status).toBe(400);
    expect((await call("alice", "purchase", { item: "day" })).status).toBe(400);
  });
});

describe("island market unlocks", () => {
  it("rejects a purchase below the XP threshold with 403 locked, and allows it at the threshold", async () => {
    await call("alice", "sync"); // 50 TC, 0 XP
    await setUser("alice", { xp_total: 19 });
    const locked = await call("alice", "purchase", { item: "campfire" }); // opens at 20 XP
    expect(locked.status).toBe(403);
    expect(locked.body.error.code).toBe("locked");
    expect(locked.body.error.message).toContain("20 XP");
    expect((await user("alice")).treecoins).toBe(50); // nothing was charged
    expect((await user("alice")).owned_items).toEqual([]);

    await setUser("alice", { xp_total: 20 });
    const ok = await call("alice", "purchase", { item: "campfire" });
    expect(ok.status).toBe(200);
    expect(ok.body).toMatchObject({ treecoins: 0, owned_items: ["campfire"] });
  });

  it("gates skies and painted growth the same way", async () => {
    await call("alice", "sync");
    await setUser("alice", { treecoins: 1000, xp_total: 79 });
    expect((await call("alice", "purchase", { item: "wildflowers" })).body.error.code).toBe("locked"); // growth, 80 XP
    expect((await call("alice", "purchase", { item: "aurora" })).body.error.code).toBe("locked"); // sky, 800 XP
    await setUser("alice", { xp_total: 80 });
    const grown = await call("alice", "purchase", { item: "wildflowers" });
    expect(grown.status).toBe(200);
    expect(grown.body).toMatchObject({ treecoins: 975, owned_items: ["wildflowers"] });
    await setUser("alice", { xp_total: 800 });
    expect((await call("alice", "purchase", { item: "aurora" })).status).toBe(200);
  });

  it("makes price-0 items wait for their XP, then claims them free: no Treecoins taken, never owned twice", async () => {
    await call("alice", "sync"); // 50 TC, 0 XP
    await setUser("alice", { xp_total: 9 });
    const locked = await call("alice", "purchase", { item: "bench" }); // free, but opens at 10 XP
    expect(locked.status).toBe(403);
    expect(locked.body.error.code).toBe("locked");
    expect(locked.body.error.message).toContain("10 XP");
    expect(await user("alice")).toMatchObject({ treecoins: 50, owned_items: [] });

    await setUser("alice", { xp_total: 10 });
    const claimed = await call("alice", "purchase", { item: "bench" });
    expect(claimed.status).toBe(200);
    expect(claimed.body).toMatchObject({ treecoins: 50, owned_items: ["bench"] }); // balance unchanged
    const again = await call("alice", "purchase", { item: "bench" });
    expect(again.status).toBe(409);
    expect(again.body.error.code).toBe("already_owned");
    expect(await user("alice")).toMatchObject({ treecoins: 50, owned_items: ["bench"] });
  });

  it("claims a free item with no Treecoins at all, and two simultaneous claims leave exactly one copy", async () => {
    await call("alice", "sync");
    await setUser("alice", { xp_total: 10, treecoins: 0 });
    const [a, b] = await Promise.all([call("alice", "purchase", { item: "kite" }), call("alice", "purchase", { item: "kite" })]);
    expect([a.status, b.status].sort()).toEqual([200, 409]);
    expect(await user("alice")).toMatchObject({ treecoins: 0, owned_items: ["kite"] });
  });

  it("checks ownership first: an owned item stays owned even if XP were lower", async () => {
    await call("alice", "sync");
    await setUser("alice", { xp_total: 0, owned_items: ["lighthouse"] }); // had it from before the market opened by XP
    const again = await call("alice", "purchase", { item: "lighthouse" });
    expect(again.status).toBe(409);
    expect(again.body.error.code).toBe("already_owned");
  });

  it("checks XP before Treecoins", async () => {
    await call("alice", "sync"); // 50 TC: too little for the lighthouse as well as too little XP
    const res = await call("alice", "purchase", { item: "lighthouse" });
    expect(res.status).toBe(403);
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

    await daily("alice", 6);
    let sets = (await admin.get(`classes/${classId}/assignments/a2/submissions/alice`))?.data;
    expect(sets).toMatchObject({ done: false, progress: 1, target: 2 });
    now = new Date(now.getTime() + 86_400_000);
    const second = await daily("alice", 6);
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
    await practice("alice", "unit", { unit: 1, qids: qids(/^[LU]1_/, 10) }, 9);
    await admin.commit([admin.set("posts/p1", { userId: "alice", title: "old" }), admin.set("posts/p1/comments/c1", { text: "hi" })]);

    expect((await call("alice", "account/delete")).status).toBe(200);
    expect(await user("alice")).toBeUndefined();
    expect(await admin.get("usernames/alice")).toBeNull();
    expect(await admin.get(`classes/${classId}/members/alice`)).toBeNull();
    expect(await admin.list("users/alice/apes_sessions")).toEqual([]);
    expect(await admin.list("users/alice/attempts")).toEqual([]);
    expect(await admin.list("users/alice/answers")).toEqual([]);
    expect(await admin.get("posts/p1")).toBeNull();
    expect(await admin.get("posts/p1/comments/c1")).toBeNull();
  });
});

describe("class chat", () => {
  async function setup() {
    await call("teach", "sync");
    await admin.commit([admin.patch("users/teach", { role: "teacher", username: "ms.rivera" }, true)]);
    const { classId, code } = (await call("teach", "class/create", { name: "APES P3" })).body;
    for (const uid of ["alice", "bob"]) {
      await call(uid, "sync");
      await admin.commit([admin.patch(`users/${uid}`, { username: uid }, true)]);
      await call(uid, "class/join", { code });
    }
    await call("carol", "sync");
    return classId as string;
  }
  const tick = (ms = 2000) => {
    now = new Date(now.getTime() + ms);
  };
  const messages = async (classId: string) => (await admin.list(`classes/${classId}/messages`)).map((d) => ({ id: d.id, ...d.data })) as any[];

  it("is off until the teacher turns it on, and only members can post", async () => {
    const classId = await setup();
    expect((await call("alice", "chat/send", { classId, text: "hi" })).body.error.code).toBe("chat_off");
    await call("teach", "chat/toggle", { classId, enabled: true });
    const sent = await call("alice", "chat/send", { classId, text: "  Is the test on Friday?  " });
    expect(sent.status).toBe(200);
    expect(sent.body.message).toMatchObject({ uid: "alice", name: "alice", role: "student", text: "Is the test on Friday?", deleted: false });
    tick();
    const t = await call("teach", "chat/send", { classId, text: "Yes, Unit 4." });
    expect(t.body.message.role).toBe("teacher");
    expect((await call("carol", "chat/send", { classId, text: "let me in" })).status).toBe(403);
    expect((await call("alice", "chat/send", { classId, text: "   " })).status).toBe(400);
    expect((await call("alice", "chat/send", { classId, text: "x".repeat(501) })).status).toBe(400);
    expect(await messages(classId)).toHaveLength(2);
  });

  it("blocks bad language but not course vocabulary, and slows down floods", async () => {
    const classId = await setup();
    await call("teach", "chat/toggle", { classId, enabled: true });
    expect((await call("alice", "chat/send", { classId, text: "this is sh1t" })).body.error.code).toBe("blocked_language");
    expect((await call("alice", "chat/send", { classId, text: "Fukushima and the sex ratio are on the assessment" })).status).toBe(200);
    expect((await call("alice", "chat/send", { classId, text: "again" })).status).toBe(429); // same instant
    // Ten a minute: nine more fit in this minute, the eleventh waits.
    for (let i = 0; i < 9; i++) {
      tick(1500);
      expect((await call("alice", "chat/send", { classId, text: `msg ${i}` })).status).toBe(200);
    }
    tick(1500);
    expect((await call("alice", "chat/send", { classId, text: "one too many" })).status).toBe(429);
    tick(60_000);
    expect((await call("alice", "chat/send", { classId, text: "next minute" })).status).toBe(200);
  });

  it("lets the teacher mute, review reports and delete; students delete only their own", async () => {
    const classId = await setup();
    await call("teach", "chat/toggle", { classId, enabled: true });
    const a = (await call("alice", "chat/send", { classId, text: "first" })).body.id;
    tick();
    const b = (await call("bob", "chat/send", { classId, text: "rude thing" })).body.id;

    expect((await call("alice", "chat/delete", { classId, messageId: b })).status).toBe(403);
    expect((await call("bob", "chat/report", { classId, messageId: b })).status).toBe(400); // own message
    await call("alice", "chat/report", { classId, messageId: b, reason: "harassment" });
    await call("alice", "chat/report", { classId, messageId: b, reason: "harassment" }); // counted once
    let msg = (await messages(classId)).find((m) => m.id === b);
    expect(msg).toMatchObject({ reported: true, report_count: 1, report_reasons: ["harassment"] });
    expect(JSON.stringify(msg)).not.toContain("alice"); // classmates can't see who reported
    expect((await call("alice", "chat/dismiss", { classId, messageId: b })).status).toBe(403);
    await call("teach", "chat/dismiss", { classId, messageId: b });
    msg = (await messages(classId)).find((m) => m.id === b);
    expect(msg).toMatchObject({ reported: false });

    expect((await call("alice", "chat/mute", { classId, uid: "bob", muted: true })).status).toBe(403);
    await call("teach", "chat/mute", { classId, uid: "bob", muted: true });
    tick();
    expect((await call("bob", "chat/send", { classId, text: "still here?" })).body.error.code).toBe("muted");
    // Stats syncs keep the mute.
    await practice("bob", "daily", { qids: DAILY }, 5);
    expect((await admin.get(`classes/${classId}/members/bob`))?.data.muted).toBe(true);

    await call("teach", "chat/delete", { classId, messageId: b });
    await call("alice", "chat/delete", { classId, messageId: a });
    const all = await messages(classId);
    expect(all.find((m) => m.id === b)).toMatchObject({ deleted: true, deleted_by: "teacher", text: "" });
    expect(all.find((m) => m.id === a)).toMatchObject({ deleted: true, deleted_by: "author", text: "" });

    // The moderation log keeps the original text and who did what.
    const log = (await admin.list(`classes/${classId}/moderation`)).map((d) => d.data as any);
    expect(log.find((r) => r.action === "reported")).toMatchObject({ actor_uid: "alice", author_uid: "bob", text: "rude thing", reason: "harassment" });
    expect(log.find((r) => r.action === "deleted" && r.message_id === b)).toMatchObject({ actor_uid: "teach", text: "rude thing" });
    expect(log.find((r) => r.action === "deleted" && r.message_id === a)).toMatchObject({ actor_role: "student", text: "first" });
    expect(log.filter((r) => r.action === "muted")).toHaveLength(1);
    expect(log.filter((r) => r.action === "dismissed")).toHaveLength(1);

    // Leaving and rejoining doesn't lift a mute.
    const { code } = (await admin.get(`classes/${classId}`))!.data as any;
    await call("bob", "class/leave", { classId });
    await call("bob", "class/join", { code });
    tick();
    expect((await call("bob", "chat/send", { classId, text: "back again" })).body.error.code).toBe("muted");
    expect((await admin.get(`classes/${classId}/members/bob`))?.data.muted).toBe(true);
  });

  it("keeps contact details and harassment out, and flags students who may be struggling", async () => {
    const classId = await setup();
    await call("teach", "chat/toggle", { classId, enabled: true });
    expect((await call("alice", "chat/send", { classId, text: "add me on snap" })).body.error.code).toBe("contact_info");
    tick();
    expect((await call("alice", "chat/send", { classId, text: "join discord.gg/xyz" })).body.error.code).toBe("contact_info");
    tick();
    expect((await call("alice", "chat/send", { classId, text: "nobody likes you bob" })).body.error.code).toBe("harassment");
    tick();
    const sad = await call("bob", "chat/send", { classId, text: "honestly i want to die, this unit is too much" });
    expect(sad.body).toMatchObject({ support: true, message: { reported: true, report_reasons: ["wellbeing"] } });
    tick();
    expect((await call("teach", "chat/send", { classId, text: "Slides: docs.google.com/presentation/x, email me at rivera@school.org" })).status).toBe(200);
    const log = (await admin.list(`classes/${classId}/moderation`)).map((d) => d.data as any);
    expect(log.find((r) => r.action === "blocked")).toMatchObject({ author_uid: "alice", reason: "harassment", text: "nobody likes you bob" });
    expect(log.find((r) => r.action === "flagged")).toMatchObject({ author_uid: "bob", reason: "wellbeing" });
    expect(log.find((r) => r.action === "chat_on")).toMatchObject({ actor_uid: "teach" });
    expect((await call("alice", "chat/toggle", { classId, enabled: false })).status).toBe(403);
    await call("teach", "chat/toggle", { classId, enabled: false });
    tick();
    expect((await call("alice", "chat/send", { classId, text: "hello?" })).body.error.code).toBe("chat_off");
  });

  it("keeps removed students out until the teacher allows them back, and can reset the code", async () => {
    const classId = await setup();
    const { code } = (await admin.get(`classes/${classId}`))!.data as any;
    await call("teach", "class/remove", { classId, uid: "bob" });
    expect((await call("bob", "class/join", { code })).body.error.code).toBe("removed");
    expect((await call("alice", "class/unblock", { classId, uid: "bob" })).status).toBe(403);
    await call("teach", "class/unblock", { classId, uid: "bob" });
    expect((await call("bob", "class/join", { code })).status).toBe(200);
    const reset = await call("teach", "class/reset-code", { classId });
    expect(reset.body.code).toMatch(/^[A-Z0-9]{6}$/);
    expect(reset.body.code).not.toBe(code);
    expect(await admin.get(`class_codes/${code}`)).toBeNull();
    await call("carol", "sync");
    expect((await call("carol", "class/join", { code })).status).toBe(404);
    expect((await call("carol", "class/join", { code: reset.body.code })).status).toBe(200);
    expect((await call("alice", "class/reset-code", { classId })).status).toBe(403);
  });

  it("removes a student's messages when they leave, and all of them when the class is deleted", async () => {
    const classId = await setup();
    await call("teach", "chat/toggle", { classId, enabled: true });
    await call("alice", "chat/send", { classId, text: "bye" });
    await call("bob", "chat/send", { classId, text: "hello" });
    await call("alice", "class/leave", { classId });
    expect((await messages(classId)).map((m) => m.uid)).toEqual(["bob"]);
    await call("teach", "class/delete", { classId });
    expect(await messages(classId)).toEqual([]);
  });
});

describe("retention", () => {
  it("deletes chat messages after 90 days and moderation records after a year", async () => {
    const at = (days: number) => new Date(now.getTime() - days * 86_400_000).toISOString();
    await admin.commit([
      admin.set("classes/c1/messages/old", { uid: "a", text: "old", created_at: at(91) }),
      admin.set("classes/c1/messages/new", { uid: "a", text: "new", created_at: at(89) }),
      admin.set("classes/c1/moderation/old", { action: "deleted", at: at(366) }),
      admin.set("classes/c1/moderation/kept", { action: "deleted", at: at(200) }),
      admin.set("users/u1/messages/notchat", { created_at: at(500) }), // not class chat: left alone
    ]);
    const removed = await runRetention(admin, now);
    expect(removed).toEqual({ messages: 1, moderation: 1 });
    expect((await admin.list("classes/c1/messages")).map((d) => d.id)).toEqual(["new"]);
    expect((await admin.list("classes/c1/moderation")).map((d) => d.id)).toEqual(["kept"]);
    expect(await admin.get("users/u1/messages/notchat")).not.toBeNull();
  });
});

describe("act", () => {
  async function setup() {
    await call("teach", "sync");
    await admin.commit([admin.patch("users/teach", { role: "teacher", username: "ms.rivera" }, true)]);
    const { classId, code } = (await call("teach", "class/create", { name: "APES P3" })).body;
    for (const uid of ["alice", "bob"]) {
      await call(uid, "sync");
      await admin.commit([admin.patch(`users/${uid}`, { username: uid }, true)]);
      await call(uid, "class/join", { code });
    }
    return classId as string;
  }
  const at = (days: number, hour: number) => `${day(days)}T${String(hour).padStart(2, "0")}:00:00.000Z`;
  const event = (extra: Record<string, unknown> = {}) => ({
    kind: "event",
    title: "Creek cleanup",
    summary: "Pull trash and invasive ivy along Thornton Creek.",
    details: "Bring gloves and water.",
    category: "cleanup",
    startsAt: at(1, 16),
    endsAt: at(1, 19),
    location: "Thornton Creek trailhead",
    orgName: "Thornton Creek Alliance",
    orgEmail: "help@creek.example.org",
    hours: 3,
    ...extra,
  });
  const action = (extra: Record<string, unknown> = {}) => ({
    kind: "action",
    actionId: "trash-audit",
    title: "Trash audit",
    summary: "Sort three days of your household's trash.",
    details: "Steps...",
    category: "waste",
    unit: 8,
    startDay: day(),
    endDay: day(6),
    ...extra,
  });
  const reflection = "We sorted three days of trash. Food scraps were the biggest share by far, so we started a compost bin.";

  it("publishes class events from the teacher, reviews community suggestions, and trusts ambassadors", async () => {
    const classId = await setup();
    const posted = await call("teach", "event/save", { scope: "class", classId, ...event() });
    expect(posted.body).toMatchObject({ status: "published" });
    expect((await admin.get(`classes/${classId}/events/${posted.body.id}`))?.data).toMatchObject({ class_name: "APES P3", going_count: 0, created_by: "teach" });
    expect((await call("alice", "event/save", { scope: "class", classId, ...event() })).status).toBe(403);

    // Community posts need a way to reach the organizer.
    expect((await call("alice", "event/save", { scope: "community", ...event({ orgEmail: "" }) })).status).toBe(400);
    expect((await call("alice", "event/save", { scope: "community", ...event({ orgUrl: "javascript:alert(1)" }) })).status).toBe(400);
    const suggestion = await call("alice", "event/save", { scope: "community", ...event() });
    expect(suggestion.body.status).toBe("pending");
    for (let i = 0; i < 2; i++) expect((await call("alice", "event/save", { scope: "community", ...event() })).status).toBe(200);
    expect((await call("alice", "event/save", { scope: "community", ...event() })).status).toBe(429);

    expect((await call("alice", "event/review", { id: suggestion.body.id, approve: true })).status).toBe(403);
    await admin.commit([admin.set("admins/boss", { note: "staff" })]);
    await call("boss", "sync");
    expect((await call("boss", "event/review", { id: suggestion.body.id, approve: true })).status).toBe(200);
    expect((await admin.get(`events/${suggestion.body.id}`))?.data.status).toBe("published");

    await admin.commit([admin.patch("users/bob", { ambassador: true }, true)]);
    expect((await call("bob", "event/save", { scope: "community", ...event() })).body.status).toBe("published");
    expect((await call("bob", "event/save", { scope: "community", ...event({ title: "Sh1t cleanup" }) })).body.error.code).toBe("blocked_language");
  });

  it("counts RSVPs once, honors capacity, and drops class RSVPs when a student leaves", async () => {
    const classId = await setup();
    const { id } = (await call("teach", "event/save", { scope: "class", classId, ...event({ capacity: 1 }) })).body;
    const ref = { scope: "class", classId, id };
    expect((await call("alice", "event/rsvp", { ...ref, going: true })).body).toEqual({ going: true, going_count: 1 });
    expect((await call("alice", "event/rsvp", { ...ref, going: true })).body).toEqual({ going: true, going_count: 1 });
    expect((await call("bob", "event/rsvp", { ...ref, going: true })).body.error.code).toBe("full");
    expect((await user("alice")).rsvp_events).toEqual([`c_${classId}_${id}`]);
    expect((await call("carol", "event/rsvp", { ...ref, going: true })).status).toBe(404); // not in the class

    await call("alice", "class/leave", { classId });
    expect((await admin.get(`classes/${classId}/events/${id}/rsvps/alice`))).toBeNull();
    expect((await admin.get(`classes/${classId}/events/${id}`))?.data.going_count).toBe(0);
    expect((await user("alice")).rsvp_events).toEqual([]);
  });

  it("rewards an eco action once, inside its window, and shares the write-up", async () => {
    const classId = await setup();
    const { id } = (await call("teach", "event/save", { scope: "class", classId, ...action() })).body;
    const ref = { scope: "class", classId, id };
    expect((await call("alice", "action/complete", { ...ref, text: "too short" })).status).toBe(400);
    const done = await call("alice", "action/complete", { ...ref, text: reflection });
    expect(done.body.reward).toEqual({ tc: 20, xp: 25 });
    expect((await call("alice", "action/complete", { ...ref, text: reflection })).status).toBe(409);
    expect((await call("teach", "action/complete", { ...ref, text: reflection })).status).toBe(400);
    const note = (await admin.get(`classes/${classId}/notes/alice_c_${classId}_${id}`))?.data;
    expect(note).toMatchObject({ kind: "action", title: "Trash audit", unit: 8, text: reflection });
    expect((await admin.get(`classes/${classId}/events/${id}`))?.data.done_count).toBe(1);

    const later = (await call("teach", "event/save", { scope: "class", classId, ...action({ startDay: day(3), endDay: day(9) }) })).body.id;
    expect((await call("bob", "action/complete", { scope: "class", classId, id: later, text: reflection })).body.error.code).toBe("not_open");
  });

  it("verifies volunteer hours through the chosen teacher, once", async () => {
    const classId = await setup();
    const log = await call("alice", "hours/log", { title: "Food bank garden", orgName: "Northgate Food Bank", date: day(-3), hours: 2, text: "Weeded and mulched the vegetable beds for the food bank.", classId });
    expect(log.body.status).toBe("pending");
    expect((await call("bob", "hours/review", { id: log.body.id, approve: true })).status).toBe(404);
    const before = await user("alice");
    const ok = await call("teach", "hours/review", { id: log.body.id, approve: true });
    expect(ok.body).toMatchObject({ status: "verified", reward: { tc: 10, xp: 15 } }); // flat, not per hour
    const after = await user("alice");
    expect(after.treecoins - before.treecoins).toBe(10);
    expect(after.hours_verified).toBe(2);
    expect((await admin.get(`classes/${classId}/members/alice`))?.data.hours_verified).toBe(2);
    expect((await call("teach", "hours/review", { id: log.body.id, approve: true })).status).toBe(409);
    expect((await call("alice", "hours/delete", { id: log.body.id })).status).toBe(409);
    const stored = (await admin.get(`hours/${log.body.id}`))?.data as any;
    expect(stored).toMatchObject({ reviewed_by: "teach", flags: [] });
    expect(stored.history.map((h: any) => h.action)).toEqual(["submitted", "verified"]);

    // Duplicates and long days are flagged; more than 12 hours in a day is refused.
    const dup = await call("alice", "hours/log", { title: "Food bank garden", orgName: "Northgate Food Bank", date: day(-3), hours: 7, text: "Weeded and mulched the vegetable beds again later that day.", classId });
    expect(dup.body.flags).toEqual(expect.arrayContaining(["possible_duplicate", "long_day"]));
    expect((await call("alice", "hours/log", { title: "Beach", orgName: "Parks", date: day(-3), hours: 4, text: "Picked up litter along the shoreline all afternoon." })).body.error.code).toBe("too_many_hours");

    const bad = (extra: Record<string, unknown>) => call("alice", "hours/log", { title: "Park day", orgName: "Parks Dept", date: day(-1), hours: 1, text: "Picked up litter around the playground area.", ...extra }).then((r) => r.status);
    expect(await bad({ hours: 0.3 })).toBe(400);
    expect(await bad({ hours: 13 })).toBe(400);
    expect(await bad({ date: day(5) })).toBe(400);
    expect(await bad({ classId: "notmyclass" })).toBe(400);
    const self = await call("alice", "hours/log", { title: "Park day", orgName: "Parks Dept", date: day(-1), hours: 1, text: "Picked up litter around the playground area." });
    expect(self.body.status).toBe("self");
    expect((await call("alice", "hours/delete", { id: self.body.id })).status).toBe(200);

    // Hours for an event open once it starts, once per event.
    const { id } = (await call("teach", "event/save", { scope: "class", classId, ...event() })).body;
    const forEvent = { event: { scope: "class", classId, id }, date: day(1), hours: 3, text: "Cleared ivy and bagged trash along the creek trail.", classId };
    expect((await call("alice", "hours/log", forEvent)).body.error.code).toBe("not_started");
    now = new Date(now.getTime() + 2 * 86_400_000);
    expect((await call("alice", "hours/log", forEvent)).status).toBe(200);
    expect((await call("alice", "hours/log", forEvent)).body.error.code).toBe("already_logged");

    // Pending hours stop waiting once the student leaves the class.
    await call("alice", "class/leave", { classId });
    expect((await admin.get(`hours/${dup.body.id}`))?.data).toMatchObject({ status: "self" });
  });

  it("handles ambassador applications one at a time, approved by an admin", async () => {
    await call("alice", "sync");
    await call("bob", "sync");
    const form = { fullName: "Alice Chen", school: "Roosevelt High", grade: "11", region: "Seattle, WA", why: "I lead our environmental club and want to run monthly creek cleanups with other schools in the area.", agree: true };
    expect((await call("alice", "ambassador/apply", { ...form, agree: false })).status).toBe(400);
    expect((await call("alice", "ambassador/apply", { ...form, why: "short" })).status).toBe(400);
    expect((await call("alice", "ambassador/apply", form)).body.status).toBe("pending");
    expect((await call("alice", "ambassador/apply", form)).status).toBe(409);
    expect((await admin.get("ambassador_applications/alice"))?.data).toMatchObject({ email: "alice@school.org", status: "pending", full_name: "Alice Chen" });

    expect((await call("alice", "ambassador/review", { uid: "alice", approve: true })).status).toBe(403);
    await admin.commit([admin.set("admins/boss", {})]);
    await call("boss", "sync");
    const coins = (await user("alice")).treecoins;
    await call("boss", "ambassador/review", { uid: "alice", approve: true });
    const a = await user("alice");
    expect(a).toMatchObject({ ambassador: true, ambassador_region: "Seattle, WA", treecoins: coins + 100 });
    expect((await call("alice", "event/save", { scope: "community", ...event() })).body.status).toBe("published");

    await call("bob", "ambassador/apply", { ...form, fullName: "Bob" });
    await call("boss", "ambassador/review", { uid: "bob", approve: false, note: "Tell us more about your plan." });
    expect((await admin.get("ambassador_applications/bob"))?.data).toMatchObject({ status: "declined", review_note: "Tell us more about your plan." });
    expect((await call("bob", "ambassador/apply", { ...form, fullName: "Bob" })).status).toBe(200);

    // Deleting the account removes the application and hours.
    await call("alice", "hours/log", { title: "Park day", orgName: "Parks Dept", date: day(-1), hours: 1, text: "Picked up litter around the playground area." });
    await call("alice", "account/delete");
    expect(await admin.get("ambassador_applications/alice")).toBeNull();
    expect(await admin.query("", "hours", [["uid", "alice"]])).toEqual([]);
  });
});

describe("streak reminders", () => {
  it("emails only students whose streak ends tonight, once, with a working unsubscribe link", async () => {
    const { sendReminders, unsubscribeToken } = await import("../../worker/reminders");
    const today = day();
    const yesterday = day(-1);
    await admin.commit([
      admin.set("users/r1", { id: "r1", email: "r1@school.org", username: "rae", email_reminders: true, last_set_day: yesterday, streak: 4 }),
      admin.set("users/r2", { id: "r2", email: "r2@school.org", email_reminders: true, last_set_day: today, streak: 5 }),
      admin.set("users/r3", { id: "r3", email: "r3@school.org", email_reminders: false, last_set_day: yesterday, streak: 2 }),
      admin.set("users/r4", { id: "r4", email: "r4@school.org", email_reminders: true, last_set_day: yesterday, streak: 2, last_reminder_day: today }),
    ]);
    const sentTo: string[] = [];
    let unsubscribeUrl = "";
    const mailFetch: typeof fetch = async (input, init) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
      if (url === "https://api.resend.com/emails") {
        const body = JSON.parse(String(init?.body));
        sentTo.push(...body.to);
        unsubscribeUrl = /(https?:\/\/\S+\/api\/unsubscribe\S+)/.exec(body.text)?.[1] ?? "";
        expect(body.subject).toBe("Your 4-day streak ends tonight");
        return new Response("{}", { status: 200 });
      }
      return fetch(input, init);
    };
    const mailEnv: Env = { ...env, RESEND_API_KEY: "re_test", REMINDER_FROM: "Ecoisland <reminders@ecoisland.xyz>" };
    expect(await sendReminders(mailEnv, admin, mailFetch, now, "http://localhost")).toBe(1);
    expect(sentTo).toEqual(["r1@school.org"]);
    expect((await user("r1")).last_reminder_day).toBe(today);
    expect(await sendReminders(mailEnv, admin, mailFetch, now, "http://localhost")).toBe(0);

    // Without a provider configured nothing is sent at all.
    expect(await sendReminders(env, admin, mailFetch, now, "http://localhost")).toBe(0);

    // The link in the email turns reminders off; a forged one does not.
    expect(unsubscribeUrl).toContain(`u=r1`);
    const forged = await handleApi(new Request(`http://localhost/api/unsubscribe?u=r3&t=${await unsubscribeToken("wrong", "r3")}`), mailEnv);
    expect(forged.status).toBe(400);
    const res = await handleApi(new Request(unsubscribeUrl), mailEnv);
    expect(res.status).toBe(200);
    expect(await res.text()).toContain("unsubscribed");
    expect((await user("r1")).email_reminders).toBe(false);
  });
});
