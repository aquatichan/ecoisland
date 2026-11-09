import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { ART } from "../../src/components/island/assets";
import { GROWTH } from "../../src/shared/catalog";
import { LANDMARK_LAYOUT } from "../../src/shared/landmarks";

// The public landing page: restyled to the family-A mockup, with its copy, routes and effects kept.
// These read the source, so they hold the line on what the restyle must not change and on the
// design rules it must follow. The measured checks (contrast against the real pixels, scrims,
// images per card, focus rings) run in a browser; see design/reviews/stage4b/.

const root = join(__dirname, "../..");
const src = readFileSync(join(root, "src/pages/Landing.tsx"), "utf8");
const css = readFileSync(join(root, "src/index.css"), "utf8");

/** The text of one top-level function in the page. */
function fn(name: string, next: string): string {
  const a = src.indexOf(`function ${name}(`);
  const b = src.indexOf(next, a);
  expect(a, `function ${name}`).toBeGreaterThan(-1);
  expect(b, `function ${next}`).toBeGreaterThan(a);
  return src.slice(a, b);
}

const lin = (c: number) => ((c /= 255) <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const rgb = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
const luminance = (hex: string) => {
  const [r, g, b] = rgb(hex);
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
};
const contrast = (a: string, b: string) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};
const over = (fg: string, bg: string, alpha: number) => {
  const f = rgb(fg);
  const b = rgb(bg);
  return `#${f.map((v, i) => Math.round(v * alpha + b[i] * (1 - alpha)).toString(16).padStart(2, "0")).join("")}`;
};
const token = (name: string) => new RegExp(`--${name}:\\s*(#[0-9a-fA-F]{6})`).exec(css)?.[1] ?? "";

