import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { createElement as h } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Plate } from "../../src/components/landing/Plate";
import { PLATES, SCRIM_FLOOR, edgeGradient, scrimGradient, type PlateId } from "../../src/components/landing/plates";

// The landing page's section plates (src/components/landing/plates.ts): painted backdrops behind
// whole sections. These check that each one is registered and real, that it never carries text, that
// wherever text sits over it there is a scrim (or a glass card) at least as opaque as the page's glass
// floor, and that plates sit on sections and never inside a card. The contrast against the real pixels
// is measured in a browser; see design/reviews/stage4b-plates/.

const root = join(__dirname, "../..");
const landing = readFileSync(join(root, "src/pages/Landing.tsx"), "utf8");
const css = readFileSync(join(root, "src/index.css"), "utf8");
const landingDir = join(root, "public/landing");
const ids = Object.keys(PLATES) as PlateId[];

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
const alphaOf = (name: string) => Number(new RegExp(`--${name}:\\s*rgb\\([^/]+/\\s*([0-9.]+)\\s*\\)`).exec(css)?.[1]);

/** The text of one top-level function in the page. */
function fn(name: string, next: string): string {
  const a = landing.indexOf(`function ${name}(`);
  const b = landing.indexOf(next, a);
  expect(a, `function ${name}`).toBeGreaterThan(-1);
  expect(b, next).toBeGreaterThan(a);
  return landing.slice(a, b);
}

describe("plates: registered, real and opaque", () => {
  it("registers the four plates, each named for its section", () => {
    expect([...ids].sort()).toEqual(["bg-act", "bg-footer", "bg-stats", "bg-teachers"]);
  });

  it("labels every plate generated, with a versioned file on disk and no file the manifest doesn't know", () => {
    const srcs = ids.map((id) => PLATES[id].src);
    expect(new Set(srcs).size).toBe(srcs.length);
    for (const id of ids) {
      expect(PLATES[id].source, id).toBe("generated");
      expect(PLATES[id].src, id).toBe(`/landing/${id}-v1.webp`);
      expect(existsSync(join(root, "public", PLATES[id].src)), PLATES[id].src).toBe(true);
    }
    const onDisk = readdirSync(landingDir).filter((n) => !n.startsWith("."));
    expect(onDisk.sort()).toEqual(srcs.map((s) => s.replace("/landing/", "")).sort());
  });

  it("ships opaque WebP at the size the manifest says", () => {
    for (const id of ids) {
      const info = webpInfo(join(root, "public", PLATES[id].src));
      expect({ w: info.w, h: info.h }, id).toEqual({ w: PLATES[id].w, h: PLATES[id].h });
      expect(info.alpha, `${id} is a full backdrop, so it is opaque`).toBe(false);
    }
  });

  it("stays within the download budget", () => {
    let total = 0;
    for (const id of ids) {
      const bytes = statSync(join(root, "public", PLATES[id].src)).size;
      expect(bytes, id).toBeLessThan(200 * 1024);
      total += bytes;
    }
    expect(total, "all four plates").toBeLessThan(600 * 1024);
  });

  it("is cached forever like the rest of the art, so a changed picture needs a new filename", () => {
    expect(readFileSync(join(root, "public/_headers"), "utf8")).toMatch(/\/landing\/\*\s+Cache-Control: public, max-age=31536000, immutable/);
  });

  it("is used: every plate is placed exactly once, and every plate the page places is registered", () => {
    const used = [...landing.matchAll(/<Plate id="([\w-]+)" \/>/g)].map((m) => m[1]);
    expect([...used].sort()).toEqual([...ids].sort());
  });
});

