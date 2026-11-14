import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { createElement as h } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ART } from "../../src/components/island/assets";
import { GREYED, MarketTile, SkyWell, SpriteWell, TILE, WELL, WELL_PAD, WELL_SIZE } from "../../src/components/island/tiles";
import { DECOR, GROWTH, SKIES } from "../../src/shared/catalog";
import { islandHealth } from "../../src/shared/economy";
import { marketState, type MarketState } from "../../src/shared/island";
import { landmarkArt } from "../../src/shared/landmarks";

// The Island page in the same style system as the rest of the app, harmonized: one tile for every market card,
// one light direction, one scrim, the banner on the same sky as the scene, and locked items greyed by a filter
// on the same art. The page pulls in Firebase, so it is read as source; the tiles are real components and are
// rendered. Contrast against the real pixels, the pictures on the page and the focus rings are measured in a
// browser; see design/reviews/stage4f/.

const root = join(__dirname, "../..");
const read = (rel: string) => readFileSync(join(root, rel), "utf8");
const page = read("src/pages/IslandPage.tsx");
const tilesSrc = read("src/components/island/tiles.tsx");
const skyThumb = read("src/components/island/SkyThumb.tsx");
const css = read("src/index.css");
const FILES = { "IslandPage.tsx": page, "tiles.tsx": tilesSrc, "SkyThumb.tsx": skyThumb };
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
const token = (name: string) => new RegExp(`--${name}:\\s*(#[0-9a-fA-F]{6})`).exec(css)?.[1] ?? "";
/** The text of the page's `getButton`, which is the one place a price or a lock can be drawn. */
const getButton = page.slice(page.indexOf("const getButton ="), page.indexOf("const saveDecor"));
const STATES: MarketState[] = ["owned", "locked", "free", "buy"];
const skyIds = SKIES.map((s) => s.id);