describe("landing: what the restyle must not change", () => {
  it("keeps the hero headline, the CTA labels and every route", () => {
    expect(src).toContain('text="Study APES five minutes a day."');
    expect(src).toContain('text="Watch your island grow."');
    for (const label of ["Start studying free", "I'm a teacher", "Get started", "Sign in", "Open Ecoisland", "Set up your class", "Your island is waiting."]) {
      expect(src, label).toContain(label);
    }
    const routes = new Set([...src.matchAll(/\bto="([^"]+)"/g)].map((m) => m[1]));
    expect([...routes].sort()).toEqual(["/", "/privacy-policy", "/start", "/today", "/tos"]);
  });

  it("keeps the current nav items; the mockup's Dashboard, Learn, Community and More have no route", () => {
    for (const [href, label] of [["#how", "How it works"], ["#teachers", "For teachers"], ["#landmarks", "Landmarks"]]) {
      expect(src).toContain(`["${href}", "${label}"]`);
      expect(src).toContain(`id="${href.slice(1)}"`);
    }
    expect(src).not.toMatch(/"(Dashboard|Learn|Community|More)"/);
  });

  it("keeps BlurText, Magnet and the counter as direct React Bits imports, and the backdrop through its wrapper", () => {
    for (const name of ["BlurText", "CountUp", "Magnet"]) {
      expect(src).toContain(`import ${name} from "@/components/bits/${name}";`);
      expect(src, name).toContain(`<${name}`);
    }
    expect(src).toContain('import { TopographyBackdrop } from "@/components/fx/TopographyBackdrop";');
    expect(src).toContain("<TopographyBackdrop");
    expect(src).not.toMatch(/bits\/Topography/);
  });
});

describe("landing: tokens only", () => {
  it("has no hex color, no arbitrary pixel size and no raw white or black", () => {
    expect(src).not.toMatch(/(?<![\w&])#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3,4})(?![\w-])/);
    expect(src).not.toMatch(/-\[-?[0-9.]+px\]/);
    expect(src).not.toMatch(/\b(?:min|max|clamp)\([^)]*[0-9.]px/);
    expect(src).not.toMatch(/(?<![\w-])(?:bg|text|border|ring|fill|stroke)-(?:white|black)(?![\w-])/);
  });

  it("takes its page width from a theme token", () => {
    expect(css).toMatch(/--container-page: 1200px;/);
    expect(src).toContain("max-w-page");
    expect(src).not.toContain("max-w-[1200px]");
  });
});

describe("landing: island art", () => {
  it("draws no SVG island: the page goes through IslandScene and the art manifest", () => {
    expect(src).toContain('import { IslandScene } from "@/components/island/IslandScene";');
    expect(src).not.toMatch(/components\/island\/(Flora|Decor|Landmarks|palette)/);
  });

  it("only ever shows generated art: the base, every growth item, every landmark and each sky it uses", () => {
    expect(ART["island-base"]?.source).toBe("generated");
    for (const g of GROWTH) expect(ART[g.art]?.source, g.art).toBe("generated");
    for (const unit of Object.keys(LANDMARK_LAYOUT)) expect(ART[`landmark-${unit}`]?.source, `landmark ${unit}`).toBe("generated");
    const skies = new Set([...src.matchAll(/\bsky[=:]\s*\{?"(\w+)"/g)].map((m) => m[1]));
    expect([...skies].sort()).toEqual(["dawn", "day", "night", "sunset"]);
    for (const sky of skies) expect(ART[`sky-${sky}`]?.source, `sky ${sky}`).toBe("generated");
  });

  it("puts at most one picture in each How-it-works card", () => {
    const cards = fn("HowItWorks", "function Course(").split('className="card').slice(1);
    expect(cards).toHaveLength(3);
    for (const card of cards) expect(card.match(/<IslandScene|<img\b/g)?.length ?? 0).toBeLessThanOrEqual(1);
  });
});

describe("landing: the closing call to action", () => {
  const cta = () => fn("FinalCta", "export default function Landing(");

  it("is a glass panel over the generated day sky, with the text inside the panel and the picture behind it", () => {
    const body = cta();
    expect(ART["sky-day"]?.source).toBe("generated");
    expect(body).toContain('ART["sky-day"]');
    const img = body.indexOf("<img");
    const panel = body.indexOf('className="glass');
    expect(img).toBeGreaterThan(-1);
    expect(panel).toBeGreaterThan(img); // the panel is drawn after the art, on top of it
    for (const text of ["<h2", "<p ", "<Button"]) expect(body.indexOf(text), text).toBeGreaterThan(panel); // all text lives in the panel
    expect(body.match(/<img\b/g)).toHaveLength(1); // one picture
    expect(body).toMatch(/<img[^>]*alt=""/); // decorative
  });

  it("stays readable: the glass fill is opaque enough that the text passes AA over any art", () => {
    const alpha = Number(/--glass-fill-strong:\s*rgb\([^/]+\/\s*([0-9.]+)\s*\)/.exec(css)?.[1]);
    expect(alpha).toBeGreaterThanOrEqual(0.84);
    // Even over black, the panel is light enough for every text color it uses.
    const panel = over(token("surface"), "#000000", alpha);
    for (const text of ["fg", "fg-2", "brand-ink"]) expect(contrast(token(text), panel), `${text} on the panel over black`).toBeGreaterThanOrEqual(4.5);
  });
});

describe("landing: the hero reads on the sky", () => {
  it("passes AA for the hero's text colors on the sky token the hero fades from", () => {
    const sky = token("sky");
    for (const text of ["fg", "fg-2", "brand-ink"]) expect(contrast(token(text), sky), `${text} on the sky`).toBeGreaterThanOrEqual(4.5);
    // The small hero text is fg-2, not the lighter fg-3 (which only just clears AA on this sky).
    const hero = fn("Hero", "function QuestionMock(");
    expect(hero).toContain('t-eyebrow text-fg-2');
    expect(hero).toMatch(/text-xl leading-relaxed text-fg-2/);
  });
});