describe("plates: a scrim wherever text sits over one", () => {
  it("tints at least as opaque as the glass floor", () => {
    expect(SCRIM_FLOOR).toBeCloseTo(0.84, 5);
    for (const id of ids) {
      const { scrim } = PLATES[id];
      if (scrim.kind === "card") continue; // the text is on a glass card, checked below
      expect(scrim.alpha, `${id} scrim`).toBeGreaterThanOrEqual(SCRIM_FLOOR);
    }
  });

  it("matches the floor the page's own glass uses", () => {
    expect(alphaOf("glass-fill")).toBeGreaterThanOrEqual(SCRIM_FLOOR);
    expect(alphaOf("glass-fill-strong")).toBeGreaterThanOrEqual(SCRIM_FLOOR);
  });

  it("holds its tint past where the section's text column ends, at every desktop width", () => {
    // The column's right edge, as a fraction of the section, for the 1024px floor up to a very wide screen.
    const grid = (name: string, next: string) => {
      const body = fn(name, next);
      const fr = /grid-cols-\[minmax\(0,([\d.]+)fr\)_minmax\(0,([\d.]+)fr\)\]/.exec(body)!;
      const gap = Number(/\bgap-(\d+)\b/.exec(body)![1]) * 4;
      return { first: Number(fr[1]), second: Number(fr[2]), gap };
    };
    const layouts = { "bg-teachers": grid("Teachers", "function Landmarks("), "bg-act": grid("ActSection", "// Two decorative strips") };
    for (const [id, g] of Object.entries(layouts)) {
      const scrim = PLATES[id as PlateId].scrim;
      expect(scrim.kind, id).toBe("start");
      if (scrim.kind !== "start") continue;
      for (let vw = 1024; vw <= 3840; vw += 64) {
        const column = Math.min(vw, 1200) - 64; // max-w-page, less px-8 on each side
        const first = ((column - g.gap) * g.first) / (g.first + g.second);
        const edge = ((vw - Math.min(vw, 1200)) / 2 + 32 + first) / vw;
        expect(edge, `${id} at ${vw}px: text column ends at ${(edge * 100).toFixed(1)}%`).toBeLessThan(scrim.hold);
      }
    }
  });

  it("leaves text readable even if the picture behind the tint were black", () => {
    // The tint is the page color at `alpha`. Over a black plate that is the worst case any picture can be.
    for (const id of ids) {
      const { scrim } = PLATES[id];
      if (scrim.kind === "card") continue;
      const behind = over(token("bg"), "#000000", scrim.alpha);
      for (const text of ["fg", "fg-2", "fg-3", "brand-ink"]) expect(ratio(token(text), behind), `${text} on ${id}'s scrim over black`).toBeGreaterThanOrEqual(4.5);
    }
  });

  it("leaves card text readable over a black plate too: the strong glass is the scrim", () => {
    // Every color text takes on these cards, over the worst picture there could be. The standard card
    // (0.88) is not enough for coral: it is 4.04:1 over black, and 4.35:1 was measured on the teachers plate.
    const strong = over(token("surface"), "#000000", alphaOf("glass-fill-strong"));
    for (const text of ["fg", "fg-2", "fg-3", "coral"]) expect(ratio(token(text), strong), `${text} on the strong glass over black`).toBeGreaterThanOrEqual(4.5);
    expect(ratio(token("coral"), over(token("surface"), "#000000", alphaOf("glass-fill"))), "why the standard card isn't used over plates").toBeLessThan(4.5);
  });

  it("makes every card over a plate a strong-glass card, never the standard one", () => {
    expect(landing).toContain('const ON_PLATE = "glass rounded-lg border shadow-sm";');
    for (const [name, next] of [["Course", "function Teachers("], ["Teachers", "function Landmarks("], ["ActSection", "// Two decorative strips"]] as const) {
      const body = fn(name, next);
      expect(body, `${name} has cards over its plate`).toContain("ON_PLATE");
      expect(body, `${name} uses no standard card over its plate`).not.toMatch(/className=(\{cn\()?"card\b/);
    }
  });

  it("puts the stats numbers and the footer text on glass cards", () => {
    const course = fn("Course", "function Teachers(");
    expect(course.indexOf("ON_PLATE"), "the band is a strong-glass card").toBeGreaterThan(course.indexOf('<Plate id="bg-stats" />'));
    expect(PLATES["bg-stats"].scrim.kind).toBe("card");
    const footer = landing.slice(landing.indexOf('<Plate id="bg-footer" />'));
    expect(footer.indexOf('className="glass'), "the footer's text is on a glass bar").toBeGreaterThan(-1);
    expect(footer.indexOf('className="glass')).toBeLessThan(footer.indexOf("Made by a high school student"));
    expect(PLATES["bg-footer"].scrim.kind).toBe("card");
  });

  it("builds its tint and its edge fades from the page-color token only", () => {
    for (const id of ids) {
      const parts = [scrimGradient(PLATES[id].scrim), edgeGradient(PLATES[id].edge)].filter(Boolean) as string[];
      for (const g of parts) {
        expect(g, id).toContain("var(--bg)");
        expect(g, id).not.toMatch(/#[0-9a-fA-F]{3,8}\b|rgba?\(/);
      }
    }
    expect(scrimGradient({ kind: "start", alpha: 0.92, hold: 0.52, fade: 0.3 })).toBe("linear-gradient(90deg, color-mix(in srgb, var(--bg) 92%, transparent) 0%, color-mix(in srgb, var(--bg) 92%, transparent) 52%, transparent 82%)");
    expect(scrimGradient({ kind: "card", alpha: 0 })).toBeNull();
    expect(edgeGradient({ top: 0, bottom: 0 })).toBeNull();
  });
});

describe("plates: sit on sections, behind everything, never in a card", () => {
  it("renders one decorative picture and its scrim, behind the content and out of the way", () => {
    const html = renderToStaticMarkup(h(Plate, { id: "bg-teachers" }));
    expect(html).toContain('aria-hidden="true"');
    expect(html).toContain('data-plate="bg-teachers"');
    expect(html).toMatch(/pointer-events-none/);
    expect(html).toMatch(/-z-10/);
    expect(html.match(/<img\b/g)).toHaveLength(1);
    expect(html).toMatch(/<img[^>]*alt=""/);
    expect(html).toMatch(/<img[^>]*src="\/landing\/bg-teachers-v1\.webp"/);
    expect(html).toContain('data-scrim="start"');
    expect(html).toContain('data-scrim-alpha="0.92"');
    expect(html).toContain('data-scrim-hold="0.52"');
  });

  it("has no scrim layer to draw when a plate has no tint, and no edge fade when it has none", () => {
    const footer = renderToStaticMarkup(h(Plate, { id: "bg-footer" }));
    expect(footer).not.toContain("data-scrim");
    expect(footer).not.toContain("data-edge");
    expect(renderToStaticMarkup(h(Plate, { id: "bg-act" }))).toContain("data-edge");
  });

  it("is static: nothing in it moves, so there is nothing for reduced motion to change", () => {
    const code = readFileSync(join(root, "src/components/landing/Plate.tsx"), "utf8").replace(/^\s*\/\/.*$/gm, ""); // the code, not its comments
    expect(code).not.toMatch(/animate|transition|motion|keyframes|setInterval/);
  });

  it("is the first child of a relative, isolated, clipped section or footer", () => {
    const placements = [...landing.matchAll(/([\s\S]{0,260})<Plate id="([\w-]+)" \/>/g)];
    expect(placements).toHaveLength(4);
    for (const [, before, id] of placements) {
      expect(before, id).toMatch(/(<Reveal as="section"[^>]*className="[^"]*\brelative isolate\b[^"]*\boverflow-hidden\b[^"]*">|<footer className="relative isolate overflow-hidden">)\s*$/);
    }
  });

  it("is never inside a card or a glass panel, so the one-picture-per-card rule is untouched", () => {
    for (const [, before, id] of landing.matchAll(/([\s\S]{0,260})<Plate id="([\w-]+)" \/>/g)) {
      const tag = before.slice(before.lastIndexOf("<"));
      expect(tag, id).not.toMatch(/\bcard\b|\bglass\b|SpotlightCard/);
    }
    for (const name of ["HowItWorks", "QuestionMock", "Hero", "Landmarks", "UnitStrip", "ArtStrip", "FinalCta"]) {
      const next = { HowItWorks: "function Course(", QuestionMock: "function HowItWorks(", Hero: "function QuestionMock(", Landmarks: "function ActSection(", UnitStrip: "// Growth and landmark art", ArtStrip: "function FinalCta(", FinalCta: "export default function Landing(" }[name]!;
      expect(fn(name, next), `${name} has no plate`).not.toContain("<Plate");
    }
  });

  it("keeps each section's own content: the same copy, routes and ids as before the plates", () => {
    for (const text of ["Assign the work. See who's done it.", "Then take it outside.", "Set up your class", "Made by a high school student, for students.", "units, matched to the AP course"]) expect(landing).toContain(text);
    for (const id of ["teachers", "act", "how", "landmarks"]) expect(landing).toContain(`id="${id}"`);
    expect([...new Set([...landing.matchAll(/\bto="([^"]+)"/g)].map((m) => m[1]))].sort()).toEqual(["/", "/privacy-policy", "/start", "/today", "/tos"]);
  });
});
