import {
  ArrowRight,
  BookOpen,
  CalendarClock,
  Check,
  CheckCircle2,
  ChevronDown,
  ClipboardCheck,
  Compass,
  Copy,
  Flag,
  Flame,
  HandHeart,
  ListChecks,
  PenLine,
  Plus,
  Sparkles,
  Users,
} from "lucide-react";
import { collection, limit, onSnapshot, query, where } from "firebase/firestore";
import { useEffect, useMemo, useState, type ComponentType } from "react";
import { ReviewHoursDialog } from "@/components/act/Dialogs";
import { Link, useNavigate } from "react-router-dom";
import { Page } from "@/components/app/Guards";
import { IslandScene } from "@/components/island/IslandScene";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState, Skeleton } from "@/components/ui/empty";
import { Input } from "@/components/ui/field";
import { ProgressRing } from "@/components/ui/progress";
import { track } from "@/lib/analytics";
import { api, errorMessage } from "@/lib/api";
import { unitPool } from "@/lib/content";
import { listingHref, useHoursToReview, useListings, whenLabel } from "@/lib/act";
import { useClasses, useCollection, type WithId } from "@/lib/data";
import { db } from "@/lib/firebase";
import { useDocumentTitle, useToday } from "@/lib/hooks";
import { useProfile } from "@/lib/session";
import { loadSrs, readiness } from "@/lib/srs";
import { useStudentContext, type ClassAssignment } from "@/lib/student";
import { useToast } from "@/lib/toast";
import { cn, firstName } from "@/lib/utils";
import { assignmentHref, type AssignmentType } from "@/shared/assignments";
import { findSky } from "@/shared/catalog";
import { findLesson, getUnit, neighbours } from "@/shared/curriculum";
import { addDays, daysBetween, dueLabel, effectiveStreak, formatDay, weekStart, type DayKey } from "@/shared/dates";
import { islandHealth, masteredUnits, stageForXp } from "@/shared/economy";
import { questForUnit } from "@/shared/quests";
import { weekStats } from "@/shared/stats";
import { actionOpen, eventPhase } from "@/shared/act";
import type { ClassDoc, MemberDoc, UserDoc } from "@/shared/types";

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
}

export default function Today() {
  const profile = useProfile();
  return profile.role === "teacher" ? <TeacherToday /> : <StudentToday />;
}

// ─── Student ────────────────────────────────────────────────────────────────

const TYPE_ICON: Record<AssignmentType, ComponentType<{ className?: string }>> = {
  lesson: BookOpen,
  lesson_quiz: ListChecks,
  unit_quiz: ListChecks,
  frq: PenLine,
  daily_sets: Sparkles,
  field_quest: Compass,
};

