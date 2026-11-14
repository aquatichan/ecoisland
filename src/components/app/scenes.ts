// The app's scenes: full-window painted backdrops, one entry per picture in public/scenes/. Each
// signed-in area has its own (sceneFor), the sign-in and onboarding screens share the lagoon, and the
// landing page opens on the open sea and closes on the sunset bay. How they were made is in
// design/scene-art/README.md; test/unit/scenes.test.ts checks this manifest against the files.
//
// Files are versioned (-v1) and served with an immutable cache (public/_headers), so a changed
// picture gets a new filename and a new entry here.
//
// A scene never carries text of its own. Text over one is either on glass (a card, the top bar's
// pills, a plate) or inside the title haze: a tint of the page colour, at least SCRIM_FLOOR opaque,
// that holds from the left edge past where the page title ends and then clears, so the picture's
// subject shows on the right. Every scene was painted with a quiet upper left for that reason.
//
// Only relative imports, so the node tests can load it.
import type { ArtAsset } from "../island/assets";
import { SCRIM_FLOOR, type PlateScrim } from "../landing/plates";

export type Scene = ArtAsset & {
  /** object-position for the crop (the picture is shown `cover`); the subject is on the right. */
  position: string;
};

export const SCENES = {
  // Home: a lagoon with a green island, a waterfall and two wind turbines.
  "scene-home": { src: "/scenes/home-v1.webp", w: 2048, h: 1152, source: "generated", position: "right top" },
  // Study: a sunlit forest clearing with a stream.
  "scene-study": { src: "/scenes/study-v1.webp", w: 2048, h: 1152, source: "generated", position: "right top" },
  // Island: the open sea, tall clouds and two islets, so the student's own island is the only one close by.
  "scene-island": { src: "/scenes/island-v1.webp", w: 2048, h: 1152, source: "generated", position: "right top" },
  // Act: a coastal trail up a headland to a lookout.
  "scene-act": { src: "/scenes/act-v1.webp", w: 2048, h: 1152, source: "generated", position: "right top" },
  // Class: a hillside village with a schoolhouse.
  "scene-class": { src: "/scenes/class-v1.webp", w: 2048, h: 1152, source: "generated", position: "right top" },
  // Ambassador: a summit above the clouds at blue hour, in the page's cobalt and gold.
  "scene-summit": { src: "/scenes/summit-v1.webp", w: 2048, h: 1152, source: "generated", position: "right top" },
  // Settings: a quiet cove with a boathouse at golden hour.
  "scene-cove": { src: "/scenes/cove-v1.webp", w: 2048, h: 1152, source: "generated", position: "right top" },
  // Sign-in and onboarding: the lagoon framed by hibiscus, with a turtle in the shallows.
  "scene-welcome": { src: "/scenes/welcome-v1.webp", w: 2048, h: 1152, source: "generated", position: "right center" },
  // The landing hero: open sea and sky; the demo island is drawn on it.
  "scene-hero": { src: "/scenes/hero-v1.webp", w: 2048, h: 1152, source: "generated", position: "center" },
  // The landing page's closing call to action: a bay at sunset. Dark on the left, where light text sits.
  "scene-sunset": { src: "/scenes/sunset-v1.webp", w: 2048, h: 1152, source: "generated", position: "right center" },
} as const satisfies Record<string, Scene>;

export type SceneId = keyof typeof SCENES;

/**
 * The title haze over an app scene: the page colour from the left edge to `hold` of the width, clear
 * by `hold + fade`. A page title (.page-hero) is at most HERO_TEXT_SPAN of the content column wide, so
 * it always ends inside the hold.
 */
export const TITLE_HAZE: PlateScrim & { kind: "start" } = { kind: "start", alpha: 0.88, hold: 0.54, fade: 0.24 };

/** The widest a page title's text column may be, as a share of the content column. */
export const HERO_TEXT_SPAN = 0.5;

/**
 * Reading pages (a lesson, a quiz, flashcards, a free-response question, the exam guide, the printed
 * hours record, one event, the admin queue) keep the scene as a faint wash under one even tint, so
 * nothing competes with the text and none of it needs a plate.
 */
export const QUIET_TINT = 0.9;

export { SCRIM_FLOOR };

const QUIET = [/^\/practice/, /^\/study\/unit\/[^/]+\/[^/]+/, /^\/study\/frq\/[^/]+/, /^\/study\/flashcards/, /^\/study\/guide/, /^\/act\/hours/, /^\/act\/(e|class)\//, /^\/admin/];

/** The scene behind a signed-in page, and whether the page is a reading page. */
export function sceneFor(pathname: string): { id: SceneId; quiet: boolean } {
  const quiet = QUIET.some((re) => re.test(pathname));
  const under = (base: string) => pathname === base || pathname.startsWith(`${base}/`);
  let id: SceneId = "scene-home";
  if (under("/study") || under("/practice")) id = "scene-study";
  else if (under("/island")) id = "scene-island";
  else if (under("/ambassador")) id = "scene-summit";
  else if (under("/act")) id = "scene-act";
  else if (under("/class")) id = "scene-class";
  else if (under("/settings") || under("/admin")) id = "scene-cove";
  return { id, quiet };
}
