import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createElement as h } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Marquee } from "../../src/components/fx/Marquee";
import { Reveal } from "../../src/components/fx/Reveal";
import { SpotlightCard } from "../../src/components/fx/SpotlightCard";
import { FINE_POINTER, REDUCED_MOTION, useCycle, usePrefersReducedMotion } from "../../src/components/fx/motion";

// The landing page's motion: marquee strips, scroll reveal, the island float, the auto-advancing
// stage dots, the self-answering sample question, the ticking roster and the cursor-tracking
// card edge. Every one has a reduced-motion path; these tests hold each of them to it.
//
// Two kinds of check. The CSS ones read src/index.css, where the animations live. The rest render
// the real components and hooks with react-dom/server under a stubbed matchMedia (this browser-only
// app has no server rendering; it is simply the way to run them in node), so what they see is the
// first render for a visitor who has asked for reduced motion, or who has not.

const root = join(__dirname, "../..");
const read = (rel: string) => readFileSync(join(root, rel), "utf8");
const css = read("src/index.css");
const landing = read("src/pages/Landing.tsx");

/** Render with `matching` as the media queries that match, and with an IntersectionObserver present. */
function render(matching: string[], build: () => ReturnType<typeof h>): string {
  const g = globalThis as Record<string, unknown>;
  const before = { window: g.window, io: g.IntersectionObserver };
  g.window = { matchMedia: (query: string) => ({ matches: matching.includes(query), addEventListener() {}, removeEventListener() {} }) };
  g.IntersectionObserver = class {};
  try {
    return renderToStaticMarkup(build());
  } finally {
    for (const [key, value] of [["window", before.window], ["IntersectionObserver", before.io]] as const) {
      if (value === undefined) delete g[key];
      else g[key] = value;
    }
  }
}

const REDUCED = [REDUCED_MOTION];
const NORMAL: string[] = [FINE_POINTER]; // a mouse, no preference
const TOUCH: string[] = []; // nothing hovers

/** The declarations of the first rule for `selector` in `source`. */
function declarations(source: string, selector: string): string {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const body = new RegExp(`${escaped}\\s*\\{([^}]*)\\}`).exec(source)?.[1];
  expect(body, `a rule for ${selector}`).toBeDefined();
  return body!.replace(/\s+/g, " ").trim();
}

/** The text of one top-level function in the page. */
function fn(name: string, next: string): string {
  const a = landing.indexOf(`function ${name}(`);
  const b = landing.indexOf(next, a);
  expect(a, `function ${name}`).toBeGreaterThan(-1);
  expect(b, next).toBeGreaterThan(a);
  return landing.slice(a, b);
}

const reducedBlock = /@media \(prefers-reduced-motion: reduce\) \{([\s\S]*?)\n\}\n/.exec(css.slice(css.indexOf("Motion (src/components/fx)")))?.[1] ?? "";
const motionSection = css.slice(css.indexOf("Motion (src/components/fx)"), css.indexOf("@media (prefers-reduced-motion: reduce) {", css.indexOf("Motion (src/components/fx)")));

describe("motion CSS: every animation holds still when motion is reduced", () => {
  it("has a reduced-motion block for the new effects", () => {
    expect(reducedBlock.length).toBeGreaterThan(100);
  });

  it("gives every animated class in the motion section its own override", () => {
    const animated = [...motionSection.matchAll(/\n\s{2}(\.[\w-]+(?::hover)?(?: \.[\w-]+)?)\s*\{[^}]*\banimation:/g)].map((m) => m[1]);
    expect(animated, "the float and the marquee track").toEqual([".fx-float", ".fx-marquee-track"]);
    for (const selector of animated) expect(declarations(reducedBlock, selector), selector).toMatch(/animation: none/);
  });

  it("lays the marquee out static: wrapped and centred, no second copy, no clipped ends", () => {
    expect(declarations(reducedBlock, ".fx-marquee")).toMatch(/mask-image: none/);
    expect(declarations(reducedBlock, ".fx-marquee-track")).toMatch(/width: auto/);
    const copy = declarations(reducedBlock, ".fx-marquee-copy");
    expect(copy).toMatch(/flex-wrap: wrap/);
    expect(copy).toMatch(/flex: 0 1 auto/); // the base rule pins the copy to its content width, which would stop it wrapping
    expect(declarations(reducedBlock, ".fx-marquee-copy[data-clone]")).toMatch(/display: none/);
  });

  it("hides the card edge highlight on touch screens and when motion is reduced", () => {
    expect(css).toMatch(/@media \(hover: none\), \(prefers-reduced-motion: reduce\) \{\s*\.spotlight::before \{\s*display: none;/);
  });
});

describe("motion CSS: the marquee", () => {
  it("pauses while hovered", () => {
    expect(declarations(css, ".fx-marquee:hover .fx-marquee-track")).toMatch(/animation-play-state: paused/);
  });

  it("fades both ends out through a mask, and clips to its own band", () => {
    const rule = declarations(css, ".fx-marquee");
    expect(rule).toMatch(/overflow: hidden/);
    expect(rule).toMatch(/(?<!-webkit-)mask-image: linear-gradient\(90deg, transparent 0, .+, transparent 100%\)/);
  });

  it("slides one copy's width, so the loop is seamless", () => {
    expect(css).toMatch(/@keyframes marquee \{[^}]*from \{[^}]*translateX\(0\)[^}]*\}\s*to \{[^}]*translateX\(-50%\)/);
  });
});