function StudentToday() {
  const profile = useProfile();
  const today = useToday();
  const { classes, assignments, focusUnit, test, loading } = useStudentContext(profile, today);
  const name = firstName(profile.username || profile.full_name);
  useDocumentTitle("Today");

  // Keep the teacher's view current with work done before an assignment existed.
  useEffect(() => {
    if (!profile.class_ids?.length) return;
    const key = `eco-asg-sync-${today}`;
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, "1");
    } catch {
      /* ignore */
    }
    void api("assignments/sync").catch(() => undefined);
  }, [profile.class_ids?.length, today]);

  const health = islandHealth(profile.last_set_day, today);
  const streak = effectiveStreak(profile.streak, profile.last_set_day, today);
  const doneToday = profile.last_set_day === today;
  const open = assignments.filter((a) => !a.status.done);
  const unit = getUnit(focusUnit);

  const subtitle = doneToday
    ? `Daily set done. ${streak > 1 ? `That's ${streak} days in a row.` : "Come back tomorrow to start a streak."}`
    : health.daysMissed > 0
      ? `Your island has gone ${health.daysMissed + 1} days without water. One daily set brings it back.`
      : open.length > 0
        ? `${open.length} ${open.length === 1 ? "assignment is" : "assignments are"} waiting, and your daily set is ready.`
        : "Your daily set is ready. Five minutes keeps your island growing.";

  return (
    <Page>
      <header className="mb-8">
        <p className="t-eyebrow">{formatDay(today, { weekday: "long", month: "long", day: "numeric" })}</p>
        <h1 className="t-h1 mt-2.5">
          {greeting()}, {name}.
        </h1>
        <p className="mt-2 text-[15.5px] text-fg-3">{subtitle}</p>
      </header>

      <div className="grid grid-cols-[minmax(0,1fr)_340px] gap-6">
        <div className="space-y-6">
          <DailySetCard doneToday={doneToday} unitTitle={unit?.title ?? ""} focusUnit={focusUnit} health={health} streak={streak} />
          <AssignmentsCard assignments={assignments} hasClass={classes.length > 0} loading={loading} today={today} />
          <ContinueCard focusUnit={focusUnit} />
        </div>
        <div className="space-y-6">
          <StreakCard streak={streak} best={profile.streak_best ?? 0} days={profile.set_days ?? []} today={today} />
          {test && <TestCard test={test} today={today} />}
          <ActCard profile={profile} today={today} />
          <QuestCard unit={focusUnit} done={(profile.quests_done ?? []).includes(focusUnit)} />
        </div>
      </div>
    </Page>
  );
}

function DailySetCard({
  doneToday,
  unitTitle,
  focusUnit,
  health,
  streak,
}: {
  doneToday: boolean;
  unitTitle: string;
  focusUnit: number;
  health: ReturnType<typeof islandHealth>;
  streak: number;
}) {
  const profile = useProfile();
  const stage = stageForXp(profile.xp_total ?? 0);
  return (
    <Card className="overflow-hidden">
      <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,380px)]">
        <div className="flex flex-col p-7">
          <p className="t-eyebrow">
            Daily set · Unit {focusUnit}
          </p>
          {doneToday ? (
            <>
              <h2 className="t-h2 mt-3 flex items-center gap-2.5">
                <CheckCircle2 className="size-6 text-brand" aria-hidden /> Done for today
              </h2>
              <p className="mt-2 text-[14.5px] text-fg-3">
                {streak > 1 ? `${streak}-day streak. ` : ""}Your island is watered until tomorrow night. Want more practice?
              </p>
              <div className="mt-auto flex gap-2.5 pt-6">
                <Button variant="secondary" asChild>
                  <Link to={`/practice?mode=unit&unit=${focusUnit}`}>Unit {focusUnit} quiz</Link>
                </Button>
                <Button variant="ghost" asChild>
                  <Link to="/practice?mode=mixed">Mixed review</Link>
                </Button>
              </div>
            </>
          ) : (
            <>
              <h2 className="t-h2 mt-3">Ten questions, about five minutes</h2>
              <p className="mt-2 text-[14.5px] text-fg-3">
                New questions from {unitTitle}, plus reviews of anything you've missed.{" "}
                {health.label === "Thriving" ? "Keep your island thriving." : `Your island is ${health.label.toLowerCase()}.`}
              </p>
              <div className="mt-auto flex items-center gap-3 pt-6">
                <Button size="lg" asChild>
                  <Link to="/practice?mode=daily">
                    Start daily set <ArrowRight />
                  </Link>
                </Button>
              </div>
            </>
          )}
        </div>
        <Link to="/island" className="group relative block border-l border-line" aria-label="Open your island">
          <IslandScene
            xp={profile.xp_total ?? 0}
            health={health.value}
            sky={findSky(profile.island_skybox)?.id ?? "day"}
            decor={profile.island_decor}
            landmarks={masteredUnits(profile.unit_best)}
            seed={profile.id}
            className="h-full min-h-[220px] transition-transform duration-500 group-hover:scale-[1.015]"
          />
          <div className="glass absolute bottom-3 left-3 flex items-center gap-2 rounded-full border px-3 py-1.5 text-[12.5px] font-semibold text-fg-2">
            <span className={cn("size-2 rounded-full", health.label === "Thriving" ? "bg-brand" : health.label === "Thirsty" ? "bg-sun" : "bg-coral")} />
            {stage.name} · {health.label}
          </div>
        </Link>
      </div>
    </Card>
  );
}

