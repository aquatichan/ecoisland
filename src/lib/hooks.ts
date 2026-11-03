import { useEffect, useState } from "react";
import { localDayKey, type DayKey } from "@/shared/dates";

/** Today's local day key. Updates on its own after midnight. */
export function useToday(): DayKey {
  const [today, setToday] = useState(localDayKey);
  useEffect(() => {
    const id = window.setInterval(() => {
      const now = localDayKey();
      setToday((prev) => (prev === now ? prev : now));
    }, 60_000);
    return () => window.clearInterval(id);
  }, []);
  return today;
}

/** Calls `handler` for a keyboard shortcut unless the user is typing. */
export function useHotkey(key: string, handler: (e: KeyboardEvent) => void, opts: { meta?: boolean; enabled?: boolean } = {}) {
  const { meta = false, enabled = true } = opts;
  useEffect(() => {
    if (!enabled) return;
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const typing = !!target && (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName));
      if (meta) {
        if (!(e.metaKey || e.ctrlKey) || e.key.toLowerCase() !== key) return;
      } else {
        if (typing || e.metaKey || e.ctrlKey || e.altKey || e.key.toLowerCase() !== key) return;
      }
      handler(e);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [key, handler, meta, enabled]);
}

export function useDocumentTitle(title: string) {
  useEffect(() => {
    document.title = title ? `${title} · Ecoisland` : "Ecoisland";
  }, [title]);
}
