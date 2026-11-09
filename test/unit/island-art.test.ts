import { existsSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { ART } from "../../src/components/island/assets";
import { W } from "../../src/components/island/geometry";
import { DECOR, GROWTH } from "../../src/shared/catalog";
import { LANDMARK_LAYOUT, landmarkArt } from "../../src/shared/landmarks";

const root = join(__dirname, "../..");
const file = (src: string) => join(root, "public", src);

/** Reads a WebP's canvas size and whether it carries an alpha channel (extended format). */
function webpInfo(path: string): { w: number; h: number; alpha: boolean } {
  const b = readFileSync(path);
  expect(b.toString("ascii", 0, 4), path).toBe("RIFF");
  expect(b.toString("ascii", 8, 12), path).toBe("WEBP");
  expect(b.toString("ascii", 12, 16), `${path} should be the extended format (it carries alpha)`).toBe("VP8X");
  return { alpha: (b[20] & 0x10) !== 0, w: 1 + b.readUIntLE(24, 3), h: 1 + b.readUIntLE(27, 3) };
}

describe("island art", () => {
  const ids = Object.keys(ART);
  const referenced = [...GROWTH.map((g) => g.art), ...DECOR.map((d) => d.art), ...Object.keys(LANDMARK_LAYOUT).map((n) => landmarkArt(Number(n))), "island-base"];

  it("has an art entry for everything the island can draw, and no strays", () => {
    expect(ids.sort()).toEqual([...referenced].sort());
  });

  it("has unique, versioned files that exist on disk", () => {
    const srcs = ids.map((id) => ART[id].src);
    expect(new Set(srcs).size).toBe(srcs.length);
    for (const id of ids) {
      expect(ART[id].src, id).toMatch(/^\/island\/(base|growth\/[a-z-]+|decor\/[a-z]+|landmarks\/u\d)-v\d+\.webp$/);
      expect(existsSync(file(ART[id].src)), `${id}: ${ART[id].src}`).toBe(true);
    }
  });

  it("ships transparent WebP, exactly the size the manifest says", () => {
    for (const id of ids) {
      const info = webpInfo(file(ART[id].src));
      expect(info.alpha, `${id} has an alpha channel`).toBe(true);
      expect({ w: info.w, h: info.h }, id).toEqual({ w: ART[id].w, h: ART[id].h });
    }
  });

  it("labels what is painted and what is a stand-in", () => {
    expect(ART["island-base"].source).toBe("painted");
    for (const g of GROWTH) expect(ART[g.art].source, g.id).toBe("painted");
    for (const d of DECOR) expect(ART[d.art].source, d.id).toBe("placeholder"); // painted decor and landmarks come later
    for (const n of Object.keys(LANDMARK_LAYOUT)) expect(ART[landmarkArt(Number(n))].source, `unit ${n}`).toBe("placeholder");
  });

  it("is never upscaled: each sprite has at least 1.4 pixels per scene pixel", () => {
    const items = [...GROWTH.map((g) => ({ id: g.id, art: g.art, w: g.w })), ...DECOR.map((d) => ({ id: d.id, art: d.art, w: d.w })), ...Object.entries(LANDMARK_LAYOUT).map(([n, l]) => ({ id: `unit ${n}`, art: landmarkArt(Number(n)), w: l.w }))];
    for (const i of items) expect(ART[i.art].w / (i.w * W), i.id).toBeGreaterThanOrEqual(1.4);
  });

  it("stays within the download budget", () => {
    let total = 0;
    for (const id of ids) {
      const bytes = statSync(file(ART[id].src)).size;
      expect(bytes, id).toBeLessThan(200 * 1024);
      total += bytes;
    }
    expect(total).toBeLessThan(1.5 * 1024 * 1024);
  });
});