describe("usePrefersReducedMotion and useCycle", () => {
  const probe = (cycle: Parameters<typeof useCycle>[0]) =>
    h(() => {
      const reduced = usePrefersReducedMotion();
      const [index] = useCycle(cycle);
      return h("span", null, `${reduced}:${index}`);
    });

  it("reads the visitor's preference", () => {
    expect(render(REDUCED, () => probe({ length: 6, ms: 100 }))).toContain("true:");
    expect(render(NORMAL, () => probe({ length: 6, ms: 100 }))).toContain("false:");
  });

  it("opens on the rest frame when motion is reduced, and on the start frame otherwise", () => {
    const cycle = { length: 6, ms: 100, start: 4, rest: 2 };
    expect(render(REDUCED, () => probe(cycle))).toContain(">true:2<");
    expect(render(NORMAL, () => probe(cycle))).toContain(">false:4<");
  });

  it("rests on the start frame by default", () => {
    expect(render(REDUCED, () => probe({ length: 4, ms: 100, start: 3 }))).toContain(">true:3<");
  });

  it("starts no timer when motion is reduced (and none while paused)", () => {
    const src = read("src/components/fx/motion.ts");
    expect(src).toMatch(/if \(reduced \|\| paused \|\| length < 2\) return;\s*\n\s*const id = window\.setInterval/);
    expect(src, "the setter must still work, so a click on a dot changes the frame").toMatch(/return \[index, setIndex\] as const;/);
  });
});

describe("Reveal: scroll-reveal that reduced motion skips", () => {
  const section = (matching: string[], props: Record<string, unknown> = {}) => render(matching, () => h(Reveal, { as: "section", id: "x", ...props }, "content"));

  it("shows the content at once when motion is reduced", () => {
    const html = section(REDUCED);
    expect(html).toContain('data-reveal="shown"');
    expect(html).toContain("opacity-100");
    expect(html).not.toContain("opacity-0");
  });

  it("starts hidden, lowered a little, otherwise", () => {
    const html = section(NORMAL);
    expect(html).toContain('data-reveal="hidden"');
    expect(html).toMatch(/\bopacity-0\b/);
    expect(html).toContain("translate-y-4");
  });

  it("fades without lifting when asked (full-bleed bands)", () => {
    const html = section(NORMAL, { lift: false });
    expect(html).toMatch(/\bopacity-0\b/);
    expect(html).not.toContain("translate-y-4");
  });

  it("renders the element it is told to, with its props, and never leaves content hidden without an observer", () => {
    expect(section(REDUCED)).toMatch(/^<section [^>]*id="x"[^>]*>content<\/section>$/);
    const g = globalThis as Record<string, unknown>;
    expect(g.IntersectionObserver).toBeUndefined(); // no observer in this environment: the hook must not hide anything
    const html = renderToStaticMarkup(h(Reveal, null, "content"));
    expect(html).toContain('data-reveal="shown"');
  });

  it("is the one reveal hook: sections use Reveal, nothing else observes scroll", () => {
    expect(landing).not.toMatch(/IntersectionObserver/);
    for (const section of ["HowItWorks", "Course", "Teachers", "Landmarks", "ActSection", "FinalCta"]) {
      expect(landing.slice(landing.indexOf(`function ${section}(`)), section).toMatch(/<Reveal as="section"/);
    }
  });
});

