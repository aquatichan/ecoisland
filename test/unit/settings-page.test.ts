import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// The Settings page in the same style system as Today, Island, Act, Ambassador and Class: the 4a primitives and tokens
// only, the faint sky behind the header under the one banner scrim (the same as the Class banner), every section one
// card and every tile inside a section one shape, danger kept on the coral token, and the banner and the content each in
// their own space. The page pulls in Firebase, so it is read as source. Contrast against the real pixels, the geometry of
// the real boxes, focus on every control, and a real settings write are measured in a browser; see design/reviews/stage4i-2/.

const root = join(__dirname, "../..");
const read = (rel: string) => readFileSync(join(root, rel), "utf8");
const page = read("src/pages/Settings.tsx");
const css = read("src/index.css");
const code = (text: string) => text.replace(/^\s*\/\/.*$/gm, "").replace(/\{\/\*[\s\S]*?\*\/\}/g, "");
const sha = (text: string) => createHash("sha256").update(text).digest("hex");
/** Every line with only its class strings taken out: the page's copy, routes and logic. */
const norm = (text: string) =>
  text
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith("//") && !l.startsWith("{/*"))
    .map((l) => l.replace(/className="[^"]*"/g, 'className=""'))
    .join("\n");

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
const header = page.slice(page.indexOf("<header"), page.indexOf("</header>"));

describe("settings page: tokens only", () => {
  it("has no hex color, no arbitrary pixel size and no raw white, black or default-palette color", () => {
    expect(page).not.toMatch(/(?<![\w&])#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3,4})(?![\w-])/);
    expect(page, "utility-[Npx]").not.toMatch(/-\[-?[0-9.]+px\]/);
    expect(page, "text-[…]").not.toMatch(/(?<![\w-])text-\[/);
    expect(page, "px in a grid track or min()/max()/clamp()").not.toMatch(/(?:minmax|min|max|clamp)\([^)]*[0-9.]px/);
    expect(page, "an arbitrary fixed width or height").not.toMatch(/(?<![\w-])(?:min-w|max-w|w|h|min-h|max-h|size)-\[[0-9.]+(?:px|ch)\]/);
    expect(page, "white/black").not.toMatch(/(?<![\w-])(?:bg|text|border|ring|fill|stroke|from|via|to)-(?:white|black)(?![\w-])/);
    expect(page, "default palette").not.toMatch(/(?<![\w-])(?:bg|text|border|ring|fill|stroke)-(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|blue|indigo|violet|purple|fuchsia|pink|rose)-\d{2,3}/);
    expect(page, "a colour made up in the page").not.toMatch(/(?<![\w-])(?:bg|from|via|to)-\[(?:linear|radial|conic|color|rgb|hsl|oklch)/);
    expect(page).not.toMatch(/text-fg-4/);
    expect(ratio(token("fg-4"), token("bg"))).toBeLessThan(4.5);
  });

  it("uses the spacing scale and rem where it had 26px and the 200px and 720px columns", () => {
    expect(page).toContain("mb-6.5"); // 26px
    expect(page).toContain("grid-cols-[12.5rem_minmax(0,1fr)]"); // 200px and 720px
    expect(page).not.toMatch(/mb-\[26px\]|200px|720px/);
  });
});

describe("settings page: the title sits on the area's scene", () => {
  // The page no longer draws a banner picture of its own: the area's scene fills the window behind the page
  // (src/components/app/SceneBackdrop.tsx), and the title sits on it inside the title haze. The scene, the haze
  // and its contrast are checked once, in test/unit/scenes.test.ts.
  it("has a page-hero header with no box and no picture of its own, its text held to half the width, inside the haze", () => {
    for (const rel of ["src/pages/Settings.tsx"]) {
      const src = readFileSync(join(__dirname, "../..", rel), "utf8");
      const start = src.indexOf('<header className="page-hero');
      expect(start, rel).toBeGreaterThan(-1);
      const head = src.slice(start, src.indexOf("</header>", start));
      expect(src, rel).not.toMatch(/ArtBackdrop|PlateScrim/);
      expect(head, rel).toContain("max-w-1/2");
      expect(head.slice(0, head.indexOf(">")), rel).not.toMatch(/rounded-|border|shadow-|overflow-hidden|isolate/);
    }
  });
});

describe("settings page: one tile for a section, one shape for what is inside it", () => {
  it("makes every section the same Card and nothing else a Card", () => {
    expect(page).toContain('<Card id={id} className="scroll-mt-24 p-6">');
    expect(page.match(/<Card\b/g)).toHaveLength(1);
    expect(page.match(/<Section\b/g)).toHaveLength(5); // profile, account type, reminders, grow, account
    expect(page, "no section padded p-7 any more").not.toMatch(/(?<![\w-])p-7(?![\w-])/);
  });

  it("gives every tile inside a section one shape (INNER), tinted or bordered per use, and no tile of its own", () => {
    expect(page).toContain('const INNER = "rounded-md border p-5";');
    expect(page.match(/cn\(INNER,/g)).toHaveLength(4); // the two account types, the invitation, the ambassador note, the delete zone: one in a map
    expect(page, "no hand-made tile").not.toMatch(/className="[^"]*rounded-md border[^"]*p-\d/);
    expect(page).toContain('cn(INNER, "flex items-start gap-3 text-left transition-colors disabled:bg-surface-2", role === o.r ? "border-brand bg-brand-soft" : "border-line-strong hover:bg-surface-2")');
    expect(page).toContain('cn(INNER, "flex items-start gap-4 border-line bg-brand-soft/60")');
    expect(page).toContain('cn(INNER, "mt-3 flex items-start gap-4 border-line")');
  });

  it("keeps the danger zone on the coral token, and the delete button the danger variant", () => {
    expect(page).toContain('cn(INNER, "mt-6 border-coral/30")');
    expect(page).toContain('<p className="text-md font-semibold text-coral">Delete account</p>');
    expect(page).toContain('<Button variant="danger" className="mt-4 disabled:bg-surface-2 disabled:text-fg-3 disabled:opacity-100" disabled=');
    expect(ratio(token("coral"), over(token("surface"), token("bg"), alphaOf("glass-fill"))), "coral text on a card").toBeGreaterThanOrEqual(4.5);
    expect(ratio(token("coral-fg"), token("coral")), "white on the delete button").toBeGreaterThanOrEqual(4.5);
  });

  it("keeps a disabled Save and Delete readable: a flat surface tint with a darker word, not a 45% fade", () => {
    expect(page).toContain('className="mb-6.5 disabled:bg-surface-2 disabled:text-fg-3 disabled:opacity-100"');
    expect(ratio(token("fg-3"), token("surface-2")), "fg-3 on the disabled tint").toBeGreaterThanOrEqual(4.5);
    expect(ratio(token("fg"), token("surface-2")), "the blocked account-type tile's title").toBeGreaterThanOrEqual(4.5);
    expect(ratio(token("fg-3"), token("surface-2")), "its description").toBeGreaterThanOrEqual(4.5);
    expect(page, "a blocked tile is not faded").not.toMatch(/disabled:opacity-50/);
  });
});

describe("settings page: focus, accent and motion", () => {
  it("leaves every control on the shared focus ring: no shadow utility on a control, the Switch the shared one", () => {
    expect(css).toMatch(/:focus-visible \{\s*outline: none;\s*box-shadow: var\(--ring\);/);
    expect(code(page).replace(header, ""), "a banner shadow is the only one").not.toMatch(/(?<![\w-])shadow-/);
    expect(page).toContain('<Switch checked={!!profile.email_reminders} onChange={(v) => void updateProfile(profile.id, { email_reminders: v })} label="Email reminders" />');
  });

  it("keeps the brand green and adds no motion: only the account-type tiles' colour change", () => {
    expect(page).not.toMatch(/data-accent|accent="/);
    expect([...code(page).matchAll(/(?<![\w-])transition-[\w[\],-]+/g)].map((m) => m[0])).toEqual(["transition-colors"]);
    expect(code(page)).not.toMatch(/animate-|motion\.|keyframes|animation|duration-/);
    expect(css).toMatch(/@media \(prefers-reduced-motion: reduce\) \{[^@]*animation-duration: 0\.01ms !important;/);
  });
});

describe("settings page: copy, routes, writes and flows are the page's own", () => {
  it("keeps every line of copy, every route and every call, exactly (every line but its class strings is pinned)", () => {
    // If you change the page's copy, routes or logic on purpose, replace this hash: it exists so a styling change cannot touch them.
    expect(sha(norm(page))).toBe("bfb4ea005ff930be9126c239fd8f4d7d9001cde492aaf91d7aad0ce63663e818");
  });

  it("keeps the writes and flows by name", () => {
    for (const line of [
      "await setUsername(profile.id, profile, name);",
      "await updateProfile(profile.id, { avatar_url: url });",
      "await updateProfile(profile.id, { role: r });",
      "updateProfile(profile.id, { email_reminders: v })",
      'await api("account/delete");',
      "await deleteUser(user);",
      "await signOut();",
      "disabled={confirm.trim().toLowerCase() !== phrase.toLowerCase()}",
      "disabled={!changed || !!problem || checking}",
      "disabled={blocked && o.r === \"student\"}",
      '<Link to="/ambassador">',
      "mailto:?subject=",
      "const NAV = [",
    ]) expect(page, line).toContain(line);
    for (const id of ["profile", "account-type", "grow", "account"]) expect(page).toContain(`{ id: "${id}"`);
  });
});
