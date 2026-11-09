import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { createElement as h } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ArtBackdrop } from "../../src/components/app/ArtBackdrop";
import { PLATES, SCRIM_FLOOR } from "../../src/components/landing/plates";

// The Class pages (the list of classes and one class, as a teacher and as a student) in the same style system as Today,
// Island, Act and Ambassador: the 4a primitives and tokens only, the faint sky behind each header under the one banner
// scrim, every class card the same tile as an event card, no picture on any card, and the banner and the content each in
// their own space. The pages pull in Firebase, so they are read as source. Contrast against the real pixels, the geometry of
// the real boxes and the focus rings are measured in a browser, for a teacher and a student in a seeded class; see
// design/reviews/stage4i-1/.

const root = join(__dirname, "../..");
const read = (rel: string) => readFileSync(join(root, rel), "utf8");
const classes = read("src/pages/Classes.tsx");
const detail = read("src/pages/ClassDetail.tsx");
const chat = read("src/components/class/ClassChat.tsx");
const css = read("src/index.css");
const FILES = { "Classes.tsx": classes, "ClassDetail.tsx": detail, "ClassChat.tsx": chat };
/** A file's code, without its comments. */
const code = (text: string) => text.replace(/^\s*\/\/.*$/gm, "").replace(/\{\/\*[\s\S]*?\*\/\}/g, "");
const sha = (text: string) => createHash("sha256").update(text).digest("hex");
/** Every line of a file with only its class strings taken out: its copy, its routes and its logic. */
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
const scrimOf = (src: string) => /const \w+: PlateScrim = \{ kind: "start", alpha: ([\d.]+), hold: ([\d.]+), fade: ([\d.]+) \};/.exec(src);
const header = (src: string) => src.slice(src.indexOf("<header"), src.indexOf("</header>"));
const BANNER = "rounded-2xl border border-line px-8 py-9 shadow-sm";

