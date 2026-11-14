import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { createElement as h } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Tray } from "../../src/components/ui/tray";

// Trays: the translucent pane under each feature group on a page (src/index.css, .tray; src/components/ui/tray.tsx).
// These hold the material to its rules (lighter than a card, concentric corners, the one blur for what it holds),
// put every page that sits on a scene into trays, and keep the layout rhythm the same on every page: the title
// right under the top bar, 24px between blocks, 12px inside a tray. What only a browser can see (the gaps as laid
// out, overflow at 1024px, text straight on a picture) is measured by the scripts in design/scene-art/README.md.

const root = join(__dirname, "../..");
const read = (rel: string) => readFileSync(join(root, rel), "utf8");
const css = read("src/index.css");

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
/** The declarations of one top-level rule in the components layer. */
const rule = (selector: string) => new RegExp(`\\n  ${selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")} \\{([\\s\\S]*?)\\n  \\}`).exec(css)?.[1] ?? "";

function sourceFiles(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (path.includes("/components/bits")) continue;
    if (statSync(path).isDirectory()) sourceFiles(path, out);
    else if (/\.tsx?$/.test(name)) out.push(path);
  }
  return out;
}

describe("trays: the material", () => {
  const fill = Number(/--tray-fill:\s*rgb\(\s*252 249 243\s*\/\s*([0-9.]+)\s*\)/.exec(css)?.[1]);

  it("is lighter than a card, so the scene reads through it", () => {
    const card = Number(/--glass-fill:\s*rgb\([^/]+\/\s*([0-9.]+)\s*\)/.exec(css)?.[1]);
    expect(fill).toBe(0.55);
    expect(fill).toBeLessThan(card);
    expect(rule(".tray")).toMatch(/background: var\(--tray-fill\);/);
  });

  it("is the thicker material: a stronger blur and a deeper shadow than a card", () => {
    expect(rule(".tray")).toMatch(/backdrop-filter: saturate\(150%\) blur\(24px\);/);
    expect(rule(".tray")).toMatch(/box-shadow: var\(--glass-shine\), var\(--shadow-md\);/);
    expect(css).toMatch(/--glass-blur: 18px;/);
  });

  it("has corners concentric with the cards inside it: a card's 20px plus its own 12px padding", () => {
    expect(rule(".tray")).toMatch(/@apply rounded-3xl border p-3;/);
    expect(css).toMatch(/--radius-3xl: 32px;/);
    expect(css).toMatch(/--radius-lg: 20px;/);
    expect(rule(".card")).toMatch(/@apply rounded-lg border;/);
  });

  it("does the blurring for what it holds: a card, plate or chip inside paints no backdrop filter of its own", () => {
    expect(css).toMatch(/\.tray \.card,\s*\.tray \.plate,\s*\.tray \.glass \{\s*-webkit-backdrop-filter: none;\s*backdrop-filter: none;\s*\}/);
  });

  it("keeps a tray's own heading readable: --fg on the tray passes AA even over a black picture", () => {
    expect(ratio(token("fg"), over(token("surface"), "#000000", fill))).toBeGreaterThanOrEqual(4.5);
    const html = renderToStaticMarkup(h(Tray, { title: "Units" }, "x"));
    expect(html).toContain('<h2 class="t-h3 text-fg">Units</h2>');
    expect(html).toMatch(/^<section class="tray">/);
  });

  it("turns solid for people who ask for less transparency or more contrast", () => {
    const less = /@media \(prefers-reduced-transparency: reduce\) \{([\s\S]*?)\n\}/.exec(css)?.[1] ?? "";
    for (const sel of [".card", ".glass", ".plate", ".tray", ".hud::before"]) expect(less, sel).toContain(sel);
    expect(less).toMatch(/backdrop-filter: none;/);
    const more = /@media \(prefers-contrast: more\) \{([\s\S]*?)\n\}/.exec(css)?.[1] ?? "";
    expect(more).toMatch(/border-color: var\(--line-strong\);/);
    expect(more).toMatch(/backdrop-filter: none;/);
  });
});