function statusText(a: ClassAssignment): string {
  if (a.status.done) return a.status.score !== null ? `Done · ${a.status.score}%` : "Done";
  if (a.type === "daily_sets") return `${a.status.progress} of ${a.status.target}`;
  if (a.status.score !== null) return `Best ${a.status.score}%`;
  return "Not started";
}

function AssignmentRow({ a, today }: { a: ClassAssignment; today: DayKey }) {
  const Icon = TYPE_ICON[a.type];
  const late = !a.status.done && daysBetween(a.due_day, today) > 0;
  const soon = !a.status.done && !late && daysBetween(today, a.due_day) <= 1;
  return (
    <li className="flex items-center gap-4 py-3.5">
      <div className={cn("grid size-10 shrink-0 place-items-center rounded-[12px]", a.status.done ? "bg-brand-soft text-brand-ink" : "bg-surface-2 text-fg-2")}>
        {a.status.done ? <Check className="size-[18px]" strokeWidth={2.6} /> : <Icon className="size-[18px]" />}
      </div>
      <div className="min-w-0 flex-1">
        <p className={cn("truncate text-[14.5px] font-semibold", a.status.done ? "text-fg-3" : "text-fg")}>{a.title}</p>
        <p className="mt-0.5 truncate text-[13px] text-fg-3">
          {a.className} · <span className={cn(late && "font-semibold text-coral", soon && "font-semibold text-sun-ink")}>{dueLabel(a.due_day, today)}</span>
          {a.notes ? ` · ${a.notes}` : ""}
        </p>
      </div>
      <span className="t-num text-[13px] font-medium whitespace-nowrap text-fg-3">{statusText(a)}</span>
      {!a.status.done && (
        <Button size="sm" variant={late || soon ? "primary" : "secondary"} asChild>
          <Link to={assignmentHref(a)}>{a.status.progress > 0 || a.status.score !== null ? "Continue" : "Start"}</Link>
        </Button>
      )}
    </li>
  );
}

function AssignmentsCard({ assignments, hasClass, loading, today }: { assignments: ClassAssignment[]; hasClass: boolean; loading: boolean; today: DayKey }) {
  const [showDone, setShowDone] = useState(false);
  const open = assignments.filter((a) => !a.status.done);
  const done = assignments.filter((a) => a.status.done).sort((a, b) => b.due_day.localeCompare(a.due_day));
  return (
    <Card className="p-6">
      <div className="flex items-center justify-between">
        <h2 className="t-h3">Assignments</h2>
        {open.length > 0 && <Badge tone="neutral">{open.length} to do</Badge>}
      </div>
      {!hasClass ? (
        <JoinClassInline />
      ) : loading ? (
        <div className="mt-4 space-y-3">
          <Skeleton className="h-12" />
          <Skeleton className="h-12" />
        </div>
      ) : assignments.length === 0 ? (
        <EmptyState icon={ListChecks} title="Nothing assigned right now" body="When your teacher assigns lessons, quizzes or FRQs, they show up here with their due dates." className="py-8" />
      ) : (
        <>
          {open.length === 0 ? (
            <p className="mt-4 flex items-center gap-2 text-[14.5px] text-fg-2">
              <CheckCircle2 className="size-[18px] text-brand" aria-hidden /> You're all caught up.
            </p>
          ) : (
            <ul className="mt-1 divide-y divide-line">
              {open.map((a) => (
                <AssignmentRow key={`${a.classId}/${a.id}`} a={a} today={today} />
              ))}
            </ul>
          )}
          {done.length > 0 && (
            <div className="mt-2 border-t border-line pt-3">
              <button onClick={() => setShowDone((s) => !s)} className="flex items-center gap-1.5 text-[13px] font-semibold text-fg-3 hover:text-fg-2" aria-expanded={showDone}>
                <ChevronDown className={cn("size-4 transition-transform", showDone && "rotate-180")} aria-hidden /> Completed ({done.length})
              </button>
              {showDone && (
                <ul className="divide-y divide-line">
                  {done.map((a) => (
                    <AssignmentRow key={`${a.classId}/${a.id}`} a={a} today={today} />
                  ))}
                </ul>
              )}
            </div>
          )}
        </>
      )}
    </Card>
  );
}