describe("Marquee", () => {
  const strip = render(NORMAL, () => h(Marquee, { seconds: 42 }, h("li", { key: "a" }, "chip")));

  it("is decorative, with two identical copies so the loop is seamless", () => {
    expect(strip).toContain('aria-hidden="true"');
    expect(strip).toContain("--marquee-seconds:42s");
    expect(strip.match(/<ul class="fx-marquee-copy"/g)).toHaveLength(2);
    expect(strip.match(/data-clone/g)).toHaveLength(1);
    expect(strip.match(/chip/g)).toHaveLength(2);
  });

  it("never lays anything over, or behind, anything else", () => {
    const src = read("src/components/fx/Marquee.tsx");
    expect(src).not.toMatch(/\babsolute\b|\bfixed\b|-z-|\bz-\d/);
    expect(declarations(css, ".fx-marquee")).not.toMatch(/position: (absolute|fixed)|z-index/);
    expect(declarations(css, ".fx-marquee-track")).not.toMatch(/position: (absolute|fixed)|z-index/);
  });
});

describe("the landing page has no marquee strips", () => {
  it("draws no Marquee and keeps the hero and the sections in order", () => {
    expect(landing).not.toMatch(/Marquee|UnitStrip|ArtStrip/);
    const page = landing.slice(landing.indexOf("export default function Landing()"));
    const order = ["<Hero />", "<HowItWorks />", "<Course />", "<Teachers />", "<Landmarks />", "<ActSection />", "<FinalCta />"].map((tag) => page.indexOf(tag));
    expect(order.every((at) => at > -1)).toBe(true);
    expect([...order].sort((a, b) => a - b)).toEqual(order);
  });
});

describe("SpotlightCard: the cursor-tracking edge", () => {
  const card = (matching: string[]) => render(matching, () => h(SpotlightCard, { className: "p-6" }, "feature"));

  it("is on for a mouse with no motion preference", () => {
    expect(card(NORMAL)).toContain('data-spotlight="on"');
  });

  it("is off when motion is reduced", () => {
    expect(card([FINE_POINTER, REDUCED_MOTION])).toContain('data-spotlight="off"');
  });

  it("is off on touch, where nothing hovers", () => {
    expect(card(TOUCH)).toContain('data-spotlight="off"');
  });

  it("is a glass card, with the highlight class", () => {
    expect(card(NORMAL)).toMatch(/class="card spotlight p-6"/);
  });

  it("is on the three feature cards only", () => {
    expect(landing.match(/<SpotlightCard\b/g)).toHaveLength(3);
    expect(fn("HowItWorks", "function Course(").match(/<SpotlightCard\b/g)).toHaveLength(3);
  });
});

describe("the island float", () => {
  it("moves the island layer only, never the sky, the sea or the island's shadow", () => {
    const scene = read("src/components/island/IslandScene.tsx");
    expect(scene).toMatch(/float\?: boolean;/);
    expect(scene).toMatch(/float = false,/);
    expect(scene.match(/fx-float/g)).toHaveLength(1);
    expect(scene).toMatch(/<div className=\{cn\("absolute inset-0 transition-\[filter\] duration-700", float && "fx-float"\)\} data-island-layer style=\{\{ filter: healthFilter\(health\) \}\}>/);
  });

  it("is switched on by the hero and nowhere else on the page", () => {
    expect(landing.match(/\bfloat\b(?!\w)/g)).toHaveLength(1);
    expect(fn("Hero", "function QuestionMock(")).toMatch(/<IslandScene [^>]*\bfloat\b/);
  });
});

