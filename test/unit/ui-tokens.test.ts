import { readFileSync, readdirSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join, resolve } from "node:path";
import { compile } from "tailwindcss";
import { beforeAll, describe, expect, it } from "vitest";

// The primitives in src/components/ui/ are built from the design tokens in src/index.css and
// nothing else: no hex colors, no arbitrary pixel sizes, no raw white/black or default-palette
// colors, only the type and corner scales, and the shared focus ring. These checks read the
// source of every file in that folder, so a new primitive is covered the day it is added.

const root = join(__dirname, "../..");
const dir = join(root, "src/components/ui");
const css = readFileSync(join(root, "src/index.css"), "utf8");
const files = readdirSync(dir)
  .filter((name) => /\.tsx?$/.test(name))
  .map((name) => ({ name, text: readFileSync(join(dir, name), "utf8") }));

/** Names declared on a theme scale in index.css, e.g. `--text-md` gives "md". */
const scale = (prefix: string) => [...css.matchAll(new RegExp(`--${prefix}-([a-z0-9]+):\\s*\\d`, "g"))].map((m) => m[1]);

describe("ui primitives: tokens only", () => {
  it("covers every primitive (so the checks below can't pass on an empty folder)", () => {
    const names = files.map((f) => f.name);
    for (const expected of ["badge.tsx", "button.tsx", "button-variants.ts", "card.tsx", "dialog.tsx", "field.tsx", "segmented.tsx", "switch.tsx"]) {
      expect(names).toContain(expected);
    }
  });

  it("has no hex color literal", () => {
    for (const { name, text } of files) {
      expect(text, name).not.toMatch(/(?<![\w&])#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3,4})(?![\w-])/);
    }
  });

  it("has no arbitrary text-[Npx] class", () => {
    for (const { name, text } of files) {
      expect(text, name).not.toMatch(/(?<![\w-])text-\[[0-9.]+px\]/);
    }
  });

  it("has no other arbitrary pixel size: lengths come from the spacing scale or a theme token", () => {
    for (const { name, text } of files) {
      expect(text, `${name}: utility-[Npx]`).not.toMatch(/-\[-?[0-9.]+px\]/);
      expect(text, `${name}: min()/max()/clamp() with px`).not.toMatch(/\b(?:min|max|clamp)\([^)]*[0-9.]px/);
    }
  });

  it("has no raw white, black or default-palette color: every color is a palette token", () => {
    for (const { name, text } of files) {
      expect(text, `${name}: -white/-black utility`).not.toMatch(/(?<![\w-])(?:bg|text|border|ring|fill|stroke|outline|from|via|to)-(?:white|black)(?![\w-])/);
      expect(text, `${name}: color-mix with white/black`).not.toMatch(/[,_ ](?:white|black)\)/);
      expect(text, `${name}: default Tailwind palette`).not.toMatch(
        /(?<![\w-])(?:bg|text|border|ring|fill|stroke)-(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|blue|indigo|violet|purple|fuchsia|pink|rose)-\d{2,3}/,
      );
    }
  });

  it("uses only the type scale and the corner scale", () => {
    const sizes = new Set(scale("text"));
    const radii = new Set([...scale("radius"), "full", "none"]);
    expect(sizes.size, "type scale parsed from index.css").toBeGreaterThanOrEqual(10);
    expect(radii.size, "corner scale parsed from index.css").toBeGreaterThanOrEqual(7);
    for (const { name, text } of files) {
      // A bare size word (text-md, text-2xs…). Colors such as text-fg-3 or text-brand-fg continue with a hyphen and don't match.
      for (const m of text.matchAll(/(?<![\w-])text-((?:\d*x[sl]|sm|md|lg|base))(?![\w-])/g)) {
        expect(sizes.has(m[1]), `${name}: text-${m[1]} is not on the type scale`).toBe(true);
      }
      for (const m of text.matchAll(/(?<![\w-])rounded(?:-[a-z]{1,2})?-([a-z0-9]+)(?![\w-])/g)) {
        expect(radii.has(m[1]), `${name}: rounded-${m[1]} is not on the corner scale`).toBe(true);
      }
    }
  });
});

describe("ui primitives: the shared focus ring", () => {
  it("is composed by the form controls over their own resting shadow, not replaced by a private halo", () => {
    const field = files.find((f) => f.name === "field.tsx")!.text;
    expect(field).toContain("focus-visible:shadow-[var(--ring),var(--shadow-xs)]");
    expect(field, "a focus: shadow utility would outrank the global :focus-visible ring").not.toMatch(/(?<![\w-])focus:shadow-/);
  });

  it("is not masked by a shadow on any other focusable primitive", () => {
    // A `shadow-*` utility outranks the global :focus-visible rule, so a focusable element that
    // sets one must compose var(--ring) on focus. The only shadows left in this folder belong to
    // surfaces that are never focused themselves (menu panel, dialog panel, segmented thumb),
    // to a card's hover lift, and to the buttons and fields that compose the ring.
    const withShadow = files.filter((f) => /(?<![\w-])shadow-/.test(f.text)).map((f) => f.name).sort();
    expect(withShadow).toEqual(["button-variants.ts", "card.tsx", "dialog.tsx", "field.tsx", "menu.tsx", "segmented.tsx"]);
  });
});

describe("ui primitives: the tokens that replaced pixel values resolve to the same lengths", () => {
  const require = createRequire(join(root, "package.json"));
  let out = "";
  beforeAll(async () => {
    const compiler = await compile(css, {
      base: join(root, "src"),
      loadStylesheet: async (id, base) => {
        const path = id === "tailwindcss" ? require.resolve("tailwindcss/index.css") : id.startsWith("tailwindcss/") ? require.resolve(id) : resolve(base, id);
        return { path, base: dirname(path), content: readFileSync(path, "utf8") };
      },
    });
    out = compiler.build(["max-w-dialog", "max-w-dialog-wide", "backdrop-blur-scrim", "min-h-24", "h-5.5", "min-w-55", "size-4.5", "text-coral-fg", "hover:bg-coral-strong", "hover:border-fg/24"]).replace(/\s+/g, " ");
  });

  it("puts one spacing unit at 4px, so the scale reaches the old pixel values", () => {
    expect(/--spacing: ([^;]+);/.exec(out)?.[1]).toBe("0.25rem");
    // 24 units = 96px (textarea), 5.5 = 22px (badge), 55 = 220px (menu), 4.5 = 18px (icons)
    expect(out).toContain("min-height: calc(var(--spacing) * 24)");
    expect(out).toContain("height: calc(var(--spacing) * 5.5)");
    expect(out).toContain("min-width: calc(var(--spacing) * 55)");
    expect(out).toMatch(/\.size-4\\\.5 \{ width: calc\(var\(--spacing\) \* 4\.5\); height: calc\(var\(--spacing\) \* 4\.5\);/);
  });

  it("gives the dialog its two widths and the scrim its blur from theme tokens", () => {
    expect(out).toMatch(/\.max-w-dialog \{ max-width: 520px; \}/);
    expect(out).toMatch(/\.max-w-dialog-wide \{ max-width: 760px; \}/);
    expect(out).toContain("--tw-backdrop-blur: blur(2px);");
  });

  it("styles the danger button from coral tokens and the input's hover edge from the ink token", () => {
    expect(out).toContain("color: var(--coral-fg);");
    expect(out).toContain("background-color: var(--coral-strong);");
    expect(out).toContain("color-mix(in oklab, var(--fg) 24%, transparent)");
  });
});