export function JoinClassInline({ compact }: { compact?: boolean }) {
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  const navigate = useNavigate();
  const join = async () => {
    setBusy(true);
    try {
      const res = await api<{ classId: string; name: string; already: boolean }>("class/join", { code });
      track("class_joined");
      toast.show({ tone: "success", title: res.already ? `You're already in ${res.name}` : `Joined ${res.name}`, body: "Assignments from this class now show on Today." });
      setCode("");
      if (!compact) navigate(`/class/${res.classId}`);
    } catch (err) {
      toast.show({ tone: "error", title: "Couldn't join", body: errorMessage(err) });
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className={cn(compact ? "" : "mt-4 rounded-lg border border-dashed border-line-strong p-5")}>
      {!compact && (
        <>
          <p className="text-[14.5px] font-semibold text-fg">Join your class</p>
          <p className="mt-1 text-[13.5px] text-fg-3">Enter the 6-character code from your teacher to see assignments, due dates and your class leaderboard.</p>
        </>
      )}
      <form
        className={cn("flex gap-2", !compact && "mt-4")}
        onSubmit={(e) => {
          e.preventDefault();
          if (code.trim()) void join();
        }}
      >
        <Input
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6))}
          placeholder="K7Q2MX"
          aria-label="Class code"
          className="w-[160px] font-mono text-[15px] tracking-[0.18em] uppercase"
          autoComplete="off"
          spellCheck={false}
        />
        <Button type="submit" variant="secondary" loading={busy} disabled={code.length !== 6}>
          Join class
        </Button>
      </form>
    </div>
  );
}

function ContinueCard({ focusUnit }: { focusUnit: number }) {
  const profile = useProfile();
  const last = profile.last_lesson?.id ? findLesson(profile.last_lesson.id) : undefined;
  const lessonsDone = new Set(profile.lessons_done ?? []);
  const lesson = last
    ? lessonsDone.has(last.lesson.id)
      ? neighbours(last.lesson.id).next ?? last.lesson
      : last.lesson
    : getUnit(focusUnit)?.lessons.find((l) => !lessonsDone.has(l.id)) ?? getUnit(focusUnit)?.lessons[0];
  if (!lesson) return null;
  const found = findLesson(lesson.id);
  const resume = last && last.lesson.id === lesson.id;
  return (
    <Card interactive className="p-0">
      <Link to={`/study/unit/${found?.unit.n}/${encodeURIComponent(lesson.id)}`} className="flex items-center gap-5 p-6">
        <div className="grid size-12 shrink-0 place-items-center rounded-[14px] bg-ocean-soft text-ocean">
          <BookOpen className="size-5" aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <p className="t-eyebrow">{resume ? "Continue reading" : "Up next"}</p>
          <p className="mt-1.5 truncate text-[15.5px] font-semibold text-fg">
            {lesson.code} {lesson.title}
          </p>
          <p className="mt-0.5 text-[13px] text-fg-3">
            Unit {found?.unit.n}: {found?.unit.title}
          </p>
        </div>
        <ArrowRight className="size-5 text-fg-3" aria-hidden />
      </Link>
    </Card>
  );
}

