import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { COLORS } from "../../src/lib/tokens";

const root = join(__dirname, "../..");
const css = readFileSync(join(root, "src/index.css"), "utf8");

/** Opaque hex tokens declared in :root. */
function rootHex(): Record<string, string> {
  const block = /:root\s*\{([\s\S]*?)\n\}/.exec(css)?.[1] ?? "";
  const out: Record<string, string> = {};
  for (const m of block.matchAll(/--([a-z0-9-]+):\s*(#[0-9a-fA-F]{6})\s*;/g)) out[m[1]] = m[2].toLowerCase();
  return out;
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

function sourceFiles(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (path.includes("/components/bits")) continue; // vendored React Bits keep their upstream style
    if (statSync(path).isDirectory()) sourceFiles(path, out);
    else if (/\.(tsx?|css)$/.test(name)) out.push(path);
  }
  return out;
}

describe("design tokens", () => {
  it("keeps src/lib/tokens.ts in step with :root in index.css", () => {
    const declared = rootHex();
    for (const [name, value] of Object.entries(COLORS)) {
      expect(declared[name], `--${name}`).toBe(value);
    }
  });

  it("keeps every glass fill at or above the text-safe opacity floor", () => {
    const fills = [...css.matchAll(/--(glass-fill[a-z-]*):\s*rgb\(\s*\d+\s+\d+\s+\d+\s*\/\s*([0-9.]+)\s*\)/g)];
    expect(fills.length).toBeGreaterThanOrEqual(2);
    for (const [, name, alpha] of fills) expect(Number(alpha), `--${name}`).toBeGreaterThanOrEqual(0.84);
  });

  it("builds .card and .glass from the glass tokens, not raw colors", () => {
    for (const selector of [".card", ".glass"]) {
      const body = new RegExp(`\\n  ${selector.replace(".", "\\.")} \\{([\\s\\S]*?)\\n  \\}`).exec(css)?.[1] ?? "";
      expect(body, selector).toMatch(/background:\s*var\(--glass-fill/);
    }
  });

  it("keeps body text readable on glass at the floor, even over dark foliage", () => {
    const t = rootHex();
    const darkBackdrop = "#2f6a3b";
    const onGlass = over(t.surface, darkBackdrop, 0.84);
    for (const ink of ["fg", "fg-2", "fg-3"]) {
      expect(contrast(t[ink], onGlass), `${ink} on glass`).toBeGreaterThanOrEqual(4.5);
    }
  });

  it("keeps the colored pairs readable", () => {
    const t = rootHex();
    const pairs: Array<[string, string]> = [
      ["brand-fg", "brand"],
      ["brand-fg", "brand-strong"],
      ["brand-ink", "brand-soft"],
      ["sun-ink", "sun-soft"],
      ["coral", "surface"],
      ["ocean", "surface"],
      ["brand", "surface"],
    ];
    for (const [fg, bg] of pairs) expect(contrast(t[fg], t[bg]), `${fg} on ${bg}`).toBeGreaterThanOrEqual(4.5);
  });

  it("has one theme: no dark variant anywhere", () => {
    expect(css).not.toMatch(/\.dark\b|@custom-variant dark/);
    for (const file of sourceFiles(join(root, "src"))) {
      const text = readFileSync(file, "utf8");
      expect(text, file).not.toMatch(/\bdark:|useTheme|ecoisland-theme/);
    }
  });

  it("uses the type and corner scales, never arbitrary pixel sizes", () => {
    for (const file of sourceFiles(join(root, "src"))) {
      const text = readFileSync(file, "utf8");
      expect(text, file).not.toMatch(/(?<![\w-])text-\[[0-9.]+px\]/);
      expect(text, file).not.toMatch(/(?<![\w-])rounded(-[a-z]{1,2})?-\[[0-9.]+px\]/);
    }
  });
});
