import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";
import { ART } from "../../src/components/island/assets";
import { H, VIEW, W, depthScale } from "../../src/components/island/geometry";
import { DECOR, GROWTH, SKIES } from "../../src/shared/catalog";
import { LANDMARK_LAYOUT, landmarkArt } from "../../src/shared/landmarks";

const root = join(__dirname, "../..");
const island = join(root, "public/island");
const file = (src: string) => join(root, "public", src);

/** A WebP's size and whether it carries alpha, from its header (extended, lossy and lossless forms). */
function webpInfo(path: string): { w: number; h: number; alpha: boolean } {
  const b = readFileSync(path);
  expect(b.toString("ascii", 0, 4), path).toBe("RIFF");
  expect(b.toString("ascii", 8, 12), path).toBe("WEBP");
  const kind = b.toString("ascii", 12, 16);
  if (kind === "VP8X") return { alpha: (b[20] & 0x10) !== 0, w: 1 + b.readUIntLE(24, 3), h: 1 + b.readUIntLE(27, 3) };
  if (kind === "VP8 ") return { alpha: false, w: b.readUInt16LE(26) & 0x3fff, h: b.readUInt16LE(28) & 0x3fff };
  throw new Error(`${path}: unexpected WebP form ${kind}`);
}

function files(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) files(p, out);
    else if (!name.startsWith(".")) out.push(p);
  }
  return out;
}

describe("island art", () => {
  const ids = Object.keys(ART);
  const skyIds = SKIES.map((s) => s.id);
  const referenced = [
    "island-base",
    ...GROWTH.map((g) => g.art),
    ...DECOR.map((d) => d.art),
    ...Object.keys(LANDMARK_LAYOUT).map((n) => landmarkArt(Number(n))),
    ...skyIds.flatMap((id) => [`sky-${id}`, `sky-${id}-thumb`]),
  ];
  const isSky = (id: string) => id.startsWith("sky-");

  it("has an art entry for everything the island can draw, and no strays", () => {
    expect([...ids].sort()).toEqual([...referenced].sort());
  });

  it("has unique, versioned files that exist on disk, and no file the manifest doesn't know", () => {
    const srcs = ids.map((id) => ART[id].src);
    expect(new Set(srcs).size).toBe(srcs.length);
    for (const id of ids) {
      expect(ART[id].src, id).toMatch(/^\/island\/(base|growth\/[a-z-]+|skies\/[a-z]+(-thumb)?|decor\/[a-z]+|landmarks\/u\d)-v\d+\.webp$/);
      expect(existsSync(file(ART[id].src)), `${id}: ${ART[id].src}`).toBe(true);
    }
    const onDisk = files(island).map((p) => `/island/${relative(island, p)}`);
    expect(onDisk.sort()).toEqual([...srcs].sort());
  });

  it("ships transparent WebP for sprites and opaque WebP for skies, at the size the manifest says", () => {
    for (const id of ids) {
      const info = webpInfo(file(ART[id].src));
      expect({ w: info.w, h: info.h }, id).toEqual({ w: ART[id].w, h: ART[id].h });
      if (isSky(id)) expect(info.alpha, `${id} is a full backdrop, so it is opaque`).toBe(false);
      else expect(info.alpha, `${id} has an alpha channel`).toBe(true);
    }
  });

  it("makes every sky card-shaped (5:3), with a matching small thumbnail", () => {
    for (const id of skyIds) {
      expect(ART[`sky-${id}`].w / ART[`sky-${id}`].h, id).toBeCloseTo(VIEW.w / VIEW.h, 2);
      expect(ART[`sky-${id}-thumb`].w / ART[`sky-${id}-thumb`].h, `${id} thumb`).toBeCloseTo(VIEW.w / VIEW.h, 2);
      expect(ART[`sky-${id}-thumb`].w, `${id} thumb is small`).toBeLessThan(ART[`sky-${id}`].w / 2);
    }
  });

  it("labels the art as generated, with no placeholder left in use", () => {
    for (const id of ids) expect(ART[id].source, id).toBe("generated");
  });

  it("is never upscaled: each sprite has at least 1.4 pixels per scene pixel", () => {
    const items = [
      ...GROWTH.map((g) => ({ id: g.id, art: g.art, w: g.w })),
      ...DECOR.map((d) => ({ id: d.id, art: d.art, w: d.w })),
      ...Object.entries(LANDMARK_LAYOUT).map(([n, l]) => ({ id: `unit ${n}`, art: landmarkArt(Number(n)), w: l.w })),
    ];
    for (const i of items) expect(ART[i.art].w / (i.w * W), i.id).toBeGreaterThanOrEqual(1.4);
  });

  it("stays within the download budget", () => {
    let total = 0;
    for (const id of ids) {
      const bytes = statSync(file(ART[id].src)).size;
      expect(bytes, id).toBeLessThan(200 * 1024);
      total += bytes;
    }
    expect(total, "everything in the catalog").toBeLessThan(3.5 * 1024 * 1024);
    // The most one island can ask for: the base, every item and one sky. Items load only when owned.
    const worst = ids.filter((id) => !isSky(id) || id === "sky-day").reduce((n, id) => n + statSync(file(ART[id].src)).size, 0);
    expect(worst, "one fully grown island").toBeLessThan(2.5 * 1024 * 1024);
  });

  it("keeps every item's default spot, with its art, inside the picture", () => {
    const spans = (id: string, x: number, y: number, wFrac: number, anchor: { x: number; y: number }, scale: number) => {
      const art = ART[id];
      const w = wFrac * W * scale;
      const h = w * (art.h / art.w);
      const left = x * W - anchor.x * w;
      const top = y * H - anchor.y * h;
      expect(left, `${id} left`).toBeGreaterThanOrEqual(VIEW.x);
      expect(left + w, `${id} right`).toBeLessThanOrEqual(VIEW.x + VIEW.w);
      expect(top, `${id} top (nothing is cut off at the top edge)`).toBeGreaterThanOrEqual(VIEW.y);
      expect(top + h, `${id} bottom`).toBeLessThanOrEqual(VIEW.y + VIEW.h);
    };
    for (const g of GROWTH) spans(g.art, g.x, g.y, g.w, g.anchor, 1);
    for (const d of DECOR) spans(d.art, d.x, d.y, d.w, d.anchor, depthScale(d.y));
    for (const [n, l] of Object.entries(LANDMARK_LAYOUT)) spans(landmarkArt(Number(n)), l.x, l.y, l.w, { x: 0.5, y: l.ay ?? 1 }, 1);
  });
});