describe("class pages: tokens only", () => {
  it("has no hex color, no arbitrary pixel size and no raw white, black or default-palette color", () => {
    for (const [name, text] of Object.entries(FILES)) {
      expect(text, name).not.toMatch(/(?<![\w&])#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3,4})(?![\w-])/);
      expect(text, `${name}: utility-[Npx]`).not.toMatch(/-\[-?[0-9.]+px\]/);
      expect(text, `${name}: text-[…]`).not.toMatch(/(?<![\w-])text-\[/);
      expect(text, `${name}: px in a grid track or min()/max()/clamp()/calc()`).not.toMatch(/(?:minmax|min|max|clamp|calc)\([^)]*[0-9.]px/);
      expect(text, `${name}: an arbitrary fixed width or height`).not.toMatch(/(?<![\w-])(?:min-w|max-w|w|h|min-h|max-h|size)-\[[0-9.]+(?:px|ch)\]/);
      expect(text, `${name}: an arbitrary accent colour`).not.toMatch(/(?<![\w-])accent-\[/);
      expect(text, `${name}: white/black`).not.toMatch(/(?<![\w-])(?:bg|text|border|ring|fill|stroke|from|via|to)-(?:white|black)(?![\w-])/);
      expect(text, `${name}: default palette`).not.toMatch(/(?<![\w-])(?:bg|text|border|ring|fill|stroke)-(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|blue|indigo|violet|purple|fuchsia|pink|rose)-\d{2,3}/);
      expect(text, `${name}: a colour made up in the page`).not.toMatch(/(?<![\w-])(?:bg|from|via|to)-\[(?:linear|radial|conic|color|rgb|hsl|oklch)/);
    }
  });

  it("uses the spacing scale and rem where it had 18px, 220px, 160px, 92px, 72px, 520px, 560px and the 260px to 340px columns", () => {
    for (const token of ["size-4.5", "max-w-130", "w-55", "w-40", "w-23", "min-h-18", "grid-cols-[1fr_16.25rem]", "grid-cols-[minmax(0,1fr)_18.75rem]", "grid-cols-[minmax(0,1fr)_21.25rem]"]) expect(detail, token).toContain(token);
    expect(classes).toContain("max-w-140"); // 560px
    expect(classes).toContain("size-4.5");
    expect(chat).toContain("grid-cols-[minmax(0,1fr)_18.75rem]");
    expect(chat).toContain("h-[min(42.5rem,calc(100dvh-20.625rem))] min-h-115");
    expect(chat).toContain("max-h-33 min-h-6");
    expect(chat).toContain("accent-brand");
  });

  it("never uses the faintest text color (below AA), and each placeholder is a darker one, set on the field and not in the shared primitive", () => {
    expect(ratio(token("fg-4"), token("bg"))).toBeLessThan(4.5);
    for (const [name, text] of Object.entries(FILES)) expect(text, name).not.toMatch(/text-fg-4|placeholder:text-fg-4/);
    expect(detail).toContain('className="min-h-18 placeholder:text-fg-3" placeholder="Focus on part (c). We\'ll discuss it Friday."');
    expect(detail).toContain('placeholder="Unit 4 test" className="placeholder:text-fg-3"');
    expect(chat).toContain("placeholder:text-fg-3");
    const today = read("src/pages/Today.tsx");
    expect(today, "the join and create forms the Class page reuses").toContain('uppercase placeholder:text-fg-3"');
    expect(today).toContain('maxLength={60} className="placeholder:text-fg-3" />');
    expect(ratio(token("fg-3"), token("surface")), "a placeholder on a field").toBeGreaterThanOrEqual(4.5);
    expect(ratio(token("fg-3"), token("surface-2")), "a muted word on the table header and the tabs").toBeGreaterThanOrEqual(4.5);
  });
});

describe("class pages: the banner, on the faint sky, under one scrim", () => {
  it("draws the plate from the manifest on both pages: registered, generated, in public/", () => {
    const plate = PLATES["bg-stats"];
    expect(plate.source).toBe("generated");
    expect(existsSync(join(root, "public", plate.src))).toBe(true);
    for (const [name, src] of [["Classes", classes], ["ClassDetail", detail]] as const) {
      expect(src.match(/<ArtBackdrop\b/g), name).toHaveLength(1);
      expect(src, name).toContain('<ArtBackdrop art="bg-stats" scrim={BANNER_SCRIM} position="center 40%" />');
      expect(header(src), name).toContain("<ArtBackdrop");
      // the first container on the page, ahead of the tabs and every card the page's own content draws
      expect(src.indexOf("<ArtBackdrop"), `${name}: before the content`).toBeLessThan(src.indexOf(name === "Classes" ? "<Card" : "<Segmented"));
    }
    const html = renderToStaticMarkup(h(ArtBackdrop, { art: "bg-stats", scrim: { kind: "start", alpha: 0.92, hold: 0.52, fade: 0.16 } }));
    expect(html).toContain(`src="${plate.src}"`);
    expect(html.match(/<img\b/g)).toHaveLength(1);
  });

  it("draws no other picture on either page: the only images are the island scenes inside the two dialogs", () => {
    for (const [name, src] of [["Classes", classes], ["ClassDetail", detail], ["ClassChat", chat]] as const) expect(src, name).not.toMatch(/<img\b|<picture\b|role="img"|backgroundImage|url\(/);
    expect(detail.match(/<IslandScene\b/g)).toHaveLength(2);
    for (const m of detail.matchAll(/<IslandScene\b[\s\S]*?\/>/g)) {
      const before = detail.slice(0, m.index);
      expect(before.lastIndexOf("<DialogContent"), "an island scene sits inside a dialog").toBeGreaterThan(before.lastIndexOf("</DialogContent>"));
    }
  });

  it("is the same scrim as the Today, Island, Act and Ambassador banners, at least as opaque as the glass floor, held past the text", () => {
    for (const [name, src] of [["Classes", classes], ["ClassDetail", detail]] as const) {
      const scrim = scrimOf(src);
      expect(scrim, `${name}'s scrim`).not.toBeNull();
      for (const [other, file] of [["Today", "src/pages/Today.tsx"], ["Island", "src/pages/IslandPage.tsx"], ["Act", "src/pages/Act.tsx"], ["Ambassador", "src/pages/Ambassador.tsx"]]) {
        expect(scrim!.slice(1), `${name}'s scrim and ${other}'s`).toEqual(scrimOf(read(file))!.slice(1));
      }
      expect(Number(scrim![1])).toBeGreaterThanOrEqual(SCRIM_FLOOR);
      expect(Number(scrim![2]), "held past the 50% the text may reach").toBeGreaterThan(0.5);
      const behind = over(token("bg"), "#000000", Number(scrim![1]));
      for (const text of ["fg", "fg-2"]) expect(ratio(token(text), behind), `${text} on the scrim over black`).toBeGreaterThanOrEqual(4.5);
    }
  });

  it("holds the text to the left half and keeps what sits over the picture on an opaque fill", () => {
    expect(header(classes)).toContain('<div className="max-w-1/2">');
    expect(header(detail)).toContain('<div className="min-w-0 max-w-1/2">');
    expect(header(classes)).toContain('<p className="t-eyebrow text-fg-2">');
    expect(header(detail)).toContain('<p className="t-eyebrow text-fg-2">');
    expect(header(classes)).toContain('<p className="mt-2 text-md text-fg-2">');
    expect(header(detail)).toContain('<p className="mt-2 text-md text-fg-2">');
    expect(header(detail)).toContain('className="mb-5 inline-flex items-center gap-1.5 text-base font-medium text-fg-2 hover:text-fg"');
    // the join code and the class menu sit over the picture: an opaque surface button each, never a ghost one
    expect(detail).toContain("rounded-md border border-line-strong bg-surface px-4 py-2.5 text-left shadow-xs hover:bg-surface-2");
    expect(detail).toContain('<Button variant="secondary" size="icon" aria-label="Class options">');
    expect(header(detail)).not.toMatch(/variant="(?:ghost|soft)"/);
  });

  it("is the same banner as the other pages', in its own space with the content under it", () => {
    for (const [name, src] of [["Classes", classes], ["ClassDetail", detail]] as const) {
      expect(src, name).toContain(`<header className="relative isolate overflow-hidden ${BANNER}">`);
      expect(src, name).not.toMatch(/pb-24|-mt-/);
    }
    for (const file of ["src/pages/Today.tsx", "src/pages/IslandPage.tsx", "src/pages/Act.tsx", "src/pages/Ambassador.tsx"]) expect(read(file), file).toContain(BANNER);
    expect(classes).toContain('<div className="mt-6 space-y-6">');
    expect(classes).toContain('<div className="mt-6 grid grid-cols-3 gap-6">');
    expect(detail).toContain('options={tabs} className="mt-6 mb-6" />');
    expect(detail.indexOf("</header>")).toBeLessThan(detail.indexOf("<Segmented"));
  });
});

describe("class pages: one tile, no art on a card", () => {
  it("makes a class card one link that is the whole card, the same tile as an event card", () => {
    const tile = "card group flex h-full flex-col p-6 transition-[border-color,box-shadow,transform] duration-200 hover:-translate-y-px hover:border-line-strong hover:shadow-md focus-visible:shadow-[var(--ring),var(--shadow-sm)] hover:focus-visible:shadow-[var(--ring),var(--shadow-md)]";
    expect(classes).toContain(`const CLASS_CARD = "${tile}";`);
    expect(classes.match(/className=\{CLASS_CARD\}/g)).toHaveLength(1);
    const event = read("src/components/act/EventCard.tsx");
    for (const part of ["card group", "hover:-translate-y-px hover:border-line-strong hover:shadow-md", "focus-visible:shadow-[var(--ring),var(--shadow-sm)] hover:focus-visible:shadow-[var(--ring),var(--shadow-md)]", "transition-[border-color,box-shadow,transform] duration-200"]) {
      expect(event, `EventCard: ${part}`).toContain(part);
      expect(tile, `the class card: ${part}`).toContain(part);
    }
    expect(classes, "no Card wraps a link any more").not.toMatch(/<Card[^>]*interactive/);
    expect(classes).toContain("<Link key={c.id} to={`/class/${c.id}`} className={CLASS_CARD}>");
  });

  it("gives every other panel one of a few shapes: a padded card, a list card, or an empty state, never p-5, p-7 or p-8", () => {
    const allowed = new Set(['<Card className="p-6">', '<Card className="px-4 py-2">', '<Card className="p-2">', '<Card className="overflow-hidden">', '<Card className="self-start p-6">', '<Card key={n.id} className="p-6">', '<Card className="mx-auto max-w-130">', "<Card>"]);
    for (const [name, src] of [["Classes", classes], ["ClassDetail", detail], ["ClassChat", chat]] as const) {
      for (const m of src.matchAll(/<Card\b[^>]*>/g)) expect(allowed.has(m[0]) || /^<Card className="flex h-\[min\(42\.5rem[^"]*">$/.test(m[0]), `${name}: ${m[0]}`).toBe(true);
      expect(src, name).not.toMatch(/(?<![\w-])p-(?:5|7|8)(?![\w-])/);
    }
    expect(detail.match(/<Card className="p-6">/g)).toHaveLength(3); // class details, delete class, join code
  });

  it("puts no picture on any card, tile or panel, and matches the loading skeletons to the card radius", () => {
    for (const [name, src] of [["Classes", classes], ["ClassDetail", detail]] as const) {
      for (const m of src.matchAll(/<Card\b[\s\S]*?<\/Card>/g)) expect(m[0], `${name}: a card`).not.toMatch(/<img\b|ArtBackdrop|role="img"|backgroundImage|url\(|bg-\[|from-|via-|to-/);
      expect(src, name).not.toMatch(/rounded-xl/);
    }
    expect(css).toMatch(/\.card \{\s*@apply rounded-lg/);
    expect(classes.match(/<Skeleton className="h-36 rounded-lg" \/>/g)).toHaveLength(2);
    expect(detail.match(/<Skeleton className="[^"]*rounded-lg" \/>/g)!.length).toBeGreaterThanOrEqual(6);
    expect(classes).toContain("grid grid-cols-3 gap-6");
    expect(detail).toContain('<div className="grid grid-cols-2 gap-6">');
  });
});

describe("class pages: keyboard focus", () => {
  it("lets a keyboard reach every roster student: the name is a button that opens the same dialog as the row", () => {
    expect(detail).toContain('<button type="button" className="flex items-center gap-3 text-left" onClick={() => setOpen(m)}>');
    expect(detail).toContain('<tr key={m.uid} className="cursor-pointer hover:bg-surface-2/50" onClick={() => setOpen(m)}>');
  });

  it("gives the join code, the class card and every other control the shared ring (a shadow utility on one composes it over its own)", () => {
    expect(detail).toContain("shadow-xs hover:bg-surface-2 focus-visible:shadow-[var(--ring),var(--shadow-xs)]");
    expect(classes).toContain("focus-visible:shadow-[var(--ring),var(--shadow-sm)] hover:focus-visible:shadow-[var(--ring),var(--shadow-md)]");
    expect(css).toMatch(/:focus-visible \{\s*outline: none;\s*box-shadow: var\(--ring\);/);
    expect(css).toMatch(/--shadow-xs:/);
    expect(css).toMatch(/--shadow-sm:/);
    expect(css).toMatch(/--shadow-md:/);
  });
});

describe("class pages: no accent and no motion of their own", () => {
  it("keeps the brand green: no accent scope on these pages", () => {
    for (const [name, text] of Object.entries(FILES)) expect(text, name).not.toMatch(/data-accent|accent="/);
  });

  it("adds no animation or transition: only the chevron's turn, the type buttons' colour, the class card's hover and the chat's own", () => {
    const transitions = (text: string) => [...code(text).matchAll(/(?<![\w-])transition-[\w[\],-]+/g)].map((m) => m[0]).sort();
    expect(transitions(detail)).toEqual(["transition-colors", "transition-transform"]);
    expect(transitions(classes)).toEqual(["transition-[border-color,box-shadow,transform]"]);
    expect(transitions(chat)).toEqual(["transition-colors", "transition-opacity"]);
    for (const [name, text] of Object.entries(FILES)) expect(code(text), name).not.toMatch(/animate-|motion\.|keyframes|animation/);
    expect(css).toMatch(/@media \(prefers-reduced-motion: reduce\) \{[^@]*animation-duration: 0\.01ms !important;/);
  });
});

describe("class pages: copy, routes and logic are the pages' own", () => {
  it("keeps every line of copy, every route and every call, exactly (every line but its class strings is pinned)", () => {
    // If you change a page's copy, route or logic on purpose, replace these hashes: they exist so a styling change cannot touch them.
    expect(sha(norm(classes))).toBe("b416606fecaa2fd0db3f2f6daae03b3f25f15979002c0b4e5908742a78e615ad");
    expect(sha(norm(detail))).toBe("3f6780d5769a24a6baf8220c20b8eb8770993dd6555f0928f8ea45ce35bd861b");
    expect(sha(norm(chat))).toBe("99c0274547b717784ef1fdd85030a1d5e58eb279ac55a0ed178c059656f774e2");
  });

  it("keeps the routes and the writes by name", () => {
    for (const line of ['to={teacher ? "/class" : "/today"}', 'api("class/leave", { classId })', 'api("class/remove", { classId: cls.id, uid: member.uid })', 'api("class/delete", { classId: cls.id })', 'run("reset", "class/reset-code", {}', '"class/unblock"', "updateClass(cls.id, {", "createAssignment(cls.id, profile.id, input)", "deleteAssignment(cls.id, a.id)", "assignmentHref(a)", 'navigate("/class?join=1")', "<Link to=\"/act\">Find an eco action</Link>"]) expect(detail, line).toContain(line);
    for (const line of ['to="/class?new=1"', "to={`/class/${c.id}`}", 'return <Navigate to={`/class/${classes[0].id}`} replace />', "<CreateFirstClass />", "<JoinClassInline />"]) expect(classes, line).toContain(line);
    expect(chat).toContain('api("chat/toggle", { classId: cls.id, enabled: on })');
  });
});
