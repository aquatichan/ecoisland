// Live data for Act: community and class listings, volunteer hours, and who
// can post what. Writes go through the server (worker/act.ts).
import { collection, doc, onSnapshot, query, where } from "firebase/firestore";
import { Apple, Bird, BrushCleaning, Droplets, Leaf, Megaphone, Recycle, Sprout, Wind, Zap, type LucideIcon } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { eventDays, eventKey, type AmbassadorApplication, type Category, type EcoEvent, type HoursLog } from "@/shared/act";
import type { UserDoc } from "@/shared/types";
import { db } from "./firebase";

export type Listing = EcoEvent & { key: string };

export const CATEGORY_STYLE: Record<Category, { icon: LucideIcon; tone: "brand" | "ocean" | "sun" | "coral" }> = {
  cleanup: { icon: BrushCleaning, tone: "ocean" },
  planting: { icon: Sprout, tone: "brand" },
  waste: { icon: Recycle, tone: "brand" },
  energy: { icon: Zap, tone: "sun" },
  water: { icon: Droplets, tone: "ocean" },
  wildlife: { icon: Bird, tone: "brand" },
  air: { icon: Wind, tone: "ocean" },
  food: { icon: Apple, tone: "coral" },
  advocacy: { icon: Megaphone, tone: "sun" },
  other: { icon: Leaf, tone: "brand" },
};

export const TONE_CLASS = {
  brand: "bg-brand-soft text-brand-ink",
  ocean: "bg-ocean-soft text-ocean",
  sun: "bg-sun-soft text-sun-ink",
  coral: "bg-coral-soft text-coral",
} as const;

function withKey(e: EcoEvent): Listing {
  return { ...e, key: eventKey(e) };
}

/** Sort key: when a listing starts. */
export function startsAt(e: EcoEvent): string {
  return e.kind === "event" ? (e.starts_at ?? "") : `${e.start_day ?? ""}T00:00`;
}

/**
 * Everything a person can see in Act: published (and cancelled) community
 * listings, plus every listing in the classes they're in or teach.
 */
export function useListings(profile: UserDoc): { listings: Listing[]; loading: boolean } {
  const classIds = useMemo(() => [...new Set([...(profile.class_ids ?? []), ...(profile.teaching_ids ?? [])])].slice(0, 20), [profile.class_ids, profile.teaching_ids]);
  const classKey = classIds.join(",");
  const [community, setCommunity] = useState<Listing[] | null>(null);
  const [byClass, setByClass] = useState<Record<string, Listing[]>>({});

  useEffect(
    () =>
      onSnapshot(
        query(collection(db, "events"), where("status", "in", ["published", "cancelled"])),
        (snap) => setCommunity(snap.docs.map((d) => withKey({ ...(d.data() as EcoEvent), id: d.id }))),
        () => setCommunity([]),
      ),
    [],
  );

  useEffect(() => {
    const ids = classKey ? classKey.split(",") : [];
    setByClass({});
    const unsubs = ids.map((cid) =>
      onSnapshot(
        collection(db, "classes", cid, "events"),
        (snap) => setByClass((m) => ({ ...m, [cid]: snap.docs.map((d) => withKey({ ...(d.data() as EcoEvent), id: d.id, scope: "class", class_id: cid })) })),
        () => setByClass((m) => ({ ...m, [cid]: [] })),
      ),
    );
    return () => unsubs.forEach((u) => u());
  }, [classKey]);

  return useMemo(() => {
    const ids = classKey ? classKey.split(",") : [];
    const loading = community === null || ids.some((id) => !(id in byClass));
    const all = [...(community ?? []), ...ids.flatMap((id) => byClass[id] ?? [])];
    all.sort((a, b) => startsAt(a).localeCompare(startsAt(b)));
    return { listings: all, loading };
  }, [community, byClass, classKey]);
}

/** One listing by scope and id, live. */
export function useListing(scope: "community" | "class", classId: string | null, id: string): { listing: Listing | null; loading: boolean } {
  const path = scope === "class" ? `classes/${classId}/events/${id}` : `events/${id}`;
  const [state, setState] = useState<{ listing: Listing | null; loading: boolean }>({ listing: null, loading: true });
  useEffect(() => {
    setState({ listing: null, loading: true });
    return onSnapshot(
      doc(db, path),
      (snap) =>
        setState({
          listing: snap.exists() ? withKey({ ...(snap.data() as EcoEvent), id: snap.id, scope, class_id: scope === "class" ? classId : null }) : null,
          loading: false,
        }),
      () => setState({ listing: null, loading: false }),
    );
  }, [path, scope, classId]);
  return state;
}

