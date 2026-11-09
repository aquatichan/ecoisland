// Seeds the Firebase emulators with ready-to-use students, so a fresh
// `pnpm dev:emulators` has someone worth signing in as.
//
//   pnpm dev:emulators     # terminal 1
//   pnpm seed:emulator     # terminal 2, once
//   pnpm dev               # then, in the browser console: __ecoSignIn("alice", "Alice Chen")
//
// XP is set directly here (nothing grants it), so each account shows a
// different island-market state:
//
//   nova   0 XP     bare island; everything in the market is locked
//   alice  620 XP   some growth and decorations owned, more open to buy, the rest locked
//   dana   2,400 XP fully grown; owns everything growth and most decorations
//
// Sign in with the handle as the first argument of __ecoSignIn (nova, alice, dana).
// It only ever talks to the local emulators under the demo project.

const PROJECT = process.env.FIREBASE_PROJECT_ID || "demo-ecoisland";
const FIRESTORE = process.env.FIRESTORE_EMULATOR_HOST || "127.0.0.1:8080";
const AUTH = process.env.FIREBASE_AUTH_EMULATOR_HOST || "127.0.0.1:9099";

if (!PROJECT.startsWith("demo-")) throw new Error(`Refusing to seed "${PROJECT}": the seed is for demo-* emulator projects only.`);

const pad = (n) => String(n).padStart(2, "0");
const dayKey = (offset = 0) => {
  const d = new Date(Date.now() + offset * 86_400_000);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

const GROWTH = ["sprouts", "wildflowers", "meadow", "shrubs", "saplings", "grove", "pond", "forest", "songbirds", "heart-tree"];

const ACCOUNTS = [
  {
    handle: "nova",
    name: "Nova Reyes",
    xp: 0,
    treecoins: 50,
    owned: [],
    decor: [],
    unit_best: {},
    streak: 0,
  },
  {
    handle: "alice",
    name: "Alice Chen",
    xp: 620,
    treecoins: 1240,
    // Owns the free bench, a campfire and the night sky, plus four growth items.
    owned: ["bench", "campfire", "night", "sprouts", "wildflowers", "meadow", "saplings"],
    decor: [
      { id: "bench", x: 0.6, y: 0.62 },
      { id: "campfire", x: 0.45, y: 0.66 },
    ],
    unit_best: { u1: 80, u3: 72 },
    streak: 3,
  },
  {
    handle: "dana",
    name: "Dana Okafor",
    xp: 2400,
    treecoins: 5000,
    owned: [...GROWTH, "bench", "kite", "campfire", "hammock", "dock", "lanterns", "tidepool", "hut", "sailboat", "lighthouse", "night", "sunset", "aurora"],
    decor: [
      { id: "bench", x: 0.6, y: 0.62 },
      { id: "dock", x: 0.73, y: 0.84 },
      { id: "lighthouse", x: 0.74, y: 0.68 },
      { id: "sailboat", x: 0.2, y: 0.85 },
    ],
    unit_best: { u1: 90, u2: 85, u3: 80, u4: 78, u5: 74, u6: 92, u7: 71, u8: 88, u9: 76 },
    streak: 21,
  },
];

// Firestore REST value encoding.
function value(v) {
  if (v === null || v === undefined) return { nullValue: null };
  if (typeof v === "boolean") return { booleanValue: v };
  if (typeof v === "number") return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
  if (typeof v === "string") return { stringValue: v };
  if (Array.isArray(v)) return { arrayValue: { values: v.map(value) } };
  return { mapValue: { fields: Object.fromEntries(Object.entries(v).filter(([, x]) => x !== undefined).map(([k, x]) => [k, value(x)])) } };
}

const docUrl = (path) => `http://${FIRESTORE}/v1/projects/${PROJECT}/databases/(default)/documents/${path}`;

async function put(path, data) {
  const res = await fetch(docUrl(path), {
    method: "PATCH",
    headers: { authorization: "Bearer owner", "content-type": "application/json" },
    body: JSON.stringify({ fields: value(data).mapValue.fields }),
  });
  if (!res.ok) throw new Error(`Writing ${path} failed (${res.status}): ${await res.text()}`);
}

// The same fake Google credential the app's emulator-only __ecoSignIn helper sends, so the uid matches
// the one the browser gets when the student signs in.
async function authUid(handle, name) {
  const claims = JSON.stringify({ sub: handle, email: `${handle}@example.com`, name, email_verified: true });
  const res = await fetch(`http://${AUTH}/identitytoolkit.googleapis.com/v1/accounts:signInWithIdp?key=fake-api-key`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ postBody: `id_token=${encodeURIComponent(claims)}&providerId=google.com`, requestUri: "http://localhost", returnIdpCredential: true, returnSecureToken: true }),
  });
  if (!res.ok) throw new Error(`Auth emulator at ${AUTH} said ${res.status}. Is \`pnpm dev:emulators\` running?`);
  return (await res.json()).localId;
}

for (const a of ACCOUNTS) {
  const uid = await authUid(a.handle, a.name);
  await put(`users/${uid}`, {
    id: uid,
    email: `${a.handle}@example.com`,
    full_name: a.name,
    username: a.handle,
    username_lower: a.handle,
    avatar_url: "",
    role: "student",
    onboarding_complete: true,
    preferences: {},
    treecoins: a.treecoins,
    lifetime_tc: a.treecoins,
    xp_total: a.xp,
    streak: a.streak,
    streak_best: a.streak,
    last_set_day: a.streak ? dayKey() : undefined,
    set_days: a.streak ? [dayKey(-2), dayKey(-1), dayKey()] : [],
    lessons_done: [],
    unit_best: a.unit_best,
    quiz_best: {},
    frq_best: {},
    quests_done: [],
    owned_items: a.owned,
    class_ids: [],
    teaching_ids: [],
    island_skybox: a.owned.includes("night") && a.handle === "dana" ? "night" : "day",
    island_decor: a.decor,
    island_name: `${a.name.split(" ")[0]}'s island`,
    economy_version: 2,
    created_date: new Date().toISOString(),
  });
  await put(`usernames/${a.handle}`, { uid });
  console.log(`${a.handle.padEnd(6)} ${String(a.xp).padStart(5)} XP  ${String(a.treecoins).padStart(5)} TC  owns ${a.owned.length}  (uid ${uid})`);
}
console.log('\nSign in from the browser console with: __ecoSignIn("alice", "Alice Chen")');
