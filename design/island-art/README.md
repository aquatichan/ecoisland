# Island art

How the generated island art in `public/island/` was made, and how to replace it.
What exists is listed in `src/components/island/assets.ts`; `test/unit/island-art.test.ts`
checks the manifest against the files (transparent sprites, opaque skies, sizes, budget).

All of it was made with `gpt-image-2.6-flare` through the OpenAI Image API (`quality: "medium"`,
PNG out). The API key is read from `.env.local` (`OPENAI_API_KEY`) and is never stored or printed.

## Batch 1: the base island and 10 growth items (11 sprites)

- 1536x1024 for the base, 1024x1024 for the rest, `background: "transparent"`.
- Style line appended to every prompt: *Painterly hand-painted 2D game asset, soft stylized
  brushwork, lush saturated greens with warm sunlit highlights from the upper left, gentle rim
  light, clean readable silhouette, three-quarter view seen slightly from above. A single isolated
  object on a fully transparent background. No cast shadow on the ground, no text, no frame, no border.*
- Subjects: `base` (a bare diorama: warm sand with sparse dry grass, a pale rim, a layered rocky
  cliff), `sprouts`, `wildflowers`, `meadow`, `shrubs`, `saplings` (three young trees), `grove`
  (five tall trees), `pond`, `forest`, `songbirds` (robin, bluebird, finch, cardinal), `heart-tree`.
- Cost: 11 images, about $0.63.

## Batch 2: 7 skies, 14 decorations, 9 landmarks (30 images, 31 generated)

- **Sprites** (decor and landmarks): `background: "transparent"`, the same style line with the
  light direction made explicit (*warm sunlight coming from the upper left, soft shading on the
  lower right*). 1024x1024, 1024x1536 or 1536x1024, whichever suits the subject.
- **Skies**: `background: "opaque"`, 1536x1024. Each asks for an empty open ocean, a clear level
  horizon, no land, boats, birds or people, any sun or moon well inside the frame, and a calm,
  low-contrast middle so the island can sit there.
  - `day`: clear summer day, a few small cumulus clouds. `dawn`: lavender and pink, peach glow.
  - `rain`: grey-blue overcast with rain clouds. `sunset`: orange and rose, low sun.
  - `night`: starry navy with a full moon. `aurora`: teal-black arctic night with only a faint
    green glow low on the horizon (the animated aurora is drawn over it). `cosmos`: indigo and
    violet nebula (the animated galaxy is drawn over it).
- **Cost**: a 3-image test first, then the rest: 31 images in all, about $1.49. A rectangular image
  is 1,132 output tokens (about $0.046); a square one is 1,449 (about $0.058). Dollars are worked out
  from the API's token counts at the published `gpt-image-1` rates ($40 per million image-output
  tokens, $5 per million text-input tokens), since the flare model's rate card wasn't available.
  Check the real figure in the OpenAI dashboard. Both batches together: about $2.12.
- **Sky crop**: cropped to 5:3 from the top, so a sun or moon near the top can never be cut off; only
  sea is trimmed (from the bottom). Aligning every horizon instead cut the moon off the night sky,
  so each sky keeps its own horizon (about 0.49 to 0.55 of the card). Each sky also has a 320x192
  thumbnail for the market.
- **Sprite processing**: crop to the artwork (alpha > 8), downscale to 2x the width it is shown at
  on the island (stepping down by halves), encode WebP with alpha at quality 0.86 through Chromium's
  canvas (the local tools can't write WebP). Skies are opaque WebP (1200x720, quality 0.80).
- **Filenames**: `*-v1.webp` for the base, growth and skies. The 23 decor and landmark sprites
  replaced rasterized `-v1` placeholders, so they are `-v2`: a cached placeholder can never be
  served for the new art.

### Checks run on the batch

- **Transparency**, on all 23 sprites: a real alpha channel, a clear border (96% to 100%), no white
  fringe; then looked at on a sea-blue and a dark-foliage background (`design/reviews/2e-art/art-check-*.png`).
- **Light direction**: the left half is brighter than the right in 22 of the 23 new sprites (median +19.3 of
  255), against 10 of 11 in batch 1 (median +18.4). The top-to-bottom bias is weaker in batch 2 (16 of 23
  against 10 of 11), mostly flat items (lagoon, reef) and tall ones with dark bases.
- **Scale**: every sprite drawn at its true in-scene size on one baseline (`scale-sheet.png`). Sizes
  are set per item in the catalog (`w`), not taken from the generated pixels.

## Placeholders

None are in use now. The type remains in the manifest for the next item that needs one. The original SVG
pieces (`Decor.tsx`, `Landmarks.tsx`, `Flora.tsx`, `palette.ts`) and the dev route `/dev/sprites`
(`src/pages/dev/SpriteLab.tsx`) are kept until the generated art is approved; the route draws one piece on a
transparent page so it can be rasterized into a stand-in.

## Replacing a picture

1. Make it on a transparent background (opaque and 5:3 for a sky); trim and downscale to about
   1.5 to 2 pixels per scene pixel (see `w` for the item in `src/shared/catalog.ts` or
   `LANDMARK_LAYOUT`; the scene is 1200 wide).
2. Save it under a new version name, e.g. `public/island/decor/bench-v3.webp`: the files are cached forever.
3. Change its entry in `src/components/island/assets.ts` (`src`, `w`, `h`) and, if the shape changed,
   the item's `anchor` and `w` in the catalog. Delete the old file.
4. `pnpm test` checks the file is a transparent (or, for a sky, opaque) WebP of the size the manifest says.
