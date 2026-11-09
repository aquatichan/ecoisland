// Sidebar width and visibility, remembered per device.
//
// Stored in localStorage through the safe helpers in utils.ts: it is a
// per-device layout preference, so nothing here touches Firestore. If storage
// is blocked the sidebar still works; it just starts at the default again.
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { storageGet, storageSet } from "./utils";

export const SIDEBAR = {
  DEFAULT: 248,
  MIN: 200,
  MAX: 360,
  /** Dragging the edge narrower than this and letting go hides the sidebar. */
  HIDE_BELOW: 160,
  KEY_STEP: 16,
  KEY_STEP_BIG: 48,
} as const;

const WIDTH_KEY = "ecoisland-sidebar-width";
const HIDDEN_KEY = "ecoisland-sidebar-hidden";

export function clampWidth(width: number): number {
  return Math.min(SIDEBAR.MAX, Math.max(SIDEBAR.MIN, Math.round(width)));
}

/** A stored width, or the default when it is missing or not a number. */
export function parseWidth(raw: string | null): number {
  const n = raw === null || raw.trim() === "" ? NaN : Number(raw);
  return Number.isFinite(n) ? clampWidth(n) : SIDEBAR.DEFAULT;
}

/** Where a drag from `startWidth` that moved `dx` pixels ends up. */
export function resolveDrag(startWidth: number, dx: number): { width: number; willHide: boolean } {
  const raw = startWidth + dx;
  return { width: clampWidth(raw), willHide: raw < SIDEBAR.HIDE_BELOW };
}

/** The new width for a key press on the separator, or null for keys it ignores. */
export function widthForKey(width: number, key: string, shift: boolean): number | null {
  const step = shift ? SIDEBAR.KEY_STEP_BIG : SIDEBAR.KEY_STEP;
  switch (key) {
    case "ArrowLeft":
      return clampWidth(width - step);
    case "ArrowRight":
      return clampWidth(width + step);
    case "Home":
      return SIDEBAR.MIN;
    case "End":
      return SIDEBAR.MAX;
    default:
      return null;
  }
}

type SidebarValue = {
  width: number;
  hidden: boolean;
  /** True while the edge is being dragged (the width should follow the pointer with no easing). */
  resizing: boolean;
  /** Set the width. Pass commit=false while dragging, then call again with true on release. */
  setWidth: (width: number, commit?: boolean) => void;
  setResizing: (resizing: boolean) => void;
  hide: () => void;
  show: () => void;
  toggle: () => void;
  reset: () => void;
};

const SidebarContext = createContext<SidebarValue | null>(null);

export function SidebarProvider({ children }: { children: ReactNode }) {
  const [width, setWidthState] = useState(() => parseWidth(storageGet(WIDTH_KEY)));
  const [hidden, setHidden] = useState(() => storageGet(HIDDEN_KEY) === "1");
  const [resizing, setResizing] = useState(false);

  const setWidth = useCallback((next: number, commit = true) => {
    const w = clampWidth(next);
    setWidthState(w);
    if (commit) storageSet(WIDTH_KEY, String(w));
  }, []);

  const setVisibility = useCallback((isHidden: boolean) => {
    setHidden(isHidden);
    storageSet(HIDDEN_KEY, isHidden ? "1" : "0");
  }, []);

  const hide = useCallback(() => setVisibility(true), [setVisibility]);
  const show = useCallback(() => setVisibility(false), [setVisibility]);
  const toggle = useCallback(() => setVisibility(!hidden), [hidden, setVisibility]);
  const reset = useCallback(() => setWidth(SIDEBAR.DEFAULT), [setWidth]);

  const value = useMemo(
    () => ({ width, hidden, resizing, setWidth, setResizing, hide, show, toggle, reset }),
    [width, hidden, resizing, setWidth, hide, show, toggle, reset],
  );
  return <SidebarContext.Provider value={value}>{children}</SidebarContext.Provider>;
}

export function useSidebar(): SidebarValue {
  const ctx = useContext(SidebarContext);
  if (!ctx) throw new Error("useSidebar must be used inside <SidebarProvider>");
  return ctx;
}
