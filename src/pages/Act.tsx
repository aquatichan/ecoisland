// Act: put the science to work. Volunteer events and eco actions from your
// class and your community, as upcoming, happening now and past, plus your
// volunteer hours record.
import { Award, CalendarPlus, ClipboardCheck, HandHeart, Hourglass, Leaf, Plus, Printer, RotateCcw, Search, Shield, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import CountUp from "@/components/bits/CountUp";
import { EventCard } from "@/components/act/EventCard";
import { EventForm, type ClassOption } from "@/components/act/EventForm";
import { LogHoursDialog, ReviewHoursDialog, type VerifierOption } from "@/components/act/Dialogs";
import { ScheduleAction } from "@/components/act/ScheduleAction";
import { Page } from "@/components/app/Guards";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tray } from "@/components/ui/tray";
import { EmptyState, Skeleton } from "@/components/ui/empty";
import { Input, Select } from "@/components/ui/field";
import { Segmented } from "@/components/ui/segmented";
import { formatHours, startsAt, useHoursToReview, useIsAdmin, useListings, useMyHours, useMySuggestions, type Listing } from "@/lib/act";
import { useClasses } from "@/lib/data";
import { useDocumentTitle, useToday } from "@/lib/hooks";
import { useProfile } from "@/lib/session";
import { CATEGORIES, CATEGORY_IDS, eventDays, eventPhase, type Category, type Phase } from "@/shared/act";
import { addDays } from "@/shared/dates";

type Kind = "all" | "event" | "action";
type Sort = "soonest" | "newest" | "popular" | "least";
type Within = "any" | "today" | "week" | "month";


const popularity = (l: Listing) => (l.kind === "event" ? (l.going_count ?? 0) : (l.done_count ?? 0));

