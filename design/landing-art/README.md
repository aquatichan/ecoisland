# Landing plates

How the section backgrounds on the landing page were made, and how to replace them. What exists is
listed in `src/components/landing/plates.ts`; `test/unit/landing-plates.test.ts` checks the manifest
against the files and against the page (registration, opaque WebP, size budget, scrims, placement).
Review screenshots are in `design/reviews/stage4b-plates/`.

A plate is an opaque painted picture behind a whole section, with a scrim over the part where text
sits. It sits on a section or the footer, never inside a card, so the one-picture-per-card rule is
untouched. It is static: nothing moves, so reduced motion changes nothing.

| id | where | picture | file |
| --- | --- | --- | --- |
| `bg-teachers` | For teachers | a dim meadow under a canopy | `bg-teachers-v1.webp`, 1536x864 |
| `bg-act` | Act | a coastal trail | `bg-act-v1.webp`, 1536x864 |
| `bg-stats` | the numbers band | a faint sky texture | `bg-stats-v1.webp`, 1536x512 |
| `bg-footer` | the footer | a shoreline strip | `bg-footer-v1.webp`, 1536x512 |

## How they were made

All four with `gpt-image-2.6-flare` through the OpenAI Image API (`quality: "medium"`, `background:
"opaque"`, PNG out), the key read from `.env.local` (`OPENAI_API_KEY`) and never stored or printed.
Sizes are the section's shape: 1536x864 (about 16:9) for the two tall sections, 1536x512 (3:1, the
widest the API takes) for the band and the footer, which are cropped (`object-fit: cover`) to fit.

Every prompt ends with the same line, which is what a plate needs that a sky doesn't, a quiet half:

> A painterly hand-painted 2D game backdrop in soft stylized storybook brushwork, lush saturated colors
> with warm sunlight from the upper left. Wide landscape. Opaque full-bleed picture. No text, no
> letters, no numbers, no logos, no signs, no people, no animals, no frame, no border. Keep the LEFT
> HALF of the image quiet: low detail, low contrast, smooth soft hazy shapes and gentle gradients only,
> with no fine detail, no sharp edges and no bright highlights, because text will sit over it. Detail
> and interest belong on the RIGHT HALF.

Subjects: `teachers`, a dim, calm view at the edge of a meadow under tall broadleaf trees in low light
(muted greens, a few faint shafts of light and a little mist on the right); `act`, a coastal hiking trail
along a green headland in soft morning light, wildflowers and a distant rocky point on the right, only
hazy sky and calm sea on the left; `footer`, a very wide low strip of calm shoreline (turquoise water,
a line of foam, wet and dry sand, a few shells on the right); `stats`, a faint airy sky with wispy cirrus.

- **Cost**: a 3-image test first (teachers, act, footer: 924, 924 and 443 output tokens, about $0.095),
  then the sky texture (443 tokens, about $0.019): four images, about $0.11, against the $8 cap.
  Dollars are worked out from the API's token counts at the same assumed `gpt-image-1` rates as the
  island art ($40 per million image-output tokens, $5 per million text-input tokens); check the real
  figure in the OpenAI dashboard.
- **Quiet where text sits**: measured, not just looked at. Mean luminance gradient in the left 45% against
  the right 45%: teachers 0.18, act 0.19, footer 0.26 of the right side's detail, and the sky texture
  0.50 (it is quiet everywhere). The teachers plate is dim (mean luminance 69 to 103 of 255).
- **Processing**: drawn onto an opaque canvas and encoded as WebP at quality 0.84 through Chromium's
  canvas (the local tools can't write WebP). 102, 114, 41 and 30 KB; 287 KB together.
- **Filenames**: `bg-<section>-v1.webp`, cached forever (`/landing/*` in `public/_headers`).

## How text stays readable

Each manifest entry has a `scrim`:

- **`start`** (teachers, act): the section's text is in the left column. A tint of the page color
  (`var(--bg)`) at 92% holds from the left edge to 52% of the width, past where the column ends at every
  desktop width (it is under 50%), then clears by 82% so the picture shows behind the card on the right.
- **`card`** (the numbers band, the footer): all the text is on a glass card.

Cards over a plate use the strong glass fill (`ON_PLATE` in `Landing.tsx`, 0.95), not the standard card
(0.88). The standard card was measured at 4.35:1 for the red "4 days ago" label over the darkest part of
the teachers plate; the strong fill passes for every text color over any picture, even black. The top and
bottom edges of each plate fade into the page color so neighbouring sections blend.

Checked in a browser at 1280px (176 text runs against the pixels behind them): the lowest contrast over a
plate is 4.94:1 on a scrim and 4.86:1 on a glass card, against 4.5.

## Replacing a plate

1. Make it opaque, 1536 wide, the section's shape, with a quiet left half. Encode as WebP.
2. Save it under a new version name, e.g. `public/landing/bg-act-v2.webp`: the files are cached forever.
3. Change its entry in `src/components/landing/plates.ts` (`src`, `w`, `h`) and delete the old file.
4. `pnpm test` checks the file is an opaque WebP of the size the manifest says, under the size budget.
