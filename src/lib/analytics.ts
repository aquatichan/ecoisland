// Product analytics (Google Analytics for Firebase). Loaded lazily, never in
// emulator mode, and never blocking the UI. Event names describe what a
// student did so retention can be measured: sign-ups, daily sets, assignments.
import { USE_EMULATORS, app } from "./firebase";

type Params = Record<string, string | number | boolean | undefined>;
let ready: Promise<((name: string, params?: Params) => void) | null> | null = null;

function load() {
  if (!ready) {
    ready = (async () => {
      if (USE_EMULATORS || import.meta.env.DEV) return null;
      try {
        const mod = await import("firebase/analytics");
        if (!(await mod.isSupported())) return null;
        const analytics = mod.getAnalytics(app);
        return (name: string, params?: Params) => mod.logEvent(analytics, name, params);
      } catch {
        return null;
      }
    })();
  }
  return ready;
}

export function track(name: string, params?: Params): void {
  void load().then((log) => {
    try {
      log?.(name, params);
    } catch {
      /* analytics must never break the app */
    }
  });
}
