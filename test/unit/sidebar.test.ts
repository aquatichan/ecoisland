import { describe, expect, it } from "vitest";
import { SIDEBAR, clampWidth, parseWidth, resolveDrag, widthForKey } from "../../src/lib/sidebar";

describe("sidebar sizing", () => {
  it("clamps widths to the allowed range", () => {
    expect(clampWidth(10)).toBe(SIDEBAR.MIN);
    expect(clampWidth(9999)).toBe(SIDEBAR.MAX);
    expect(clampWidth(250.6)).toBe(251);
  });

  it("restores a stored width, and falls back to the default for anything else", () => {
    expect(parseWidth("300")).toBe(300);
    expect(parseWidth("5")).toBe(SIDEBAR.MIN);
    expect(parseWidth("5000")).toBe(SIDEBAR.MAX);
    for (const bad of [null, "", "  ", "wide", "NaN"]) expect(parseWidth(bad)).toBe(SIDEBAR.DEFAULT);
  });

  it("follows a drag, and flags a drag past the hide threshold", () => {
    expect(resolveDrag(248, 40)).toEqual({ width: 288, willHide: false });
    expect(resolveDrag(248, -60)).toEqual({ width: SIDEBAR.MIN, willHide: false });
    expect(resolveDrag(248, 500)).toEqual({ width: SIDEBAR.MAX, willHide: false });
    expect(resolveDrag(248, -100)).toEqual({ width: SIDEBAR.MIN, willHide: true });
    expect(resolveDrag(248, -88).willHide).toBe(false);
    expect(resolveDrag(248, -89).willHide).toBe(true);
  });

  it("resizes from the keyboard and ignores other keys", () => {
    expect(widthForKey(248, "ArrowRight", false)).toBe(264);
    expect(widthForKey(248, "ArrowLeft", false)).toBe(232);
    expect(widthForKey(248, "ArrowRight", true)).toBe(296);
    expect(widthForKey(SIDEBAR.MIN, "ArrowLeft", false)).toBe(SIDEBAR.MIN);
    expect(widthForKey(SIDEBAR.MAX, "ArrowRight", false)).toBe(SIDEBAR.MAX);
    expect(widthForKey(248, "Home", false)).toBe(SIDEBAR.MIN);
    expect(widthForKey(248, "End", false)).toBe(SIDEBAR.MAX);
    expect(widthForKey(248, "Enter", false)).toBeNull();
    expect(widthForKey(248, "a", false)).toBeNull();
  });
});