function StreakCard({ streak, best, days, today }: { streak: number; best: number; days: DayKey[]; today: DayKey }) {
  const set = new Set(days);
  const monday = weekStart(today);
  const week = Array.from({ length: 7 }, (_, i) => addDays(monday, i));
  return (
    <Card className="p-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="t-eyebrow">Streak</p>
          <p className="mt-3 flex items-baseline gap-2">
            <span className="font-display t-num text-[44px] leading-none font-[600] text-fg">{streak}</span>
            <span className="text-[14px] text-fg-3">{streak === 1 ? "day" : "days"}</span>
          </p>
        </div>
        <div className={cn("grid size-11 place-items-center rounded-[13px]", streak > 0 ? "bg-sun-soft" : "bg-surface-2")}>
          <Flame className={cn("size-6", streak > 0 ? "fill-sun/30 text-sun" : "text-fg-4")} aria-hidden />
        </div>
      </div>
      <div className="mt-5 grid grid-cols-7 gap-1.5" aria-label="This week">
        {week.map((d) => {
          const done = set.has(d);
          const isToday = d === today;
          const future = daysBetween(today, d) > 0;
          return (
            <div key={d} className="flex flex-col items-center gap-1.5">
              <span className="text-[11px] font-medium text-fg-4">{formatDay(d, { weekday: "narrow" })}</span>
              <span
                className={cn(
                  "grid size-8 place-items-center rounded-full text-[11px]",
                  done ? "bg-brand text-brand-fg" : isToday ? "border-2 border-dashed border-brand/60" : future ? "bg-surface-2" : "bg-surface-3",
                )}
                title={formatDay(d, { weekday: "long", month: "short", day: "numeric" })}
              >
                {done && <Check className="size-3.5" strokeWidth={3} />}
              </span>
            </div>
          );
        })}
      </div>
      <p className="mt-4 text-[13px] text-fg-3">Best streak: {Math.max(best, streak)} {Math.max(best, streak) === 1 ? "day" : "days"}</p>
    </Card>
  );
}

function TestCard({ test, today }: { test: { day: DayKey; label: string; unit: number | null; className: string }; today: DayKey }) {
  const profile = useProfile();
  const [ready, setReady] = useState<number | null>(null);
  const days = daysBetween(today, test.day);
  useEffect(() => {
    if (!test.unit) return;
    let cancelled = false;
    void Promise.all([unitPool(test.unit), loadSrs(profile.id)]).then(([pool, state]) => {
      if (!cancelled) setReady(readiness(pool, state));
    });
    return () => {
      cancelled = true;
    };
  }, [test.unit, profile.id]);
  return (
    <Card className="p-6">
      <p className="t-eyebrow flex items-center gap-1.5">
        <CalendarClock className="size-3.5" aria-hidden /> Coming up
      </p>
      <div className="mt-3 flex items-center gap-4">
        {test.unit && (
          <ProgressRing value={ready ?? 0} size={58} stroke={5} tone="ocean">
            <span className="t-num text-[13px] font-semibold text-fg">{ready ?? "–"}%</span>
          </ProgressRing>
        )}
        <div className="min-w-0">
          <p className="truncate text-[15.5px] font-semibold text-fg">{test.label}</p>
          <p className="text-[13px] text-fg-3">
            {formatDay(test.day, { weekday: "short", month: "short", day: "numeric" })} · {days === 0 ? "today" : days === 1 ? "tomorrow" : `in ${days} days`}
          </p>
        </div>
      </div>
      {test.unit && (
        <>
          <p className="mt-3 text-[13px] text-fg-3">Readiness is the share of Unit {test.unit} questions you've answered correctly and still remember.</p>
          <Button variant="secondary" className="mt-4 w-full" asChild>
            <Link to={`/practice?mode=unit&unit=${test.unit}`}>Practice Unit {test.unit}</Link>
          </Button>
        </>
      )}
    </Card>
  );
}

