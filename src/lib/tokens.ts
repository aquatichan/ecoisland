// The design tokens that JavaScript needs as literal values (WebGL effects,
// the switch, canvas). The source of truth is :root in src/index.css;
// test/unit/tokens.test.ts fails if the two drift. Keys are the CSS variable
// names without the leading dashes.

export const COLORS = {
  bg: "#edf3ef",
  sky: "#bfe2f8",
  surface: "#fcf9f3",
  "surface-2": "#f3efe5",
  "surface-3": "#e8e3d6",
  track: "#d6d1c3",
  fg: "#11211d",
  "fg-2": "#34423d",
  "fg-3": "#55645d",
  "fg-4": "#84908a",
  brand: "#177a58",
  "brand-strong": "#10654a",
  "brand-soft": "#e1efe2",
  "brand-fg": "#ffffff",
  "brand-ink": "#0f6347",
  ocean: "#216aa3",
  "ocean-soft": "#e0eef8",
  sun: "#f2b73c",
  "sun-soft": "#fbf0d4",
  "sun-ink": "#7e5204",
  coral: "#b83e29",
  "coral-soft": "#f9e5e0",
} as const;

export type ColorToken = keyof typeof COLORS;
