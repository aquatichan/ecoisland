// Where things go on the island. Positions are stored as fractions of a scene
// that is W x H (a student's saved decoration layout uses these, so they stay
// valid); the picture shows the VIEW window of that scene, at 5:3.
export const W = 1200;
export const H = 720;
export const VIEW = { x: 150, y: 215, w: 900, h: 540 };
/** Where decorations may be placed, in 0..1 scene units. */
export const PLACE = { x0: 0.15, x1: 0.85, y0: 0.3, y1: 0.95 };
/** The painted base island: bottom-center of the sprite at (x, y) in scene px, w px wide. Its top face is centered at (600, 500). */
export const BASE = { x: 600, y: 741, w: 540, ax: 0.5, ay: 1 };
/** Where the sky meets the sea, as a fraction of the view's height. */
export const HORIZON = 0.39;

/** Scene px -> percent of the visible view. */
export const pctX = (sceneX: number) => ((sceneX - VIEW.x) / VIEW.w) * 100;
export const pctY = (sceneY: number) => ((sceneY - VIEW.y) / VIEW.h) * 100;
export const pctW = (sceneW: number) => (sceneW / VIEW.w) * 100;

/** A point inside the view (0..1 across, 0..1 down) -> decoration scene units. */
export function sceneFromView(fx: number, fy: number): { x: number; y: number } {
  return { x: (VIEW.x + fx * VIEW.w) / W, y: (VIEW.y + fy * VIEW.h) / H };
}

export const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

/** Items nearer the viewer (lower on the island) are a little bigger. */
export function depthScale(sceneY: number): number {
  return 0.85 + clamp((sceneY - 0.55) / 0.35, 0, 1) * 0.3;
}