function QuestCard({ unit, done }: { unit: number; done: boolean }) {
  const quest = questForUnit(unit);
  if (!quest) return null;
  return (
    <Card className="p-6">
      <p className="t-eyebrow flex items-center gap-1.5">
        <Compass className="size-3.5" aria-hidden /> Field quest · Unit {unit}
      </p>
      <p className="mt-3 text-[15.5px] font-semibold text-fg">{quest.title}</p>
      <p className="mt-1.5 line-clamp-3 text-[13.5px] text-fg-3">{quest.prompt}</p>
      {done ? (
        <p className="mt-4 flex items-center gap-2 text-[13.5px] font-semibold text-brand-ink">
          <CheckCircle2 className="size-4" aria-hidden /> Completed
        </p>
      ) : (
        <Button variant="soft" className="mt-4 w-full" asChild>
          <Link to={`/study/unit/${unit}?quest=1`}>Start quest · +30 TC</Link>
        </Button>
      )}
    </Card>
  );
}

/** The next thing to do in Act: an event they're going to, or an open eco action. */
function ActCard({ profile, today }: { profile: UserDoc; today: DayKey }) {
  const { listings, loading } = useListings(profile);
  const going = new Set(profile.rsvp_events ?? []);
  const done = new Set(profile.actions_done ?? []);
  const live = listings.filter((l) => l.status === "published" && eventPhase(l, today) !== "past");
  const next =
    live.find((l) => l.kind === "event" && going.has(l.key)) ??
    live.find((l) => l.kind === "action" && !done.has(l.key) && actionOpen(l, today) && l.scope === "class") ??
    live.find((l) => l.kind === "action" && !done.has(l.key) && actionOpen(l, today)) ??
    live.find((l) => l.kind === "event");
  if (loading) return null;
  return (
    <Card className="p-6">
      <p className="t-eyebrow flex items-center gap-1.5">
        <HandHeart className="size-3.5" aria-hidden /> Act
        {next ? (next.kind === "event" ? (going.has(next.key) ? " · You're going" : " · Volunteer event") : " · Eco action") : ""}
      </p>
      {next ? (
        <>
          <p className="mt-3 text-[15.5px] font-semibold text-fg">{next.title}</p>
          <p className="mt-1 text-[13px] text-fg-3">{whenLabel(next)}</p>
          <Button variant="soft" className="mt-4 w-full" asChild>
            <Link to={listingHref(next)}>{next.kind === "action" ? "Do it · +20 TC" : going.has(next.key) ? "See details" : "Take a look"}</Link>
          </Button>
        </>
      ) : (
        <>
          <p className="mt-3 text-[15.5px] font-semibold text-fg">Take it outside</p>
          <p className="mt-1.5 text-[13.5px] text-fg-3">Find a volunteer event or an eco action, and log your service hours.</p>
          <Button variant="soft" className="mt-4 w-full" asChild>
            <Link to="/act">Open Act</Link>
          </Button>
        </>
      )}
    </Card>
  );
}

// ─── Teacher ────────────────────────────────────────────────────────────────

/** Reported chat messages across a teacher's classes: classId → count. */
function useReports(classIds: string[]): Record<string, number> {
  const key = classIds.join(",");
  const [map, setMap] = useState<Record<string, number>>({});
  useEffect(() => {
    const ids = key ? key.split(",") : [];
    setMap({});
    const unsubs = ids.map((cid) =>
      onSnapshot(
        query(collection(db, "classes", cid, "messages"), where("reported", "==", true), limit(50)),
        (snap) => setMap((m) => ({ ...m, [cid]: snap.docs.filter((d) => d.data().deleted !== true).length })),
        () => setMap((m) => ({ ...m, [cid]: 0 })),
      ),
    );
    return () => unsubs.forEach((u) => u());
  }, [key]);
  return map;
}

