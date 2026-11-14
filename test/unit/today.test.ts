import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { islandHealth } from "../../src/shared/economy";

// The Today page in the same style system as the rest of the app: the 4a primitives and tokens only, a sky
// behind the greeting, the daily set across the page over its lower edge, and the island as that card's one
// picture. This page pulls in Firebase, so it is read as source: these hold it to what it may and may not
// change (its copy, routes and every line of logic), to one picture per card, to the island's health still
// coming from useIslandHealth, and to its text staying readable. Contrast against the real pixels, the
// pictures on the page and the focus rings are measured in a browser; see design/reviews/stage4e/.

const root = join(__dirname, "../..");
const read = (rel: string) => readFileSync(join(root, rel), "utf8");
const today = read("src/pages/Today.tsx");
const css = read("src/index.css");
/** A file's code, without its comments. */
const code = (text: string) => text.replace(/^\s*\/\/.*$/gm, "").replace(/\{\/\*[\s\S]*?\*\/\}/g, "");

/** The text of one top-level function in the page, up to the next top-level declaration. */
function fn(name: string): string {
  const at = today.search(new RegExp(`^(?:export )?function ${name}\\(`, "m"));
  expect(at, `function ${name}`).toBeGreaterThan(-1);
  const rest = today.slice(at + 1);
  const next = rest.search(/^(?:export )?(?:function|const) |^\/\/ ─── /m);
  return today.slice(at, next === -1 ? undefined : at + 1 + next);
}

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

const STUDENT_CARDS = ["AssignmentsCard", "ContinueCard", "StreakCard", "TestCard", "QuestCard", "ActCard"];

