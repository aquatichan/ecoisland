// The layout rule for every page: no container sits over another. Cards, banners and panels each take their own
// space, so nothing is covered, clipped or hidden by a neighbour, and no negative margin or offset is needed.
//
// What this does not cover: a chip or caption laid on the picture inside its own card (the "Animated" tag on a
// sky, the arrange hint on the island scene) is part of that card, not a second container, and a control that
// centres itself with -translate-1/2 moves only itself. The browser check (design/reviews, "no overlapping
// containers") measures the real boxes; this test keeps the classes that cause overlap out of the source.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = join(__dirname, "..", "..");
const SRC = join(ROOT, "src");

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) return name === "bits" ? [] : walk(p); // vendored; its own style
    return /\.(tsx|ts|css)$/.test(name) ? [p] : [];
  });
}

// A negative margin, a negative inset, or a negative translate that is not the 1/2 centring pair. (A negative
// z-index is not a position: it only orders a picture behind its own container's content.)
const NEGATIVE = /(?<![\w-])(?:[a-z-]+:)*-(?:m[trblxyse]?|top|bottom|left|right|inset(?:-[xy])?|translate-[xy])-(?!1\/2\b|full\b)[\w./[\]-]+/g;

// Each of these is a deliberate exception, and none puts one container over another. An exception is one exact class
// on a line that also holds `near`, so it cannot hide a second negative class beside it.
const ALLOWED: { file: string; token: string; near: string; why: string }[] = [
  { file: "src/components/ui/dialog.tsx", token: "-m-1", near: "rounded-md p-1.5", why: "the close button grows its hit area into the dialog's own padding" },
  { file: "src/pages/UnitPage.tsx", token: "-mx-2", near: "flex items-center gap-3", why: "a link row widens its hover fill into the card's padding" },
  { file: "src/components/act/EventCard.tsx", token: "hover:-translate-y-px", near: "card group", why: "a 1px lift of one card on hover, the same as an interactive Card; the grid gap is larger" },
  { file: "src/components/ui/card.tsx", token: "hover:-translate-y-px", near: "interactive &&", why: "a 1px lift of one card on hover; the grid gap is larger" },
];

describe("no overlapping containers", () => {
  it("uses no negative margin or offset that would put one container over another", () => {
    const found: string[] = [];
    for (const file of walk(SRC)) {
      const rel = relative(ROOT, file);
      readFileSync(file, "utf8").split("\n").forEach((line, i) => {
        for (const m of line.matchAll(NEGATIVE)) {
          const ok = ALLOWED.some((a) => a.file === rel && m[0] === a.token && line.includes(a.near));
          if (!ok) found.push(`${rel}:${i + 1}  ${m[0]}`);
        }
      });
    }
    expect(found, `negative margins or offsets stack containers; give each its own space instead:\n${found.join("\n")}`).toEqual([]);
  });

  it("keeps every exception on a line that still exists, so the list cannot go stale", () => {
    for (const a of ALLOWED) {
      const hit = readFileSync(join(ROOT, a.file), "utf8").split("\n").some((line) => line.includes(a.token) && line.includes(a.near));
      expect(hit, `${a.file}: ${a.token} (${a.why})`).toBe(true);
    }
  });

  it("sets the landing page's perks strip below the hero, and lets the hero's lines fade out instead of ending on an edge", () => {
    const landing = readFileSync(join(SRC, "pages", "Landing.tsx"), "utf8");
    expect(landing).toContain('<div className="mx-auto mt-8 max-w-page px-8">'); // the strip: its own space, a gap above it
    expect(landing).toContain("pb-20"); // the hero keeps no extra room for the strip to sit in
    expect(landing, "nothing now hides where the hero's backdrop stops, so it fades onto the page colour").toContain('<div className="pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-linear-to-t from-bg to-transparent" />');
  });
});
