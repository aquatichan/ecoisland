import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// The Ambassador page in the same style system as Today, Island and Act: the 4a primitives and tokens only, the
// forest canopy behind the page's header under the one banner scrim, the four benefit cards and the application
// panel all the same tile, no picture on any card, the blue and purple accent scoped to the page, and the banner
// and the content each in their own space. The page pulls in Firebase, so it is read as source; the banner's art
// is a real component and is rendered. Contrast against the real pixels, the geometry of the real boxes and the
// focus rings in the blue accent are measured in a browser; see design/reviews/stage4h/.

const root = join(__dirname, "../..");
const read = (rel: string) => readFileSync(join(root, rel), "utf8");
const page = read("src/pages/Ambassador.tsx");
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
const accentBlock = /\[data-accent="ambassador"\]\s*\{([\s\S]*?)\n\}/.exec(css)?.[1] ?? "";
const accent = (name: string) => new RegExp(`--${name}:\\s*(#[0-9a-fA-F]{6})`).exec(accentBlock)?.[1] ?? "";
const sha = (text: string) => createHash("sha256").update(text).digest("hex");

describe("ambassador page: tokens only", () => {
  it("has no hex color, no arbitrary pixel size and no raw white, black or default-palette color", () => {
    expect(page).not.toMatch(/(?<![\w&])#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3,4})(?![\w-])/);
    expect(page, "utility-[Npx]").not.toMatch(/-\[-?[0-9.]+px\]/);
    expect(page, "text-[…]").not.toMatch(/(?<![\w-])text-\[/);
    expect(page, "px in a grid track or min()/max()/clamp()").not.toMatch(/(?:minmax|min|max|clamp)\([^)]*[0-9.]px/);
    expect(page, "ch or other arbitrary widths").not.toMatch(/(?<![\w-])(?:min-w|max-w|w|h|size)-\[/);
    expect(page, "an arbitrary accent colour").not.toMatch(/(?<![\w-])accent-\[/);
    expect(page, "white/black").not.toMatch(/(?<![\w-])(?:bg|text|border|ring|fill|stroke|from|via|to)-(?:white|black)(?![\w-])/);
    expect(page, "default palette").not.toMatch(/(?<![\w-])(?:bg|text|border|ring|fill|stroke)-(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|blue|indigo|violet|purple|fuchsia|pink|rose)-\d{2,3}/);
    expect(page, "a colour made up in the page").not.toMatch(/(?<![\w-])(?:bg|from|via|to)-\[(?:linear|radial|conic|color|rgb|hsl|oklch)/);
  });

  it("uses the spacing scale and rem where it had 1040px, 420px, 18px, 52ch and 16ch", () => {
    expect(page).toContain("    <Page>\n"); // the shared content width, like every other page (it was a narrower 1040px column)
    expect(page).toContain("grid-cols-[minmax(0,1.3fr)_minmax(20rem,1fr)]"); // the form column: about 43% of the width, never under 320px
    expect(page).toContain("size-4.5"); // 18px
    expect(page).not.toMatch(/max-w-\[1040px\]|420px|size-\[18px\]|max-w-\[52ch\]|max-w-\[16ch\]/);
  });

  it("never uses the faintest text color (below AA on the page), and each placeholder is a darker one, set here and not in the shared field", () => {
    expect(ratio(token("fg-4"), token("bg"))).toBeLessThan(4.5);
    expect(page).not.toMatch(/text-fg-4/);
    expect(page.match(/className="placeholder:text-fg-3"/g)).toHaveLength(3); // region, the event idea, the sponsor
    for (const id of ["am-region", "am-idea", "am-sponsor"]) expect(page, id).toMatch(new RegExp(`id="${id}"[^\\n]*placeholder="[^"]+" className="placeholder:text-fg-3"`));
    expect(ratio(token("fg-3"), token("surface")), "placeholder on the field").toBeGreaterThanOrEqual(4.5);
    expect(page, "the page does not touch the shared field").not.toMatch(/from "@\/components\/ui\/field";[\s\S]*placeholder:text-fg-4/);
  });
});

describe("ambassador page: the title sits on the area's scene", () => {
  // The page no longer draws a banner picture of its own: the area's scene fills the window behind the page
  // (src/components/app/SceneBackdrop.tsx), and the title sits on it inside the title haze. The scene, the haze
  // and its contrast are checked once, in test/unit/scenes.test.ts.
  it("has a page-hero header with no box and no picture of its own, its text held to half the width, inside the haze", () => {
    for (const rel of ["src/pages/Ambassador.tsx"]) {
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

describe("ambassador page: one tile for the four benefits and the application panel, no art on a card", () => {
  it("makes every panel a Card with the same padding", () => {
    expect(page.match(/<Card\b[^>]*>/g)).toHaveLength(4); // a benefit, the ambassador status, the application status, the form
    for (const m of page.matchAll(/<Card\b[^>]*>/g)) expect(m[0]).toMatch(/^<Card (?:key=\{b\.title\} )?className="p-6">$/);
    expect(page, "the old bare tile").not.toContain("rounded-lg border border-line bg-surface p-5");
    expect(page).not.toMatch(/p-7|overflow-hidden rounded-xl/);
  });

  it("draws the four benefits through one Card in a map, with the icon in the page's accent tile", () => {
    expect(page.match(/BENEFITS\.map\(/g)).toHaveLength(1);
    expect(page).toContain('<span className="grid size-9 place-items-center rounded-md bg-brand-soft text-brand-ink" aria-hidden>');
    expect(page).toContain('<div className="grid grid-cols-2 gap-3">'); // 12px apart inside their tray
    expect(page).toContain('<p className="mt-3 text-md font-semibold text-fg">{b.title}</p>');
    expect(page).toContain('<p className="mt-1 text-sm leading-relaxed text-fg-3">{b.body}</p>');
  });

  it("puts no picture on any card, tile or panel", () => {
    for (const m of page.matchAll(/<Card\b[\s\S]*?<\/Card>/g)) expect(m[0], "a card").not.toMatch(/<img\b|ArtBackdrop|role="img"|backgroundImage|url\(|bg-\[|from-|via-|to-/);
  });

  it("matches the loading skeleton to the card's radius", () => {
    expect(css).toMatch(/\.card \{\s*@apply rounded-lg/);
    expect(page).toContain('<Skeleton className="h-96 rounded-lg" />');
    expect(page).not.toMatch(/rounded-xl/);
  });

  it("keeps the benefits' own text exactly", () => {
    const data = page.slice(page.indexOf("const BENEFITS = ["), page.indexOf("const GRADE_LABEL"));
    expect(sha(data)).toBe("e4b3aa5784c03d0ba9dd8e801adeb6d227943dcae2630b0765d5372d791fe1ba");
  });
});

describe("ambassador page: the blue and purple accent stays on this page", () => {
  it("wraps the whole page, banner included, in the one data-accent scope, and nothing else sets it", () => {
    expect(page.match(/data-accent=/g)).toHaveLength(1);
    expect(page).toContain('<div data-accent="ambassador">');
    expect(page.indexOf('<div data-accent="ambassador">')).toBeLessThan(page.indexOf("<header"));
    expect(page.indexOf("<EventForm")).toBeGreaterThan(page.indexOf("</header>"));
    for (const file of ["src/components/app/Sidebar.tsx", "src/components/app/Topbar.tsx", "src/components/app/Shell.tsx", "src/components/app/ArtBackdrop.tsx", "src/pages/Act.tsx", "src/pages/Today.tsx", "src/pages/IslandPage.tsx"]) {
      if (existsSync(join(root, file))) expect(read(file), file).not.toMatch(/data-accent|accent="ambassador"/);
    }
  });

  it("keeps the event dialog and the toast on the accent, as before", () => {
    expect(page).toContain('{posting && <EventForm open onOpenChange={setPosting} classes={[]} trusted accent="ambassador" />}');
    expect(page).toContain('toast.show({ tone: "success", title: "Application sent", body: "We\'ll review it and let you know here.", accent: "ambassador" });');
  });

  it("changes no accent token: the page uses the scope's own, and the medal is still only its two tokens", () => {
    expect(accentBlock).toMatch(/--brand: #2a52c8;/);
    expect(accentBlock).toMatch(/--accent-2: #6236bd;/);
    expect(accentBlock).toMatch(/--medal-navy: #0b1f4d;/);
    expect(accentBlock).toMatch(/--medal-cobalt: #0047ab;/);
    expect(page.match(/medal/gi)?.length, "the page names the medal only to draw its picture").toBeGreaterThan(0);
    expect(code(page), "the medal's blues come from the picture, never from the tokens at draw time").not.toMatch(/var\(--medal|medal-(?:navy|cobalt)/);
    const pub = (dir: string): string[] => readdirSync(join(root, dir), { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? pub(join(dir, e.name)) : [e.name]));
    expect(pub("public").filter((f) => /medal/i.test(f))).toEqual(["medal-v1.webp"]);
  });

  it("passes AA for the blue and purple, on glass over the banner's darkest picture and over the sky, and for white on the buttons", () => {
    const glass = over(token("surface"), token("sky"), alphaOf("glass-fill")); // a card, over the sky band at the top of the page
    const strong = over(token("surface"), "#000000", alphaOf("glass-fill-strong"));
    for (const [name, fg] of [["royal blue", accent("brand")], ["cobalt", accent("brand-strong")], ["blue ink", accent("brand-ink")], ["purple", accent("accent-2")]]) {
      expect(ratio(fg, glass), `${name} on a card over the sky`).toBeGreaterThanOrEqual(4.5);
      expect(ratio(fg, token("surface")), `${name} on the surface`).toBeGreaterThanOrEqual(4.5);
      expect(ratio(fg, accent("brand-soft")), `${name} on the soft tint`).toBeGreaterThanOrEqual(4.5);
      expect(ratio(fg, strong), `${name} on the strong glass over black`).toBeGreaterThanOrEqual(4.5);
    }
    expect(ratio(accent("brand-fg"), accent("brand")), "white on royal blue").toBeGreaterThanOrEqual(4.5);
    expect(ratio(accent("brand-fg"), accent("brand-strong")), "white on cobalt (hover)").toBeGreaterThanOrEqual(4.5);
  });

  it("keeps a disabled Send button readable: a flat surface tint with a darker word, not a 45% fade of the accent", () => {
    expect(page).toContain('className={cn("mt-6 w-full", !ready && "disabled:bg-surface-2 disabled:text-fg-3 disabled:opacity-100")}');
    expect(ratio(token("fg-3"), token("surface-2")), "fg-3 on the disabled tint").toBeGreaterThanOrEqual(4.5);
    expect(ratio(accent("brand-fg"), over(accent("brand"), token("surface"), 0.45)), "what it was: white on the accent at 45%").toBeLessThan(4.5);
  });

  it("takes the checkbox and every focus ring from the accent through the brand token, never a fixed color", () => {
    expect(page).toContain('className="mt-0.5 size-4 accent-brand"');
    expect(accentBlock).toMatch(/--ring:[^;]*var\(--brand\)/);
    expect(css).toMatch(/:focus-visible \{\s*outline: none;\s*box-shadow: var\(--ring\);/);
    expect(read("src/components/ui/field.tsx")).toContain("focus-visible:shadow-[var(--ring),var(--shadow-xs)]");
  });
});

describe("ambassador page: no motion of its own", () => {
  it("adds no animation, transition or motion: only the page's rise and the primitives' own", () => {
    expect(code(page)).not.toMatch(/animate-|motion\.|transition-|duration-|keyframes|animation|framer-motion/);
    expect(read("src/components/app/Guards.tsx")).toContain("animate-rise");
    expect(css).toMatch(/@media \(prefers-reduced-motion: reduce\) \{[^@]*animation-duration: 0\.01ms !important;/);
  });
});

describe("ambassador page: copy, routes, validation and the application logic are the page's own", () => {
  // Every line of text the page shows or labels, each checked against the page as it was before this stage.
  const COPY = [
    "Ecoisland Ambassadors",
    "Lead the work in your community",
    "Ambassadors organize cleanups, plantings and other real projects where they live, and bring their schools along. Ecoisland gives you the tools to post events, find volunteers and track their hours.",
    "<ArrowLeft className=\"size-4\" /> Act",
    "Approved ambassadors also get {ACT_REWARD.AMBASSADOR_TC} Treecoins for their island.",
    "<BadgeCheck /> Ambassador",
    "You're an Ecoisland Ambassador",
    "{profile.ambassador_region ? `For ${profile.ambassador_region}. ` : \"\"}Community events you post go live right away. Keep them accurate, and cancel anything that changes.",
    "<CalendarPlus /> Post a community event",
    "See what's happening",
    "<Clock /> In review",
    "Thanks for applying",
    "We read every application. You'll see the decision here, usually within a week. We may email you at {application.email || \"your account email\"}.",
    "Not this time",
    "Your application wasn't approved",
    "You're welcome to apply again with more detail about what you'd organize.",
    "Apply again",
    "Your application was approved. Refresh the page to see your ambassador tools.",
    "<h2 className=\"t-h2\">Apply</h2>",
    "Takes about five minutes. Tell us what you'd like to organize.",
    "label=\"Full name\"",
    "label=\"School\"",
    "label=\"Grade\"",
    "Choose",
    "{GRADE_LABEL[g]}",
    "label=\"City or region\"",
    "hint=\"Where you'd organize events.\"",
    "label=\"Why do you want to be an ambassador?\"",
    "`${LIMITS.AMBASSADOR_WHY_MIN - why.trim().length} more characters`",
    "label=\"An event you'd organize\"",
    "hint=\"Optional\"",
    "label=\"Teacher or adult sponsor\"",
    "hint=\"Optional, but it helps.\"",
    "placeholder=\"Austin, TX\"",
    "placeholder=\"A monthly litter sweep along our creek with the Environmental Club.\"",
    "placeholder=\"Ms. Rivera, APES\"",
    "I'll keep listings accurate and safe, follow the",
    "Terms",
    "and get a parent or guardian's OK for events if I'm under 18.",
    "<Sparkles /> Send application",
    "title: \"Application sent\"",
    "body: \"We'll review it and let you know here.\"",
    "useDocumentTitle(\"Ambassadors\");",
  ];

  it("keeps every line of copy and every label", () => {
    for (const text of COPY) expect(page, text).toContain(text);
    expect(page).toContain("Ecoisland gives you the tools to post events, find volunteers and track their hours.");
  });

  it("keeps the routes: back to Act twice, the terms in a new tab, and the application's own API call", () => {
    expect(page).toContain('<Link to="/act" className="plate mb-4');
    expect(page).toContain("<Link to=\"/act\">See what's happening</Link>");
    expect(page).toContain('<a href="/tos" target="_blank" rel="noopener noreferrer"');
    expect(page).toContain('await api("ambassador/apply", { fullName, school, grade, region, why, idea, sponsor, agree });');
    expect(page).toContain('track("ambassador_applied");');
    expect(page, "the button that opens the event dialog").toContain('<Button className="mt-6 w-full" size="lg" onClick={() => setPosting(true)}>');
    expect(page, "the button that reopens the form").toContain("<Button className=\"mt-6\" onClick={() => setReapply(true)}>");
  });

  it("keeps the page's state and the application form's validation and submit exactly as they were (byte for byte)", () => {
    const logic = page.slice(page.indexOf("export default function Ambassador() {"), page.indexOf("  return (\n    <Page"));
    expect(sha(logic)).toBe("4c26dc76f97adb8ded98ff310ad0472a4f792eee5f0629598d52ed36747b30ad");
    const form = page.slice(page.indexOf("function ApplicationForm("), page.indexOf("  return (\n    <Card"));
    expect(form).toContain("const ready = fullName.trim().length >= 2 && school.trim().length >= 2 && grade && region.trim().length >= 2 && why.trim().length >= LIMITS.AMBASSADOR_WHY_MIN && agree;");
    // If you change the page's logic or validation on purpose, replace these hashes: they exist so a styling change cannot touch them.
    expect(sha(form)).toBe("ee7c85608906c24e8b367f485f3f1c7b47b55595f83a18141241bd02fc91215a");
  });

  it("keeps each field's id, limit and size", () => {
    for (const line of [
      '<Input id="am-name" value={fullName} maxLength={80} onChange={(e) => setFullName(e.target.value)} />',
      '<Input id="am-school" value={school} maxLength={100} onChange={(e) => setSchool(e.target.value)} />',
      '<Select id="am-grade" value={grade} onChange={(e) => setGrade(e.target.value)}>',
      '<Input id="am-region" value={region} maxLength={LIMITS.REGION} placeholder="Austin, TX"',
      '<Textarea id="am-why" value={why} maxLength={LIMITS.AMBASSADOR_WHY_MAX} rows={4} onChange={(e) => setWhy(e.target.value)} />',
      '<Textarea id="am-idea" value={idea} maxLength={LIMITS.AMBASSADOR_IDEA_MAX} rows={3} placeholder=',
      '<Input id="am-sponsor" value={sponsor} maxLength={80} placeholder="Ms. Rivera, APES"',
      '<input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)}',
      "onClick={submit} loading={busy} disabled={!ready}",
      "<ApplicationForm onDone={() => setReapply(false)} defaultName={profile.full_name ?? \"\"} teacher={profile.role === \"teacher\"} />",
    ]) expect(page, line).toContain(line);
  });
});
