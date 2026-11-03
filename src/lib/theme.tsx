import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { storageGet, storageSet } from "./utils";

export type ThemePref = "light" | "dark" | "system";
type Resolved = "light" | "dark";

type ThemeValue = { pref: ThemePref; resolved: Resolved; setPref: (p: ThemePref) => void; toggle: () => void };

const ThemeContext = createContext<ThemeValue>({ pref: "system", resolved: "light", setPref: () => {}, toggle: () => {} });
const KEY = "ecoisland-theme";
const media = () => window.matchMedia("(prefers-color-scheme: dark)");

function readPref(): ThemePref {
  const v = storageGet(KEY);
  return v === "light" || v === "dark" || v === "system" ? v : "system";
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [pref, setPrefState] = useState<ThemePref>(readPref);
  const [systemDark, setSystemDark] = useState(() => media().matches);

  useEffect(() => {
    const m = media();
    const onChange = () => setSystemDark(m.matches);
    m.addEventListener("change", onChange);
    return () => m.removeEventListener("change", onChange);
  }, []);

  const resolved: Resolved = pref === "system" ? (systemDark ? "dark" : "light") : pref;

  useEffect(() => {
    document.documentElement.classList.toggle("dark", resolved === "dark");
  }, [resolved]);

  const setPref = useCallback((p: ThemePref) => {
    setPrefState(p);
    storageSet(KEY, p);
  }, []);

  const toggle = useCallback(() => setPref(resolved === "dark" ? "light" : "dark"), [resolved, setPref]);

  const value = useMemo(() => ({ pref, resolved, setPref, toggle }), [pref, resolved, setPref, toggle]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export const useTheme = () => useContext(ThemeContext);
