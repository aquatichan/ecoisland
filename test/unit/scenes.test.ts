import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { createElement as h } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { HAZE_MASK, SceneBackdrop } from "../../src/components/app/SceneBackdrop";
import { HERO_TEXT_SPAN, QUIET_TINT, SCENES, SCRIM_FLOOR, TITLE_HAZE, sceneFor, type SceneId } from "../../src/components/app/scenes";

// The app's scenes (src/components/app/scenes.ts): full-window painted backdrops, one per signed-in area, one
// for sign-in and onboarding, and two for the landing page. These check that each is registered and real, that
// every area maps to one, that text over a scene is always inside a tint at least as opaque as the glass floor
// (the title haze, or the even tint of a reading page) or on glass, and that the shell draws the scene behind the
// page without covering it. What only a browser can measure (text that sits straight on a picture) is checked by
// the audit described in design/scene-art/README.md.

const root = join(__dirname, "../..");
const read = (rel: string) => readFileSync(join(root, rel), "utf8");
const css = read("src/index.css");
const shell = read("src/components/app/AppShell.tsx");
const ids = Object.keys(SCENES) as SceneId[];

/** A WebP's size and whether it carries alpha, from its header. */
function webpInfo(path: string): { w: number; h: number; alpha: boolean } {
  const b = readFileSync(path);
  expect(b.toString("ascii", 0, 4), path).toBe("RIFF");
  expect(b.toString("ascii", 8, 12), path).toBe("WEBP");
  const kind = b.toString("ascii", 12, 16);
  if (kind === "VP8X") return { alpha: (b[20] & 0x10) !== 0, w: 1 + b.readUIntLE(24, 3), h: 1 + b.readUIntLE(27, 3) };
  if (kind === "VP8 ") return { alpha: false, w: b.readUInt16LE(26) & 0x3fff, h: b.readUInt16LE(28) & 0x3fff };
  throw new Error(`${path}: unexpected WebP form ${kind}`);
}