describe("island page: tokens only", () => {
  it("has no hex color, no arbitrary pixel size and no raw white, black or default-palette color", () => {
    for (const [name, text] of Object.entries(FILES)) {
      expect(text, name).not.toMatch(/(?<![\w&])#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3,4})(?![\w-])/);
      expect(text, `${name}: utility-[Npx]`).not.toMatch(/-\[-?[0-9.]+px\]/);
      expect(text, `${name}: text-[…]`).not.toMatch(/(?<![\w-])text-\[/);
      expect(text, `${name}: px in a grid track or min()/max()/clamp()`).not.toMatch(/(?:minmax|min|max|clamp)\([^)]*[0-9.]px/);
      expect(text, `${name}: white/black`).not.toMatch(/(?<![\w-])(?:bg|text|border|ring|fill|stroke|from|via|to)-(?:white|black)(?![\w-])/);
      expect(text, `${name}: default palette`).not.toMatch(/(?<![\w-])(?:bg|text|border|ring|fill|stroke)-(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|blue|indigo|violet|purple|fuchsia|pink|rose)-\d{2,3}/);
    }
  });

  it("uses the spacing scale and rem where it had 72px, 64px, 300px, 340px, 380px and 120px", () => {
    expect(tilesSrc).toContain("h-18"); // 72px
    expect(skyThumb).not.toContain("h-[64px]");
    expect(page).toContain("w-75"); // 300px
    expect(page).toContain("max-w-85"); // 340px
    expect(page).toContain("grid-cols-[minmax(0,1.6fr)_minmax(19rem,1fr)]"); // the market column: about 38% of the width, never under 304px
    expect(page).toContain("max-h-[calc(100dvh-7.5rem)]"); // 120px
  });

  it("never uses the faintest text color (below AA on the page), and draws no hand-made 'Animated' badge over art", () => {
    expect(ratio(token("fg-4"), token("bg"))).toBeLessThan(4.5);
    for (const [name, text] of Object.entries(FILES)) expect(text, name).not.toMatch(/text-fg-4/);
    expect(skyThumb).not.toMatch(/bg-black|text-white/);
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

describe("island page: one tile style for every market card", () => {
  const tile = (state: MarketState, extra = "") => renderToStaticMarkup(h(MarketTile, { id: "x", state, title: extra || undefined }, "inside"));

  it("defines the tile once, and the page never writes its own", () => {
    expect(TILE).toBe("rounded-md border border-line bg-surface p-2.5");
    for (const rel of ["src/pages/IslandPage.tsx", "src/components/island/SkyThumb.tsx"]) expect(read(rel), rel).not.toMatch(/rounded-md border border-line(?: bg-surface)? p-2\.5/);
    expect(page.match(/<MarketTile\b/g), "growth, skies and decorations").toHaveLength(3);
    expect(page).not.toMatch(/import \{[^}]*\b(ArtThumb|SkyThumb)\b[^}]*\} from/); // pictures reach the page only through the wells
  });

  it("gives growth, sky and decoration tiles the identical card, whatever they hold and in whatever state", () => {
    // (cn() may reorder the classes, so compare them as a set)
    const set = (html: string) => [...new Set(/class="([^"]*)"/.exec(html)![1].split(/\s+/))].sort();
    const sets = STATES.map((s) => JSON.stringify(set(tile(s))));
    expect(new Set(sets).size, "one class list for every state").toBe(1);
    expect(set(tile("owned"))).toEqual([...new Set(TILE.split(" "))].sort());
    // Only the sky in use changes it: its border turns brand and it gains a ring.
    const inUse = set(renderToStaticMarkup(h(MarketTile, { id: "x", state: "owned", selected: true }, "in use")));
    expect(inUse).toEqual(expect.arrayContaining(["border-brand", "ring-2", "ring-brand/25", "rounded-md", "p-2.5", "bg-surface"]));
    expect(inUse).not.toContain("border-line");
  });

  it("gives every picture the same well: the same radius, tint and padding, in the grid and in the lists", () => {
    const wells = [
      renderToStaticMarkup(h(SpriteWell, { art: GROWTH[0].art })),
      renderToStaticMarkup(h(SpriteWell, { art: DECOR[0].art })),
      renderToStaticMarkup(h(SpriteWell, { art: landmarkArt(1), size: "row" })),
      renderToStaticMarkup(h(SpriteWell, { art: DECOR[1].art, size: "row" })),
    ];
    for (const html of wells) {
      expect(html).toContain(WELL);
      expect(html).toContain(WELL_PAD);
    }
    expect(wells[0]).toContain(WELL_SIZE.grid);
    expect(wells[1]).toContain(WELL_SIZE.grid);
    expect(wells[2]).toContain(WELL_SIZE.row);
    expect(wells[3]).toContain(WELL_SIZE.row);
    // The sky's well is the same well, without the sprite padding because its picture fills it.
    const sky = renderToStaticMarkup(h(SkyWell, { id: "day" }));
    expect(sky).toContain(WELL);
    expect(sky).toContain(WELL_SIZE.grid);
    expect(sky).not.toContain(WELL_PAD);
    expect(WELL).toContain("rounded-sm");
  });

  it("uses the wells for every sprite on the page: the shop, the landmarks list and the arrange list", () => {
    expect(page.match(/<SpriteWell\b/g)).toHaveLength(4);
    expect(page.match(/<SkyWell\b/g)).toHaveLength(1);
    expect(page).toContain("<SpriteWell art={landmarkArt(u.n)} locked={!have} size=\"row\" />");
    expect(page).toContain('<SpriteWell art={findDecor(d.id)?.art ?? ""} size="row" />');
    expect(page).not.toMatch(/<img\b/);
  });
});

describe("island page: one light direction", () => {
  it("lights every well from the upper left, as the sprites are lit", () => {
    expect(WELL).toContain("bg-linear-to-br");
    expect(WELL).toContain("from-surface-2");
    expect(WELL).toContain("to-surface-3");
    expect(lum(token("surface-2")), "lightest at the top left").toBeGreaterThan(lum(token("surface-3")));
    for (const [name, text] of Object.entries(FILES)) expect(text.match(/bg-linear-to-(?!br\b)[a-z]+/g) ?? [], `${name} has no other gradient direction`).toEqual([]);
  });

  it("agrees with the art: the island art README says upper left, and the audit measured it", () => {
    expect(read("design/island-art/README.md")).toMatch(/upper left/);
    const audit = read("design/reviews/stage4f/sprite-audit.md");
    expect(audit).toContain("**32 of 33**");
    expect(audit).toMatch(/sky-day.*70% across/);
    expect(existsSync(join(root, "design/reviews/stage4f/sprite-audit.png"))).toBe(true);
  });
});

describe("island page: a locked item is the same picture, greyed by a filter", () => {
  it("greys a locked sprite or sky and nothing else, on the very same file", () => {
    expect(GREYED).toBe("opacity-60 grayscale");
    for (const art of [GROWTH[3].art, DECOR[2].art, landmarkArt(4)]) {
      const open = renderToStaticMarkup(h(SpriteWell, { art }));
      const locked = renderToStaticMarkup(h(SpriteWell, { art, locked: true }));
      expect(open).not.toMatch(/grayscale/);
      expect(locked).toMatch(/grayscale/);
      expect(/src="([^"]+)"/.exec(open)![1], "the same file").toBe(/src="([^"]+)"/.exec(locked)![1]);
    }
    const sky = renderToStaticMarkup(h(SkyWell, { id: "aurora", animated: true }));
    const lockedSky = renderToStaticMarkup(h(SkyWell, { id: "aurora", animated: true, locked: true }));
    expect(/src="([^"]+)"/.exec(sky)![1]).toBe(/src="([^"]+)"/.exec(lockedSky)![1]);
    expect(lockedSky).toMatch(/grayscale/);
    const chip = /<span class="glass absolute[^"]*"[^>]*>[\s\S]*?Animated<\/span>/.exec(lockedSky);
    expect(chip, "the Animated chip is drawn").not.toBeNull();
    expect(chip![0], "the Animated chip is not greyed").not.toMatch(/grayscale|opacity-60/);
  });

  it("has no second set of art for locked items", () => {
    expect(Object.keys(ART).filter((id) => /lock|grey|gray|mono/.test(id))).toEqual([]);
  });

  it("greys by the item's market state, and by whether a landmark is earned", () => {
    for (const kind of ["g", "s", "d"]) expect(page).toContain(`locked={stateOf(${kind}.id) === "locked"}`);
    expect(page).toContain("locked={!have}");
  });
});

describe("island page: marketState drives every card", () => {
  it("decides each card's offer in one place, and gives every tile that decision", () => {
    expect(page).toContain("const stateOf = (id: string) => marketState(id, owned, xp);");
    for (const kind of ["g", "s", "d"]) expect(page).toContain(`state={stateOf(${kind}.id)}`);
    expect(page.match(/marketState\(/g)).toHaveLength(1);
    expect(page).toContain("const owned = useMemo(() => new Set([...(profile.owned_items ?? []), ...claimed]), [profile.owned_items, claimed]);"); // what was just claimed counts at once
    expect(page).toContain("setClaimed((prev) => new Set(prev).add(id));");
  });

  it("never offers a price for something owned: the owned branch comes first, in every tile and in the button", () => {
    expect(getButton).toContain('if (state === "owned") return null;');
    expect(getButton.indexOf('state === "owned"')).toBeLessThan(getButton.indexOf('state === "locked"'));
    expect(getButton.indexOf('state === "locked"')).toBeLessThan(getButton.indexOf("{price}"));
    expect(page.match(/\{price\}/g), "the price is drawn only in getButton").toHaveLength(1);
    expect(page.match(/<Treecoin size=\{13\} \/> \{price\}|<Treecoin size=\{13\} \/>/g)).toHaveLength(1);
    for (const kind of ["g", "s", "d"]) expect(page).toMatch(new RegExp(`stateOf\\(${kind}\\.id\\) === "owned"`));
    expect(page).toContain('{state === "free" ? "Free" : <><Treecoin size={13} /> {price}</>}'); // price-0 items stay Free
  });

  it("locks by XP: a locked card is a disabled button with its threshold, and the text stays readable", () => {
    expect(getButton).toContain("const need = (findUnlock(id)?.minXp ?? 0).toLocaleString();");
    expect(getButton).toContain("disabled title={`Opens at ${need} XP`}");
    expect(getButton).toContain("<Lock className=\"size-3.5\" /> {need} XP");
    // A disabled button is dimmed to 45% by default (below AA): these two keep full-strength text.
    expect(getButton.match(/disabled:opacity-100/g)).toHaveLength(2);
    expect(getButton).toContain("disabled:bg-surface-2 disabled:text-fg-3");
    expect(ratio(token("fg-3"), token("surface")), "the lock label on the tile").toBeGreaterThanOrEqual(4.5);
    expect(ratio(token("fg-3"), token("surface-2")), "the unaffordable price on its disabled button").toBeGreaterThanOrEqual(4.5);
  });

  it("agrees with the rules for every item: a tile carries marketState's answer, one of four", () => {
    const html = (state: MarketState) => renderToStaticMarkup(h(MarketTile, { id: "bench", state }, "x"));
    for (const state of STATES) expect(html(state)).toContain(`data-state="${state}"`);
    expect(marketState("bench", [], 9)).toBe("locked");
    expect(marketState("bench", [], 10)).toBe("free");
    expect(marketState("bench", ["bench"], 0)).toBe("owned");
    expect(marketState("day", [], 0)).toBe("owned"); // the default sky
    expect(marketState("campfire", [], 20)).toBe("buy");
  });
});

describe("island page: every picture is from the art manifest, one to a tile", () => {
  it("names no image file", () => {
    for (const [name, text] of Object.entries(FILES)) expect(code(text), name).not.toMatch(/\.(webp|png|jpe?g|svg|gif)\b|["'`]\/(?:island|landing|images)\/|["'`]public\//);
  });

  it("registers everything it can draw, each with a source: the seven skies and their thumbnails, every growth, decoration and landmark", () => {
    for (const id of skyIds) for (const key of [`sky-${id}`, `sky-${id}-thumb`]) {
      expect(ART[key], key).toBeDefined();
      expect(ART[key].source, key).toBe("generated");
    }
    for (const art of [...GROWTH.map((g) => g.art), ...DECOR.map((d) => d.art), ...[1, 2, 3, 4, 5, 6, 7, 8, 9].map(landmarkArt)]) {
      expect(ART[art], art).toBeDefined();
      expect(ART[art].source, art).toBe("generated");
    }
  });

  it("puts exactly one picture in each tile, row and well, and none in the chip", () => {
    const one = (html: string) => {
      expect(html.match(/<img\b/g)).toHaveLength(1);
      expect(html).toMatch(/<img[^>]*alt=""/);
    };
    for (const g of GROWTH) one(renderToStaticMarkup(h(MarketTile, { id: g.id, state: "locked" }, h(SpriteWell, { art: g.art, locked: true }), "name")));
    for (const d of DECOR) one(renderToStaticMarkup(h(MarketTile, { id: d.id, state: "owned" }, h(SpriteWell, { art: d.art }), "name")));
    for (const s of SKIES) one(renderToStaticMarkup(h(MarketTile, { id: s.id, state: "buy" }, h(SkyWell, { id: s.id, animated: s.animated }), "name")));
    for (let n = 1; n <= 9; n++) one(renderToStaticMarkup(h(SpriteWell, { art: landmarkArt(n), size: "row", locked: n % 2 === 0 })));
  });

  it("has the scene as the scene card's one picture, and no picture on the title (the open sea behind the page is the shell's scene)", () => {
    expect(page.match(/<IslandScene\b/g)).toHaveLength(1);
    expect(page).not.toMatch(/<ArtBackdrop\b/);
    const header = page.slice(page.indexOf("<header"), page.indexOf("</header>"));
    expect(header).not.toMatch(/<img\b|IslandScene/);
    expect(page.indexOf("<header")).toBeLessThan(page.indexOf("<Card"));
    const sceneCard = page.slice(page.indexOf("<Card className=\"overflow-hidden\">"), page.indexOf("</Card>"));
    expect(sceneCard.match(/<IslandScene\b/g)).toHaveLength(1);
    expect(sceneCard).not.toMatch(/<img\b|ArtBackdrop|SpriteWell|SkyWell/);
  });
});

describe("island page: the title sits on the area's scene", () => {
  // The page no longer draws a banner picture of its own: the area's scene fills the window behind the page
  // (src/components/app/SceneBackdrop.tsx), and the title sits on it inside the title haze. The scene, the haze
  // and its contrast are checked once, in test/unit/scenes.test.ts.
  it("has a page-hero header with no box and no picture of its own, its text held to half the width, inside the haze", () => {
    for (const rel of ["src/pages/IslandPage.tsx"]) {
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

describe("island page: health still comes from useIslandHealth", () => {
  it("reads it once from the shared hook and shows that one value", () => {
    expect(page).toContain('import { useIslandHealth } from "@/lib/island";');
    expect(page.match(/useIslandHealth\(/g)).toHaveLength(1);
    expect(page).toContain("const health = useIslandHealth();");
    expect(page).toContain("health={health.value}");
    expect(page).toContain("health.daysMissed === 0 ? \"Watered by your daily sets.\"");
    expect(page).not.toMatch(/islandHealth\(|healthFilter/);
    expect(page).not.toMatch(/import \{[^}]*\bislandHealth\b[^}]*\} from/);
    expect(read("src/lib/island.ts")).toContain("return islandHealth(lastSetDay ?? profile.last_set_day, today);");
    expect(islandHealth("2026-11-09", "2026-11-09").daysMissed).toBe(0);
  });
});

describe("island page: what the restyle must not change", () => {
  it("keeps the copy", () => {
    for (const text of ["Rename your island", "Island name", "Next: ${progress.next.name}", "Fully grown", " XP to go", "Growth to next stage", "Health", "Watered by your daily sets.", "One daily set restores it.", "Water it now", "Growth", "Every question, lesson and quest adds XP. Your island never shrinks.", "Landmarks", "One for each unit you master at {MASTERY_PCT}%.", "Island panels", "Shop", "Arrange", "Skies", "Decorations", "On your island", "In use", "Place another (${count})", "Place", "Use", "Free", "Unlocked", "Best ${best}%, need ${MASTERY_PCT}%", "Score ${MASTERY_PCT}% on the unit quiz", "Quiz", "Nothing placed yet. Buy something in the Shop and it lands on your island.", "Done", "Treecoins come from daily sets, quizzes, lessons, FRQs and field quests.", "Drag to move, or select one and use the arrow keys", "Remove ${findDecor(d.id)?.name}"]) {
      expect(page, text).toContain(text);
    }
  });

  it("keeps the routes and the three tabs, opening on the Shop", () => {
    for (const route of ['to="/practice?mode=daily"', "`/practice?mode=unit&unit=${u.n}`"]) expect(page, route).toContain(route);
    expect(page).toContain('const [tab, setTab] = useState<Tab>("shop");');
    expect(page).toContain('{ value: "shop", label: "Shop" }');
    expect(page).toContain('{ value: "landmarks", label: "Landmarks" }');
    expect(page).toContain('{ value: "arrange", label: "Arrange" }');
  });

  it("keeps the purchase, placement and naming logic, line for line", () => {
    for (const line of [
      'await api<PurchaseResult>("purchase", { item: id });',
      'track("purchase", { item: id });',
      "if (d && decor.length < MAX_PLACED_DECOR) saveDecor([...decor, { id: d.id, x: d.x, y: d.y }]);",
      'await updateProfile(profile.id, { island_skybox: asSky.id });',
      "const progress = stageProgress(xp);",
      "const mastered = masteredUnits(profile.unit_best);",
      "growth={visibleGrowth(profile.owned_items)}",
      "const ownedDecor = (list: PlacedDecor[] | undefined) => (list ?? []).filter((d) => (profile.owned_items ?? []).includes(d.id));",
      "if (decor.length >= MAX_PLACED_DECOR) {",
      "const n = name.trim().slice(0, 32);",
      "disabled={coins < price} loading={buying === id} onClick={() => void buy(id, name)}",
      "editable={tab === \"arrange\"}",
    ]) {
      expect(page, line).toContain(line);
    }
  });
});

describe("island page: focus and reduced motion", () => {
  it("leaves the tabs and the buttons to the shared primitives and their shared ring", () => {
    expect(page).toContain("<Segmented<Tab>");
    // No control carries a shadow of its own, which would outrank the global focus ring. The shadows on the page are
    // on the banner and on the arrange hint: neither takes a click or focus.
    const shadows = [...page.matchAll(/^.*(?<![\w-])shadow-[\w-]+.*$/gm)].map((m) => m[0]);
    expect(shadows.length).toBeGreaterThan(0);
    for (const line of shadows) expect(line, "a shadow only on something that cannot be focused").toMatch(/<header |pointer-events-none/);
    expect(page).toContain('<button onClick={() => setEditingName(true)} className="group flex items-center gap-2 text-left" aria-label="Rename your island">');
    expect(css).toMatch(/:focus-visible \{[^}]*box-shadow: var\(--ring\);/);
  });

  it("adds no motion: only the existing reveal and the existing pencil fade", () => {
    for (const [name, text] of Object.entries(FILES)) expect(code(text), name).not.toMatch(/animate-|useCycle|useReveal|Marquee|Reveal\b|keyframes|setInterval|useReducedMotion/);
    expect(page).toContain("<Page>");
    expect(read("src/components/app/Guards.tsx")).toMatch(/animate-rise/);
    expect(css).toMatch(/@media \(prefers-reduced-motion: reduce\) \{[^@]*animation-duration: 0\.01ms !important;/);
  });
});