export default function Act() {
  const profile = useProfile();
  const today = useToday();
  useDocumentTitle("Act");
  const teacher = profile.role === "teacher";
  const admin = useIsAdmin(profile.id);
  const trusted = admin || profile.ambassador === true;
  const [params, setParams] = useSearchParams();
  const phase = (["upcoming", "now", "past"].includes(params.get("when") ?? "") ? params.get("when") : "upcoming") as Phase;
  const kind = (["all", "event", "action"].includes(params.get("kind") ?? "") ? params.get("kind") : "all") as Kind;
  // "all", "class", "community", or a specific class id
  const scope = params.get("scope") ?? "all";
  const region = params.get("where") ?? "";
  const within = (["any", "today", "week", "month"].includes(params.get("within") ?? "") ? params.get("within") : "any") as Within;
  const category = (CATEGORY_IDS as string[]).includes(params.get("cat") ?? "") ? (params.get("cat") as Category) : "";
  const sort = (["soonest", "newest", "popular", "least"].includes(params.get("sort") ?? "") ? params.get("sort") : "soonest") as Sort;
  const q = params.get("q") ?? "";
  const setParam = (k: string, v: string) => {
    const next = new URLSearchParams(params);
    if (v) next.set(k, v);
    else next.delete(k);
    setParams(next, { replace: true });
  };
  const filtered = !!(region || category || q || within !== "any" || scope !== "all" || sort !== "soonest");
  const clearFilters = () => {
    const next = new URLSearchParams();
    if (params.get("when")) next.set("when", phase);
    if (params.get("kind")) next.set("kind", kind);
    setParams(next, { replace: true });
  };

  const { listings, loading } = useListings(profile);
  const { classes: taught } = useClasses(teacher ? profile.teaching_ids : []);
  const { classes: joined } = useClasses(teacher ? [] : profile.class_ids);
  const hours = useMyHours(profile.id);
  const toReview = useHoursToReview(profile.id, teacher);
  const suggestions = useMySuggestions(profile.id);

  const [form, setForm] = useState<"event" | "action" | null>(null);
  const [scheduling, setScheduling] = useState(false);
  const [logging, setLogging] = useState(false);
  const [reviewing, setReviewing] = useState(false);

  const going = useMemo(() => new Set(profile.rsvp_events ?? []), [profile.rsvp_events]);
  const done = useMemo(() => new Set(profile.actions_done ?? []), [profile.actions_done]);
  const visible = listings.filter((l) => l.status === "published" || l.status === "cancelled");
  const regions = useMemo(
    () => [...new Set(visible.filter((l) => l.scope === "community" && l.region).map((l) => (l.region ?? "").trim()))].sort((a, b) => a.localeCompare(b)),
    [visible],
  );
  const classNames = useMemo(() => {
    const m = new Map<string, string>();
    for (const l of visible) if (l.scope === "class" && l.class_id) m.set(l.class_id, l.class_name || "Class");
    return [...m.entries()];
  }, [visible]);

  // Everything except the When tabs, so the tab counts match what's shown.
  const matches = (l: Listing) => {
    if (kind !== "all" && l.kind !== kind) return false;
    if (scope === "class" && l.scope !== "class") return false;
    if (scope === "community" && l.scope !== "community") return false;
    if (scope !== "all" && scope !== "class" && scope !== "community" && l.class_id !== scope) return false;
    if (region && (l.scope !== "community" || (l.region ?? "").trim() !== region)) return false;
    if (category && l.category !== category) return false;
    if (q) {
      const hay = `${l.title} ${l.summary} ${l.org_name ?? ""} ${l.location ?? ""} ${l.region ?? ""}`.toLowerCase();
      if (!q.toLowerCase().split(/\s+/).every((w) => hay.includes(w))) return false;
    }
    if (within !== "any") {
      const days = eventDays(l);
      if (!days) return false;
      const span = within === "today" ? 0 : within === "week" ? 7 : 30;
      // Upcoming and now: starting within the window. Past: ended within it.
      if (phase === "past") {
        if (days.end < addDays(today, -span)) return false;
      } else if (days.start > addDays(today, span)) return false;
    }
    return true;
  };
  const narrowed = visible.filter(matches);
  const counts = { upcoming: 0, now: 0, past: 0 };
  for (const l of narrowed) if (l.status !== "cancelled") counts[eventPhase(l, today)]++;
  const shown = narrowed
    .filter((l) => eventPhase(l, today) === phase)
    .sort((a, b) => {
      if (sort === "newest") return b.created_at.localeCompare(a.created_at);
      if (sort === "popular") return popularity(b) - popularity(a) || startsAt(a).localeCompare(startsAt(b));
      if (sort === "least") return popularity(a) - popularity(b) || startsAt(a).localeCompare(startsAt(b));
      // Soonest: next up first; for past listings, the most recent first.
      return (phase === "past" ? -1 : 1) * startsAt(a).localeCompare(startsAt(b));
    });

  const classOptions: ClassOption[] = taught.map((c) => ({ id: c.id, name: c.name }));
  const verifiers: VerifierOption[] = joined.map((c) => ({ classId: c.id, label: `${c.teacher_name} (${c.name})` }));
  const verified = hours.items.filter((h) => h.status === "verified").reduce((s, h) => s + h.hours, 0);
  const pending = hours.items.filter((h) => h.status === "pending");
  const myOpen = suggestions.items.filter((s) => s.status === "pending" || s.status === "rejected");

  return (
    <Page>
      <header className="page-hero">
        <div className="flex items-end justify-between gap-6">
          <div className="min-w-0 max-w-1/2">
            <p className="t-eyebrow text-fg-2">Act</p>
            <h1 className="t-hero mt-2.5">Take it outside</h1>
            <p className="mt-2 text-md text-fg-2">
              Volunteer events and eco actions from {teacher ? "your classes" : "your class"} and your community. Learn the science in Study, then put it to work here.
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {teacher && classOptions.length > 0 ? (
              <>
                <Button variant="secondary" onClick={() => setForm("event")}>
                  <CalendarPlus /> Post an event
                </Button>
                <Button onClick={() => setScheduling(true)}>
                  <Leaf /> Schedule an eco action
                </Button>
              </>
            ) : (
              <Button variant={trusted ? "primary" : "secondary"} onClick={() => setForm("event")}>
                <Plus /> {trusted ? "Post a community event" : "Suggest an event"}
              </Button>
            )}
          </div>
        </div>
      </header>

      <div className="grid grid-cols-[minmax(0,1.9fr)_minmax(16rem,1fr)] items-start gap-6">
        <Tray className="@container min-w-0">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <Segmented<Phase>
              label="When"
              value={phase}
              onChange={(v) => setParam("when", v)}
              options={[
                { value: "upcoming", label: <>Upcoming{counts.upcoming ? <span className="t-num text-fg-3">{counts.upcoming}</span> : null}</> },
                { value: "now", label: <>Happening now{counts.now ? <span className="t-num text-fg-3">{counts.now}</span> : null}</> },
                { value: "past", label: "Past" },
              ]}
            />
            <Segmented<Kind>
              label="Type"
              size="sm"
              value={kind}
              onChange={(v) => setParam("kind", v)}
              options={[
                { value: "all", label: "All" },
                { value: "event", label: "Events" },
                { value: "action", label: "Eco actions" },
              ]}
            />
          </div>

          <div className="mb-3 grid grid-cols-[repeat(auto-fill,minmax(10.5rem,1fr))] gap-2.5">
            <div className="relative col-span-full">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-fg-3" aria-hidden />
              <Input value={q} onChange={(e) => setParam("q", e.target.value)} placeholder="Search title, organizer or place" aria-label="Search listings" className="h-9 pl-9 text-base placeholder:text-fg-3" />
            </div>
            <Select value={scope} onChange={(e) => setParam("scope", e.target.value === "all" ? "" : e.target.value)} aria-label="Who it's for" className="h-9 w-full text-base">
              <option value="all">Classes and community</option>
              <option value="class">{classNames.length > 1 ? "All my classes" : "My class"}</option>
              {classNames.length > 1 && classNames.map(([id, name]) => (
                <option key={id} value={id}>
                  {name}
                </option>
              ))}
              <option value="community">Community</option>
            </Select>
            <Select
              value={region}
              onChange={(e) => {
                const next = new URLSearchParams(params);
                if (e.target.value) {
                  next.set("where", e.target.value);
                  if (scope === "class" || (scope !== "all" && scope !== "community")) next.delete("scope");
                } else next.delete("where");
                setParams(next, { replace: true });
              }}
              aria-label="Location"
              className="h-9 w-full text-base"
              disabled={regions.length === 0}
            >
              <option value="">{regions.length ? "Any location" : "No locations yet"}</option>
              {regions.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </Select>
            <Select value={within} onChange={(e) => setParam("within", e.target.value === "any" ? "" : e.target.value)} aria-label="Time" className="h-9 w-full text-base">
              <option value="any">Any time</option>
              <option value="today">{phase === "past" ? "Ended today" : "Today"}</option>
              <option value="week">{phase === "past" ? "Past week" : "Next 7 days"}</option>
              <option value="month">{phase === "past" ? "Past 30 days" : "Next 30 days"}</option>
            </Select>
            <Select value={category} onChange={(e) => setParam("cat", e.target.value)} aria-label="Category" className="h-9 w-full text-base">
              <option value="">All categories</option>
              {CATEGORY_IDS.map((c) => (
                <option key={c} value={c}>
                  {CATEGORIES[c]}
                </option>
              ))}
            </Select>
            <Select value={sort} onChange={(e) => setParam("sort", e.target.value === "soonest" ? "" : e.target.value)} aria-label="Sort" className="h-9 w-full text-base">
              <option value="soonest">{phase === "past" ? "Most recent" : "Coming up soonest"}</option>
              <option value="newest">Newest posted</option>
              <option value="popular">Most popular</option>
              <option value="least">Least popular</option>
            </Select>
            {filtered && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                <RotateCcw /> Clear
              </Button>
            )}
          </div>

          {loading ? (
            <div className="grid grid-cols-1 gap-3 @lg:grid-cols-2">
              <Skeleton className="h-40 rounded-lg" />
              <Skeleton className="h-40 rounded-lg" />
              <Skeleton className="h-40 rounded-lg" />
            </div>
          ) : shown.length === 0 ? (
            <Card>
              <EmptyState
                icon={phase === "past" ? Hourglass : HandHeart}
                title={filtered && visible.length > 0 ? "Nothing matches these filters" : phase === "upcoming" ? "Nothing scheduled yet" : phase === "now" ? "Nothing happening today" : "Nothing here yet"}
                body={
                  teacher
                    ? "Schedule an eco action for your class. There are twelve ready to go, each tied to an APES unit."
                    : phase === "past"
                      ? "Events and eco actions you could join show up here once they end."
                      : "When your teacher or your community posts something, it shows up here. Know a cleanup or planting near you? Suggest it."
                }
                action={
                  teacher && classOptions.length > 0 ? (
                    <Button onClick={() => setScheduling(true)}>
                      <Leaf /> Schedule an eco action
                    </Button>
                  ) : phase !== "past" ? (
                    <Button variant="secondary" onClick={() => setForm("event")}>
                      <Plus /> Suggest an event
                    </Button>
                  ) : undefined
                }
              />
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-3 @lg:grid-cols-2">
              {shown.map((l, i) => (
                <EventCard key={l.key} e={l} going={going.has(l.key)} done={done.has(l.key)} index={i} />
              ))}
            </div>
          )}
        </Tray>

        <aside className="tray space-y-3">
          {teacher ? (
            <Card className="p-6">
              <div className="flex items-center gap-2.5">
                <ClipboardCheck className="size-4.5 text-brand" aria-hidden />
                <h2 className="text-md font-semibold text-fg">Hours to verify</h2>
              </div>
              <p className="font-display t-num mt-3 text-4xl leading-none font-[600] text-fg">{toReview.items.length}</p>
              <p className="mt-2 text-sm text-fg-3">
                {toReview.items.length ? "Students are waiting on you to verify their volunteer hours." : "When students log hours with your class, you verify them here."}
              </p>
              {toReview.items.length > 0 && (
                <Button className="mt-4 w-full" onClick={() => setReviewing(true)}>
                  Review {toReview.items.length === 1 ? "entry" : `${toReview.items.length} entries`}
                </Button>
              )}
            </Card>
          ) : (
            <Card className="p-6">
              <div className="flex items-center gap-2.5">
                <HandHeart className="size-4.5 text-brand" aria-hidden />
                <h2 className="text-md font-semibold text-fg">Your volunteer hours</h2>
              </div>
              <p className="mt-3 flex items-baseline gap-2">
                <span className="font-display t-num text-4xl leading-none font-[600] text-fg">
                  <CountUp to={Math.round(verified * 100) / 100} duration={0.8} />
                </span>
                <span className="text-base text-fg-3">verified</span>
              </p>
              {pending.length > 0 && <p className="mt-1.5 text-sm text-sun-ink">{formatHours(pending.reduce((s, h) => s + h.hours, 0))} waiting for your teacher</p>}
              <p className="mt-2 text-sm text-fg-3">Teacher-verified hours you can print for service requirements.</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button className="flex-1" onClick={() => setLogging(true)}>
                  <Plus /> Log hours
                </Button>
                <Button variant="secondary" className="flex-1" asChild>
                  <Link to="/act/hours">
                    <Printer /> Record
                  </Link>
                </Button>
              </div>
            </Card>
          )}

          {myOpen.length > 0 && (
            <Card className="p-6">
              <h2 className="text-md font-semibold text-fg">Your suggestions</h2>
              <ul className="mt-3 space-y-2.5">
                {myOpen.map((s) => (
                  <li key={s.id} className="text-base">
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate font-medium text-fg-2">{s.title}</span>
                      <Badge tone={s.status === "pending" ? "sun" : "coral"}>{s.status === "pending" ? "In review" : "Not approved"}</Badge>
                    </div>
                    {s.status === "rejected" && s.review_note && <p className="mt-1 text-sm text-fg-3">{s.review_note}</p>}
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {admin && (
            <Card className="p-6">
              <div className="flex items-center gap-2.5">
                <Shield className="size-4.5 text-ocean" aria-hidden />
                <h2 className="text-md font-semibold text-fg">Admin</h2>
              </div>
              <p className="mt-2 text-sm text-fg-3">Review suggested events and ambassador applications.</p>
              <Button variant="secondary" className="mt-4 w-full" asChild>
                <Link to="/admin">Open admin</Link>
              </Button>
            </Card>
          )}

          <Card className="p-6">
            <div className="flex items-center gap-2.5">
              <Award className="size-4.5 text-brand-ink" aria-hidden />
              <h2 className="text-md font-semibold text-fg">{profile.ambassador ? "You're an ambassador" : "Ecoisland Ambassadors"}</h2>
            </div>
            <p className="mt-2 text-sm text-fg-3">
              {profile.ambassador
                ? "Post community events for your area. They go live right away."
                : "Organize real events in your area, post them for everyone, and earn volunteer hours."}
            </p>
            <Button variant={profile.ambassador ? "primary" : "secondary"} size="sm" className="mt-4" asChild>
              <Link to="/ambassador">
                <Sparkles /> {profile.ambassador ? "Ambassador hub" : "Learn more and apply"}
              </Link>
            </Button>
          </Card>
        </aside>
      </div>

      {form && <EventForm open onOpenChange={(o) => !o && setForm(null)} classes={teacher ? classOptions : []} trusted={trusted} initialKind={form} />}
      {scheduling && <ScheduleAction open onOpenChange={setScheduling} classes={classOptions} trusted={trusted} />}
      {logging && <LogHoursDialog open onOpenChange={setLogging} verifiers={verifiers} />}
      {reviewing && <ReviewHoursDialog open onOpenChange={setReviewing} logs={toReview.items} />}
    </Page>
  );
}