describe("the hero, the sample question and the roster: what reduced motion holds", () => {
  it("holds the hero on 'After six weeks', as it did before it moved", () => {
    const hero = fn("Hero", "function QuestionMock(");
    expect(hero).toMatch(/useCycle\(\{ length: SHOWCASE\.length, ms: 2600, start: 4, rest: 4, paused: hold \}\)/);
    expect(landing).toMatch(/caption: "After six weeks", landmarks: \[1, 2, 3, 4\], sky: "day"/);
    expect(landing.match(/xp: \d+, caption: "After six weeks"/)?.[0]).toBe("xp: 950, caption: \"After six weeks\"");
  });

  it("pauses the hero's stage cycle while the picture is hovered or focused", () => {
    const hero = fn("Hero", "function QuestionMock(");
    for (const handler of ["onPointerEnter", "onPointerLeave", "onFocusCapture", "onBlurCapture"]) expect(hero, handler).toContain(handler);
  });

  it("shows the sample question answered when motion is reduced", () => {
    expect(landing).toMatch(/const QUESTION_STEPS = \["idle", "hover", "press", "answered", "answered"\] as const;/);
    expect(landing).toMatch(/useCycle\(\{ length: QUESTION_STEPS\.length, ms: 1100, start: 0, rest: QUESTION_STEPS\.length - 1, paused: !inView \}\)/);
    expect(landing).toContain('const answered = first && state === "answered";');
  });

  it("holds the roster on its original rows when motion is reduced", () => {
    expect(landing).toMatch(/useCycle\(\{ length: ROSTER_FRAMES\.length, ms: 2600, start: 0, rest: 0, paused: !inView \}\)/);
    expect(landing).toContain("{ total: 22, rows: {}, lit: null },"); // frame 0: no overrides, the 22/26 the page always showed
    for (const row of ['{ name: "Avery Chen", streak: 12, done: 5, active: "Today" }', '{ name: "Jordan Patel", streak: 6, done: 4, active: "Today" }', '{ name: "Sam Okafor", streak: 0, done: 2, active: "4 days ago", idle: true }', '{ name: "Maya Rivera", streak: 9, done: 5, active: "Yesterday" }']) {
      expect(landing).toContain(row);
    }
    expect(Math.round((22 / 26) * 100)).toBe(85); // the bar the page always showed
  });

  it("ticks only plausible states: totals climb by one, and only the rows that finish change", () => {
    const frames = [...landing.matchAll(/\{ total: (\d+), rows: (\{[^\n]*?\}), lit: (\d+|null) \}/g)].map((m) => ({ total: Number(m[1]), lit: m[3] }));
    expect(frames.map((f) => f.total)).toEqual([22, 23, 24, 25]);
    expect(frames.map((f) => f.lit)).toEqual(["null", "1", "2", "null"]);
  });

  it("starts no timers of its own: all timing lives in the fx hooks", () => {
    expect(landing).not.toMatch(/setInterval|setTimeout|matchMedia/);
    expect(landing).not.toMatch(/function useCycle/);
    for (const name of ["useCycle", "useInView"]) expect(landing).toContain(name);
    expect(landing).toContain('from "@/components/fx/motion"');
  });
});

describe("contrast in the animated states", () => {
  // The page-wide pixel scan runs on the resting page. These are the colors only the motion produces:
  // the sample question's hover, press and answered rows, and the roster row that lights up.
  const lin = (c: number) => ((c /= 255) <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  const lum = (hex: string) => {
    const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
    return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
  };
  const ratio = (a: string, b: string) => {
    const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
    return (hi + 0.05) / (lo + 0.05);
  };
  const token = (name: string) => new RegExp(`--${name}:\\s*(#[0-9a-fA-F]{6})`).exec(css)?.[1] ?? "";

  it("keeps every text color readable on the surface the animation puts it on", () => {
    const pairs: Array<[string, string, string]> = [
      ["fg-3", "surface", "an unchosen option"],
      ["fg-2", "surface", "an unchosen option's letter"],
      ["fg-2", "surface-2", "the option under the pointer"],
      ["fg", "brand-soft", "the pressed and answered option"],
      ["brand-fg", "brand", "the check mark on its chip"],
      ["fg", "brand-soft", "the lit roster row: name"],
      ["fg-2", "brand-soft", "the lit roster row: streak and score"],
      ["fg-3", "brand-soft", "the lit roster row: when"],
      ["coral", "brand-soft", "a late student, if one is ever lit"],
    ];
    for (const [fg, bg, what] of pairs) expect(ratio(token(fg), token(bg)), `${fg} on ${bg}: ${what}`).toBeGreaterThanOrEqual(4.5);
  });

  it("only ever lights a roster row with the brand tint the pairs above were checked on", () => {
    expect(landing).toContain('frame.lit === k && "bg-brand-soft"');
    expect(landing).toMatch(/first && state === "hover" && "border-line-strong bg-surface-2 text-fg-2"/);
    expect(landing).toMatch(/first && state === "press" && "scale-99 border-brand bg-brand-soft text-fg"/);
  });
});
