# Island art: light direction and palette audit (Stage 4f)

Measured, not regenerated: nothing here changes any art. `sprite-audit.png` shows every sprite and sky with its
numbers. Method: for each sprite, the alpha-weighted brightness of its left half against its right (L/R) and its top
half against its bottom (T/B), on the trimmed WebP files in `public/island/`; for each sky, the centroid of the
brightest 0.4% of pixels in its upper half (where the sun or moon is).

## The rule the art already follows

The sprites are lit from the upper left (`design/island-art/README.md`). Measured: **32 of 33** have a brighter left
half (median L/R +19), and 25 of 33 a brighter top half. The tile wells on the Island page use the same direction
(`bg-linear-to-br`: lightest at the top left), so a sprite and its backdrop agree.

## What clashes with the scene: three skies (for a separate, reviewed regeneration)

| sky | light source | note |
| --- | --- | --- |
| `sky-day` | 70% across, upper right | **the default sky every student starts with** |
| `sky-sunset` | 71% across | |
| `sky-night` | 71% across | the moon |

Every sprite on the island is lit from the left while these skies' sun or moon is on the right, so the scene has two
light directions. It was set when the skies were generated (they were asked to keep the sun "70 percent of the way
across, well inside the frame" so it clears the island). The other four skies are fine: `dawn` has its glow on the left
(14%), `rain` is overcast, and `aurora` and `cosmos` have no single source.

Options for the review, in order of cost: (1) regenerate day, sunset and night with the light source on the upper left
(this is the clean fix, and it is why this is flagged and not done here); (2) mirror those three skies horizontally
everywhere they are drawn (`IslandScene`, the market thumbnails, the page banners), which is cheap but changes every
page's scene at once and needs a look at each; (3) accept it.

## Sprites: nothing clashes; three measurement outliers, all explained by content

| sprite | measure | why |
| --- | --- | --- |
| `growth-songbirds` | L/R -10 (the only one lit from the right) | a scattered flock of four birds, no single shape to light |
| `decor-hammock` | T/B -24 | dark palm crowns above a bright hammock and sand |
| `landmark-7` (weather station) | T/B -14 | a white instrument on a dark base; strongly left-lit (L/R +51) |

Palette: brightness and saturation sit within 2.5 standard deviations for all 33. The extremes are naturally pale
objects (`decor-bench`, `decor-sailboat`, `landmark-3` seabirds, `landmark-7`) and dark soil (`growth-sprouts`), not
style drift.