function useQueryDocs<T>(make: () => ReturnType<typeof query> | null, deps: unknown[]): { items: T[]; loading: boolean } {
  const [state, setState] = useState<{ items: T[]; loading: boolean }>({ items: [], loading: true });
  useEffect(() => {
    const q = make();
    if (!q) {
      setState({ items: [], loading: false });
      return;
    }
    setState((s) => ({ ...s, loading: true }));
    return onSnapshot(
      q,
      (snap) => setState({ items: snap.docs.map((d) => ({ ...(d.data() as T), id: d.id })), loading: false }),
      () => setState({ items: [], loading: false }),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return state;
}

export function useMyHours(uid: string) {
  const out = useQueryDocs<HoursLog>(() => query(collection(db, "hours"), where("uid", "==", uid)), [uid]);
  return useMemo(() => ({ ...out, items: [...out.items].sort((a, b) => b.date.localeCompare(a.date) || b.created_at.localeCompare(a.created_at)) }), [out]);
}

export function useHoursToReview(uid: string, enabled: boolean) {
  const out = useQueryDocs<HoursLog>(
    () => (enabled ? query(collection(db, "hours"), where("teacher_uid", "==", uid), where("status", "==", "pending")) : null),
    [uid, enabled],
  );
  return useMemo(() => ({ ...out, items: [...out.items].sort((a, b) => a.created_at.localeCompare(b.created_at)) }), [out]);
}

/** Community listings this person posted or suggested, including pending and rejected. */
export function useMySuggestions(uid: string) {
  return useQueryDocs<EcoEvent>(() => query(collection(db, "events"), where("created_by", "==", uid)), [uid]);
}

export function useIsAdmin(uid: string): boolean {
  const [admin, setAdmin] = useState(false);
  useEffect(
    () =>
      onSnapshot(
        doc(db, "admins", uid),
        (snap) => setAdmin(snap.exists()),
        () => setAdmin(false),
      ),
    [uid],
  );
  return admin;
}

export function useAmbassadorApplication(uid: string): { application: AmbassadorApplication | null; loading: boolean } {
  const [state, setState] = useState<{ application: AmbassadorApplication | null; loading: boolean }>({ application: null, loading: true });
  useEffect(
    () =>
      onSnapshot(
        doc(db, "ambassador_applications", uid),
        (snap) => setState({ application: snap.exists() ? (snap.data() as AmbassadorApplication) : null, loading: false }),
        () => setState({ application: null, loading: false }),
      ),
    [uid],
  );
  return state;
}

// ─── Formatting ─────────────────────────────────────────────────────────────

const dayDate = (key: string) => {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
};

/** "Sat, Nov 14 · 9:00 AM – 12:00 PM", or "Nov 3 – Nov 10" for an action. */
export function whenLabel(e: EcoEvent): string {
  if (e.kind === "action") {
    if (!e.start_day || !e.end_day) return "";
    const fmt: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
    const a = dayDate(e.start_day).toLocaleDateString(undefined, fmt);
    const b = dayDate(e.end_day).toLocaleDateString(undefined, fmt);
    return a === b ? a : `${a} – ${b}`;
  }
  if (!e.starts_at || !e.ends_at) return "";
  const s = new Date(e.starts_at);
  const f = new Date(e.ends_at);
  const day: Intl.DateTimeFormatOptions = { weekday: "short", month: "short", day: "numeric" };
  const time: Intl.DateTimeFormatOptions = { hour: "numeric", minute: "2-digit" };
  if (s.toDateString() === f.toDateString()) {
    return `${s.toLocaleDateString(undefined, day)} · ${s.toLocaleTimeString([], time)} – ${f.toLocaleTimeString([], time)}`;
  }
  return `${s.toLocaleDateString(undefined, day)}, ${s.toLocaleTimeString([], time)} – ${f.toLocaleDateString(undefined, day)}, ${f.toLocaleTimeString([], time)}`;
}

/** Month and day for the date tile on a card. */
export function dateTile(e: EcoEvent): { month: string; day: string } {
  const days = eventDays(e);
  const d = days ? dayDate(days.start) : new Date();
  return { month: d.toLocaleDateString(undefined, { month: "short" }).toUpperCase(), day: String(d.getDate()) };
}

export function formatHours(h: number): string {
  const v = Math.round(h * 100) / 100;
  return `${v} ${v === 1 ? "hour" : "hours"}`;
}

/** Local "YYYY-MM-DDTHH:mm" for a datetime-local input. */
export function toLocalInput(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

export function listingHref(e: { scope: string; class_id?: string | null; id: string }): string {
  return e.scope === "class" ? `/act/class/${e.class_id}/${e.id}` : `/act/e/${e.id}`;
}

// ─── Calendar file ──────────────────────────────────────────────────────────

function icsText(v: string): string {
  return v.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
}

function fold(line: string): string {
  const out: string[] = [];
  let rest = line;
  while (rest.length > 74) {
    out.push(rest.slice(0, 74));
    rest = ` ${rest.slice(74)}`;
  }
  out.push(rest);
  return out.join("\r\n");
}

const utcStamp = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
const dateStamp = (key: string) => key.replace(/-/g, "");

/** An .ics file for adding a listing to Google Calendar, Outlook or Apple Calendar. */
export function calendarFile(e: Listing, url: string): string {
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Ecoisland//Act//EN", "CALSCALE:GREGORIAN", "BEGIN:VEVENT", `UID:${e.key}@ecoisland.xyz`, `DTSTAMP:${utcStamp(new Date())}`];
  if (e.kind === "event" && e.starts_at && e.ends_at) {
    lines.push(`DTSTART:${utcStamp(new Date(e.starts_at))}`, `DTEND:${utcStamp(new Date(e.ends_at))}`);
  } else if (e.start_day && e.end_day) {
    const end = dayDate(e.end_day);
    end.setDate(end.getDate() + 1);
    const p = (n: number) => String(n).padStart(2, "0");
    lines.push(`DTSTART;VALUE=DATE:${dateStamp(e.start_day)}`, `DTEND;VALUE=DATE:${end.getFullYear()}${p(end.getMonth() + 1)}${p(end.getDate())}`);
  }
  lines.push(`SUMMARY:${icsText(e.title)}`);
  if (e.location) lines.push(`LOCATION:${icsText(e.location)}`);
  lines.push(`DESCRIPTION:${icsText(`${e.summary}\n\n${url}`)}`, `URL:${url}`, "END:VEVENT", "END:VCALENDAR");
  return `${lines.map(fold).join("\r\n")}\r\n`;
}

export function downloadCalendar(e: Listing): void {
  const url = `${window.location.origin}${listingHref(e)}`;
  const blob = new Blob([calendarFile(e, url)], { type: "text/calendar;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `${e.title.replace(/[^A-Za-z0-9]+/g, "-").replace(/^-|-$/g, "").toLowerCase() || "event"}.ics`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
