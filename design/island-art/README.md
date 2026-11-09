# Island art

How the painted island art in `public/island/` was made, and how to replace it.
The list of what exists, and which pieces are placeholders, is
`src/components/island/assets.ts`; `test/unit/island-art.test.ts` checks it
against the files.

## Painted (11 sprites): the base island and the 10 growth items

- **Model:** `gpt-image-2.6-flare` through the OpenAI Image API, `quality: "medium"`,
  `background: "transparent"`, PNG out. 1536x1024 for the base, 1024x1024 for the rest.
  The API key is read from `.env.local` (`OPENAI_API_KEY`) and is never stored or printed.
- **Style line appended to every prompt:** *Painterly hand-painted 2D game asset, soft
  stylized brushwork, lush saturated greens with warm sunlit highlights from the upper
  left, gentle rim light, clean readable silhouette, three-quarter view seen slightly
  from above. A single isolated object on a fully transparent background. No cast shadow
  on the ground, no text, no frame, no border.*
- **Subjects:**
  - `base`: a small round island diorama with a bare top of warm sand and sparse dry grass
    (no trees, bushes, flowers or buildings), a pale sandy rim and a layered rocky cliff underside.
  - `sprouts`: a low patch of dark soil with the first sprouts and short grass blades.
  - `wildflowers`: a low patch of white, yellow, purple and pink wildflowers, two butterflies.
  - `meadow`: a broad, gently mounded meadow of tall soft grass, wildflowers, a few young shrubs.
  - `shrubs`: dense round shrubs of several greens and blue-greens, a few red berries.
  - `saplings`: a small grove of three young trees on a patch of grass with low bushes.
  - `grove`: five tall broadleaf trees with a closing canopy and fern undergrowth.
  - `pond`: a freshwater pond with reeds, lily pads, two dragonflies, grass and stones.
  - `forest`: a dense cluster of tall mixed pines and broadleaf trees with undergrowth and mushrooms.
  - `songbirds`: four songbirds in flight (robin, bluebird, yellow finch, cardinal).
  - `heart-tree`: one large ancient tree with a heart-shaped hollow, small flowers at the roots.
- **Cost:** 11 images, about 15.6k output tokens and 1.2k input tokens in all. At the
  published `gpt-image-1` rates (the flare model's rate card wasn't available, so this is an
  assumption) that is about $0.63. A 3-image test ran first; its three images were kept.
- **Transparency:** the API returned real alpha. Every sprite was checked for an alpha
  channel, a clear border and no white fringe, then looked at on a sea-blue and a dark-foliage
  background. `forest` and `heart-tree` fill their frame but are not cropped.
- **Processing:** crop to the artwork (alpha > 8), downscale to 2x the width it is shown at
  on the island (stepping down by halves), encode WebP with alpha at quality 0.86 (Chromium's
  canvas, since the local tools can't write WebP). Files are named `*-v1.webp`.

## Placeholders (23 sprites): the 14 decorations and 9 landmarks

Their painted art is a later batch. Until then each is the original SVG piece, rasterized
by `src/pages/dev/SpriteLab.tsx` (draws one piece on a transparent page; a script screenshots
it, crops it, and records its anchor and size). The SVG sources (`Decor.tsx`, `Landmarks.tsx`,
`Flora.tsx`, `palette.ts`) are kept for this.

## Replacing a placeholder with painted art

1. Generate or paint it on a transparent background; trim and downscale to about 1.5 to 2
   pixels per scene pixel (see `w` for the item in `src/shared/catalog.ts` or
   `LANDMARK_LAYOUT`; the scene is 1200 wide).
2. Save it as `public/island/<kind>/<name>-v2.webp` (a new version: the files are cached forever).
3. Change its entry in `src/components/island/assets.ts` (`src`, `w`, `h`, `source: "painted"`)
   and, if the shape changed, the item's `anchor` and `w` in the catalog.
4. `pnpm test` checks the file is a transparent WebP of the size the manifest says.
