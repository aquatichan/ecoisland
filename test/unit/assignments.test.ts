import { describe, expect, it } from "vitest";
import { assignmentHref, defaultAssignmentTitle, evaluateAssignment } from "../../src/shared/assignments";

const base = { created_day: "2026-11-02", due_day: "2026-11-06" };

describe("evaluateAssignment", () => {
  it("completes a lesson once it is read", () => {
    const a = { ...base, type: "lesson" as const, ref: "1.4_The_Carbon_Cycle" };
    expect(evaluateAssignment(a, {}).done).toBe(false);
    expect(evaluateAssignment(a, { lessons_done: ["1.4_The_Carbon_Cycle"] }).done).toBe(true);
  });

  it("uses best scores for quizzes, with an optional minimum", () => {
    const a = { ...base, type: "lesson_quiz" as const, ref: "1.4_The_Carbon_Cycle" };
    expect(evaluateAssignment(a, { quiz_best: { L1_4: 40 } })).toMatchObject({ done: true, score: 40 });
    expect(evaluateAssignment({ ...a, min_pct: 70 }, { quiz_best: { L1_4: 40 } })).toMatchObject({ done: false, score: 40 });
    const u = { ...base, type: "unit_quiz" as const, ref: "u4", min_pct: 70 };
    expect(evaluateAssignment(u, { unit_best: { u4: 85 } }).done).toBe(true);
    const f = { ...base, type: "frq" as const, ref: "u1-frq-1" };
    expect(evaluateAssignment(f, { frq_best: { u1_frq_1: 60 } })).toMatchObject({ done: true, score: 60 });
  });

  it("counts daily sets only inside the assignment window", () => {
    const a = { ...base, type: "daily_sets" as const, ref: "", count: 3 };
    const r = { set_days: ["2026-11-01", "2026-11-02", "2026-11-04", "2026-11-07"] };
    expect(evaluateAssignment(a, r)).toMatchObject({ done: false, progress: 2, target: 3 });
    expect(evaluateAssignment(a, { set_days: [...r.set_days, "2026-11-06"] })).toMatchObject({ done: true, progress: 3 });
  });

  it("completes field quests by unit", () => {
    const a = { ...base, type: "field_quest" as const, ref: "u9" };
    expect(evaluateAssignment(a, { quests_done: [9] }).done).toBe(true);
    expect(evaluateAssignment(a, { quests_done: [8] }).done).toBe(false);
  });

  it("links to the right place", () => {
    expect(assignmentHref({ type: "lesson", ref: "8.0_Aquatic_&_Terrestrial_Pollution", unit: 8 })).toBe(
      "/study/unit/8/8.0_Aquatic_%26_Terrestrial_Pollution",
    );
    expect(assignmentHref({ type: "unit_quiz", ref: "u4", unit: 4 })).toBe("/practice?mode=unit&unit=4");
    expect(defaultAssignmentTitle("daily_sets", "", { count: 1 })).toBe("1 daily set");
    expect(defaultAssignmentTitle("lesson", "1.4_The_Carbon_Cycle")).toBe("Read 1.4 The Carbon Cycle");
  });
});
