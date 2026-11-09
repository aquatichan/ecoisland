import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createElement as h } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { SIDEBAR_ART, SIDEBAR_ART_FADE, SidebarArt } from "../../src/components/app/SidebarArt";
import { PLATES } from "../../src/components/landing/plates";

// The app shell and its sidebar: the sidebar fills the height of the page (not just the window), carries the
// glass, keeps its content pinned as the page scrolls, and ends in a decorative landscape from the art
// manifest that can never be behind a nav label. These read the source for the layout, which only a
// browser can really lay out; the measured checks (the glass reaching the bottom of the document at two
// window heights, contrast against the real pixels, focus rings) are in design/reviews/stage4d/.

const root = join(__dirname, "../..");
const read = (rel: string) => readFileSync(join(root, rel), "utf8");
const sidebar = read("src/components/app/Sidebar.tsx");
const shell = read("src/components/app/AppShell.tsx");
const art = read("src/components/app/SidebarArt.tsx");
const css = read("src/index.css");
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

/** The class list of the element whose opening tag contains `marker`. */
function classesOf(source: string, marker: string): string[] {
  const at = source.indexOf(marker);
  expect(at, marker).toBeGreaterThan(-1);
  const tagStart = source.lastIndexOf("<", at);
  const tag = source.slice(tagStart, source.indexOf(">", at));
  return [...tag.matchAll(/"([^"]*)"/g)].flatMap((m) => m[1].split(/\s+/)).filter(Boolean);
}

describe("shell: the sidebar fills the height of the page", () => {
  const sidebarFn = sidebar.slice(sidebar.indexOf("export function Sidebar("));

  it("is a column that stretches to the full height of the shell, not one viewport tall", () => {
    const column = classesOf(sidebarFn, "style={{ width: hidden ? 0 : width }}");
    expect(column).toContain("self-stretch");
    expect(column).toContain("shrink-0");
    expect(column).toContain("relative");
    // The old column was `sticky h-dvh self-start`: one window tall, so the page showed below it.
    for (const bad of ["h-dvh", "self-start", "sticky", "overflow-hidden", "h-screen"]) expect(column, `the column must not be ${bad}`).not.toContain(bad);
  });

  it("clips the width transition without becoming a scroll container, so the panel inside can still stick", () => {
    const column = classesOf(sidebarFn, "style={{ width: hidden ? 0 : width }}");
    expect(column).toContain("overflow-x-clip");
    expect(column).not.toContain("overflow-hidden");
    expect(column.some((c) => /^overflow-(auto|scroll|y-)/.test(c)), "no scrolling overflow either").toBe(false);
  });

  it("puts the glass on a backing that runs the column's full height, behind everything", () => {
    const glass = classesOf(sidebarFn, "data-sidebar-glass");
    for (const c of ["glass", "absolute", "inset-y-0", "left-0", "border-r"]) expect(glass, c).toContain(c);
    expect(sidebarFn.indexOf("data-sidebar-glass"), "the backing comes before the panel").toBeLessThan(sidebarFn.indexOf('<aside id="app-sidebar"'));
    expect(sidebarFn).toMatch(/<div aria-hidden data-sidebar-glass/);
  });

  it("keeps the content in a panel one window tall that sticks, with no fill of its own", () => {
    const aside = classesOf(sidebarFn, 'id="app-sidebar"');
    for (const c of ["sticky", "top-0", "h-dvh", "flex", "flex-col"]) expect(aside, c).toContain(c);
    for (const bad of ["glass", "card", "overflow-hidden"]) expect(aside, `the panel has no ${bad}`).not.toContain(bad);
    expect(aside.some((c) => /^bg-/.test(c))).toBe(false);
  });

  it("is a direct child of a shell that is at least a window tall, so the column has a height to stretch to", () => {
    expect(shell).toMatch(/<div className="bg-scene flex min-h-dvh print:block">\s*<Sidebar teacher=\{teacher\} \/>/);
    expect(shell).toMatch(/<div className="flex min-w-0 flex-1 flex-col">/);
  });

  it("keeps hiding, resizing and printing as they were", () => {
    expect(sidebarFn).toContain("print:hidden");
    expect(sidebarFn).toContain("inert={hidden}");
    expect(sidebarFn).toContain("motion-reduce:transition-none");
    expect(sidebarFn).toContain("{!hidden && <ResizeHandle />}");
    expect(sidebarFn).toMatch(/style=\{\{ width: hidden \? 0 : width \}\}/);
  });
});

