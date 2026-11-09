import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join, resolve } from "node:path";
import { compile } from "tailwindcss";
import { beforeAll, describe, expect, it } from "vitest";
import { button } from "../../src/components/ui/button-variants";

// A button that sets its own shadow loses the app's focus ring unless it composes the
// shared --ring token over that shadow: a shadow utility outranks the global :focus-visible
// rule (utilities sit above the base layer). This compiles the real button classes with the
// real stylesheet and reads the CSS Tailwind emits, so it fails if a ring is ever masked again.

const root = join(__dirname, "../..");
const require = createRequire(join(root, "package.json"));
const css = readFileSync(join(root, "src/index.css"), "utf8");

const VARIANTS = ["primary", "secondary", "soft", "ghost", "danger", "danger-soft"] as const;
const classesOf = (variant: (typeof VARIANTS)[number]) => button({ variant }).split(/\s+/).filter(Boolean);
const escape = (cls: string) => cls.replace(/[^a-zA-Z0-9_-]/g, "\\$&");

let emitted = "";
beforeAll(async () => {
  const compiler = await compile(css, {
    base: join(root, "src"),
    loadStylesheet: async (id, base) => {
      const path = id === "tailwindcss" ? require.resolve("tailwindcss/index.css") : id.startsWith("tailwindcss/") ? require.resolve(id) : resolve(base, id);
      return { path, base: dirname(path), content: readFileSync(path, "utf8") };
    },
  });
  emitted = compiler.build(VARIANTS.flatMap(classesOf));
});

/** The CSS rule Tailwind emitted for one class. */
function rule(cls: string): string {
  const start = emitted.indexOf(`.${escape(cls)} {`);
  expect(start, `Tailwind should emit a rule for ${cls}`).toBeGreaterThan(-1);
  // The rule's body ends at its closing brace: count braces from the first one.
  let depth = 0;
  for (let i = emitted.indexOf("{", start); i < emitted.length; i++) {
    if (emitted[i] === "{") depth++;
    if (emitted[i] === "}" && --depth === 0) return emitted.slice(start, i + 1);
  }
  throw new Error(`unterminated rule for ${cls}`);
}

describe("button focus ring", () => {
  it("is the app's one focus style: --ring on :focus-visible, from a base layer that utilities outrank", () => {
    expect(css).toMatch(/@layer base \{[\s\S]*?:focus-visible \{[^}]*box-shadow: var\(--ring\);/);
  });

  it("gives every button variant a ring when focused", () => {
    for (const variant of VARIANTS) {
      const classes = classesOf(variant);
      const resting = classes.filter((c) => /^shadow-/.test(c));
      const onFocus = classes.filter((c) => /^focus-visible:shadow-/.test(c));
      if (resting.length === 0) {
        // No shadow of its own: nothing outranks the global rule, so the ring already shows.
        expect(onFocus, `${variant} has no shadow, so it relies on the global ring`).toEqual([]);
      } else {
        // A shadow of its own would hide the ring, so it must compose --ring on focus.
        expect(onFocus.length, `${variant} sets a resting shadow and must compose the ring on focus`).toBe(1);
        expect(onFocus[0], variant).toContain("var(--ring)");
      }
    }
  });

  it("emits a :focus-visible rule that puts the ring on top of the primary button's own shadow", () => {
    const focus = classesOf("primary").find((c) => c.startsWith("focus-visible:shadow-"))!;
    const body = rule(focus);
    expect(body).toContain("&:focus-visible");
    // --ring first, so its band paints over the resting highlight and drop shadow that follow it.
    expect(body).toContain(
      "--tw-shadow: var(--ring), inset 0 1px 0 var(--tw-shadow-color, rgba(255,255,255,0.18)), 0 1px 2px var(--tw-shadow-color, rgba(0,0,0,0.12));",
    );
    expect(body).toMatch(/box-shadow: [^;]*var\(--tw-shadow\)/);
  });

  it("does the same for the secondary button's own shadow", () => {
    const focus = classesOf("secondary").find((c) => c.startsWith("focus-visible:shadow-"))!;
    expect(rule(focus)).toMatch(/--tw-shadow: var\(--ring\), var\(--shadow-xs\);/);
    expect(css).toMatch(/--shadow-xs: [^;]+;/);
  });

  it("leaves the variants that never overrode the ring exactly as they were", () => {
    for (const variant of ["soft", "ghost", "danger", "danger-soft"] as const) {
      expect(classesOf(variant).filter((c) => /(^|:)shadow-/.test(c)), variant).toEqual([]); // no shadow utility, at rest or on focus
    }
  });

  it("takes its color from the brand in force, so the ring is green in light glass and blue on the Ambassador accent", () => {
    const rootRing = /:root \{[\s\S]*?--ring: ([^;]+);/.exec(css)?.[1] ?? "";
    const accentRing = /\[data-accent="ambassador"\] \{[\s\S]*?--ring: ([^;]+);/.exec(css)?.[1] ?? "";
    for (const ring of [rootRing, accentRing]) {
      expect(ring).toMatch(/0 0 0 4px color-mix\(in srgb, var\(--brand\) 70%, transparent\)/); // a visible 4px band in the brand color
      expect(ring).toMatch(/^0 0 0 2px var\(--bg\)/); // with a gap of the page color inside it
    }
    // --ring bakes in --brand where it is declared, so the accent has to declare its own to turn the ring blue.
    expect(accentRing).not.toBe("");
    expect(css).toMatch(/\[data-accent="ambassador"\] \{[\s\S]*?--brand: #2a52c8;/);
  });
});
