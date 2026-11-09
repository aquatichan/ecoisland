import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createElement as h } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { ArtBackdrop } from "../../src/components/app/ArtBackdrop";
import { ART } from "../../src/components/island/assets";
import { SCRIM_FLOOR } from "../../src/components/landing/plates";
import { UnitCard } from "../../src/components/study/UnitCard";
import { UNITS } from "../../src/shared/curriculum";
import { MASTERY_PCT } from "../../src/shared/economy";
import { LANDMARK_INFO, landmarkArt } from "../../src/shared/landmarks";

// The Study page in the same style system as the rest of the app: the 4a primitives and tokens only, a
// sky behind the title, and a landmark beside each unit's title. These hold the page to what it may and
// may not change (its copy, routes, order and progress logic), to one picture per card, to the art all
// coming from the manifest, and to its text staying readable. Contrast against the real pixels is
// measured in a browser; see design/reviews/stage4c/.

const root = join(__dirname, "../..");
const read = (rel: string) => readFileSync(join(root, rel), "utf8");
const css = read("src/index.css");
const FILES = { "Study.tsx": read("src/pages/Study.tsx"), "UnitCard.tsx": read("src/components/study/UnitCard.tsx"), "ArtBackdrop.tsx": read("src/components/app/ArtBackdrop.tsx") };
const study = FILES["Study.tsx"];
const unitCard = FILES["UnitCard.tsx"];
/** A file's code, without its comments. */
const code = (text: string) => text.replace(/^\s*\/\/.*$/gm, "").replace(/\{\/\*[\s\S]*?\*\/\}/g, "");

const lin = (c: number) => ((c /= 255) <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const lum = (hex: string) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
};
const ratio = (a: string, b: string) => {
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};
const over = (fg: string, bg: string, alpha: number) => {
  const f = [1, 3, 5].map((i) => parseInt(fg.slice(i, i + 2), 16));
  const b = [1, 3, 5].map((i) => parseInt(bg.slice(i, i + 2), 16));
  return `#${f.map((v, i) => Math.round(v * alpha + b[i] * (1 - alpha)).toString(16).padStart(2, "0")).join("")}`;
};
const token = (name: string) => new RegExp(`--${name}:\\s*(#[0-9a-fA-F]{6})`).exec(css)?.[1] ?? "";
const alphaOf = (name: string) => Number(new RegExp(`--${name}:\\s*rgb\\([^/]+/\\s*([0-9.]+)\\s*\\)`).exec(css)?.[1]);

/** One unit card, rendered inside a router (its link needs one). */
const card = (n: number, props: Partial<Parameters<typeof UnitCard>[0]> = {}) => {
  const unit = UNITS.find((u) => u.n === n)!;
  return renderToStaticMarkup(h(MemoryRouter, null, h(UnitCard, { unit, read: 3, total: unit.lessons.length, best: undefined, mastered: false, isFocus: false, ...props })));
};

