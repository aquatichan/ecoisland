// Act: put the science to work. Volunteer events and eco actions from your
// class and your community, as upcoming, happening now and past, plus your
// volunteer hours record.
import { Award, CalendarPlus, ClipboardCheck, HandHeart, Hourglass, Leaf, Plus, Printer, Shield, Sparkles } from "lucide-react";
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
import { EmptyState, Skeleton } from "@/components/ui/empty";
import { Segmented } from "@/components/ui/segmented";
import { formatHours, useHoursToReview, useIsAdmin, useListings, useMyHours, useMySuggestions } from "@/lib/act";
import { useClasses } from "@/lib/data";
import { useDocumentTitle, useToday } from "@/lib/hooks";
import { useProfile } from "@/lib/session";
import { eventPhase, type Phase } from "@/shared/act";

type Kind = "all" | "event" | "action";

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
  const setParam = (k: string, v: string) => {
    const next = new URLSearchParams(params);
    next.set(k, v);
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
  const counts = useMemo(() => {
    const c = { upcoming: 0, now: 0, past: 0 };
    for (const l of visible) if (l.status !== "cancelled") c[eventPhase(l, today)]++;
    return c;
  }, [visible, today]);
  const shown = visible
    .filter((l) => eventPhase(l, today) === phase && (kind === "all" || l.kind === kind))
    .sort((a, b) => (phase === "past" ? -1 : 1) * (a.start_day ?? a.starts_at ?? "").localeCompare(b.start_day ?? b.starts_at ?? ""));

  const classOptions: ClassOption[] = taught.map((c) => ({ id: c.id, name: c.name }));
  const verifiers: VerifierOption[] = joined.map((c) => ({ classId: c.id, label: `${c.teacher_name} (${c.name})` }));
  const verified = hours.items.filter((h) => h.status === "verified").reduce((s, h) => s + h.hours, 0);
  const pending = hours.items.filter((h) => h.status === "pending");
  const myOpen = suggestions.items.filter((s) => s.status === "pending" || s.status === "rejected");

  return (
    <Page>
      <header className="mb-7 flex items-end justify-between gap-6">
        <div>
          <p className="t-eyebrow">Act</p>
          <h1 className="t-h1 mt-2.5">Take it outside</h1>
          <p className="mt-2 max-w-[60ch] text-[15px] text-fg-3">
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
      </header>

      <div className="grid grid-cols-[minmax(0,1fr)_320px] gap-6">
        <div className="min-w-0">
          <div className="mb-5 flex items-center justify-between gap-4">
            <Segmented<Phase>
              label="When"
              value={phase}
              onChange={(v) => setParam("when", v)}
              options={[
                { value: "upcoming", label: <>Upcoming{counts.upcoming ? <span className="t-num text-fg-4">{counts.upcoming}</span> : null}</> },
                { value: "now", label: <>Happening now{counts.now ? <span className="t-num text-fg-4">{counts.now}</span> : null}</> },
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

          {loading ? (
            <div className="grid grid-cols-2 gap-4">
              <Skeleton className="h-40 rounded-xl" />
              <Skeleton className="h-40 rounded-xl" />
              <Skeleton className="h-40 rounded-xl" />
            </div>
          ) : shown.length === 0 ? (
            <Card>
              <EmptyState
                icon={phase === "past" ? Hourglass : HandHeart}
                title={phase === "upcoming" ? "Nothing scheduled yet" : phase === "now" ? "Nothing happening today" : "Nothing here yet"}
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
            <div className="grid grid-cols-2 gap-4">
              {shown.map((l, i) => (
                <EventCard key={l.key} e={l} going={going.has(l.key)} done={done.has(l.key)} index={i} />
              ))}
            </div>
          )}
        </div>

        <aside className="space-y-4 self-start">
          {teacher ? (
            <Card className="p-6">
              <div className="flex items-center gap-2.5">
                <ClipboardCheck className="size-[18px] text-brand" aria-hidden />
                <h2 className="text-[15px] font-semibold text-fg">Hours to verify</h2>
              </div>
              <p className="font-display t-num mt-3 text-[34px] leading-none font-[600] text-fg">{toReview.items.length}</p>
              <p className="mt-2 text-[13px] text-fg-3">
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
                <HandHeart className="size-[18px] text-brand" aria-hidden />
                <h2 className="text-[15px] font-semibold text-fg">Your volunteer hours</h2>
              </div>
              <p className="mt-3 flex items-baseline gap-2">
                <span className="font-display t-num text-[38px] leading-none font-[600] text-fg">
                  <CountUp to={Math.round(verified * 100) / 100} duration={0.8} />
                </span>
                <span className="text-[13.5px] text-fg-3">verified</span>
              </p>
              {pending.length > 0 && <p className="mt-1.5 text-[13px] text-sun-ink">{formatHours(pending.reduce((s, h) => s + h.hours, 0))} waiting for your teacher</p>}
              <p className="mt-2 text-[13px] text-fg-3">Teacher-verified hours you can print for service requirements.</p>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <Button onClick={() => setLogging(true)}>
                  <Plus /> Log hours
                </Button>
                <Button variant="secondary" asChild>
                  <Link to="/act/hours">
                    <Printer /> Record
                  </Link>
                </Button>
              </div>
            </Card>
          )}

          {myOpen.length > 0 && (
            <Card className="p-6">
              <h2 className="text-[15px] font-semibold text-fg">Your suggestions</h2>
              <ul className="mt-3 space-y-2.5">
                {myOpen.map((s) => (
                  <li key={s.id} className="text-[13.5px]">
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate font-medium text-fg-2">{s.title}</span>
                      <Badge tone={s.status === "pending" ? "sun" : "coral"}>{s.status === "pending" ? "In review" : "Not approved"}</Badge>
                    </div>
                    {s.status === "rejected" && s.review_note && <p className="mt-1 text-[12.5px] text-fg-3">{s.review_note}</p>}
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {admin && (
            <Card className="p-6">
              <div className="flex items-center gap-2.5">
                <Shield className="size-[18px] text-ocean" aria-hidden />
                <h2 className="text-[15px] font-semibold text-fg">Admin</h2>
              </div>
              <p className="mt-2 text-[13px] text-fg-3">Review suggested events and ambassador applications.</p>
              <Button variant="secondary" className="mt-4 w-full" asChild>
                <Link to="/admin">Open admin</Link>
              </Button>
            </Card>
          )}

          <Card className="overflow-hidden">
            <div className="bg-[linear-gradient(135deg,var(--brand-soft),var(--ocean-soft))] p-6">
              <div className="flex items-center gap-2.5">
                <Award className="size-[18px] text-brand-ink" aria-hidden />
                <h2 className="text-[15px] font-semibold text-fg">{profile.ambassador ? "You're an ambassador" : "Ecoisland Ambassadors"}</h2>
              </div>
              <p className="mt-2 text-[13px] text-fg-2">
                {profile.ambassador
                  ? "Post community events for your area. They go live right away."
                  : "Organize real events in your area, post them for everyone, and earn volunteer hours."}
              </p>
              <Button variant={profile.ambassador ? "primary" : "secondary"} size="sm" className="mt-4" asChild>
                <Link to="/ambassador">
                  <Sparkles /> {profile.ambassador ? "Ambassador hub" : "Learn more and apply"}
                </Link>
              </Button>
            </div>
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
