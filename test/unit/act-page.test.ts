import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { createElement as h } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ArtBackdrop } from "../../src/components/app/ArtBackdrop";
import { ART } from "../../src/components/island/assets";
import { PLATES, SCRIM_FLOOR } from "../../src/components/landing/plates";

// The Act page in the same style system as the rest of the app: the 4a primitives and tokens only, the coastal
// trail behind the page's header under the one banner scrim, every event and eco-action card the same tile, no
// picture on any card, and the banner and the content each in their own space. The page pulls in Firebase, so
// it is read as source; the banner's art is a real component and is rendered. Contrast against the real pixels,
// the pictures on the page, the geometry of the real boxes and the focus rings are measured in a browser; see
// design/reviews/stage4g/.

const root = join(__dirname, "../..");
const read = (rel: string) => readFileSync(join(root, rel), "utf8");
const act = read("src/pages/Act.tsx");
const card = read("src/components/act/EventCard.tsx");
const css = read("src/index.css");
const FILES = { "Act.tsx": act, "EventCard.tsx": card };
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
const scrimOf = (src: string) => /const \w+: PlateScrim = \{ kind: "start", alpha: ([\d.]+), hold: ([\d.]+), fade: ([\d.]+) \};/.exec(src);
/** The page's header and the grid under it. */
const header = act.slice(act.indexOf("<header"), act.indexOf("</header>"));

