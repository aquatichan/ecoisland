import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { createElement as h } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ArtBackdrop } from "../../src/components/app/ArtBackdrop";
import { PLATES, SCRIM_FLOOR } from "../../src/components/landing/plates";

// The Onboarding page (the Google sign-in and the four steps) in the same style system as the rest of the app: the 4a
// primitives and tokens only, the coastal trail behind the sign-in hero under the one banner scrim, one shape for every
// tile inside a step, the Google button left in its own colours, the stepper still the OnboardingStepper wrapper around
// the vendored one, and nothing laid over anything else. The page pulls in Firebase, so it is read as source. Contrast
// against the real pixels, the geometry of the real boxes and focus on every control, signed out and signed in with new
// student and teacher accounts, are measured in a browser; see design/reviews/stage4i-3/.

const root = join(__dirname, "../..");
const read = (rel: string) => readFileSync(join(root, rel), "utf8");
const page = read("src/pages/Onboarding.tsx");
const wrapper = read("src/components/fx/OnboardingStepper.tsx");
const css = read("src/index.css");
const code = (text: string) => text.replace(/^\s*\/\/.*$/gm, "").replace(/\{\/\*[\s\S]*?\*\/\}/g, "");
const sha = (text: string) => createHash("sha256").update(text).digest("hex");
const norm = (text: string) =>
  text
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith("//") && !l.startsWith("{/*"))
    .map((l) => l.replace(/className="[^"]*"/g, 'className=""'))
    .join("\n");

/** The Google logo: the one place Google's own colours are allowed. */
const googleIcon = page.slice(page.indexOf("function GoogleIcon() {"), page.indexOf("function suggestUsername"));
const pageSansGoogle = page.replace(googleIcon, "");
const signIn = page.slice(page.indexOf('if (status === "signed_out"'), page.indexOf('if (status === "error"'));
const setup = page.slice(page.indexOf("function Setup("));

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
const scrimOf = (src: string) => /const \w+: PlateScrim = \{ kind: "start", alpha: ([\d.]+), hold: ([\d.]+), fade: ([\d.]+) \};/.exec(src);
const BANNER = "rounded-2xl border border-line px-8 py-9 shadow-sm";

describe("onboarding page: tokens only, except Google's own button logo", () => {
  it("has no hex color outside the Google logo, no arbitrary pixel size anywhere, and no raw white, black or default-palette color", () => {
    expect(pageSansGoogle).not.toMatch(/(?<![\w&])#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3,4})(?![\w-])/);
    expect(page, "utility-[Npx]").not.toMatch(/-\[-?[0-9.]+px\]/);
    expect(page, "text-[…]").not.toMatch(/(?<![\w-])text-\[/);
    expect(page, "px in a grid track or min()/max()/clamp()").not.toMatch(/(?:minmax|min|max|clamp)\([^)]*[0-9.]px/);
    expect(page, "an arbitrary fixed width or height").not.toMatch(/(?<![\w-])(?:min-w|max-w|w|h|min-h|max-h|size)-\[[0-9.]+(?:px|ch)\]/);
    expect(pageSansGoogle, "white/black").not.toMatch(/(?<![\w-])(?:bg|text|border|ring|fill|stroke|from|via|to)-(?:white|black)(?![\w-])/);
    expect(pageSansGoogle, "default palette").not.toMatch(/(?<![\w-])(?:bg|text|border|ring|fill|stroke)-(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|blue|indigo|violet|purple|fuchsia|pink|rose)-\d{2,3}/);
    expect(pageSansGoogle, "a colour made up in the page").not.toMatch(/(?<![\w-])(?:bg|from|via|to)-\[(?:linear|radial|conic|color|rgb|hsl|oklch)/);
    expect(page).not.toMatch(/text-fg-4|placeholder:text-fg-4/);
    expect(ratio(token("fg-4"), token("bg"))).toBeLessThan(4.5);
  });

  it("uses the spacing scale where it had 18px and 200px, and nothing but the logo's own four colours is named", () => {
    expect(page).toContain("w-50"); // 200px
    expect(googleIcon).toContain('className="size-4.5"'); // 18px
    expect([...googleIcon.matchAll(/fill="(#[0-9A-F]{6})"/g)].map((m) => m[1])).toEqual(["#4285F4", "#34A853", "#FBBC05", "#EA4335"]);
    expect(page).not.toMatch(/w-\[200px\]|size-\[18px\]|max-w-\[440px\]/);
  });

  it("leaves the Google logo and its button as they were: Google's mark, its label, a secondary button", () => {
    // If you change the logo on purpose, replace this hash: it exists so a styling change cannot touch Google's mark.
    expect(sha(googleIcon.replace("size-4.5", "size-[18px]"))).toBe("8c8d06971a86fab6eb62a5882358a4d6d7e772a659a5800f0f8037812a3df3e5");
    expect(signIn).toContain('size="lg"');
    expect(signIn).toContain('variant="secondary"');
    expect(signIn).toContain("{!signingIn && <GoogleIcon />} Continue with Google");
    expect(signIn, "the Google button gets no colour of its own from the page").not.toMatch(/<Button[^>]*className="[^"]*(?:bg-|text-|border-)/);
  });
});

describe("onboarding page: the sign-in hero, on the coastal trail, under one scrim", () => {
  const scrim = scrimOf(page);

  it("draws the plate from the manifest: registered, generated, in public/, and the sign-in's only picture", () => {
    const plate = PLATES["bg-act"];
    expect(plate.source).toBe("generated");
    expect(existsSync(join(root, "public", plate.src))).toBe(true);
    expect(signIn.match(/<ArtBackdrop\b/g)).toHaveLength(1);
    expect(page.match(/<ArtBackdrop\b/g)).toHaveLength(1);
    expect(signIn).toContain('<ArtBackdrop art="bg-act" scrim={BANNER_SCRIM} position="center 40%" />');
    expect(signIn, "no island scene, no other picture on the sign-in").not.toMatch(/<IslandScene|<img\b|<picture\b|role="img"|backgroundImage|url\(/);
    const html = renderToStaticMarkup(h(ArtBackdrop, { art: "bg-act", scrim: { kind: "start", alpha: 0.92, hold: 0.52, fade: 0.16 } }));
    expect(html).toContain(`src="${plate.src}"`);
    expect(html.match(/<img\b/g)).toHaveLength(1);
  });

  it("puts the headline, the paragraph, the Google button and the terms inside the hero's own box, on its scrim, held to the left half", () => {
    const hero = signIn.slice(signIn.indexOf("<header"), signIn.indexOf("</header>"));
    expect(hero).toContain(`<header className="relative isolate w-full overflow-hidden ${BANNER}">`);
    expect(hero.indexOf("<ArtBackdrop")).toBeLessThan(hero.indexOf("<p"));
    for (const part of ["Welcome", "<h1", "Sign in with your school", "<Button", "By continuing you agree"]) expect(hero, part).toContain(part);
    expect(hero).toContain('<div className="max-w-1/2 py-8">');
    expect(hero).toContain('<p className="t-eyebrow text-fg-2">Welcome</p>');
    expect(hero).toContain('<p className="mt-4 text-lg text-fg-2">');
    expect(hero).toContain('<p className="mt-5 text-sm text-fg-2">');
  });

  it("is the same scrim as every other banner, at least as opaque as the glass floor, held past the text, with the text readable over black", () => {
    expect(scrim, "BANNER_SCRIM").not.toBeNull();
    for (const file of ["src/pages/Today.tsx", "src/pages/IslandPage.tsx", "src/pages/Act.tsx", "src/pages/Ambassador.tsx", "src/pages/Classes.tsx", "src/pages/Settings.tsx"]) expect(scrim!.slice(1), file).toEqual(scrimOf(read(file))!.slice(1));
    expect(Number(scrim![1])).toBeGreaterThanOrEqual(SCRIM_FLOOR);
    expect(Number(scrim![2]), "held past the 50% the text may reach").toBeGreaterThan(0.5);
    const behind = over(token("bg"), "#000000", Number(scrim![1]));
    for (const text of ["fg", "fg-2"]) expect(ratio(token(text), behind), `${text} on the scrim over black`).toBeGreaterThanOrEqual(4.5);
  });

  it("stacks the logo, the hero and the footer line in their own space: nothing is laid over anything", () => {
    expect(signIn.indexOf("<Logo")).toBeLessThan(signIn.indexOf("<header"));
    expect(signIn.indexOf("</header>")).toBeLessThan(signIn.indexOf("Made for AP Environmental Science"));
    expect(signIn).toContain('<div className="flex min-h-dvh flex-col bg-bg px-8 py-10">');
    expect(page).not.toMatch(/(?<![\w-])-(?:m[trblxy]?|top|bottom|left|right|translate-[xy])-|pb-24|absolute inset-0/);
    expect(signIn).toContain('<p className="mx-auto w-full max-w-page text-sm text-fg-3">Made for AP Environmental Science students and teachers.</p>');
  });
});

describe("onboarding page: the steps", () => {
  it("keeps the stepper the OnboardingStepper wrapper around the vendored Stepper, which the page never imports or edits", () => {
    expect(page).toContain('import { OnboardingStepper, Step } from "@/components/fx/OnboardingStepper";');
    expect(page).not.toMatch(/components\/bits/);
    expect(wrapper).toContain('import Stepper from "@/components/bits/Stepper";');
    expect(wrapper).toContain('<Stepper theme="light" width={620} radius={RADIUS_2XL} {...props} style={STYLE} />');
    expect(wrapper).toContain("const RADIUS_2XL = 28;");
    expect(css).toMatch(/--radius-2xl:\s*28px;/);
    expect(wrapper).toContain('"--stepper-frame-shadow": "var(--shadow-sm)",');
    expect(wrapper, "a hovered Continue darkens, so white on the green stays AA").toContain('"--stepper-solid-hover": "brightness(0.9)",');
    expect(ratio(token("brand-fg"), over(token("brand"), "#000000", 0.9)), "white on the green at brightness 0.9").toBeGreaterThanOrEqual(4.5);
    expect(page.match(/<OnboardingStepper\b/g)).toHaveLength(1);
    expect(page.match(/<Step title=/g)).toHaveLength(4);
  });

  it("gives every tile inside a step one shape (TILE), the same as a tile inside a Settings section, and no tile of its own", () => {
    expect(page).toContain('const TILE = "rounded-md border p-5";');
    expect(read("src/pages/Settings.tsx")).toContain('const INNER = "rounded-md border p-5";');
    expect(setup.match(/cn\(TILE,/g)).toHaveLength(2); // the two roles (one in a map) and the class code
    expect(setup, "no hand-made tile").not.toMatch(/className="[^"]*rounded-(?:md|lg) border[^"]*p-\d/);
    expect(setup).toContain('className={cn(TILE, "text-left transition-[border-color,background-color]", role === o.r ? "border-brand bg-brand-soft" : "border-line-strong hover:bg-surface-2")}');
    expect(setup).toContain('className={cn(TILE, "mt-6 flex w-full items-center justify-between border-line-strong hover:bg-surface-2")}');
  });

  it("has one picture in the steps, the island on the student's last step, and none on any tile", () => {
    expect(page.match(/<IslandScene\b/g)).toHaveLength(1);
    expect(setup.match(/<IslandScene\b/g)).toHaveLength(1);
    expect(setup).toContain('<div className="mt-5 overflow-hidden rounded-lg border border-line">');
    expect(setup).not.toMatch(/<img\b|ArtBackdrop|role="img"|backgroundImage|url\(/);
  });

  it("keeps a disabled Continue, Create and Join readable: a flat surface tint with a darker word, not a 40 to 45% fade", () => {
    expect(setup).toContain('className: "disabled:bg-surface-2! disabled:text-fg-3! disabled:opacity-100!",');
    expect(page).toContain('const FLAT_DISABLED = "disabled:bg-surface-2 disabled:text-fg-3 disabled:opacity-100";');
    expect(setup.match(/className=\{FLAT_DISABLED\}/g)).toHaveLength(2);
    expect(ratio(token("fg-3"), token("surface-2")), "fg-3 on the disabled tint").toBeGreaterThanOrEqual(4.5);
  });

  it("darkens the two placeholders on the page, on the fields and not in the shared primitive", () => {
    expect(setup).toContain('aria-label="Class name" className="placeholder:text-fg-3" autoFocus');
    expect(setup).toContain('className="w-50 font-mono text-xl tracking-[0.22em] placeholder:text-fg-3"');
    expect(ratio(token("fg-3"), token("surface")), "a placeholder on a field").toBeGreaterThanOrEqual(4.5);
  });
});

describe("onboarding page: focus, accent and motion", () => {
  it("adds no shadow of its own to a control, so the shared ring (and the stepper's own outline) is what shows", () => {
    expect(css).toMatch(/:focus-visible \{\s*outline: none;\s*box-shadow: var\(--ring\);/);
    expect(code(page).replace(signIn.slice(signIn.indexOf("<header"), signIn.indexOf(">", signIn.indexOf("<header"))), "")).not.toMatch(/(?<![\w-])shadow-/);
    expect(read("src/components/bits/Stepper.tsx")).toContain("focus-visible:outline-2 focus-visible:outline-offset-2");
  });

  it("keeps the brand green and adds no motion: only the role tiles' colour change, and the stepper's own transition", () => {
    expect(page).not.toMatch(/data-accent|accent="/);
    expect([...code(page).matchAll(/(?<![\w-])transition-[\w[\],-]+/g)].map((m) => m[0]).sort()).toEqual(["transition-[border-color,background-color]"]);
    expect(code(page)).not.toMatch(/animate-|motion\.|keyframes|animation|duration-/);
    expect(css).toMatch(/@media \(prefers-reduced-motion: reduce\) \{[^@]*animation-duration: 0\.01ms !important;/);
  });
});

describe("onboarding page: copy, routes, the auth flow and the writes are the page's own", () => {
  it("keeps every line of copy, every route and every call, exactly (every line but its class strings is pinned)", () => {
    // If you change the page's copy, routes or logic on purpose, replace this hash: it exists so a styling change cannot touch them.
    expect(sha(norm(page))).toBe("2bf7933f622414d7b012578890547eaddb28d17189da24c81f65ec8fb282b2f6");
  });

  it("keeps the routes, the auth flow and the writes by name", () => {
    for (const line of [
      "await signIn();",
      '<Link to="/tos"',
      '<Link to="/privacy-policy"',
      '<Navigate to={finishTarget ?? (next && next.startsWith("/") ? next : "/today")} replace />',
      "await updateProfile(p.id, { role });",
      "await setUsername(p.id, p, username);",
      "await updateProfile(p.id, { focus_unit: focus });",
      'await api<{ classId: string; name: string }>("class/join", { code });',
      'await api<{ classId: string; code: string }>("class/create", { name: className });',
      "await updateProfile(p.id, { onboarding_complete: true });",
      'role === "teacher" ? (created ? `/class/${created.classId}` : "/today") : "/practice?mode=daily"',
      "if (e.key === \"Enter\" && canContinue && !busy) void advance();",
      "disableStepIndicators",
    ]) expect(page, line).toContain(line);
  });
});
