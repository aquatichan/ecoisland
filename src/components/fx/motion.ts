// The timing and visibility hooks behind the landing page's motion. Every effect
// that moves on its own takes its reduced-motion path from here, so "what happens
// when someone asks for less motion" is decided in one place:
//
//   useReveal   an element fades in once, when it scrolls into view. Reduced motion: shown at once.
//   useCycle    steps through frames on a timer. Reduced motion: holds the `rest` frame, no timer.
//   useInView   whether an element is on screen, so loops only run while someone can see them.
//
// Only relative imports and no DOM access outside effects, so test/unit/landing-motion.test.ts can
// render these in node with a stubbed matchMedia.
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";

export const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";
/** A mouse or trackpad: something that can hover. Touch screens don't match. */
export const FINE_POINTER = "(hover: hover) and (pointer: fine)";

const matches = (query: string) => typeof window !== "undefined" && typeof window.matchMedia === "function" && window.matchMedia(query).matches;

/** Live value of a media query. The browser is the only renderer, so the same read serves both snapshots. */
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      if (typeof window === "undefined" || typeof window.matchMedia !== "function") return () => {};
      const list = window.matchMedia(query);
      list.addEventListener("change", onChange);
      return () => list.removeEventListener("change", onChange);
    },
    [query],
  );
  const read = () => matches(query);
  return useSyncExternalStore(subscribe, read, read);
}

export const usePrefersReducedMotion = () => useMediaQuery(REDUCED_MOTION);

type ObserveOptions = { threshold?: number; rootMargin?: string };

/** Whether the element is on screen right now (live, unlike useReveal). */
export function useInView<T extends Element = HTMLElement>({ threshold = 0.2, rootMargin = "0px" }: ObserveOptions = {}) {
  const ref = useRef<T | null>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver((entries) => setInView(entries[entries.length - 1].isIntersecting), { threshold, rootMargin });
    io.observe(el);
    return () => io.disconnect();
  }, [threshold, rootMargin]);
  return [ref, inView] as const;
}

/**
 * The one scroll-reveal hook. `shown` flips to true the first time the element scrolls into
 * view and stays true. It is true from the first render when motion is reduced (or when the
 * browser has no IntersectionObserver), so content is never held back from those users.
 */
export function useReveal<T extends Element = HTMLElement>({ threshold = 0.15, rootMargin = "0px 0px -8% 0px" }: ObserveOptions = {}) {
  const reduced = usePrefersReducedMotion();
  const ref = useRef<T | null>(null);
  const [seen, setSeen] = useState(() => typeof IntersectionObserver === "undefined");
  const shown = reduced || seen;
  useEffect(() => {
    const el = ref.current;
    if (shown || !el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setSeen(true);
          io.disconnect();
        }
      },
      { threshold, rootMargin },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [shown, threshold, rootMargin]);
  return { ref, shown };
}

type CycleOptions = {
  length: number;
  ms: number;
  /** The frame to open on. */
  start?: number;
  /** The frame to hold when motion is reduced (default: the start frame). */
  rest?: number;
  /** Stop advancing (offscreen, hovered…). The timer resumes when this goes false. */
  paused?: boolean;
};

/**
 * Steps through `length` frames every `ms`. With reduced motion it opens on `rest` and never
 * starts a timer; the setter still works, so a click on a stage dot changes the frame.
 */
export function useCycle({ length, ms, start = 0, rest = start, paused = false }: CycleOptions) {
  const reduced = usePrefersReducedMotion();
  const [index, setIndex] = useState(() => (reduced ? rest : start));
  useEffect(() => {
    if (reduced || paused || length < 2) return;
    const id = window.setInterval(() => {
      if (!document.hidden) setIndex((n) => (n + 1) % length);
    }, ms);
    return () => window.clearInterval(id);
  }, [reduced, paused, length, ms]);
  return [index, setIndex] as const;
}