describe("shell: the art at the foot of the sidebar", () => {
  it("is a registered plate from the art manifest, generated, and nothing new", () => {
    expect(SIDEBAR_ART).toBe("bg-act");
    expect(PLATES[SIDEBAR_ART]).toBeDefined();
    expect(PLATES[SIDEBAR_ART].source).toBe("generated");
    expect(art).toContain("PLATES[SIDEBAR_ART]");
    expect(code(art)).not.toMatch(/\.(webp|png|jpe?g|svg|gif)\b|["'`]\/(?:island|landing|images)\/|["'`]public\//); // no file named here
  });

  it("renders as one decorative picture: hidden from assistive tech, empty alt, never taking a click", () => {
    const html = renderToStaticMarkup(h(SidebarArt));
    expect(html).toContain('aria-hidden="true"');
    expect(html).toContain(`data-sidebar-art="${SIDEBAR_ART}"`);
    expect(html).toMatch(/pointer-events-none/);
    expect(html.match(/<img\b/g)).toHaveLength(1);
    expect(html).toMatch(/<img[^>]*alt=""/);
    expect(html).toContain(`src="${PLATES[SIDEBAR_ART].src}"`);
    expect(html).not.toMatch(/<(a|button)\b/);
  });

  it("fades out at its top edge into the glass, through a mask, so it isn't a picture box", () => {
    expect(SIDEBAR_ART_FADE).toBe("linear-gradient(180deg, transparent 0%, var(--fg) 55%)");
    const html = renderToStaticMarkup(h(SidebarArt));
    expect(html).toContain("mask-image:linear-gradient(180deg, transparent 0%, var(--fg) 55%)");
    expect(html).toContain("-webkit-mask-image:linear-gradient(180deg, transparent 0%, var(--fg) 55%)");
    expect(SIDEBAR_ART_FADE).not.toMatch(/#[0-9a-fA-F]{3,8}\b|rgba?\(/);
  });

  it("sits after the nav and the Settings link, in the flow, as the last thing in the panel: never behind a label", () => {
    const aside = sidebar.slice(sidebar.indexOf('<aside id="app-sidebar"'), sidebar.indexOf("</aside>"));
    const order = ["<nav ", "{NAV.map(", "<NavItem {...SETTINGS}", "<SidebarArt />"].map((t) => aside.indexOf(t));
    expect(order.every((i) => i > -1)).toBe(true);
    expect([...order].sort((a, b) => a - b)).toEqual(order);
    expect(aside.trim().endsWith("<SidebarArt />"), "the art is the panel's last child").toBe(true);
    const own = classesOf(art, "data-sidebar-art");
    for (const bad of ["absolute", "fixed", "sticky"]) expect(own, `the art is not ${bad}`).not.toContain(bad);
    expect(own.some((c) => /^-?z-/.test(c))).toBe(false);
    expect(code(art)).not.toMatch(/<(Link|a|button|NavItem|nav)\b/);
  });

  it("gives up height before anything else when the window is short", () => {
    const own = classesOf(art, "data-sidebar-art");
    expect(own).toContain("shrink");
    expect(own).not.toContain("shrink-0");
    expect(own).toContain("min-h-0");
    const aside = sidebar.slice(sidebar.indexOf('<aside id="app-sidebar"'), sidebar.indexOf("</aside>"));
    expect(aside.match(/shrink-0/g)?.length, "the header, the nav and the Settings link keep their height").toBeGreaterThanOrEqual(3);
  });

  it("uses tokens only and adds no motion", () => {
    expect(art).not.toMatch(/(?<![\w&])#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3,4})(?![\w-])/);
    expect(art).not.toMatch(/-\[-?[0-9.]+px\]/);
    expect(code(art)).not.toMatch(/animate-|transition|motion|keyframes|setInterval|setTimeout/);
  });
});

describe("shell: the sidebar's text stays on the glass, with the same contrast", () => {
  it("passes AA for the nav labels on the glass over the page's lightest and darkest backdrops", () => {
    for (const behind of [token("sky"), token("bg")]) {
      const glass = over(token("surface"), behind, alphaOf("glass-fill-strong"));
      for (const text of ["fg", "fg-3"]) expect(ratio(token(text), glass), `${text} on the sidebar glass over ${behind}`).toBeGreaterThanOrEqual(4.5);
    }
    expect(ratio(token("brand-ink"), token("brand-soft")), "the active item").toBeGreaterThanOrEqual(4.5);
  });

  it("leaves the nav items exactly as they were: same colors, no fill of their own on the sidebar, no shadow to hide the focus ring", () => {
    expect(sidebar).toContain('active ? "text-brand-ink" : "text-fg-3 hover:bg-surface-2/70 hover:text-fg"');
    expect(sidebar).toContain('className="mt-auto shrink-0 px-3 pb-4"');
    const navItem = sidebar.slice(sidebar.indexOf("function NavItem("), sidebar.indexOf("/** The draggable"));
    expect(navItem).not.toMatch(/(^|[\s"])(focus:|focus-visible:)?shadow-/);
    expect(navItem).not.toMatch(/outline/);
    expect(css).toMatch(/:focus-visible \{[^}]*box-shadow: var\(--ring\);/);
  });

  it("keeps the resize handle keyboard-operable with its visible focus state, and now as tall as the column", () => {
    expect(sidebar).toContain('role="separator"');
    expect(sidebar).toContain("tabIndex={0}");
    expect(sidebar).toContain("focus-visible:bg-brand/15");
    expect(sidebar).toContain("group-focus-visible:w-1 group-focus-visible:bg-brand");
    expect(sidebar).toContain("absolute inset-y-0 right-0");
    expect(sidebar).toContain("onKeyDown={onKeyDown}");
  });
});
