import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { ALL_LESSONS, UNITS, findLesson, lessonKey, neighbours, unitOfLesson } from "../../src/shared/curriculum";

const root = join(__dirname, "../../public/APES_Modules");

describe("curriculum", () => {
  it("has nine units and every lesson folder on disk", () => {
    expect(UNITS.map((u) => u.n)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    for (const l of ALL_LESSONS) {
      const dir = join(root, `Unit_${unitOfLesson(l.id)}`, l.id);
      expect(existsSync(join(dir, "content.json")), l.id).toBe(true);
      expect(existsSync(join(dir, "questions.json")), `${l.id} hasQuiz`).toBe(l.hasQuiz);
    }
  });

  it("gives every lesson a unique storage key", () => {
    const keys = ALL_LESSONS.map((l) => lessonKey(l.id));
    expect(new Set(keys).size).toBe(keys.length);
    expect(lessonKey("1.10_Energy_Flow_and_the_10_Percent_Rule")).toBe("L1_10");
  });

  it("walks lessons in course order", () => {
    expect(neighbours("1.11_Food_Chains_and_Food_Webs").next?.id).toBe("2.0_The_Living_World_Biodiversity");
    expect(neighbours("1.0_The_Living_World_Ecosystems").prev).toBeUndefined();
    expect(findLesson("4.9_El_Nino_and_La_Nina")?.lesson.title).toBe("El Niño and La Niña");
  });

  it("ships well-formed lesson quizzes", () => {
    for (const l of ALL_LESSONS.filter((x) => x.hasQuiz)) {
      const file = join(root, `Unit_${unitOfLesson(l.id)}`, l.id, "questions.json");
      const qs = JSON.parse(readFileSync(file, "utf8"));
      expect(Array.isArray(qs)).toBe(true);
      for (const q of qs) {
        expect(q.answers).toHaveLength(4);
        expect(["A", "B", "C", "D"]).toContain(q.correct);
      }
    }
  });
});
