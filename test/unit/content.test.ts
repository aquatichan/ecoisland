import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
// @ts-expect-error: plain JS build script without type declarations
import { buildContent } from "../../tools/build-content.mjs";
import { ANSWERS } from "../../worker/generated/content";
import { ALL_LESSONS, lessonAssetBase, lessonKey } from "../../src/shared/curriculum";

const root = join(__dirname, "../..");
const built = buildContent(root) as { files: Record<string, string>; count: number; skipped: string[] };

describe("generated course content", () => {
  it("is up to date (run `pnpm content` after editing content/)", () => {
    for (const [path, contents] of Object.entries(built.files)) {
      expect(readFileSync(join(root, path), "utf8"), path).toBe(contents);
    }
  });

  it("ships no answer keys or rubrics to the browser", () => {
    for (const path of Object.keys(built.files).filter((p) => p.startsWith("public/"))) {
      const text = built.files[path];
      expect(text, path).not.toMatch(/"(answer|correct|rubric)"\s*:/);
    }
  });

  it("has an answer for every public question, and nothing else", () => {
    const publicIds = new Set<string>();
    for (const path of Object.keys(built.files).filter((p) => p.startsWith("public/") && !p.endsWith("APES_FRQs.json"))) {
      for (const q of JSON.parse(built.files[path]) as Array<{ id: string }>) publicIds.add(q.id);
    }
    expect(publicIds.size).toBe(built.count);
    expect(new Set(Object.keys(ANSWERS))).toEqual(publicIds);
    expect(Object.values(ANSWERS).every((a) => a >= 0 && a <= 3)).toBe(true);
    expect(built.skipped).toEqual([]);
  });

  it("matches the curriculum: every quiz lesson has questions keyed like the server expects", () => {
    for (const lesson of ALL_LESSONS.filter((l) => l.hasQuiz)) {
      const path = `public${decodeURIComponent(lessonAssetBase(lesson.id))}/questions.json`;
      expect(built.files[path], path).toBeDefined();
      const ids = (JSON.parse(built.files[path]) as Array<{ id: string }>).map((q) => q.id);
      expect(ids.length).toBeGreaterThanOrEqual(5);
      expect(ids.every((id) => id.startsWith(`${lessonKey(lesson.id)}_`))).toBe(true);
    }
  });
});
