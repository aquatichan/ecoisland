# Ambassador medal

How the one generated picture on the Ambassador page, `public/ambassador/medal-v1.webp`, was made.
It is registered in `src/components/ambassador/medal.ts` (source `generated`) and drawn by
`src/pages/Ambassador.tsx`; `test/unit/ambassador-page.test.ts` checks the manifest against the file.

It was added in Stage 4h at the owner's request, after the stage's first scope said "no new medal art".

## Made with

`gpt-image-2.6-flare` through the OpenAI Image API (`quality: "medium"`, 1024x1024, `background: "transparent"`,
PNG out). The key is read from `.env.local` (`OPENAI_API_KEY`) and is never stored or printed. The style line is the
one the island sprites use, so the light matches: *Painterly hand-painted 2D game asset, soft stylized brushwork,
warm sunlight coming from the upper left, soft shading on the lower right, gentle rim light, clean readable
silhouette, front view. A single isolated object on a fully transparent background. No cast shadow on the ground,
no text, no letters, no frame, no border.*

Two candidates were made; B is the one shipped (a thick glossy gold rim, a navy outer band, a cobalt face and a
gold two-leaf sapling with two laurel sprigs, on a short cobalt ribbon with one gold stripe), because it reads better
at the small size it is shown at. The prompt for B:

> An ambassador award medal seen straight on: a round royal blue and cobalt enamel face with a navy outer band, a
> thick glossy gold rim, and a gold two-leaf sapling in the centre. Two small gold laurel sprigs curve around the
> lower half. A short cobalt blue ribbon with a gold stripe at the top.

Cost: 2 images, about $0.12 (1,449 output tokens each, at the same assumed rates as `design/island-art/README.md`).

## Processing

Trimmed to the artwork (alpha > 8, 672x927), the alpha ramped from 190 to 250 so no soft edge is left, scaled down to
224 px wide (2x the 112 px it is shown at), WebP with alpha at quality 0.86 through Chromium's canvas: 224x309, about
19 KB.

## The blues

The medal keeps full-strength navy and cobalt and is never tinted by the page's accent (it is a picture, not CSS, and
the page draws it with no filter but a soft drop shadow, and no opacity). Measured on the shipped file: the median
blue is (2, 54, 166) against `--medal-cobalt` #0047ab (0, 71, 171), and the darkest tenth of the blues is
(13, 29, 72) against `--medal-navy` #0b1f4d (11, 31, 77). About a third of the opaque pixels are gold.

## Where it sits

Inside the page's banner, hung from its top edge, 3rem in from the right (`top-0 right-12 w-28`), on the right half where
the picture shows. The text column is held to the left half under the scrim, so the medal is never behind text. It is
inside the banner's own box, so it does not overlap any other container. It is decorative (`alt=""`, `aria-hidden`,
no pointer events).

## Replacing it

Make the new one on a transparent background, trim and scale it to 2x its display width, save it under a new version
name (`medal-v2.webp`), update `AMBASSADOR_MEDAL` in `src/components/ambassador/medal.ts` (`src`, `w`, `h`) and delete
the old file: the files are cached forever.
