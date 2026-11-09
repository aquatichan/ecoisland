// The ambassador medal: one generated picture, hung from the top edge of the Ambassador page's banner.
// It is baked in cobalt blue, navy and gold, so the page's accent never tints it (the --medal-navy and
// --medal-cobalt tokens in src/index.css name the same two blues). How it was made is in
// design/ambassador-art/README.md. The file is versioned (-v1) and served with an immutable cache
// (public/_headers), so a changed medal gets a new filename and a new entry here.
//
// Only relative imports, so the node tests can load it.
import type { ArtAsset } from "../island/assets";

export const AMBASSADOR_MEDAL: ArtAsset = { src: "/ambassador/medal-v1.webp", w: 224, h: 309, source: "generated" };
