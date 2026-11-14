# Scenes

Full-window painted backdrops: one behind each signed-in area, one behind sign-in and onboarding, and
two on the landing page. What exists is listed in `src/components/app/scenes.ts`;
`test/unit/scenes.test.ts` checks the manifest against the files and the shell. Review screenshots are
in `design/reviews/stage5a/`.

| id | where | picture |
| --- | --- | --- |
| `scene-home` | Home | a lagoon, a green island with a waterfall and two wind turbines |
| `scene-study` | Study, practice, lessons | a sunlit forest clearing with a stream |
| `scene-island` | Island | open sea, tall clouds, two far islets |
| `scene-act` | Act, events, hours | a coastal trail up a headland to a lookout |
| `scene-class` | Class | a hillside village with a schoolhouse |
| `scene-summit` | Ambassador | a summit above the clouds at blue hour (cobalt and gold) |
| `scene-cove` | Settings, Admin | a quiet cove with a boathouse at golden hour |
| `scene-welcome` | sign-in, onboarding | the lagoon framed by hibiscus, a turtle in the shallows |
| `scene-hero` | landing hero | open sea and sky; the demo island is drawn on it |
| `scene-sunset` | landing closing call to action | a bay at sunset, dark on the left |

## How a scene is used

- **In the app**, `SceneBackdrop` is pinned in the shell's content column: it stays put while the page
  scrolls over it and never reaches under the sidebar. `sceneFor(pathname)` picks the scene.
- **Text never sits straight on a scene.** It is one of:
  - a page title in a `.page-hero`, held to the left half of the column, inside the **title haze**
    (the page colour at 0.88, held to 54% of the width for the top 26rem, then clear);
  - on glass: a `.card` (0.88), the top bar's pills, or a `.plate` (a small glass label for a
    section heading or a caption);
  - on a **reading page** (a lesson, a quiz, flashcards, one FRQ, the guide, the hours record, one
    event, the admin queue), where the whole scene is under one even tint (`QUIET_TINT`, 0.9).
- **Sign-in and the landing hero** bring their own left-hand tint (0.88) instead of the haze; the
  closing call to action puts light text on a dark tint (the ink colour at 0.84).

## Trays

Every feature group on a page sits in a tray (`.tray` in `src/index.css`, `<Tray>` in
`src/components/ui/tray.tsx`): a pane of cream at 0.55 with a 24px blur, lighter than a card so the
scene reads through it, and the thicker material of the two. Cards sit inside it 12px apart and 12px
from its edge, with concentric corners (a card's 20px, the tray's 32px). Only the tray's heading, in
`--fg`, sits straight on it (AA even over black); every other word is on a card or a plate inside it.
A card inside a tray paints no backdrop filter of its own, so a page has a handful of blurred layers,
not dozens (the FRQ list went from 42 to 15).

## The sidebar painting

`public/sidebar/cove-v1.webp` (720x686, 54 KB) is the foot of the sidebar: a little cove with a pier
and a palm. It was generated as a 1024x1536 portrait whose top 55% is empty pale cream sky, so it melts
into the sidebar's glass, then cropped to the cove and encoded through Chromium's canvas at quality
0.82. Prompt (with the style line above):

> A tall portrait vignette for the foot of a game's side menu. Everything sits in the BOTTOM 45 percent
> of the picture: a tiny cozy tropical cove seen from a low grassy bank, with a small curved sandy
> beach, a short wooden pier, one leaning palm tree on the right, a few round bushes with pink and
> yellow flowers in the foreground, clear turquoise shallow water, and far away a small green islet
> with one slim white wind turbine on the horizon. The TOP 55 percent of the picture is completely
> empty: a smooth, flat, very pale warm cream sky, almost white, with no clouds, no birds and no detail
> at all, fading very gently into a soft pale blue just above the horizon.

Cost: one image, 1,132 output tokens, about $0.05.

## The audit

`design/scene-art/audit.mjs` drives the running app (emulator mode) with Playwright. It lists every
piece of text in `<main>` that sits straight on the scene (no painted ancestor, and not page-hero text
inside the title haze) or straight on a tray (anything but a tray's own heading), and any horizontal
overflow. Run it after adding a page or moving text out of a card, at 1280 and at 1024 (the narrowest
window the app allows):

```bash
PLAYWRIGHT=/path/to/node_modules/playwright/index.mjs node design/scene-art/audit.mjs dana /today /study /study/unit/1 /study/frq /island /act /ambassador /class /settings
W=1024 PLAYWRIGHT=... node design/scene-art/audit.mjs dana /today /island /act /ambassador /study/unit/1
```

It expects the app on `http://localhost:5183` (`BASE` to change it), started in emulator mode and
seeded (`pnpm seed:emulator`).

## How they were made

All ten with `gpt-image-2.6-flare` through the OpenAI Image API (`quality: "medium"`, `background:
"opaque"`, 2048x1152 PNG), by `scripts/generate_images.py` from the prompts in `scripts/scenes.json`
(`scripts/` is not in git; the prompts are repeated below). The key is read from `.env.local`
(`OPENAI_API_KEY`) and never stored or printed.

Every prompt ends with the style line:

> A painterly hand-painted 2D game backdrop in soft stylized storybook brushwork, like the title
> screen of a cozy island adventure game. Lush saturated colors, bright, vibrant and welcoming, with
> warm sunlight from the upper left. Wide landscape, opaque full-bleed picture. No text, no letters,
> no numbers, no logos, no signs, no people, no frame, no border, no interface elements.

The seven app scenes add the composition a page needs:

> Composition: the main subject sits in the UPPER RIGHT third of the picture. Keep the UPPER LEFT
> quiet: pale hazy sky and soft mist with very low detail and low contrast, because a page title sits
> there. Keep the LOWER HALF calm and low in contrast, with broad smooth shapes, because interface
> panels float over it; a few large soft leaves may frame the two bottom corners.

`scene-welcome` and `scene-hero` ask for a quiet left 40 to 45 percent instead (the headline is
there), and `scene-hero` for a calm, empty centre-right sea where the island is drawn.
`scene-sunset` asks for a quiet, fairly dark left half, because light text sits on it.

- **Cost**: 10 images, 1,212 output tokens each, about $0.49 at the same assumed `gpt-image-1` rate
  as the island art ($40 per million image-output tokens), against a $5 cap. No retries were needed.
  Check the real figure in the OpenAI dashboard.
- **Processing**: encoded as opaque WebP at quality 0.80 through Chromium's canvas (the local tools
  can't write WebP), at the generated size. 90 to 233 KB each, 1.58 MB together; a page loads one.
- **Filenames**: `<name>-v1.webp` in `public/scenes/`, cached forever (`/scenes/*` in
  `public/_headers`). A changed picture gets a new filename and a new manifest entry.
- **Light**: from the upper left, like the island's sprites.
