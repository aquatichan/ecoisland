import { describe, expect, it } from "vitest";
import {
  addDays,
  daysBetween,
  dueLabel,
  effectiveStreak,
  isDayKey,
  isPlausibleClientDay,
  weekKey,
  weekStart,
  weekday,
} from "../../src/shared/dates";

describe("day keys", () => {
  it("validates real calendar dates only", () => {
    expect(isDayKey("2026-11-02")).toBe(true);
    expect(isDayKey("2026-02-29")).toBe(false);
    expect(isDayKey("2028-02-29")).toBe(true);
    expect(isDayKey("2026-13-01")).toBe(false);
    expect(isDayKey("2026-1-01")).toBe(false);
    expect(isDayKey(20261102)).toBe(false);
  });

  it("adds days across month and year boundaries", () => {
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
    expect(daysBetween("2026-11-01", "2026-11-08")).toBe(7);
  });

  it("computes ISO weeks", () => {
    expect(weekKey("2026-11-02")).toBe("2026-W45");
    expect(weekKey("2026-01-01")).toBe("2026-W01");
    expect(weekKey("2027-01-03")).toBe("2026-W53");
    expect(weekKey("2026-12-31")).toBe("2026-W53");
    expect(weekKey("2024-12-30")).toBe("2025-W01");
    expect(weekKey("2026-03-01")).toBe("2026-W09");
    expect(weekday("2026-11-02")).toBe(0);
    expect(weekStart("2026-11-08")).toBe("2026-11-02");
  });

  it("accepts client days within a day of UTC", () => {
    const now = new Date("2026-11-02T03:00:00Z");
    expect(isPlausibleClientDay("2026-11-01", now)).toBe(true); // evening in California
    expect(isPlausibleClientDay("2026-11-02", now)).toBe(true);
    expect(isPlausibleClientDay("2026-11-03", now)).toBe(true);
    expect(isPlausibleClientDay("2026-10-31", now)).toBe(false);
    expect(isPlausibleClientDay("2026-11-04", now)).toBe(false);
    expect(isPlausibleClientDay("nope", now)).toBe(false);
  });

  it("keeps a streak alive until the end of the next day", () => {
    expect(effectiveStreak(5, "2026-11-02", "2026-11-02")).toBe(5);
    expect(effectiveStreak(5, "2026-11-01", "2026-11-02")).toBe(5);
    expect(effectiveStreak(5, "2026-10-31", "2026-11-02")).toBe(0);
    expect(effectiveStreak(0, "2026-11-02", "2026-11-02")).toBe(0);
    expect(effectiveStreak(3, undefined, "2026-11-02")).toBe(0);
  });

  it("labels due dates", () => {
    expect(dueLabel("2026-11-02", "2026-11-02")).toBe("Due today");
    expect(dueLabel("2026-11-03", "2026-11-02")).toBe("Due tomorrow");
    expect(dueLabel("2026-11-05", "2026-11-02")).toBe("Due in 3 days");
    expect(dueLabel("2026-11-01", "2026-11-02")).toBe("1 day late");
    expect(dueLabel("2026-10-30", "2026-11-02")).toBe("3 days late");
  });
});
