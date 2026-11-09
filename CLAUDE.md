# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Ecoisland is an AP Environmental Science study app (daily spaced-repetition sets, quizzes, FRQs, teacher classes, volunteer/eco-action tracking, and a painted island that grows with progress). It is a React SPA with a Cloudflare Worker API, backed by Firebase Auth, Firestore, and Storage. `docs/SETUP.md` covers deployment, secrets, and admin setup in full.

## Commands

Use pnpm.

```bash
pnpm dev:emulators   # terminal 1: Firebase auth/firestore/storage emulators (needs Java)
pnpm dev             # terminal 2: app + /api/* on http://localhost:5173
pnpm seed:emulator   # once, with the emulators running: students nova (0 XP), alice (620), dana (2,400); sign in with __ecoSignIn("alice", "Alice Chen") in the console
pnpm content         # regenerate public/ question files + worker/generated/content.ts from content/
pnpm typecheck       # two passes: tsconfig.app.json (src) and tsconfig.worker.json (worker + src/shared)
pnpm lint            # eslint with --max-warnings 0, so warnings fail
pnpm test            # unit tests (test/unit), node environment
pnpm test:emulator   # rules + Worker API tests (test/emulator); starts emulators itself
pnpm build           # typecheck, then vite build into dist/
pnpm deploy          # build + wrangler deploy
pnpm deploy:rules    # firestore rules/indexes + storage rules
```

Running a single test:

```bash
pnpm vitest run test/unit/economy.test.ts
pnpm vitest run test/unit/srs.test.ts -t "wrong answers tomorrow"
# Emulator tests, with `pnpm dev:emulators` already running:
pnpm vitest run --config vitest.emulator.config.ts test/emulator/worker.test.ts
```

Local env comes from `.env.local` (copy `.env.example`). The emulator setup uses project `demo-ecoisland`, so it never touches real data.

## Architecture

### Trust model: the browser reads, the Worker writes anything of value

- The app reads Firestore directly with live listeners (`useDoc` and `useCollection` in `src/lib/data.ts`, and the profile listener in `src/lib/session.tsx`).
- The browser may write only a short list of fields: a student's profile and cosmetic choices, their SRS state (`users/{uid}/srs/state`), and a teacher's own class settings and assignments. `firestore.rules` enforces that list (see `profileFields()` and its validators).
- Everything else goes through the Worker, which bypasses the rules with a service account. That covers Treecoins, XP, streaks, progress, class membership, submissions, chat, events, RSVPs, and hours.
- A new user field needs a decision. If it is client-writable, add it to the rules and to `test/emulator/rules.test.ts`. If it is server-only, write it from a Worker handler.

### Request path

1. `src/lib/api.ts` `api(path, body)` sends `POST /api/<path>` with the Firebase ID token and the client's local `day`.
2. `worker/index.ts` `handleApi` verifies the token (`worker/jwt.ts`), applies the per-uid rate limit, builds a `Ctx` (`worker/env.ts`), and dispatches through the `ROUTES` table.
3. Every route except `health` and `unsubscribe` is POST-only. A new endpoint needs a handler plus an entry in `ROUTES`.
4. Handlers throw `HttpError(status, code, message)` from `worker/http.ts`. The `message` is shown to the user verbatim, so write it as user-facing copy.
5. Validate input with the helpers in `worker/http.ts` (`str`, `int`, `asStringArray`, ...).

In dev, a plugin in `vite.config.ts` loads `worker/index.ts` through `ssrLoadModule` and serves `/api/*` itself, so `pnpm dev` doesn't need wrangler. In production, `wrangler.jsonc` serves `dist/` as assets with SPA fallback, and `run_worker_first` sends only `/api/*` to the Worker. A daily cron (`scheduled` in `worker/index.ts`) runs chat retention and then streak reminder emails.

### Firestore from the Worker

The Firebase Admin SDK doesn't run on Workers. `worker/firestore.ts` is a small REST client instead:

- **Building writes:** `fs.create`, `fs.set`, `fs.patch`, and `fs.delete` build `Write` objects, and `fs.commit` sends them.
- **Transactions:** `fs.runTransaction(fn)` retries on contention. `fn` reads through `tx.get`/`tx.getAll` and returns `{ writes, result }`. A transaction allows at most 450 writes.
- **Decoding:** values come back as plain JS, with timestamps as ISO strings.
- **Rewards:** any change to Treecoins or XP should go through `activityWrites` in `worker/state.ts`. It updates the user document and also re-mirrors the student's public stats (`memberPayload`) into `classes/{cid}/members/{uid}` for every class they belong to. Class pages and leaderboards read those mirrors.

### `src/shared/`: code used by both app and Worker

`src/shared/` holds the curriculum, the reward economy (`REWARD` in `economy.ts`), SRS, dates, assignments, the shop catalog, and Act rules. The Worker applies these rules. The app imports the same tables only to show previews.

`src/shared/` is also compiled under `tsconfig.worker.json` (ES2022 + WebWorker libs, no DOM, no path alias). Code there must:

- use only relative imports, never `@/`
- not use any browser APIs

The app imports these modules as `@/shared/...`, and the Worker imports them as `../src/shared/...`.

### Day keys

Streaks, daily sets, and due dates all use a "day key": the student's local date as `YYYY-MM-DD`. `api()` sends one with every call. The server calls `clientDay()` (`worker/handlers.ts`), which rejects any key more than about one day from UTC now with `bad_day`. Tests pin `now` through the `Deps` argument of `handleApi`.

### Course content pipeline

