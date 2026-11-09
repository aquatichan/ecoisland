// Where plants grow on the island. Positions are generated once per seed
// (each student's island has its own arrangement) and revealed in a fixed
// order, so every study session adds something new and nothing ever moves.
// The SVG island pieces (Flora, Decor, Landmarks) are kept as the source for the
// placeholder sprites (see src/pages/dev/SpriteLab.tsx); the live island draws rasters.
const MAX_FLORA = 40;

export const W = 1200;
export const H = 720;
/** The visible window of the scene (5:3, zoomed onto the island). */
export const VIEW = { x: 150, y: 150, w: 900, h: 540 };
/** Where decorations may be placed, in 0..1 scene units. */
export const PLACE = { x0: 0.15, x1: 0.85, y0: 0.27, y1: 0.93 };
export const TOP = { cx: 600, cy: 500, rx: 268, ry: 64 };

export type FloraKind = "tuft" | "flower" | "shrub" | "round" | "pine" | "palm" | "bigRound";
export type Slot = { x: number; y: number; kind: FloraKind; s: number; tint: number; delay: number };

function hash(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function rng(seed: string) {
  let a = hash(seed) || 1;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Places reserved for unit landmarks and the stage-5 heart tree.
const RESERVED: Array<{ x: number; y: number; r: number }> = [
  { x: 432, y: 540, r: 46 }, // 1 food web
  { x: 762, y: 548, r: 44 }, // 2 meadow
  { x: 392, y: 470, r: 50 }, // 5 farm
  { x: 812, y: 458, r: 40 }, // 6 energy
  { x: 702, y: 462, r: 20 }, // 7 weather station
  { x: 352, y: 528, r: 26 }, // 9 mangroves
  { x: 560, y: 452, r: 40 }, // heart tree
];

// The unit 4 river runs from the hill to the front cliff.
export const RIVER: Array<[number, number]> = [
  [572, 456],
  [590, 488],
  [628, 520],
  [652, 552],
  [660, 574],
];

function nearRiver(x: number, y: number, d: number): boolean {
  for (let i = 0; i < RIVER.length - 1; i++) {
    const [x1, y1] = RIVER[i];
    const [x2, y2] = RIVER[i + 1];
    const dx = x2 - x1;
    const dy = y2 - y1;
    const t = Math.max(0, Math.min(1, ((x - x1) * dx + (y - y1) * dy) / (dx * dx + dy * dy)));
    if (Math.hypot(x - (x1 + t * dx), y - (y1 + t * dy)) < d) return true;
  }
  return false;
}

function inside(x: number, y: number, margin = 0.92): boolean {
  const nx = (x - TOP.cx) / TOP.rx;
  const ny = (y - TOP.cy) / TOP.ry;
  return nx * nx + ny * ny <= margin;
}

const cache = new Map<string, Slot[]>();

export function floraSlots(seed: string): Slot[] {
  const hit = cache.get(seed);
  if (hit) return hit;
  const rand = rng(`flora:${seed}`);
  const points: Array<{ x: number; y: number }> = [];
  let tries = 0;
  let minDist = 34;
  while (points.length < MAX_FLORA && tries < 20000) {
    tries++;
    if (tries % 4000 === 0) minDist -= 3;
    const x = TOP.cx - TOP.rx + rand() * TOP.rx * 2;
    const y = TOP.cy - TOP.ry + rand() * TOP.ry * 2;
    if (!inside(x, y)) continue;
    if (RESERVED.some((z) => Math.hypot(x - z.x, (y - z.y) * 1.6) < z.r)) continue;
    if (nearRiver(x, y, 20)) continue;
    if (points.some((p) => Math.hypot(p.x - x, (p.y - y) * 1.7) < minDist)) continue;
    points.push({ x, y });
  }

  // Reveal order: spread out, starting near the front middle.
  const order: Array<{ x: number; y: number }> = [];
  const left = [...points];
  let cur = { x: TOP.cx, y: TOP.cy + 30 };
  while (left.length) {
    let best = 0;
    let bestScore = -Infinity;
    left.forEach((p, i) => {
      const nearest = order.length ? Math.min(...order.map((q) => Math.hypot(q.x - p.x, (q.y - p.y) * 1.7))) : -Math.hypot(p.x - cur.x, p.y - cur.y);
      if (nearest > bestScore) {
        bestScore = nearest;
        best = i;
      }
    });
    cur = left.splice(best, 1)[0];
    order.push(cur);
  }

  const slots = order.map((p, i): Slot => {
    const edge = Math.hypot((p.x - TOP.cx) / TOP.rx, (p.y - TOP.cy) / TOP.ry);
    const back = p.y < TOP.cy - 6;
    let kind: FloraKind;
    if (i < 2) kind = "tuft";
    else if (i < 8) kind = i % 2 === 0 ? "flower" : "shrub";
    else if (i < 16) kind = i % 3 === 0 ? "shrub" : "round";
    else if (i < 28) kind = back ? "pine" : i % 4 === 0 ? "flower" : "round";
    else kind = edge > 0.72 ? "palm" : back ? "pine" : "bigRound";
    return { x: p.x, y: p.y, kind, s: 0.86 + rand() * 0.3, tint: rand(), delay: rand() * 4 };
  });
  cache.set(seed, slots);
  return slots;
}