function Attention({ classes, uid }: { classes: WithId<ClassDoc>[]; uid: string }) {
  const hours = useHoursToReview(uid, true);
  const reports = useReports(classes.map((c) => c.id));
  const [reviewing, setReviewing] = useState(false);
  const flagged = classes.filter((c) => (reports[c.id] ?? 0) > 0);
  if (hours.items.length === 0 && flagged.length === 0) return null;
  return (
    <div className="mb-6 grid grid-cols-2 gap-4">
      {hours.items.length > 0 && (
        <Card className="flex items-center gap-4 p-5">
          <span className="grid size-10 place-items-center rounded-[12px] bg-sun-soft text-sun-ink" aria-hidden>
            <ClipboardCheck className="size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[14.5px] font-semibold text-fg">
              {hours.items.length} volunteer {hours.items.length === 1 ? "entry" : "entries"} to verify
            </p>
            <p className="text-[13px] text-fg-3">Verified hours go on each student's service record.</p>
          </div>
          <Button size="sm" onClick={() => setReviewing(true)}>
            Review
          </Button>
        </Card>
      )}
      {flagged.map((c) => (
        <Card key={c.id} className="flex items-center gap-4 p-5">
          <span className="grid size-10 place-items-center rounded-[12px] bg-coral-soft text-coral" aria-hidden>
            <Flag className="size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[14.5px] font-semibold text-fg">
              {reports[c.id]} reported {reports[c.id] === 1 ? "message" : "messages"}
            </p>
            <p className="truncate text-[13px] text-fg-3">In {c.name}'s chat</p>
          </div>
          <Button size="sm" variant="secondary" asChild>
            <Link to={`/class/${c.id}?tab=chat`}>Open chat</Link>
          </Button>
        </Card>
      ))}
      {reviewing && <ReviewHoursDialog open onOpenChange={setReviewing} logs={hours.items} />}
    </div>
  );
}

function TeacherToday() {
  const profile = useProfile();
  const today = useToday();
  const { classes, loading } = useClasses(profile.teaching_ids);
  useDocumentTitle("Today");
  const name = profile.username || profile.full_name || "";
  return (
    <Page>
      <header className="mb-8 flex items-end justify-between gap-6">
        <div>
          <p className="t-eyebrow">{formatDay(today, { weekday: "long", month: "long", day: "numeric" })}</p>
          <h1 className="t-h1 mt-2.5">
            {greeting()}
            {name ? `, ${firstName(name)}` : ""}.
          </h1>
          <p className="mt-2 text-[15.5px] text-fg-3">
            {classes.length === 0 ? "Create a class to start assigning work." : "Here's how your classes are doing today."}
          </p>
        </div>
        {classes.length > 0 && (
          <Button variant="secondary" asChild>
            <Link to="/class?new=1">
              <Plus /> New class
            </Link>
          </Button>
        )}
      </header>
      {loading ? (
        <div className="grid grid-cols-2 gap-6">
          <Skeleton className="h-64 rounded-xl" />
          <Skeleton className="h-64 rounded-xl" />
        </div>
      ) : classes.length === 0 ? (
        <CreateFirstClass />
      ) : (
        <>
          <Attention classes={classes} uid={profile.id} />
          <div className="grid grid-cols-2 gap-6">
            {classes.map((c) => (
              <ClassSummary key={c.id} cls={c} today={today} />
            ))}
          </div>
        </>
      )}
    </Page>
  );
}

export function CreateFirstClass() {
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  const navigate = useNavigate();
  const create = async () => {
    setBusy(true);
    try {
      const res = await api<{ classId: string; code: string }>("class/create", { name });
      track("class_created");
      toast.show({ tone: "success", title: "Class created", body: `Share the code ${res.code} with your students.` });
      navigate(`/class/${res.classId}`);
    } catch (err) {
      toast.show({ tone: "error", title: "Couldn't create the class", body: errorMessage(err) });
      setBusy(false);
    }
  };
  return (
    <Card className="mx-auto max-w-[640px] p-8 text-center">
      <div className="mx-auto grid size-12 place-items-center rounded-[14px] bg-brand-soft text-brand-ink">
        <Users className="size-6" aria-hidden />
      </div>
      <h2 className="t-h2 mt-5">Create your first class</h2>
      <p className="mx-auto mt-2 max-w-[44ch] text-[14.5px] text-fg-3">
        You'll get a join code to share. Students who join show up on your roster, and you can assign lessons, quizzes, FRQs and daily practice with due dates.
      </p>
      <form
        className="mx-auto mt-6 flex max-w-[420px] gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (name.trim().length >= 2) void create();
        }}
      >
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="APES · Period 3" aria-label="Class name" maxLength={60} />
        <Button type="submit" loading={busy} disabled={name.trim().length < 2}>
          Create
        </Button>
      </form>
    </Card>
  );
}