describe("trays: every page on a scene groups its features in them", () => {
  const pages: [string, number][] = [
    ["src/pages/Today.tsx", 4], // the daily set, the two columns, the teacher's classes
    ["src/pages/Study.tsx", 2], // focus and tools; units
    ["src/pages/UnitPage.tsx", 1],
    ["src/pages/FrqList.tsx", 1], // one per unit, in a map
    ["src/pages/IslandPage.tsx", 2], // the island and its stats; the market
    ["src/pages/Act.tsx", 2], // listings; the side column
    ["src/pages/Ambassador.tsx", 2], // benefits; the application
    ["src/pages/Classes.tsx", 1],
    ["src/pages/ClassDetail.tsx", 1], // the tabs and what they show
    ["src/pages/Settings.tsx", 1],
  ];

  it.each(pages)("%s has its trays", (rel, n) => {
    const src = read(rel);
    const count = (src.match(/<Tray\b/g) ?? []).length + (src.match(/className="tray\b/g) ?? []).length;
    expect(count, rel).toBe(n);
  });

  it("puts the cards inside a tray 12px apart", () => {
    for (const [rel] of pages) {
      const src = read(rel);
      for (const m of src.matchAll(/<(?:Tray|section|div|aside)\b[^>]*className="(?:tray )?[^"]*\b(gap-\d+(?:\.\d+)?|space-y-\d+)\b[^"]*"/g)) {
        if (!/\btray\b|<Tray/.test(m[0])) continue;
        expect(["gap-3", "space-y-3"], `${rel}: ${m[0].slice(0, 90)}`).toContain(m[1]);
      }
    }
  });

  it("keeps the landing hero's island and the landing's card groups on the same material", () => {
    const landing = read("src/pages/Landing.tsx");
    expect((landing.match(/className="tray\b/g) ?? []).length).toBe(5); // hero, how it works, roster, landmarks, listings
    expect(css).not.toMatch(/\.glass-panel/);
  });
});

describe("rhythm: the same spacing on every page", () => {
  it("starts every page 24px under the top bar, with no title block reserving height", () => {
    expect(read("src/components/app/AppShell.tsx")).toContain('<main className="mx-auto w-full max-w-310 px-8 pt-6 pb-24 print:max-w-none print:p-0">');
    expect(rule(".page-hero")).toMatch(/@apply relative mb-6 flex flex-col;/);
    for (const file of sourceFiles(join(root, "src/pages"))) {
      const src = readFileSync(file, "utf8");
      expect(src, file).not.toMatch(/page-hero[^"]*\b(?:min-h-\d+|mb-\d+)\b/); // the hero's own margin, never a page's
      // The lesson reader is a book layout: its title sits above a divider with a reading margin of its own.
      if (!file.endsWith("Lesson.tsx")) expect(src, file).not.toMatch(/<header className="mb-(?:7|8|10)\b/);
    }
  });

  it("gives every back link the same plate and the same 16px below it", () => {
    const backs = sourceFiles(join(root, "src/pages")).flatMap((f) => [...readFileSync(f, "utf8").matchAll(/<Link[^>]*>\s*<ArrowLeft[^>]*\/>/g)].map((m) => `${f}: ${m[0]}`));
    expect(backs.length).toBeGreaterThanOrEqual(8);
    for (const b of backs) expect(b, b).toMatch(/className="plate mb-4 text-base font-medium text-fg-2 hover:text-fg"/);
  });

  it("lets side columns shrink in proportion, so a 1024px window never squeezes the main column", () => {
    for (const rel of ["src/pages/Today.tsx", "src/pages/UnitPage.tsx", "src/pages/Act.tsx"]) expect(read(rel), rel).toContain("grid-cols-[minmax(0,1.9fr)_minmax(16rem,1fr)]");
    expect(read("src/pages/IslandPage.tsx")).toContain("grid-cols-[minmax(0,1.6fr)_minmax(19rem,1fr)]");
    expect(read("src/pages/Ambassador.tsx")).toContain("grid-cols-[minmax(0,1.3fr)_minmax(20rem,1fr)]");
    // Card grids inside a narrow tray drop a column, by the tray's own width.
    expect(read("src/pages/IslandPage.tsx")).toContain('<div className="grid grid-cols-2 gap-3 @md:grid-cols-3">');
    expect(read("src/pages/Ambassador.tsx")).toContain('<div className="grid grid-cols-1 gap-3 @md:grid-cols-2">');
    expect(read("src/pages/Act.tsx")).toContain('<div className="grid grid-cols-1 gap-3 @lg:grid-cols-2">');
  });
});

describe("text contrast: no small text in the faintest ink", () => {
  it("keeps --fg-4 for icons only: every word on cream uses --fg-3 or darker", () => {
    expect(ratio(token("fg-4"), token("surface")), "fg-4 would fail AA as text").toBeLessThan(4.5);
    expect(ratio(token("fg-3"), token("surface"))).toBeGreaterThanOrEqual(4.5);
    for (const file of sourceFiles(join(root, "src"))) {
      readFileSync(file, "utf8")
        .split("\n")
        .forEach((line, i) => {
          if (!/(?<![\w:-])text-fg-4\b|placeholder:text-fg-4/.test(line)) return;
          const icon = /<(Flame|ArrowRight|X|ChevronRight)\b/.test(line) || line.includes('aria-label="Dismiss"');
          expect(icon, `${file}:${i + 1} uses text-fg-4 for text`).toBe(true);
        });
    }
  });
});