describe("today: tokens only", () => {
  it("has no hex color, no arbitrary pixel size and no raw white, black or default-palette color", () => {
    expect(today).not.toMatch(/(?<![\w&])#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3,4})(?![\w-])/);
    expect(today, "utility-[Npx]").not.toMatch(/-\[-?[0-9.]+px\]/);
    expect(today, "text-[…]").not.toMatch(/(?<![\w-])text-\[/);
    expect(today, "px inside a grid track or min()/max()/clamp()").not.toMatch(/(?:minmax|min|max|clamp)\([^)]*[0-9.]px/);
    expect(today, "white/black").not.toMatch(/(?<![\w-])(?:bg|text|border|ring|fill|stroke|from|via|to)-(?:white|black)(?![\w-])/);
    expect(today, "default palette").not.toMatch(/(?<![\w-])(?:bg|text|border|ring|fill|stroke)-(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|blue|indigo|violet|purple|fuchsia|pink|rose)-\d{2,3}/);
  });

  it("uses the spacing scale and rem where it had 18px, 160px, 220px, 420px, 640px, 340px and 380px", () => {
    expect(today).toContain("size-4.5"); // 18px
    expect(today).toContain("w-40"); // 160px
    expect(today).toContain("min-h-72"); // the island panel, 288px
    expect(today).toContain("max-w-105"); // 420px
    expect(today).toContain("max-w-160"); // 640px
    expect(today).toContain("grid-cols-[minmax(0,1.9fr)_minmax(16rem,1fr)]"); // the side column: about a third of the width, never under 256px
    expect(today).toContain("grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]"); // the island's column
  });

  it("never uses the faintest text color: fg-4 is below AA on the page, so the weekday letters are fg-3", () => {
    expect(ratio(token("fg-4"), token("bg")), "fg-4 on the page color").toBeLessThan(4.5);
    expect(today).not.toMatch(/text-fg-4/);
    expect(fn("StreakCard")).toContain('<span className="text-2xs font-medium text-fg-3">{formatDay(d, { weekday: "narrow" })}</span>');
  });

  it("uses only the type and corner scales", () => {
    const sizes = new Set([...css.matchAll(/--text-([a-z0-9]+):\s*\d/g)].map((m) => m[1]));
    const radii = new Set([...[...css.matchAll(/--radius-([a-z0-9]+):\s*\d/g)].map((m) => m[1]), "full", "none"]);
    for (const m of today.matchAll(/(?<![\w-])text-((?:\d*x[sl]|sm|md|lg|base))(?![\w-])/g)) expect(sizes.has(m[1]), `text-${m[1]}`).toBe(true);
    for (const m of today.matchAll(/(?<![\w-])rounded(?:-[a-z]{1,2})?-([a-z0-9]+)(?![\w-])/g)) expect(radii.has(m[1]), `rounded-${m[1]}`).toBe(true);
  });
});

describe("today: every picture is from the art manifest, one to a card", () => {
  it("names no image file", () => {
    expect(code(today)).not.toMatch(/\.(webp|png|jpe?g|svg|gif)\b|["'`]\/(?:island|landing|images)\/|["'`]public\//);
  });

  it("has one picture on the student's page, manifest art: the island (the lagoon behind the page is the shell's scene)", () => {
    expect(today).not.toMatch(/<ArtBackdrop\b/);
    expect(today.match(/<IslandScene\b/g)).toHaveLength(1);
    expect(today).not.toMatch(/<img\b/);
    expect(today).toMatch(/from "@\/components\/island\/IslandScene"/); // the island is drawn from the same manifest (assets.ts)
  });

  it("sets the greeting on the scene, above every card, with no picture of its own", () => {
    const student = fn("StudentToday");
    const header = student.slice(student.indexOf("<header"), student.indexOf("</header>"));
    expect(header).toContain('<header className="page-hero">');
    expect(header).not.toMatch(/<ArtBackdrop|<img\b/);
    expect(student.indexOf("<header")).toBeLessThan(student.indexOf("<DailySetCard")); // before any card
    expect(student, "the page draws its cards through components, so nothing wraps the greeting in one").not.toContain("<Card");
  });

  it("gives the daily-set card the island as its one picture, and no other card a picture at all", () => {
    const daily = fn("DailySetCard");
    expect(daily.match(/<IslandScene\b/g)).toHaveLength(1);
    expect(daily).not.toMatch(/<img\b|ArtBackdrop/);
    for (const name of STUDENT_CARDS) expect(fn(name), `${name} has no picture (the streak and Act cards carry none)`).not.toMatch(/<IslandScene|<img\b|ArtBackdrop|Plate\b/);
  });

  it("keeps the teacher's page free of pictures", () => {
    for (const name of ["TeacherToday", "CreateFirstClass", "ClassSummary", "Attention"]) expect(fn(name), name).not.toMatch(/<IslandScene|<img\b|ArtBackdrop/);
  });
});

describe("today: the island's health still comes from useIslandHealth", () => {
  it("reads it from the shared hook, once, and gives the daily-set card that value", () => {
    expect(today).toContain('import { useIslandHealth } from "@/lib/island";');
    expect(today.match(/useIslandHealth\(/g)).toHaveLength(1);
    expect(fn("StudentToday")).toContain("const health = useIslandHealth();");
    expect(fn("StudentToday")).toContain("health={health}");
  });

  it("shows nothing it worked out itself: the island, the chip and the copy all read that one value", () => {
    expect(today).not.toMatch(/islandHealth\(|healthFilter|daysMissed\s*=/);
    expect(today).not.toMatch(/import \{[^}]*\bislandHealth\b[^}]*\} from/);
    const daily = fn("DailySetCard");
    expect(daily).toContain("health={health.value}");
    expect(daily).toContain("          {health.label}\n"); // the chip shows health only: the stage is in the XP strip beside it
    expect(daily).toContain("{stage.name}</p>");
    expect(daily).toContain('health.label === "Thriving" ? "Keep your island thriving."');
    expect(fn("StudentToday")).toContain("health.daysMissed > 0");
  });

  it("is the hook the Island page and the practice results use too, over islandHealth, so they cannot disagree", () => {
    const hook = read("src/lib/island.ts");
    expect(hook).toContain("return islandHealth(lastSetDay ?? profile.last_set_day, today);");
    expect(read("src/pages/IslandPage.tsx")).toContain('import { useIslandHealth } from "@/lib/island";');
    expect(read("src/pages/Practice.tsx")).toContain('import { useIslandHealth } from "@/lib/island";');
    // And the numbers: a set done today is thriving; the readout worsens with each missed day.
    expect(islandHealth("2026-11-09", "2026-11-09").daysMissed).toBe(0);
    expect(islandHealth("2026-11-07", "2026-11-09").daysMissed).toBeGreaterThan(0);
  });
});

describe("today: what the restyle must not change", () => {
  it("keeps the student's copy", () => {
    for (const text of [
      "Daily set · Unit {focusUnit}", "Ten questions, about five minutes", "Done for today", "Your island is watered until tomorrow night. Want more practice?", "New questions from {unitTitle}, plus reviews of anything you've missed.",
      "Keep your island thriving.", "Start daily set", "Mixed review", "Open your island", "Assignments", "to do", "Nothing assigned right now", "You're all caught up.", "Completed (",
      "Continue reading", "Up next", "Streak", "Best streak:", "Coming up", "Readiness is the share of Unit {test.unit} questions you've answered correctly and still remember.", "Field quest · Unit {unit}", "Start quest · +30 TC", "Completed",
      "Take it outside", "Find a volunteer event or an eco action, and log your service hours.", "Open Act", "Do it · +20 TC", "Your daily set is ready. Five minutes keeps your island growing.", "Come back tomorrow to start a streak.",
    ]) {
      expect(today, text).toContain(text);
    }
  });

  it("keeps every route", () => {
    for (const route of ['to="/practice?mode=daily"', 'to="/practice?mode=mixed"', "`/practice?mode=unit&unit=${focusUnit}`", 'to="/island"', "`/study/unit/${found?.unit.n}/${encodeURIComponent(lesson.id)}`", "`/practice?mode=unit&unit=${test.unit}`", "`/study/unit/${unit}?quest=1`", 'to="/act"', "assignmentHref(a)", "listingHref(next)"]) {
      expect(today, route).toContain(route);
    }
  });

  it("keeps the daily-set, streak, assignment, Act and field-quest logic, line for line", () => {
    for (const line of [
      "const streak = effectiveStreak(profile.streak, profile.last_set_day, today);",
      "const doneToday = profile.last_set_day === today;",
      "const open = assignments.filter((a) => !a.status.done);",
      "const unit = getUnit(focusUnit);",
      "const { classes, assignments, focusUnit, test, loading } = useStudentContext(profile, today);",
      'void api("assignments/sync").catch(() => undefined);',
      "const late = !a.status.done && daysBetween(a.due_day, today) > 0;",
      "const soon = !a.status.done && !late && daysBetween(today, a.due_day) <= 1;",
      'if (a.type === "daily_sets") return `${a.status.progress} of ${a.status.target}`;',
      "const done = assignments.filter((a) => a.status.done).sort((a, b) => b.due_day.localeCompare(a.due_day));",
      "const week = Array.from({ length: 7 }, (_, i) => addDays(monday, i));",
      "const future = daysBetween(today, d) > 0;",
      "if (!cancelled) setReady(readiness(pool, state));",
      "const quest = questForUnit(unit);",
      'live.find((l) => l.kind === "event" && going.has(l.key)) ??',
      'live.find((l) => l.kind === "action" && !done.has(l.key) && actionOpen(l, today) && l.scope === "class") ??',
    ]) {
      expect(today, line).toContain(line);
    }
    // The cards are the same set, whichever column they are in, and the test card is still conditional.
    for (const card of ["<AssignmentsCard", "<ContinueCard", "<ActCard", "<StreakCard", "<QuestCard", "{test && <TestCard"]) expect(fn("StudentToday"), card).toContain(card);
  });

  it("keeps the teacher's page and the two helpers other pages import", () => {
    expect(today).toContain('<header className="page-hero flex-row items-end justify-between gap-6">'); // the teacher's greeting, on the scene too
    expect(today).toMatch(/export function JoinClassInline\(/);
    expect(today).toMatch(/export function CreateFirstClass\(/);
    expect(today).toContain("const subtitle = doneToday");
    expect(today).toContain("Here's how your classes are doing today.");
  });
});

describe("today: the title sits on the area's scene", () => {
  // The page no longer draws a banner picture of its own: the area's scene fills the window behind the page
  // (src/components/app/SceneBackdrop.tsx), and the title sits on it inside the title haze. The scene, the haze
  // and its contrast are checked once, in test/unit/scenes.test.ts.
  it("has a page-hero header with no box and no picture of its own, its text held to half the width, inside the haze", () => {
    for (const rel of ["src/pages/Today.tsx"]) {
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

describe("today: focus and reduced motion", () => {
  it("gives the island link and the next-lesson link their cards' corners, so the shared focus ring follows them", () => {
    expect(fn("DailySetCard")).toContain('<Link to="/island" className="group relative block overflow-hidden rounded-lg border border-line" aria-label="Open your island">');
    expect(fn("ContinueCard")).toContain('className="flex items-center gap-5 rounded-lg p-6">');
    for (const link of [...fn("DailySetCard").matchAll(/<Link [^>]*className="([^"]*)"/g), ...fn("ContinueCard").matchAll(/<Link [^>]*className="([^"]*)"/g)]) {
      expect(link[1], "no shadow or outline of its own to hide the ring").not.toMatch(/(^|\s)(focus:|focus-visible:)?shadow-|outline/);
    }
    expect(css).toMatch(/:focus-visible \{[^}]*box-shadow: var\(--ring\);/);
  });

  it("adds no motion; the island's existing hover zoom now holds still when motion is reduced", () => {
    expect(code(today)).not.toMatch(/animate-|useCycle|useReveal|Marquee|Reveal\b|keyframes|setInterval|useReducedMotion/);
    expect(fn("DailySetCard")).toContain("transition-transform duration-500 group-hover:scale-[1.015] motion-reduce:group-hover:scale-100");
    expect(fn("StudentToday")).toContain("<Page>");
    expect(fn("TeacherToday")).toContain("<Page>");
    expect(read("src/components/app/Guards.tsx")).toMatch(/animate-rise/); // the existing reveal
    expect(css).toMatch(/@media \(prefers-reduced-motion: reduce\) \{[^@]*animation-duration: 0\.01ms !important;/);
  });
});