describe("study: tokens only", () => {
  it("has no hex color, no arbitrary pixel size and no raw white, black or default-palette color", () => {
    for (const [name, text] of Object.entries(FILES)) {
      expect(text, name).not.toMatch(/(?<![\w&])#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3,4})(?![\w-])/);
      expect(text, `${name}: utility-[Npx]`).not.toMatch(/-\[-?[0-9.]+px\]/);
      expect(text, `${name}: text-[…]`).not.toMatch(/(?<![\w-])text-\[/);
      expect(text, `${name}: min()/max()/clamp() with px`).not.toMatch(/\b(?:min|max|clamp)\([^)]*[0-9.]px/);
      expect(text, `${name}: white/black`).not.toMatch(/(?<![\w-])(?:bg|text|border|ring|fill|stroke|from|via|to)-(?:white|black)(?![\w-])/);
      expect(text, `${name}: default palette`).not.toMatch(/(?<![\w-])(?:bg|text|border|ring|fill|stroke)-(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|blue|indigo|violet|purple|fuchsia|pink|rose)-\d{2,3}/);
    }
  });

  it("never uses the faintest text color: fg-4 is below AA on the page, which is why the hint and the exam weights moved to fg-3", () => {
    expect(ratio(token("fg-4"), token("bg")), "fg-4 on the page color").toBeLessThan(4.5);
    for (const [name, text] of Object.entries(FILES)) expect(text, name).not.toMatch(/text-fg-4/);
  });

  it("uses the spacing scale where it had 150px, 520px and 18px", () => {
    expect(study).toContain("w-37.5"); // 150px
    expect(study).toContain("max-w-130"); // 520px
    expect(study).toContain("size-4.5"); // 18px
  });

  it("uses only the type and corner scales", () => {
    const sizes = new Set([...css.matchAll(/--text-([a-z0-9]+):\s*\d/g)].map((m) => m[1]));
    const radii = new Set([...[...css.matchAll(/--radius-([a-z0-9]+):\s*\d/g)].map((m) => m[1]), "full", "none"]);
    for (const [name, text] of Object.entries(FILES)) {
      for (const m of text.matchAll(/(?<![\w-])text-((?:\d*x[sl]|sm|md|lg|base))(?![\w-])/g)) expect(sizes.has(m[1]), `${name}: text-${m[1]}`).toBe(true);
      for (const m of text.matchAll(/(?<![\w-])rounded(?:-[a-z]{1,2})?-([a-z0-9]+)(?![\w-])/g)) expect(radii.has(m[1]), `${name}: rounded-${m[1]}`).toBe(true);
    }
  });
});

describe("study: every picture comes from the art manifest", () => {
  it("names no image file: the page draws only manifest art", () => {
    for (const [name, text] of Object.entries(FILES)) expect(code(text), name).not.toMatch(/\.(webp|png|jpe?g|svg|gif)\b|["'`]\/(?:island|landing|images)\/|["'`]public\//); // an image file or an asset URL in a string (an import path is fine)
  });

  it("registers the sky and all nine landmarks, each with a source", () => {
    for (const id of ["sky-day", ...UNITS.map((u) => landmarkArt(u.n))]) {
      expect(ART[id], id).toBeDefined();
      expect(["generated", "placeholder"], id).toContain(ART[id].source);
      expect(ART[id].source, id).toBe("generated");
    }
    expect(study).toContain('art="sky-day"');
    expect(unitCard).toContain("ART[landmarkArt(unit.n)]");
  });

  it("draws nothing for art the manifest doesn't have, rather than an unregistered picture", () => {
    const html = renderToStaticMarkup(h(ArtBackdrop, { art: "not-in-the-manifest", scrim: { kind: "start", alpha: 0.92, hold: 0.4, fade: 0.2 } }));
    expect(html).toBe("");
  });
});

describe("study: unit cards pair each unit with its own landmark, one picture to a card", () => {
  it("has a landmark for each of the nine units, matched by number", () => {
    expect(UNITS.map((u) => u.n)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    const srcs = UNITS.map((u) => ART[landmarkArt(u.n)].src);
    expect(new Set(srcs).size, "nine different pictures").toBe(9);
    for (const u of UNITS) {
      for (const mastered of [true, false]) {
        const html = card(u.n, { mastered });
        expect(html, `unit ${u.n}`).toContain(u.title);
        expect(html).toContain(`Unit ${u.n}`);
        expect(html).toContain(`href="/study/unit/${u.n}"`);
        expect(html.match(/<img\b/g), `unit ${u.n}: one picture`).toHaveLength(1);
        expect(html).toContain(`src="${ART[`landmark-${u.n}`].src}"`);
        expect(html).toMatch(/<img[^>]*alt=""/);
        expect(html).toContain(`data-landmark="${u.n}"`);
      }
    }
  });

  it("shows a landmark in colour once it is earned, and greyed while it is locked", () => {
    const earned = card(4, { mastered: true });
    const locked = card(4, { mastered: false });
    expect(earned).toContain('data-earned="true"');
    expect(earned).not.toMatch(/grayscale|opacity-60/);
    expect(locked).toContain('data-earned="false"');
    expect(locked).toMatch(/grayscale/);
  });

  it("says what it said before: the landmark's name when earned, else what it takes to unlock it", () => {
    expect(card(4, { mastered: true, best: 72 })).toContain(LANDMARK_INFO[4].name);
    expect(card(2, { mastered: false, best: 55 })).toContain(`Best 55% · ${MASTERY_PCT}% unlocks a landmark`);
    expect(card(2, { mastered: false })).toContain(`${MASTERY_PCT}% on the quiz unlocks a landmark`);
    expect(card(3)).toContain("10–15% of exam");
  });

  it("draws the progress it is given, as the page worked it out", () => {
    const unit = UNITS.find((u) => u.n === 2)!;
    expect(card(2, { read: 3 })).toContain(`aria-valuenow="${Math.round((3 / unit.lessons.length) * 100)}"`);
    expect(card(2, { read: 3 })).toContain(`3/${unit.lessons.length}`);
    expect(unitCard).toContain("(read / total) * 100");
  });

  it("rings the focus unit and no other", () => {
    expect(card(2, { isFocus: true })).toContain("ring-2 ring-brand/40");
    expect(card(2, { isFocus: false })).not.toContain("ring-2");
  });

  it("gives the card's link the card's corners and the shared focus ring, with no shadow of its own to hide it", () => {
    const link = /<a [^>]*class="([^"]*)"/.exec(card(2))![1];
    expect(link).toContain("rounded-lg"); // the ring follows the card (rounded-lg), not the global 8px
    expect(css).toMatch(/\.card \{\s*@apply rounded-lg/);
    expect(link).not.toMatch(/(^|\s)(focus:|focus-visible:)?shadow-/);
    expect(link).not.toMatch(/outline/);
    expect(css).toMatch(/:focus-visible \{[^}]*box-shadow: var\(--ring\);/);
  });

  it("puts a picture in no other card on the page", () => {
    expect(unitCard.match(/<img\b/g)).toHaveLength(1);
    const body = code(study);
    for (const m of body.matchAll(/<Card\b[\s\S]*?<\/Card>/g)) expect(m[0], "the focus card and the three tool cards hold no picture").not.toMatch(/<img\b|ArtBackdrop|UnitCard/);
  });
});

describe("study: the sky behind the title, with a scrim where the text sits", () => {
  it("is the one sky on the page, on the banner, outside every card", () => {
    expect(study.match(/<ArtBackdrop\b/g)).toHaveLength(1);
    const header = study.slice(study.indexOf("<header"), study.indexOf("</header>"));
    expect(header).toContain("<ArtBackdrop");
    expect(study.indexOf("<ArtBackdrop")).toBeLessThan(study.indexOf("<Card"));
  });

  it("keeps only the eyebrow and the title on the sky: the facts and the hint are on the page below it", () => {
    const header = study.slice(study.indexOf("<header"), study.indexOf("</header>"));
    const banner = header.slice(0, header.indexOf("</div>"));
    expect(banner).toContain("t-eyebrow");
    expect(banner).toContain("<h1");
    expect(banner).not.toMatch(/practice questions|Search any lesson/);
    expect(header.indexOf("practice questions")).toBeGreaterThan(header.indexOf("</div>"));
    expect(header.indexOf("Search any lesson")).toBeGreaterThan(header.indexOf("</div>"));
  });

  it("tints the title's side at least as opaque as the glass floor, and holds it past the title", () => {
    const m = /const BANNER_SCRIM: PlateScrim = \{ kind: "start", alpha: ([\d.]+), hold: ([\d.]+), fade: ([\d.]+) \};/.exec(study)!;
    expect(m, "BANNER_SCRIM").not.toBeNull();
    const [alpha, hold] = [Number(m[1]), Number(m[2])];
    expect(alpha).toBeGreaterThanOrEqual(SCRIM_FLOOR);
    expect(hold).toBeGreaterThanOrEqual(0.4);
    // The eyebrow is the widest thing on the banner, about 220px after the 32px padding: that is 35% of the
    // narrowest banner (712px, a 1024px window) and less of any wider one.
    expect((32 + 220) / 712).toBeLessThan(hold);
    for (const text of ["fg", "fg-2", "fg-3"]) expect(ratio(token(text), over(token("bg"), "#000000", alpha)), `${text} on the scrim over black`).toBeGreaterThanOrEqual(4.5);
  });

  it("renders as one picture and its scrim, behind everything and out of the way", () => {
    const html = renderToStaticMarkup(h(ArtBackdrop, { art: "sky-day", scrim: { kind: "start", alpha: 0.92, hold: 0.4, fade: 0.2 } }));
    expect(html).toContain('aria-hidden="true"');
    expect(html).toContain('data-backdrop="sky-day"');
    expect(html).toMatch(/pointer-events-none/);
    expect(html).toMatch(/-z-10/);
    expect(html.match(/<img\b/g)).toHaveLength(1);
    expect(html).toMatch(/<img[^>]*alt=""/);
    expect(html).toContain(`src="${ART["sky-day"].src}"`);
    expect(html).toContain('data-scrim="start"');
    expect(html).toContain('data-scrim-hold="0.4"');
    expect(html).toContain("var(--bg)");
  });
});

describe("study: what the restyle must not change", () => {
  it("keeps its sections and copy, 'Your focus' and 'Exam guide' among them", () => {
    for (const text of ["AP Environmental Science", ">Study<", "Your focus", "Set by your teacher", "Choose your focus unit", "FRQ practice", "Flashcards", "Exam guide", "27 original FRQs, graded part by part against an AP-style rubric.", "Every key term in the course, by unit or lesson.", "How the exam is scored, unit weights and test-day tips.", ">Units<", "Search any lesson with", "9 units · {ALL_LESSONS.length} lessons · 1,221 practice questions · 27 free-response questions", "to add the ${LANDMARK_INFO[unit.n].name.toLowerCase()} to your island."]) {
      expect(study, text).toContain(text);
    }
  });

  it("keeps every route", () => {
    for (const route of ["`/study/unit/${unit.n}/${encodeURIComponent(next.id)}`", "`/practice?mode=unit&unit=${unit.n}`", 'to: "/study/frq"', 'to: "/study/flashcards"', 'to: "/study/guide"']) expect(study, route).toContain(route);
    expect(unitCard).toContain("`/study/unit/${unit.n}`");
  });

  it("keeps the units in curriculum order, and the progress logic as it was", () => {
    expect(study.match(/UNITS\.map\(/g)).toHaveLength(2); // the focus select and the grid, both in curriculum order
    expect(study).not.toMatch(/UNITS\.(sort|reverse|filter|slice|toSorted|toReversed)/);
    for (const line of [
      "const done = new Set(profile.lessons_done ?? []);",
      "const unitDone = unit.lessons.filter((l) => done.has(l.id)).length;",
      "const next = unit.lessons.find((l) => !done.has(l.id)) ?? unit.lessons[0];",
      "const best = profile.unit_best?.[`u${focusUnit}`];",
      "const read = u.lessons.filter((l) => done.has(l.id)).length;",
      "const b = profile.unit_best?.[`u${u.n}`];",
      "const mastered = (b ?? 0) >= MASTERY_PCT;",
      "value={(unitDone / unit.lessons.length) * 100}",
      "isFocus={u.n === focusUnit && !teacher}",
      "total={u.lessons.length}",
    ]) {
      expect(study, line).toContain(line);
    }
  });

  it("is a teacher-aware page still: the focus card is for students only", () => {
    expect(study).toContain("{!teacher && (");
  });
});

describe("study: text stays readable", () => {
  it("passes AA for the text colors it uses on its cards over the page's lightest and darkest backdrops", () => {
    // A card is the standard glass fill over the page: the sky at the top of the shell's gradient, or the page color.
    for (const behind of [token("sky"), token("bg")]) {
      const surface = over(token("surface"), behind, alphaOf("glass-fill"));
      for (const text of ["fg", "fg-2", "fg-3", "brand-ink"]) expect(ratio(token(text), surface), `${text} on a card over ${behind}`).toBeGreaterThanOrEqual(4.5);
    }
  });

  it("passes AA for the facts and the hint on the page itself, down to the sky at the top of its gradient", () => {
    for (const text of ["fg", "fg-2", "fg-3"]) expect(ratio(token(text), token("sky")), `${text} on the sky`).toBeGreaterThanOrEqual(4.5);
    expect(study).toMatch(/<p className="text-lg text-fg-3">/);
    expect(study).toMatch(/<span className="shrink-0 text-sm text-fg-3">/);
  });
});

describe("study: reduced motion", () => {
  it("adds no motion: only the page's existing reveal moves, and that already holds still when motion is reduced", () => {
    for (const [name, text] of Object.entries(FILES)) expect(code(text), name).not.toMatch(/animate-|transition|motion|keyframes|setInterval|setTimeout|useCycle|useReveal|Marquee|Reveal\b/);
    expect(study).toContain("<Page>");
    const guards = read("src/components/app/Guards.tsx");
    expect(guards).toMatch(/animate-rise/);
    expect(css).toMatch(/@media \(prefers-reduced-motion: reduce\) \{[^@]*animation-duration: 0\.01ms !important;/);
  });
});