function ClassSummary({ cls, today }: { cls: WithId<ClassDoc>; today: DayKey }) {
  const { items: members, loading } = useCollection<MemberDoc>(`classes/${cls.id}/members`);
  const [copied, setCopied] = useState(false);
  const stats = useMemo(() => members.map((m) => ({ m, s: weekStats(m, today) })), [members, today]);
  const activeToday = stats.filter((x) => x.s.idleDays === 0).length;
  const setsThisWeek = stats.reduce((n, x) => n + x.s.weekSets, 0);
  const idle = stats.filter((x) => x.s.idleDays === null || x.s.idleDays >= 3).sort((a, b) => (b.s.idleDays ?? 99) - (a.s.idleDays ?? 99));

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(cls.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* ignore */
    }
  };

  return (
    <Card className="flex flex-col p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="t-h2 truncate">{cls.name}</h2>
          <p className="mt-1 text-[13.5px] text-fg-3">
            {cls.current_unit ? `Unit ${cls.current_unit}: ${getUnit(cls.current_unit)?.title}` : "No current unit set"}
            {cls.test_day ? ` · ${cls.test_label || "Test"} ${formatDay(cls.test_day, { month: "short", day: "numeric" })}` : ""}
          </p>
        </div>
        <button onClick={copy} className="inline-flex h-8 items-center gap-1.5 rounded-[9px] border border-line-strong px-2.5 font-mono text-[13px] font-semibold tracking-[0.14em] text-fg-2 hover:bg-surface-2" aria-label={`Copy class code ${cls.code}`}>
          {cls.code} {copied ? <Check className="size-3.5 text-brand" /> : <Copy className="size-3.5 text-fg-3" />}
        </button>
      </div>
      <div className="mt-6 grid grid-cols-3 gap-3">
        {[
          { label: "Students", value: loading ? "–" : members.length },
          { label: "Active today", value: loading ? "–" : activeToday },
          { label: "Sets this week", value: loading ? "–" : setsThisWeek },
        ].map((s) => (
          <div key={s.label} className="rounded-[12px] bg-surface-2/70 px-4 py-3">
            <p className="font-display t-num text-[24px] font-[600] text-fg">{s.value}</p>
            <p className="text-[12.5px] text-fg-3">{s.label}</p>
          </div>
        ))}
      </div>
      <div className="mt-5 flex-1">
        <p className="text-[13px] font-semibold text-fg-2">Needs a nudge</p>
        {members.length === 0 ? (
          <p className="mt-2 text-[13.5px] text-fg-3">No students yet. Share the code {cls.code} to get started.</p>
        ) : idle.length === 0 ? (
          <p className="mt-2 text-[13.5px] text-fg-3">Everyone has studied in the last two days.</p>
        ) : (
          <ul className="mt-2 space-y-2">
            {idle.slice(0, 4).map(({ m, s }) => (
              <li key={m.uid} className="flex items-center gap-2.5 text-[13.5px]">
                <Avatar name={m.username} src={m.avatar_url} size={24} />
                <span className="flex-1 truncate text-fg-2">{m.username}</span>
                <span className="text-fg-3">{s.idleDays === null ? "Not started" : `${s.idleDays} days idle`}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="mt-6 flex gap-2.5">
        <Button asChild>
          <Link to={`/class/${cls.id}`}>
            Open class <ArrowRight />
          </Link>
        </Button>
        <Button variant="secondary" asChild>
          <Link to={`/class/${cls.id}?tab=assignments&new=1`}>
            <Plus /> Assign work
          </Link>
        </Button>
      </div>
    </Card>
  );
}
