// Accent scopes. A page can recolor its brand for its own content (see the
// data-accent rules in src/index.css), but anything it renders into a
// portal (a dialog, a toast) lands outside that page's wrapper and falls back to the
// default brand. Those pieces take an optional `accent` and put the same attribute on
// their own element, so they inherit the scope. Nothing opts in by default.

export type Accent = "ambassador";

/** The attribute that scopes `accent` on an element, or nothing at all when there is none. */
export function accentAttr(accent?: Accent): { "data-accent"?: Accent } {
  return accent ? { "data-accent": accent } : {};
}
