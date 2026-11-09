import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";
import { accentAttr } from "../../src/lib/accent";

// A page's accent (see [data-accent="ambassador"] in src/index.css) only reaches what the page
// renders inside its own wrapper. A dialog or a toast renders in a portal, outside it, so it
// would fall back to the green brand. They take an optional `accent` and put the attribute on
// their own element. These checks pin down that this is opt-in and that only the Ambassador
// page opts in: every other dialog and toast stays the default brand.

const root = join(__dirname, "../..");
const css = readFileSync(join(root, "src/index.css"), "utf8");

function sources(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (p.includes("/components/bits")) continue;
    if (statSync(p).isDirectory()) sources(p, out);
    else if (/\.tsx?$/.test(name)) out.push(p);
  }
  return out;
}
const files = sources(join(root, "src"));
const text = (rel: string) => readFileSync(join(root, rel), "utf8");
const rel = (p: string) => relative(root, p);

/** Every `<Name ...>` opening tag in `source`, read to its closing `>` while skipping over `{...}` expressions. */
function tags(source: string, name: string): string[] {
  const out: string[] = [];
  for (let at = source.indexOf(`<${name}`); at !== -1; at = source.indexOf(`<${name}`, at + 1)) {
    let depth = 0;
    let i = at + name.length + 1;
    for (; i < source.length; i++) {
      const c = source[i];
      if (c === "{") depth++;
      else if (c === "}") depth--;
      else if (c === ">" && depth === 0) break;
    }
    out.push(source.slice(at, i + 1));
  }
  return out;
}

describe("accent in portals", () => {
  it("adds the attribute only when there is an accent", () => {
    expect(accentAttr()).toEqual({});
    expect(accentAttr(undefined)).toEqual({});
    expect(accentAttr("ambassador")).toEqual({ "data-accent": "ambassador" });
  });

  it("is a real scope in the stylesheet: the attribute recolors the brand", () => {
    expect(css).toMatch(/\[data-accent="ambassador"\] \{[\s\S]*?--brand: #2a52c8;/);
  });

  it("is applied by the dialog and the toast to their own element, from an optional prop", () => {
    const dialog = text("src/components/ui/dialog.tsx");
    expect(dialog).toMatch(/accent\?: Accent;/);
    expect(dialog).toMatch(/<D\.Content\s+\{\.\.\.accentAttr\(accent\)\}/); // on the portal's content, not the overlay
    const toast = text("src/lib/toast.tsx");
    expect(toast).toMatch(/accent\?: Accent/);
    expect(toast).toContain("{...accentAttr(t.accent)}");
  });

  it("is forwarded by EventForm to its dialog and to both of its toasts", () => {
    const form = text("src/components/act/EventForm.tsx");
    expect(form).toMatch(/accent\?: Accent;/);
    expect(tags(form, "DialogContent").some((t) => t.includes("accent={accent}"))).toBe(true);
    expect(form.match(/accent \}\);/g)?.length, "both toast.show calls pass the accent on").toBe(2);
  });

  it("is opted into only by the Ambassador page", () => {
    const optIns = files.filter((f) => /\baccent="[a-z]+"/.test(readFileSync(f, "utf8")) || /\baccent: "[a-z]+"/.test(readFileSync(f, "utf8")));
    expect(optIns.map(rel)).toEqual(["src/pages/Ambassador.tsx"]);
    const ambassador = text("src/pages/Ambassador.tsx");
    expect(tags(ambassador, "EventForm").some((t) => t.includes('accent="ambassador"'))).toBe(true);
    expect(ambassador).toMatch(/title: "Application sent"[^\n]*accent: "ambassador"/);
  });

  it("leaves every other EventForm and dialog on the default brand", () => {
    for (const page of ["src/pages/Act.tsx", "src/pages/EventDetail.tsx"]) {
      const forms = tags(text(page), "EventForm");
      expect(forms.length, page).toBeGreaterThan(0);
      for (const t of forms) expect(t, page).not.toMatch(/\baccent\b/);
    }
    for (const f of files) {
      if (rel(f) === "src/components/act/EventForm.tsx" || rel(f) === "src/components/ui/dialog.tsx") continue;
      for (const t of tags(readFileSync(f, "utf8"), "DialogContent")) expect(t, rel(f)).not.toMatch(/\baccent\b/);
    }
  });
});