describe("act page: tokens only", () => {
  it("has no hex color, no arbitrary pixel size and no raw white, black or default-palette color", () => {
    for (const [name, text] of Object.entries(FILES)) {
      expect(text, name).not.toMatch(/(?<![\w&])#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3,4})(?![\w-])/);
      expect(text, `${name}: utility-[Npx]`).not.toMatch(/-\[-?[0-9.]+px\]/);
      expect(text, `${name}: text-[…]`).not.toMatch(/(?<![\w-])text-\[/);
      expect(text, `${name}: px in a grid track or min()/max()/clamp()`).not.toMatch(/(?:minmax|min|max|clamp)\([^)]*[0-9.]px/);
      expect(text, `${name}: ch or other arbitrary widths`).not.toMatch(/(?<![\w-])(?:min-w|max-w|w|h|size)-\[/);
      expect(text, `${name}: white/black`).not.toMatch(/(?<![\w-])(?:bg|text|border|ring|fill|stroke|from|via|to)-(?:white|black)(?![\w-])/);
      expect(text, `${name}: default palette`).not.toMatch(/(?<![\w-])(?:bg|text|border|ring|fill|stroke)-(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|blue|indigo|violet|purple|fuchsia|pink|rose)-\d{2,3}/);
      expect(text, `${name}: a colour made up in the page`).not.toMatch(/(?<![\w-])(?:bg|from|via|to)-\[(?:linear|radial|conic|color|rgb|hsl|oklch)/);
    }
  });

  it("uses the spacing scale and rem where it had 18px, 200px, 320px and 60ch", () => {
    expect(act).toContain("size-4.5"); // 18px
    expect(act).toContain("min-w-50"); // 200px
    expect(act).toContain("grid-cols-[minmax(0,1fr)_20rem]"); // the 320px side column
    expect(act).not.toMatch(/size-\[18px\]|min-w-\[200px\]|320px|max-w-\[60ch\]/);
  });

  it("never uses the faintest text color (below AA on the page), and the search placeholder is a darker one", () => {
    expect(ratio(token("fg-4"), token("bg"))).toBeLessThan(4.5);
    for (const [name, text] of Object.entries(FILES)) expect(text, name).not.toMatch(/text-fg-4/);
    expect(act).toContain('aria-label="Search listings" className="h-9 pl-9 text-base placeholder:text-fg-3" />');
    expect(ratio(token("fg-3"), token("surface")), "placeholder on the field").toBeGreaterThanOrEqual(4.5);
  });
});

describe("act page: the banner, on the coastal trail, under one scrim", () => {
  const scrim = scrimOf(act);

  it("draws the plate from the manifest: registered, generated, in public/, and not also an island picture", () => {
    const plate = PLATES["bg-act"];
    expect(plate.source).toBe("generated");
    expect(existsSync(join(root, "public", plate.src))).toBe(true);
    expect(Object.keys(ART), "one id means one picture").not.toContain("bg-act");
    expect(act).toContain('<ArtBackdrop art="bg-act" scrim={BANNER_SCRIM} position="center 38%" />');
    const html = renderToStaticMarkup(h(ArtBackdrop, { art: "bg-act", scrim: { kind: "start", alpha: 0.92, hold: 0.52, fade: 0.16 } }));
    expect(html).toContain(`src="${plate.src}"`);
    expect(html.match(/<img\b/g)).toHaveLength(1);
    expect(renderToStaticMarkup(h(ArtBackdrop, { art: "not-in-either-manifest", scrim: { kind: "all", alpha: 0.9 } }))).toBe("");
  });

  it("has one picture, in the banner, before any card", () => {
    expect(act.match(/<ArtBackdrop\b/g)).toHaveLength(1);
    expect(header).toContain("<ArtBackdrop");
    expect(act.indexOf("<ArtBackdrop")).toBeLessThan(act.indexOf("<Card"));
    expect(act.indexOf("<ArtBackdrop")).toBeLessThan(act.indexOf("<EventCard"));
    expect(act, "the page draws no other image").not.toMatch(/<img\b|<picture\b|role="img"|backgroundImage|url\(/);
  });

  it("is the same scrim as the Today and Island banners (the Study banner's differs only in where its hold ends), at least as opaque as the glass floor, held past the text", () => {
    expect(scrim, "BANNER_SCRIM").not.toBeNull();
    const today = scrimOf(read("src/pages/Today.tsx"));
    const island = scrimOf(read("src/pages/IslandPage.tsx"));
    const study = scrimOf(read("src/pages/Study.tsx"));
    for (const [name, other] of Object.entries({ Today: today, Island: island })) {
      expect(other, `${name}'s scrim`).not.toBeNull();
      expect(scrim!.slice(1), `Act's scrim and ${name}'s`).toEqual(other!.slice(1));
    }
    // Study's text is narrower (it ends by 35% of the banner), so its hold is shorter; the tint itself is the same.
    expect(study, "Study's scrim").not.toBeNull();
    expect(study![1], "the same tint").toBe(scrim![1]);
    expect(Number(study![2]), "held only as far as its own, narrower text").toBeLessThan(Number(scrim![2]));
    expect(Number(scrim![1])).toBeGreaterThanOrEqual(SCRIM_FLOOR);
    expect(Number(scrim![2]), "held past the 50% the text may reach").toBeGreaterThan(0.5);
    expect(header).toContain('<div className="min-w-0 max-w-1/2">'); // the text is held to half the banner, so its right edge is at most 50%
    for (const text of ["fg", "fg-2"]) expect(ratio(token(text), over(token("bg"), "#000000", Number(scrim![1]))), `${text} on the scrim over black`).toBeGreaterThanOrEqual(4.5);
    expect(header).toContain('<p className="t-eyebrow text-fg-2">Act</p>');
    expect(header).toContain('<p className="mt-2 text-md text-fg-2">');
  });

  it("keeps its buttons on an opaque fill over the picture, never a ghost or soft one", () => {
    expect(header).not.toMatch(/variant="(?:ghost|soft|danger-soft)"/);
    const variants = read("src/components/ui/button-variants.ts");
    expect(variants).toMatch(/primary:\s*"bg-brand text-brand-fg/);
    expect(variants).toMatch(/secondary: "border border-line-strong bg-surface text-fg/);
    expect(ratio(token("brand-fg"), token("brand"))).toBeGreaterThanOrEqual(4.5);
    expect(ratio(token("fg"), token("surface"))).toBeGreaterThanOrEqual(4.5);
  });

  it("is the same banner as Today's and the Island's, in its own space with the content under it", () => {
    const banner = "rounded-2xl border border-line px-8 py-9 shadow-sm";
    expect(act).toContain(`<header className="relative isolate overflow-hidden ${banner}">`);
    expect(read("src/pages/Today.tsx")).toContain(banner);
    expect(read("src/pages/IslandPage.tsx")).toContain(banner);
    expect(act).not.toMatch(/pb-24/);
    expect(act, "the content starts below the banner, with a gap").toContain('<div className="mt-6 grid grid-cols-[minmax(0,1fr)_20rem] gap-6">');
    expect(act.indexOf("</header>")).toBeLessThan(act.indexOf('<div className="mt-6 grid'));
  });
});

describe("act page: one tile for every event and eco action, no art on a card", () => {
  it("draws every listing through the one EventCard, with the same classes whatever the kind", () => {
    expect(act.match(/<EventCard\b/g)).toHaveLength(1);
    expect(code(card).match(/className=\{cn\(/g)).toHaveLength(5); // the link, the date column, the month, the icon, the title
    expect(code(card), "no class is keyed on the listing's kind (a badge's tone is not a class)").not.toMatch(/e\.kind[^\n]*(?:&& "[a-z]|\? "[a-z]+-[a-z])/);
    expect(card).toContain('"card group flex h-full gap-4 p-5 transition-[border-color,box-shadow,transform] duration-200 hover:-translate-y-px hover:border-line-strong hover:shadow-md');
    expect(code(card), "kind picks a badge and nothing else").not.toMatch(/e\.kind === "action" \?[^:]*"[^"]*(?:bg|text|border|p-|gap)-/);
  });

  it("lifts the same 1px as an interactive Card, so there is one hover", () => {
    expect(read("src/components/ui/card.tsx")).toContain("hover:-translate-y-px hover:border-line-strong hover:shadow-md");
    expect(card).toContain("hover:-translate-y-px hover:border-line-strong hover:shadow-md");
  });

  it("puts no picture on any card, tile or panel", () => {
    expect(card).not.toMatch(/<img\b|ArtBackdrop|role="img"|<picture\b|backgroundImage|url\(/);
    for (const m of act.matchAll(/<Card\b[\s\S]*?<\/Card>/g)) expect(m[0], "a card in Act.tsx").not.toMatch(/<img\b|ArtBackdrop|role="img"|backgroundImage|url\(|bg-\[|from-|via-|to-/);
  });

  it("makes the side column's panels cards like the rest: one padding, no tinted panel of their own", () => {
    expect(act.match(/<Card className="p-6">/g)).toHaveLength(5); // hours to verify, volunteer hours, suggestions, admin, ambassadors
    expect(act).not.toMatch(/<Card className="overflow-hidden"/);
    expect(act).not.toMatch(/--brand-soft\),var\(--ocean-soft|linear-gradient/);
    expect(act).toContain('<aside className="space-y-6 self-start">');
    expect(act.match(/grid grid-cols-2 gap-6/g)).toHaveLength(2); // the loading skeletons and the cards: the same gap as the columns
  });

  it("matches the loading skeleton to the card's radius", () => {
    expect(css).toMatch(/\.card \{\s*@apply rounded-lg/);
    expect(act.match(/<Skeleton className="h-40 rounded-lg" \/>/g)).toHaveLength(3);
    expect(act).not.toMatch(/rounded-xl/);
  });
});

describe("act page: the card's states", () => {
  it("keeps every badge and where it shows", () => {
    expect(card).toContain('<Badge tone={e.kind === "action" ? "sun" : "ocean"}>{e.kind === "action" ? "Eco action" : "Volunteer event"}</Badge>');
    expect(card).toContain('{e.scope === "class" ? <Badge tone="outline">{e.class_name || "Your class"}</Badge> : <Badge tone="outline">Community</Badge>}');
    expect(card).toContain('{cancelled && <Badge tone="coral">Cancelled</Badge>}');
    expect(card).toContain("{done && (");
    expect(card).toContain("{going && !done && (");
    expect(card).toContain("const cancelled = e.status === \"cancelled\";");
  });

  it("shows a cancelled listing as a muted tile (a surface tint, a greyed date column, a quieter title), not a faded one, so every word keeps AA", () => {
    expect(card).toContain('cancelled && "bg-surface-2",');
    expect(card).toContain('cancelled && "grayscale"');
    expect(card).toContain('cancelled ? "text-fg-2" : "text-fg"');
    expect(code(card), "no opacity on the card").not.toMatch(/(?<![\w-])opacity-\d/);
    const wasOpacity = over(token("fg-3"), over(token("surface"), token("bg"), alphaOf("glass-fill")), 0.7);
    expect(ratio(wasOpacity, over(token("surface"), token("bg"), alphaOf("glass-fill"))), "fg-3 text at 70% opacity, which it was").toBeLessThan(4.5);
    for (const text of ["fg", "fg-2", "fg-3"]) expect(ratio(token(text), token("surface-2")), `${text} on the muted tile`).toBeGreaterThanOrEqual(4.5);
  });

  it("passes AA for every badge and date-tile tone, and for the counts in the tabs", () => {
    const tones = read("src/lib/act.ts");
    for (const m of tones.matchAll(/(brand|ocean|sun|coral): "bg-(\w+)-soft text-([\w-]+)"/g)) expect(ratio(token(m[3]), token(`${m[2]}-soft`)), `${m[1]}`).toBeGreaterThanOrEqual(4.5);
    expect(ratio(token("fg-3"), token("surface-2")), "outline badge and tab counts on the tab track").toBeGreaterThanOrEqual(4.5);
    expect(ratio(token("fg-3"), over(token("surface"), token("bg"), alphaOf("glass-fill"))), "outline badge on a card").toBeGreaterThanOrEqual(4.5);
    expect(act).toContain('<span className="t-num text-fg-3">{counts.upcoming}</span>');
    expect(act).toContain('<span className="t-num text-fg-3">{counts.now}</span>');
  });
});

describe("act page: keyboard focus and motion", () => {
  it("gives a focused card the shared ring, composed over the card's own shadow (a shadow utility on a card would hide the base ring)", () => {
    expect(card).toContain("focus-visible:shadow-[var(--ring),var(--shadow-sm)] hover:focus-visible:shadow-[var(--ring),var(--shadow-md)]");
    expect(css).toMatch(/:focus-visible \{\s*outline: none;\s*box-shadow: var\(--ring\);/);
    expect(css).toMatch(/--shadow-sm:/);
    expect(css).toMatch(/--shadow-md:/);
  });

  it("adds no motion of its own: the card keeps its one reveal, the page its rise, and reduced motion is respected", () => {
    expect(card).toContain('<motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.28, delay: Math.min(index, 8) * 0.03, ease: [0.22, 1, 0.36, 1] }}>');
    expect(code(act), "the page itself").not.toMatch(/animate-|motion\.|transition-|duration-|keyframes|animation/);
    expect(code(card), "the card: its reveal and its hover, and no looping animation").not.toMatch(/animate-|keyframes|animation/);
    expect(css).toMatch(/@media \(prefers-reduced-motion: reduce\) \{[^@]*animation-duration: 0\.01ms !important;/);
    expect(read("src/App.tsx")).toContain('<MotionConfig reducedMotion="user">');
  });
});

describe("act page: copy, routes and logic are the page's own", () => {
  // Every line of text the page shows or labels, each checked against the page as it was before this stage.
  const COPY = [
    "Take it outside",
    'Volunteer events and eco actions from {teacher ? "your classes" : "your class"} and your community. Learn the science in Study, then put it to work here.',
    "Post an event",
    "Schedule an eco action",
    "Post a community event",
    "Suggest an event",
    'label="When"',
    'label="Type"',
    '{ value: "past", label: "Past" }',
    '{ value: "all", label: "All" }',
    '{ value: "event", label: "Events" }',
    '{ value: "action", label: "Eco actions" }',
    'placeholder="Search title, organizer or place"',
    'aria-label="Search listings"',
    `aria-label="Who it's for"`,
    "Classes and community",
    'classNames.length > 1 ? "All my classes" : "My class"',
    "<option value=\"community\">Community</option>",
    'aria-label="Location"',
    'regions.length ? "Any location" : "No locations yet"',
    'aria-label="Time"',
    "Any time",
    'phase === "past" ? "Ended today" : "Today"',
    'phase === "past" ? "Past week" : "Next 7 days"',
    'phase === "past" ? "Past 30 days" : "Next 30 days"',
    'aria-label="Category"',
    "All categories",
    'aria-label="Sort"',
    'phase === "past" ? "Most recent" : "Coming up soonest"',
    "Newest posted",
    "Most popular",
    "Least popular",
    "<RotateCcw /> Clear",
    "Nothing matches these filters",
    "Nothing scheduled yet",
    "Nothing happening today",
    "Nothing here yet",
    "Schedule an eco action for your class. There are twelve ready to go, each tied to an APES unit.",
    "Events and eco actions you could join show up here once they end.",
    "When your teacher or your community posts something, it shows up here. Know a cleanup or planting near you? Suggest it.",
    "Hours to verify",
    "Students are waiting on you to verify their volunteer hours.",
    "When students log hours with your class, you verify them here.",
    'Review {toReview.items.length === 1 ? "entry" : `${toReview.items.length} entries`}',
    "Your volunteer hours",
    '<span className="text-base text-fg-3">verified</span>',
    "waiting for your teacher",
    "Teacher-verified hours you can print for service requirements.",
    "<Plus /> Log hours",
    "<Printer /> Record",
    "Your suggestions",
    '"In review" : "Not approved"',
    "Admin",
    "Review suggested events and ambassador applications.",
    "Open admin",
    `profile.ambassador ? "You're an ambassador" : "Ecoisland Ambassadors"`,
    "Post community events for your area. They go live right away.",
    "Organize real events in your area, post them for everyone, and earn volunteer hours.",
    'profile.ambassador ? "Ambassador hub" : "Learn more and apply"',
    'Upcoming{counts.upcoming ? <span className="t-num text-fg-3">{counts.upcoming}</span> : null}',
    'Happening now{counts.now ? <span className="t-num text-fg-3">{counts.now}</span> : null}',
  ];

  it("keeps every line of copy and every label", () => {
    for (const text of COPY) expect(act, text).toContain(text);
  });

  it("keeps the routes: the hours record, the ambassador hub, admin and each listing's own page", () => {
    expect(act).toContain('<Link to="/act/hours">');
    expect(act).toContain('<Link to="/ambassador">');
    expect(act).toContain('<Link to="/admin">Open admin</Link>');
    expect(card).toContain("to={listingHref(e)}");
  });

  it("keeps the whole data flow, filtering, sorting, RSVP and hours logic exactly as it was (the block above the JSX is byte for byte unchanged)", () => {
    const block = act.slice(act.indexOf("export default function Act() {"), act.indexOf("  return (\n    <Page>"));
    expect(block.split("\n")).toHaveLength(99);
    // If you change Act's logic on purpose, replace this hash: it exists so a styling change cannot touch it.
    expect(createHash("sha256").update(block).digest("hex")).toBe("5b43ffffef27253cb88ad88bbb15a4c11b0af300fd5afcfd48d94d1a32678446");
  });

  it("keeps event creation, hours logging and review where they were opened from", () => {
    expect(act).toContain("{form && <EventForm open onOpenChange={(o) => !o && setForm(null)} classes={teacher ? classOptions : []} trusted={trusted} initialKind={form} />}");
    expect(act).toContain("{scheduling && <ScheduleAction open onOpenChange={setScheduling} classes={classOptions} trusted={trusted} />}");
    expect(act).toContain("{logging && <LogHoursDialog open onOpenChange={setLogging} verifiers={verifiers} />}");
    expect(act).toContain("{reviewing && <ReviewHoursDialog open onOpenChange={setReviewing} logs={toReview.items} />}");
    expect(act).toContain('<EventCard key={l.key} e={l} going={going.has(l.key)} done={done.has(l.key)} index={i} />');
    expect(act.match(/onClick=\{\(\) => setForm\("event"\)\}/g)).toHaveLength(3);
    expect(act.match(/onClick=\{\(\) => setScheduling\(true\)\}/g)).toHaveLength(2);
    expect(act).toContain("onClick={() => setLogging(true)}");
    expect(act).toContain("onClick={() => setReviewing(true)}");
  });
});