`content/` holds the question banks and FRQs **with answers and rubrics**. `tools/build-content.mjs` (`pnpm content`) generates two things from it:

- **Answer-free copies for the browser:**
  - `public/APES/APES_Unit{n}.json`
  - `public/APES_Modules/Unit_n/<lesson>/questions.json`
  - `public/APES/APES_FRQs.json`
- **The server-only key:** `worker/generated/content.ts`, which exports `ANSWERS` and `FRQS`. Never import it from `src/`.

`test/unit/content.test.ts` fails if the generated files drift from `content/` or if an answer leaks into `public/`.

Question IDs come from the question's position in its file:

- `U{unit}_{index}` for unit banks
- `L{lesson code with dots replaced by _}_{index}` for lesson quizzes, e.g. `L1_4_3`

Stored answers and SRS cards are keyed by these IDs. Inserting or reordering questions in `content/` changes the IDs of existing questions, so add new questions at the end.

Not everything under `public/` is generated:

- Lesson folders hold hand-authored `content.json` and `vocab.json` next to the generated `questions.json`.
- `public/APES/APES_Vocab.json` and `APES_Resources.json` are edited directly.

Lessons are registered in `src/shared/curriculum.ts`, where the lesson `id` is the folder name and `hasQuiz` says whether it has a `questions.json`. The app, the assignments, and the server all read lessons from that file.

`scripts/` is gitignored and predates the `content/` pipeline. Its spec still targets `public/` directly, so don't follow its file paths.

### Practice scoring

Practice scoring lives in `worker/attempts.ts` and runs as `attempt/start`, then `attempt/answer`, then `attempt/finish`.

- The first answer to each question is stored with a create-only write and is final. A repeat answer returns the stored result.
- `finish` is idempotent: a retried request replays the saved result.
- FRQs are graded by Gemini on the server (`frq/grade`, limited by `AI_LIMITER`).

### Frontend

- Routes are lazy-loaded in `src/App.tsx`. Signed-in pages sit under `RequireProfile`, and `/dev/island` (IslandLab) exists only in dev builds.
- `DesktopGate` blocks windows narrower than 1024px. The app is built for laptops and Chromebooks.
- Styling uses Tailwind v4 with primitives in `src/components/ui/`.
- `src/components/bits/` contains vendored React Bits components. Keep their upstream style; lint relaxes rules there, and attribution is in `THIRD_PARTY_NOTICES.md`.
- **The island** (`src/components/island/`) is a raster compositor, not SVG. `IslandScene` draws a painted base plus absolutely positioned item images over a CSS-gradient sky and sea. It draws only what the student owns, so callers pass `growth` and `decor` through `visibleGrowth` and `visibleDecor` (`src/shared/island.ts`); landmarks come from mastered units. A thirsty island fades with a CSS `filter` (`health.ts`) on the image wrapper only.
- **What can be bought, and when:** `ISLAND_UNLOCKS` in `src/shared/economy.ts` gives every growth item, decoration and sky a `minXp`, and `handlePurchase` rejects below it with 403 `locked` (so the browser can't skip it). Prices, art ids, anchors and sizes live in `src/shared/catalog.ts`. A price of 0 is a free claim, still behind its XP.
- **Island art** is in `public/island/` with versioned names (`*-v1.webp`, `-v2` for items that replaced an earlier version), cached immutably (`public/_headers`), and listed in `src/components/island/assets.ts`. This is separate from the generic `public/images/` rule below. Everything is AI-generated (`design/island-art/README.md`): transparent sprites for the base, growth, decorations and landmarks, and opaque 5:3 skies with thumbnails. The sky is drawn as an image over its CSS gradient (`skies.ts`), which stays as the fallback. The SVG modules (`Decor`, `Landmarks`, `Flora`, `palette`) and the dev route `/dev/sprites` are kept until the generated art is approved.
- **Landing plates** are opaque painted backdrops behind four sections of the landing page (teachers, act, the numbers band, the footer), in `public/landing/` (`bg-*-v1.webp`, cached immutably) and listed in `src/components/landing/plates.ts`, a manifest separate from the island's. A plate sits on a section, never in a card, and the manifest says how text stays readable over it (a `start` tint over the text column, or a glass card); cards over a plate use the strong glass fill (`ON_PLATE` in `Landing.tsx`). See `design/landing-art/README.md`.

## Tests

- **Unit tests** (`test/unit/`) cover the pure logic in `src/shared/` and `worker/`.
- **`test/emulator/worker.test.ts`** calls `handleApi` directly. It uses unsigned `alg: none` tokens, which are accepted only in emulator mode, and it injects `fetch` to stub Gemini and `now` to pin the date.
- **`test/emulator/rules.test.ts`** tests `firestore.rules` and `storage.rules` with `@firebase/rules-unit-testing`.
- Emulator tests run serially (`fileParallelism: false`).

## Lint rules worth knowing

- `@typescript-eslint/no-explicit-any` is an error, except in tests.
- `no-console` warns in `src/` (only `console.error` and `console.warn` are allowed) and is off in `worker/` and `test/`.
- Unused arguments must be prefixed with `_`.

## Design and images
- Images go in `public/images/`, converted to WebP, named `{slot}-{family}-{nn}.webp`.
- Image generation uses OpenAI `gpt-image-2.6-flare`, quality `medium`, via `scripts/generate_images.py`. The key comes from `.env`; never log it.
- Text, buttons, and labels are HTML/CSS, never baked into images.
- Do not edit `src/components/bits/` directly. Restyle through wrappers and tokens.
- Do not hand-edit generated files (`public/APES/*.json`, lesson `questions.json`).