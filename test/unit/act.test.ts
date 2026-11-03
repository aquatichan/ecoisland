import { describe, expect, it } from "vitest";
import { actionOpen, eventKey, eventPhase, hoursFlags, hoursOnDay, hoursReward, isValidHours, parseEventKey, safeUrl } from "../../src/shared/act";
import { ECO_ACTIONS, actionDetails, findAction } from "../../src/shared/actions";
import { CATEGORY_IDS } from "../../src/shared/act";

describe("act helpers", () => {
  it("sorts listings into upcoming, now and past by local day", () => {
    const action = { kind: "action" as const, start_day: "2026-11-03", end_day: "2026-11-09" };
    expect(eventPhase(action, "2026-11-02")).toBe("upcoming");
    expect(eventPhase(action, "2026-11-03")).toBe("now");
    expect(eventPhase(action, "2026-11-09")).toBe("now");
    expect(eventPhase(action, "2026-11-10")).toBe("past");
    expect(eventPhase({ kind: "action", start_day: "nope", end_day: null }, "2026-11-10")).toBe("past");
  });

  it("keeps an eco action open for a few days after it ends", () => {
    const a = { kind: "action" as const, start_day: "2026-11-03", end_day: "2026-11-09" };
    expect(actionOpen(a, "2026-11-02")).toBe(false);
    expect(actionOpen(a, "2026-11-12")).toBe(true);
    expect(actionOpen(a, "2026-11-13")).toBe(false);
  });

  it("accepts hours in quarter steps up to the cap, with a flat bonus per entry", () => {
    expect([0.25, 1, 2.5, 12].every(isValidHours)).toBe(true);
    expect([0, -1, 0.3, 12.25, Number.NaN, "2"].some(isValidHours)).toBe(false);
    // A verified entry earns the same however many hours it covers.
    expect(hoursReward()).toEqual({ tc: 10, xp: 15 });
  });

  it("flags duplicates, long days, heavy weeks, late entries and overlong event hours", () => {
    const others = [
      { date: "2026-11-01", hours: 3, title: "Creek cleanup", org_name: "Creek Alliance", status: "verified" as const },
      { date: "2026-11-02", hours: 9, title: "Garden", org_name: "Food Bank", status: "rejected" as const },
      { date: "2026-10-30", hours: 10, title: "Trail work", org_name: "Parks", status: "pending" as const },
      { date: "2026-10-31", hours: 10, title: "Trail work", org_name: "Parks", status: "pending" as const },
    ];
    const today = "2026-11-03";
    expect(hoursFlags({ date: "2026-11-01", hours: 2, title: "creek  CLEANUP", org_name: "Other" }, others, today)).toContain("possible_duplicate");
    expect(hoursFlags({ date: "2026-11-01", hours: 6, title: "Beach", org_name: "Other" }, others, today)).toContain("long_day");
    expect(hoursFlags({ date: "2026-11-02", hours: 8, title: "Garden", org_name: "Food Bank" }, others, today)).not.toContain("possible_duplicate"); // declined entries don't count
    expect(hoursFlags({ date: "2026-11-02", hours: 8, title: "Beach", org_name: "X" }, others, today)).toContain("high_weekly_total");
    expect(hoursFlags({ date: "2026-08-01", hours: 1, title: "Beach", org_name: "X" }, [], today)).toEqual(["logged_late"]);
    expect(hoursFlags({ date: "2026-11-03", hours: 5, title: "Beach", org_name: "X", event_hours: 3 }, [], today)).toEqual(["longer_than_event"]);
    expect(hoursOnDay("2026-11-02", others)).toBe(0);
    expect(hoursOnDay("2026-11-01", others)).toBe(3);
  });

  it("round-trips event keys", () => {
    expect(eventKey({ scope: "community", id: "abc" })).toBe("e_abc");
    expect(eventKey({ scope: "class", class_id: "c1", id: "e9" })).toBe("c_c1_e9");
    expect(parseEventKey("c_c1_e9")).toEqual({ scope: "class", classId: "c1", id: "e9" });
    expect(parseEventKey("e_abc")).toEqual({ scope: "community", classId: null, id: "abc" });
    expect(parseEventKey("x_1")).toBeNull();
  });

  it("only allows web links", () => {
    expect(safeUrl("example.org/volunteer")).toBe("https://example.org/volunteer");
    expect(safeUrl("http://parks.example.gov")).toBe("http://parks.example.gov/");
    expect(safeUrl("javascript:alert(1)")).toBeNull();
    expect(safeUrl("data:text/html,hi")).toBeNull();
    expect(safeUrl("mailto:a@b.org")).toBeNull();
    expect(safeUrl("localhost")).toBeNull();
    expect(safeUrl(`https://example.org/${"a".repeat(400)}`)).toBeNull();
  });

  it("ships a complete eco action catalog", () => {
    const ids = ECO_ACTIONS.map((a) => a.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const a of ECO_ACTIONS) {
      expect(CATEGORY_IDS).toContain(a.category);
      expect(a.unit).toBeGreaterThanOrEqual(1);
      expect(a.unit).toBeLessThanOrEqual(9);
      expect(a.steps.length).toBeGreaterThanOrEqual(3);
      expect(a.summary.length).toBeLessThanOrEqual(160);
      expect(a.title.length).toBeLessThanOrEqual(90);
      expect(actionDetails(a).length).toBeLessThanOrEqual(3000);
      expect(findAction(a.id)).toBe(a);
    }
  });
});