const lin = (c: number) => ((c /= 255) <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const rgb = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
const lum = (hex: string) => {
  const [r, g, b] = rgb(hex);
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
};
const ratio = (a: string, b: string) => {
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};
const over = (fg: string, bg: string, alpha: number) => {
  const f = rgb(fg);
  const b = rgb(bg);
  return `#${f.map((v, i) => Math.round(v * alpha + b[i] * (1 - alpha)).toString(16).padStart(2, "0")).join("")}`;
};
const token = (name: string) => new RegExp(`--${name}:\\s*(#[0-9a-fA-F]{6})`).exec(css)?.[1] ?? "";

describe("scenes: registered, real and opaque", () => {
  it("registers the ten scenes", () => {
    expect([...ids].sort()).toEqual(["scene-act", "scene-class", "scene-cove", "scene-hero", "scene-home", "scene-island", "scene-study", "scene-summit", "scene-sunset", "scene-welcome"]);
  });

  it("has one opaque, versioned WebP per entry, the size the manifest says, and no stray file", () => {
    for (const id of ids) {
      const scene = SCENES[id];
      expect(scene.src, id).toMatch(/^\/scenes\/[a-z]+-v\d+\.webp$/);
      const file = join(root, "public", scene.src);
      expect(existsSync(file), scene.src).toBe(true);
      const info = webpInfo(file);
      expect({ w: info.w, h: info.h }, id).toEqual({ w: scene.w, h: scene.h });
      expect(info.alpha, `${id} is opaque`).toBe(false);
      expect(scene.source, id).toBe("generated");
    }
    const files = readdirSync(join(root, "public/scenes")).sort();
    expect(files).toEqual(ids.map((id) => SCENES[id].src.replace("/scenes/", "")).sort());
  });

  it("keeps each scene light enough to load behind a page: 260 KB at most, 2 MB together", () => {
    let total = 0;
    for (const id of ids) {
      const size = statSync(join(root, "public", SCENES[id].src)).size;
      total += size;
      expect(size, id).toBeLessThanOrEqual(260 * 1024);
    }
    expect(total).toBeLessThanOrEqual(2 * 1024 * 1024);
  });

  it("is cached forever, like the rest of the versioned art", () => {
    expect(read("public/_headers")).toMatch(/\/scenes\/\*\n\s+Cache-Control: public, max-age=31536000, immutable/);
  });
});

describe("scenes: every signed-in area has its own", () => {
  it("maps each area to its scene, with sub-pages following their area", () => {
    const cases: [string, SceneId][] = [
      ["/today", "scene-home"],
      ["/study", "scene-study"],
      ["/study/unit/3", "scene-study"],
      ["/practice", "scene-study"],
      ["/island", "scene-island"],
      ["/act", "scene-act"],
      ["/act/hours", "scene-act"],
      ["/ambassador", "scene-summit"],
      ["/class", "scene-class"],
      ["/class/abc123", "scene-class"],
      ["/settings", "scene-cove"],
      ["/admin", "scene-cove"],
    ];
    for (const [path, id] of cases) expect(sceneFor(path).id, path).toBe(id);
    for (const [, id] of cases) expect(SCENES[id], id).toBeDefined();
  });

  it("keeps reading pages quiet and the rest clear", () => {
    for (const path of ["/practice", "/study/unit/1/1.4 Soil", "/study/frq/U1_F1", "/study/flashcards", "/study/guide", "/act/hours", "/act/e/abc", "/act/class/c1/abc", "/admin"]) expect(sceneFor(path).quiet, path).toBe(true);
    for (const path of ["/today", "/study", "/study/unit/1", "/study/frq", "/island", "/act", "/ambassador", "/class", "/class/abc", "/settings"]) expect(sceneFor(path).quiet, path).toBe(false);
  });
});

describe("scenes: text over a scene stays readable", () => {
  it("tints the title's side at least as opaque as the glass floor, and holds the tint past the title", () => {
    expect(SCRIM_FLOOR).toBe(0.84);
    expect(TITLE_HAZE.kind).toBe("start");
    expect(TITLE_HAZE.alpha).toBeGreaterThanOrEqual(SCRIM_FLOOR);
    // A page title is at most HERO_TEXT_SPAN of the content column, which starts 2rem in: the hold must reach past it.
    expect(HERO_TEXT_SPAN).toBe(0.5);
    expect(TITLE_HAZE.hold).toBeGreaterThan(HERO_TEXT_SPAN);
    expect(TITLE_HAZE.hold + TITLE_HAZE.fade).toBeLessThan(1); // and the picture's subject shows on the right
    expect(css).toMatch(/\.page-hero \{\s*@apply relative mb-6 flex flex-col;/); // no reserved height: the title starts right under the top bar
  });

  it("passes AA for a title's ink on the haze even over a black picture, and for all body ink on a reading page's tint over the darkest foliage", () => {
    // A page title uses fg, fg-2 and the brand ink (never the lighter fg-3: see the page tests).
    const haze = over(token("bg"), "#000000", TITLE_HAZE.alpha);
    for (const ink of ["fg", "fg-2", "brand-ink"]) expect(ratio(token(ink), haze), `${ink} on the haze`).toBeGreaterThanOrEqual(4.5);
    // A reading page has fg-3 text straight on the tint; the darkest thing behind it is foliage (the same green the glass floor is tested over).
    expect(QUIET_TINT).toBeGreaterThanOrEqual(SCRIM_FLOOR);
    const quiet = over(token("bg"), "#2f6a3b", QUIET_TINT);
    for (const ink of ["fg", "fg-2", "fg-3", "brand-ink"]) expect(ratio(token(ink), quiet), `${ink} on a reading page`).toBeGreaterThanOrEqual(4.5);
  });

  it("holds the haze for the height of a page title, through a mask of tokens only", () => {
    expect(HAZE_MASK).toBe("linear-gradient(180deg, var(--fg) 0, var(--fg) 26rem, transparent 34rem)");
    expect(HAZE_MASK).not.toMatch(/#[0-9a-fA-F]{3,8}\b|rgba?\(/);
  });

  it("gives every page that has a title on the scene a page-hero whose text is held to half the width", () => {
    const pages = readdirSync(join(root, "src/pages")).filter((f) => f.endsWith(".tsx"));
    const withHero = pages.filter((f) => read(`src/pages/${f}`).includes('className="page-hero'));
    expect(withHero.sort()).toEqual(["Act.tsx", "Ambassador.tsx", "ClassDetail.tsx", "Classes.tsx", "FrqList.tsx", "IslandPage.tsx", "Settings.tsx", "Study.tsx", "Today.tsx", "UnitPage.tsx"]);
    for (const f of withHero) {
      const src = read(`src/pages/${f}`);
      for (const m of src.matchAll(/<header className="page-hero[^"]*">([\s\S]*?)<\/header>/g)) expect(m[1], f).toMatch(/max-w-1\/2/);
    }
  });

  it("builds a plate, the label for text that would otherwise sit on a scene, from the glass fill", () => {
    const body = /\n {2}\.plate \{([\s\S]*?)\n {2}\}/.exec(css)?.[1] ?? "";
    expect(body).toMatch(/background: var\(--glass-fill\);/);
    expect(body).toMatch(/backdrop-filter: saturate\(160%\) blur\(var\(--glass-blur\)\);/);
  });
});

describe("scenes: the backdrop", () => {
  it("renders one decorative picture from the manifest that never takes a click", () => {
    for (const id of ids) {
      const html = renderToStaticMarkup(h(SceneBackdrop, { scene: id }));
      expect(html, id).toContain('aria-hidden="true"');
      expect(html, id).toContain(`data-scene="${id}"`);
      expect(html, id).toMatch(/pointer-events-none/);
      expect(html.match(/<img\b/g), id).toHaveLength(1);
      expect(html, id).toMatch(/<img[^>]*alt=""/);
      expect(html, id).toContain(`src="${SCENES[id].src}"`);
      expect(html, id).not.toMatch(/<(a|button)\b/);
    }
  });

  it("fetches a first-screen scene at high priority and a below-the-fold one lazily", () => {
    const first = renderToStaticMarkup(h(SceneBackdrop, { scene: "scene-home" }));
    expect(first).toMatch(/<img[^>]*loading="eager"/);
    expect(first).toMatch(/<img[^>]*fetchPriority="high"|<img[^>]*fetchpriority="high"/);
    const below = renderToStaticMarkup(h(SceneBackdrop, { scene: "scene-sunset", lazy: true }));
    expect(below).toMatch(/<img[^>]*loading="lazy"/);
    expect(read("src/pages/Landing.tsx")).toContain('<SceneBackdrop scene="scene-sunset" haze={false} lazy />');
  });

  it("draws the title haze by default, one even tint on a reading page, and neither when a page brings its own scrim", () => {
    const plain = renderToStaticMarkup(h(SceneBackdrop, { scene: "scene-home" }));
    expect(plain).toContain(`data-scene-haze="${TITLE_HAZE.alpha}"`);
    expect(plain).not.toContain("data-scene-tint");
    const quiet = renderToStaticMarkup(h(SceneBackdrop, { scene: "scene-study", quiet: true }));
    expect(quiet).toContain(`data-scene-tint="${QUIET_TINT}"`);
    expect(quiet).not.toContain("data-scene-haze");
    const bare = renderToStaticMarkup(h(SceneBackdrop, { scene: "scene-welcome", haze: false }));
    expect(bare).not.toMatch(/data-scene-(haze|tint)/);
  });

  it("is pinned in the shell: a zero-height sticky anchor in the content column, one window tall, behind the page, never printed", () => {
    const html = renderToStaticMarkup(h(SceneBackdrop, { scene: "scene-home", pinned: true }));
    expect(html).toContain('<div aria-hidden="true" data-scene="scene-home" class="pointer-events-none sticky top-0 -z-10 h-0 print:hidden">');
    expect(html).toContain('<div class="absolute inset-x-0 top-0 h-dvh overflow-hidden">');
    expect(shell).toContain("<SceneBackdrop pinned scene={scene.id} quiet={scene.quiet} />");
    expect(shell).toContain("const scene = sceneFor(useLocation().pathname);");
    // After the sidebar, inside the content column and before the top bar: it never reaches under the sidebar.
    const column = shell.indexOf('<div className="flex min-w-0 flex-1 flex-col">');
    expect(shell.indexOf("<SceneBackdrop")).toBeGreaterThan(column);
    expect(shell.indexOf("<SceneBackdrop")).toBeLessThan(shell.indexOf("<header"));
    // The shell isolates, so the scene's negative z-index sits over the shell's fill and under the page.
    expect(css).toMatch(/\.bg-scene \{[^}]*isolation: isolate;/);
  });

  it("makes the top bar a strip of glass pills over the scene, not a band across it", () => {
    expect(shell).toContain('<header className="hud sticky top-0 z-40 print:hidden">');
    expect(shell).not.toMatch(/<header className="glass/);
    for (const pill of ['className="plate h-10 w-60', "data-hud-stats className=\"plate", 'className="plate size-10 justify-center p-0"']) expect(shell, pill).toContain(pill);
    expect(css).toMatch(/\.hud::before \{[^}]*backdrop-filter: blur\(12px\);/);
  });
});
