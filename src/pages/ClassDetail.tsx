// One class. Teachers see the roster, assign work and watch completion live;
// students see what's due, the class leaderboard and field notes.
import { collection, deleteDoc, doc, onSnapshot } from "firebase/firestore";
import {
  ArrowLeft,
  ArrowUpDown,
  Award,
  BookOpen,
  Check,
  ChevronDown,
  Compass,
  Copy,
  Flame,
  ListChecks,
  LogOut,
  MoreHorizontal,
  Pencil,
  PenLine,
  Plus,
  Sparkles,
  Trash2,
  TrendingUp,
  Users,
} from "lucide-react";
import { useEffect, useMemo, useState, type ComponentType } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ArtBackdrop } from "@/components/app/ArtBackdrop";
import { Page } from "@/components/app/Guards";
import { ClassChat, useChatUnread } from "@/components/class/ClassChat";
import { IslandScene } from "@/components/island/IslandScene";
import type { PlateScrim } from "@/components/landing/plates";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { EmptyState, Skeleton } from "@/components/ui/empty";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { Menu, MenuContent, MenuItem, MenuTrigger } from "@/components/ui/menu";
import { ProgressBar } from "@/components/ui/progress";
import { Segmented } from "@/components/ui/segmented";
import { track } from "@/lib/analytics";
import { api, errorMessage } from "@/lib/api";
import { frqs as loadFrqs, type Frq } from "@/lib/content";
import { createAssignment, deleteAssignment, updateAssignment, updateClass, useCollection, useDoc, type AssignmentInput, type WithId } from "@/lib/data";
import { db } from "@/lib/firebase";
import { useDocumentTitle, useToday } from "@/lib/hooks";
import { useProfile } from "@/lib/session";
import { useToast } from "@/lib/toast";
import { cn, plural } from "@/lib/utils";
import { ASSIGNMENT_TYPES, assignmentHref, defaultAssignmentTitle, evaluateAssignment, type Assignment, type AssignmentType } from "@/shared/assignments";
import { findSky } from "@/shared/catalog";
import { UNITS, getUnit } from "@/shared/curriculum";
import { addDays, daysBetween, dueLabel, formatDay, isDayKey, type DayKey } from "@/shared/dates";
import { islandHealth, stageForXp } from "@/shared/economy";
import { questForUnit } from "@/shared/quests";
import { weekStats } from "@/shared/stats";
import type { ClassDoc, MemberDoc, NoteDoc, SubmissionDoc } from "@/shared/types";

// The faint sky behind the class's header (existing art, from the landing plates). The text is held to the left half
// of the banner, so that is where the scrim is. It is the same scrim as the Today, Island, Act and Ambassador banners
// (the tests hold them equal).
const BANNER_SCRIM: PlateScrim = { kind: "start", alpha: 0.92, hold: 0.52, fade: 0.16 };

type TeacherTab = "students" | "assignments" | "chat" | "leaderboard" | "notes" | "settings";
type StudentTab = "assignments" | "chat" | "leaderboard" | "notes";

const TYPE_ICON: Record<AssignmentType, ComponentType<{ className?: string }>> = {
  lesson: BookOpen,
  lesson_quiz: ListChecks,
  unit_quiz: ListChecks,
  frq: PenLine,
  daily_sets: Sparkles,
  field_quest: Compass,
};

/** Live submissions for every assignment in a class: aid → uid → submission. */
function useSubmissions(classId: string, assignmentIds: string[], enabled: boolean) {
  const key = assignmentIds.join(",");
  const [map, setMap] = useState<Record<string, Record<string, SubmissionDoc>>>({});
  useEffect(() => {
    if (!enabled || !key) {
      setMap({});
      return;
    }
    const unsubs = key.split(",").map((aid) =>
      onSnapshot(
        collection(db, "classes", classId, "assignments", aid, "submissions"),
        (snap) => setMap((m) => ({ ...m, [aid]: Object.fromEntries(snap.docs.map((d) => [d.id, d.data() as SubmissionDoc])) })),
        () => setMap((m) => ({ ...m, [aid]: {} })),
      ),
    );
    return () => unsubs.forEach((u) => u());
  }, [classId, key, enabled]);
  return map;
}

export default function ClassDetail() {
  const { classId = "" } = useParams();
  const profile = useProfile();
  const today = useToday();
  const [params, setParams] = useSearchParams();
  const { data: cls, loading, error } = useDoc<ClassDoc>(`classes/${classId}`);
  const teacher = !!cls && cls.teacher_id === profile.id;
  const { items: members, loading: membersLoading } = useCollection<MemberDoc>(cls ? `classes/${classId}/members` : null);
  const { items: assignments, loading: assignmentsLoading } = useCollection<Omit<Assignment, "id">>(cls ? `classes/${classId}/assignments` : null);
  const sortedAssignments = useMemo(() => [...assignments].sort((a, b) => a.due_day.localeCompare(b.due_day)), [assignments]);
  const submissions = useSubmissions(classId, sortedAssignments.map((a) => a.id), teacher);
  useDocumentTitle(cls?.name ?? "Class");

  const tab = (params.get("tab") ?? (teacher ? "students" : "assignments")) as TeacherTab | StudentTab;
  const unread = useChatUnread(classId, !!cls && cls.chat_enabled === true, tab === "chat");
  const setTab = (t: string) => {
    const next = new URLSearchParams(params);
    next.set("tab", t);
    next.delete("new");
    setParams(next, { replace: true });
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-80" />
        <Skeleton className="h-64 rounded-lg" />
      </div>
    );
  }
  if (!cls || error) {
    return (
      <Page>
        <Card className="mx-auto max-w-130">
          <EmptyState icon={Users} title="This class isn't available" body="It may have been deleted, or you're no longer a member." action={<Button asChild><Link to="/class">Back to classes</Link></Button>} />
        </Card>
      </Page>
    );
  }

  const chatLabel = (
    <>
      Chat
      {unread && <span className="size-1.5 rounded-full bg-coral" aria-label="New messages" />}
    </>
  );
  const tabs = teacher
    ? [
        { value: "students", label: "Students" },
        { value: "assignments", label: "Assignments" },
        { value: "chat", label: chatLabel },
        { value: "leaderboard", label: "Leaderboard" },
        { value: "notes", label: "Field notes" },
        { value: "settings", label: "Settings" },
      ]
    : [
        { value: "assignments", label: "Assignments" },
        { value: "chat", label: chatLabel },
        { value: "leaderboard", label: "Leaderboard" },
        { value: "notes", label: "Field notes" },
      ];

  return (
    <Page>
      <header className="relative isolate overflow-hidden rounded-2xl border border-line px-8 py-9 shadow-sm">
        <ArtBackdrop art="bg-stats" scrim={BANNER_SCRIM} position="center 40%" />
        <div className="flex items-end justify-between gap-6">
          <div className="min-w-0 max-w-1/2">
            <Link to={teacher ? "/class" : "/today"} className="mb-5 inline-flex items-center gap-1.5 text-base font-medium text-fg-2 hover:text-fg">
              <ArrowLeft className="size-4" /> {teacher ? "Classes" : "Today"}
            </Link>
            <p className="t-eyebrow text-fg-2">{teacher ? "Your class" : `Taught by ${cls.teacher_name}`}</p>
            <h1 className="t-h1 mt-2.5 truncate">{cls.name}</h1>
            <p className="mt-2 text-md text-fg-2">
              {plural(members.length, "student")}
              {cls.current_unit ? ` · Unit ${cls.current_unit}: ${getUnit(cls.current_unit)?.title}` : ""}
              {cls.test_day ? ` · ${cls.test_label || "Test"} ${formatDay(cls.test_day, { weekday: "short", month: "short", day: "numeric" })}` : ""}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {teacher ? <CodePill code={cls.code} /> : <LeaveClass classId={classId} name={cls.name} />}
          </div>
        </div>
      </header>

      <Segmented label="Class sections" value={tab} onChange={setTab} options={tabs} className="mt-6 mb-6" />

      {teacher && tab === "students" && <Roster cls={cls} members={members} loading={membersLoading} assignments={sortedAssignments} submissions={submissions} today={today} />}
      {tab === "assignments" &&
        (teacher ? (
          <TeacherAssignments cls={cls} members={members} assignments={sortedAssignments} submissions={submissions} loading={assignmentsLoading} today={today} openNew={params.get("new") === "1"} />
        ) : (
          <StudentAssignments assignments={sortedAssignments} loading={assignmentsLoading} today={today} />
        ))}
      {tab === "chat" && <ClassChat cls={cls} teacher={teacher} meId={profile.id} members={members} />}
      {tab === "leaderboard" && <Leaderboard members={members} loading={membersLoading} today={today} meId={profile.id} />}
      {tab === "notes" && <Notes classId={classId} teacher={teacher} meId={profile.id} />}
      {teacher && tab === "settings" && <ClassSettings cls={cls} />}
    </Page>
  );
}

function CodePill({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(code);
          setCopied(true);
          setTimeout(() => setCopied(false), 1800);
        } catch {
          /* ignore */
        }
      }}
      className="flex items-center gap-3 rounded-md border border-line-strong bg-surface px-4 py-2.5 text-left shadow-xs hover:bg-surface-2 focus-visible:shadow-[var(--ring),var(--shadow-xs)]"
      aria-label={`Copy join code ${code}`}
    >
      <span>
        <span className="block text-xs font-semibold tracking-[0.06em] text-fg-3 uppercase">Join code</span>
        <span className="font-mono text-xl font-bold tracking-[0.2em] text-fg">{code}</span>
      </span>
      {copied ? <Check className="size-4 text-brand" /> : <Copy className="size-4 text-fg-3" />}
    </button>
  );
}

function LeaveClass({ classId, name }: { classId: string; name: string }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();
  const toast = useToast();
  return (
    <>
      <Menu>
        <MenuTrigger asChild>
          <Button variant="secondary" size="icon" aria-label="Class options">
            <MoreHorizontal />
          </Button>
        </MenuTrigger>
        <MenuContent>
          <MenuItem danger onSelect={() => setOpen(true)}>
            <LogOut /> Leave class
          </MenuItem>
        </MenuContent>
      </Menu>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent title={`Leave ${name}?`} description="Your progress stays with you, but your teacher will no longer see your work for this class.">
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              loading={busy}
              onClick={async () => {
                setBusy(true);
                try {
                  await api("class/leave", { classId });
                  toast.show({ tone: "info", title: `You left ${name}` });
                  navigate("/class?join=1");
                } catch (err) {
                  toast.show({ tone: "error", title: "Couldn't leave the class", body: errorMessage(err) });
                  setBusy(false);
                }
              }}
            >
              Leave class
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ─── Roster ─────────────────────────────────────────────────────────────────

type SortKey = "name" | "streak" | "active" | "week" | "done" | "unit";

function Roster({
  cls,
  members,
  loading,
  assignments,
  submissions,
  today,
}: {
  cls: WithId<ClassDoc>;
  members: WithId<MemberDoc>[];
  loading: boolean;
  assignments: WithId<Omit<Assignment, "id">>[];
  submissions: Record<string, Record<string, SubmissionDoc>>;
  today: DayKey;
}) {
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: "active", dir: 1 });
  const [open, setOpen] = useState<WithId<MemberDoc> | null>(null);
  const unitKey = cls.current_unit ? `u${cls.current_unit}` : null;
  const dueSoFar = assignments.filter((a) => daysBetween(a.created_day, today) >= 0);

  const rows = useMemo(() => {
    const list = members.map((m) => {
      const s = weekStats(m, today);
      const done = dueSoFar.filter((a) => submissions[a.id]?.[m.uid]?.done).length;
      return { m, s, done, unit: unitKey ? m.unit_best?.[unitKey] ?? null : null };
    });
    const val = (r: (typeof list)[number]): number | string => {
      switch (sort.key) {
        case "name":
          return r.m.username.toLowerCase();
        case "streak":
          return -r.s.streak;
        case "active":
          return r.s.idleDays ?? 9999;
        case "week":
          return -r.s.weekXp;
        case "done":
          return -r.done;
        case "unit":
          return -(r.unit ?? -1);
      }
    };
    return list.sort((a, b) => {
      const x = val(a);
      const y = val(b);
      return (x < y ? -1 : x > y ? 1 : 0) * sort.dir;
    });
  }, [members, today, dueSoFar, submissions, unitKey, sort]);

  const header = (key: SortKey, label: string, className?: string) => (
    <th className={cn("px-4 py-3 text-left text-xs font-semibold tracking-[0.04em] text-fg-3 uppercase", className)}>
      <button className="inline-flex items-center gap-1 hover:text-fg" onClick={() => setSort((s) => ({ key, dir: s.key === key ? (s.dir === 1 ? -1 : 1) : 1 }))}>
        {label} <ArrowUpDown className={cn("size-3", sort.key === key ? "text-fg" : "text-fg-3")} />
      </button>
    </th>
  );

  if (loading) return <Skeleton className="h-64 rounded-lg" />;
  if (members.length === 0) {
    return (
      <Card>
        <EmptyState
          icon={Users}
          title="No students yet"
          body={
            <>
              Ask students to sign in at <span className="font-semibold text-fg-2">{window.location.host}</span> and enter the code <span className="font-mono font-semibold text-fg-2">{cls.code}</span>.
            </>
          }
        />
      </Card>
    );
  }
  return (
    <Card className="overflow-hidden">
      <table className="w-full border-collapse">
        <thead className="border-b border-line bg-surface-2/50">
          <tr>
            {header("name", "Student")}
            {header("streak", "Streak")}
            {header("active", "Last active")}
            {header("week", "This week")}
            {header("done", "Assignments")}
            {cls.current_unit ? header("unit", `Unit ${cls.current_unit} best`) : <th />}
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {rows.map(({ m, s, done, unit }) => (
            <tr key={m.uid} className="cursor-pointer hover:bg-surface-2/50" onClick={() => setOpen(m)}>
              <td className="px-4 py-3">
                <button type="button" className="flex items-center gap-3 text-left" onClick={() => setOpen(m)}>
                  <Avatar name={m.username} src={m.avatar_url} size={30} />
                  <span className="text-base font-semibold text-fg">{m.username}</span>
                </button>
              </td>
              <td className="t-num px-4 py-3 text-base text-fg-2">
                <span className="inline-flex items-center gap-1.5">
                  <Flame className={cn("size-4", s.streak ? "text-sun" : "text-fg-3")} /> {s.streak}
                </span>
              </td>
              <td className="px-4 py-3 text-base">
                <span className={cn(s.idleDays === null || s.idleDays >= 3 ? "font-semibold text-coral" : s.idleDays === 0 ? "text-brand-ink" : "text-fg-2")}>
                  {s.idleDays === null ? "Never" : s.idleDays === 0 ? "Today" : s.idleDays === 1 ? "Yesterday" : `${s.idleDays} days ago`}
                </span>
              </td>
              <td className="t-num px-4 py-3 text-base text-fg-2">
                {s.weekSets} {s.weekSets === 1 ? "set" : "sets"} · {s.weekXp} XP
              </td>
              <td className="px-4 py-3">
                {dueSoFar.length === 0 ? (
                  <span className="text-sm text-fg-3">None yet</span>
                ) : (
                  <span className="flex items-center gap-3">
                    <ProgressBar value={(done / dueSoFar.length) * 100} className="h-1.5 w-20" label="Assignments done" />
                    <span className="t-num text-sm text-fg-2">
                      {done}/{dueSoFar.length}
                    </span>
                  </span>
                )}
              </td>
              <td className="t-num px-4 py-3 text-base text-fg-2">{cls.current_unit ? (unit === null ? "–" : `${unit}%`) : ""}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {open && <StudentDialog member={open} cls={cls} assignments={assignments} submissions={submissions} today={today} onClose={() => setOpen(null)} />}
    </Card>
  );
}

function StudentDialog({
  member,
  cls,
  assignments,
  submissions,
  today,
  onClose,
}: {
  member: WithId<MemberDoc>;
  cls: WithId<ClassDoc>;
  assignments: WithId<Omit<Assignment, "id">>[];
  submissions: Record<string, Record<string, SubmissionDoc>>;
  today: DayKey;
  onClose: () => void;
}) {
  const s = weekStats(member, today);
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent title={member.username} description={`${stageForXp(member.xp_total ?? 0).name} · ${member.lessons_count ?? 0} lessons read · ${(member.masteries ?? []).length} units mastered`} wide>
        <div className="grid grid-cols-[1fr_16.25rem] gap-5">
          <div className="overflow-hidden rounded-lg border border-line">
            <IslandScene
              health={islandHealth(member.last_set_day ?? undefined, today).value}
              sky={findSky(member.island_skybox)?.id ?? "day"}
              growth={member.island_growth}
              decor={member.island_decor}
              landmarks={member.masteries}
              animate={false}
              className="aspect-[5/3]"
            />
          </div>
          <div className="space-y-2.5 text-base">
            {[
              ["Streak", `${s.streak} days`],
              ["This week", `${s.weekSets} sets · ${s.weekXp} XP`],
              ["Last week", `${s.lastWeekXp} XP`],
              ["Total XP", (member.xp_total ?? 0).toLocaleString()],
              ["Volunteer hours", `${member.hours_verified ?? 0} verified`],
              ["Eco actions", `${member.actions_count ?? 0} done`],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between rounded-md bg-surface-2/70 px-3 py-2">
                <span className="text-fg-3">{k}</span>
                <span className="t-num font-semibold text-fg">{v}</span>
              </div>
            ))}
          </div>
        </div>
        <p className="mt-6 mb-2 text-sm font-semibold text-fg-2">Unit quiz bests</p>
        <div className="grid grid-cols-9 gap-1.5">
          {UNITS.map((u) => {
            const b = member.unit_best?.[`u${u.n}`];
            return (
              <div key={u.n} className={cn("rounded-sm px-1 py-2 text-center", b === undefined ? "bg-surface-2" : b >= 70 ? "bg-brand-soft" : "bg-sun-soft")}>
                <p className="text-2xs text-fg-3">U{u.n}</p>
                <p className="t-num text-sm font-semibold text-fg">{b === undefined ? "–" : `${b}%`}</p>
              </div>
            );
          })}
        </div>
        {assignments.length > 0 && (
          <>
            <p className="mt-6 mb-2 text-sm font-semibold text-fg-2">Assignments</p>
            <ul className="divide-y divide-line rounded-lg border border-line">
              {assignments.map((a) => {
                const sub = submissions[a.id]?.[member.uid];
                return (
                  <li key={a.id} className="flex items-center gap-3 px-3.5 py-2.5 text-base">
                    <span className="flex-1 truncate text-fg-2">{a.title}</span>
                    <span className="text-fg-3">{formatDay(a.due_day, { month: "short", day: "numeric" })}</span>
                    {sub?.done ? <Badge tone={sub.late ? "sun" : "brand"}>{sub.late ? "Late" : "Done"}{sub.score !== null ? ` · ${sub.score}%` : ""}</Badge> : <Badge tone={daysBetween(a.due_day, today) > 0 ? "coral" : "neutral"}>{sub && sub.progress > 0 ? `${sub.progress}/${sub.target}` : sub?.score != null ? `${sub.score}%` : "Not started"}</Badge>}
                  </li>
                );
              })}
            </ul>
          </>
        )}
        <div className="mt-6 flex justify-end">
          {confirm ? (
            <div className="flex items-center gap-2">
              <span className="text-base text-fg-3">Remove {member.username}? They can't rejoin until you allow it in Settings.</span>
              <Button variant="secondary" size="sm" onClick={() => setConfirm(false)}>
                Cancel
              </Button>
              <Button
                variant="danger"
                size="sm"
                loading={busy}
                onClick={async () => {
                  setBusy(true);
                  try {
                    await api("class/remove", { classId: cls.id, uid: member.uid });
                    toast.show({ tone: "info", title: `${member.username} was removed` });
                    onClose();
                  } catch (err) {
                    toast.show({ tone: "error", title: "Couldn't remove", body: errorMessage(err) });
                    setBusy(false);
                  }
                }}
              >
                Remove
              </Button>
            </div>
          ) : (
            <Button variant="danger-soft" size="sm" onClick={() => setConfirm(true)}>
              <Trash2 /> Remove from class
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Assignments ────────────────────────────────────────────────────────────

function TeacherAssignments({
  cls,
  members,
  assignments,
  submissions,
  loading,
  today,
  openNew,
}: {
  cls: WithId<ClassDoc>;
  members: WithId<MemberDoc>[];
  assignments: WithId<Omit<Assignment, "id">>[];
  submissions: Record<string, Record<string, SubmissionDoc>>;
  loading: boolean;
  today: DayKey;
  openNew: boolean;
}) {
  const [editing, setEditing] = useState<WithId<Omit<Assignment, "id">> | "new" | null>(openNew ? "new" : null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const toast = useToast();
  const upcoming = assignments.filter((a) => daysBetween(today, a.due_day) >= 0);
  const past = assignments.filter((a) => daysBetween(today, a.due_day) < 0).reverse();

  const row = (a: WithId<Omit<Assignment, "id">>) => {
    const Icon = TYPE_ICON[a.type];
    const subs = submissions[a.id] ?? {};
    const done = members.filter((m) => subs[m.uid]?.done).length;
    const late = members.filter((m) => subs[m.uid]?.done && subs[m.uid]?.late).length;
    const isOpen = expanded === a.id;
    return (
      <li key={a.id} className="py-1">
        <div className="flex items-center gap-4 px-2 py-2.5">
          <button className="flex min-w-0 flex-1 items-center gap-4 text-left" onClick={() => setExpanded(isOpen ? null : a.id)} aria-expanded={isOpen}>
            <span className="grid size-10 shrink-0 place-items-center rounded-md bg-surface-2 text-fg-2">
              <Icon className="size-4.5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-md font-semibold text-fg">{a.title}</span>
              <span className="block truncate text-sm text-fg-3">
                {ASSIGNMENT_TYPES.find((t) => t.type === a.type)?.label} · Due {formatDay(a.due_day, { weekday: "short", month: "short", day: "numeric" })}
                {a.min_pct ? ` · ${a.min_pct}% to pass` : ""}
              </span>
            </span>
            <span className="flex w-55 items-center gap-3">
              <ProgressBar value={members.length ? (done / members.length) * 100 : 0} className="h-1.5" label="Completion" />
              <span className="t-num text-sm whitespace-nowrap text-fg-2">
                {done}/{members.length} done
              </span>
            </span>
            {late > 0 && <Badge tone="sun">{late} late</Badge>}
            <ChevronDown className={cn("size-4 text-fg-3 transition-transform", isOpen && "rotate-180")} />
          </button>
          <Menu>
            <MenuTrigger asChild>
              <Button variant="ghost" size="icon-sm" aria-label={`Options for ${a.title}`}>
                <MoreHorizontal />
              </Button>
            </MenuTrigger>
            <MenuContent>
              <MenuItem onSelect={() => setEditing(a)}>
                <Pencil /> Edit
              </MenuItem>
              <MenuItem
                danger
                onSelect={async () => {
                  try {
                    await deleteAssignment(cls.id, a.id);
                    toast.show({ tone: "info", title: "Assignment deleted" });
                  } catch (err) {
                    toast.show({ tone: "error", title: "Couldn't delete", body: errorMessage(err) });
                  }
                }}
              >
                <Trash2 /> Delete
              </MenuItem>
            </MenuContent>
          </Menu>
        </div>
        {isOpen && (
          <div className="mb-3 ml-16 rounded-lg border border-line">
            {a.notes && <p className="border-b border-line px-4 py-2.5 text-base text-fg-2">{a.notes}</p>}
            {members.length === 0 ? (
              <p className="px-4 py-3 text-base text-fg-3">No students in this class yet.</p>
            ) : (
              <ul className="divide-y divide-line">
                {[...members]
                  .sort((x, y) => Number(!!subs[y.uid]?.done) - Number(!!subs[x.uid]?.done) || x.username.localeCompare(y.username))
                  .map((m) => {
                    const sub = subs[m.uid];
                    return (
                      <li key={m.uid} className="flex items-center gap-3 px-4 py-2 text-base">
                        <Avatar name={m.username} src={m.avatar_url} size={22} />
                        <span className="flex-1 text-fg-2">{m.username}</span>
                        {sub?.done ? (
                          <span className="flex items-center gap-1.5 font-semibold text-brand-ink">
                            <Check className="size-3.5" strokeWidth={3} /> {sub.score !== null ? `${sub.score}%` : "Done"}
                            {sub.late && <span className="font-medium text-sun-ink">· late</span>}
                          </span>
                        ) : sub ? (
                          <span className="text-fg-3">{sub.target > 1 ? `${sub.progress}/${sub.target}` : sub.score !== null ? `Best ${sub.score}%` : "Started"}</span>
                        ) : (
                          <span className="text-fg-3">Not started</span>
                        )}
                      </li>
                    );
                  })}
              </ul>
            )}
          </div>
        )}
      </li>
    );
  };

  return (
    <>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-base text-fg-3">Students complete assignments by doing the work. Completion updates here automatically.</p>
        <Button onClick={() => setEditing("new")}>
          <Plus /> New assignment
        </Button>
      </div>
      {loading ? (
        <Skeleton className="h-48 rounded-lg" />
      ) : assignments.length === 0 ? (
        <Card>
          <EmptyState icon={ListChecks} title="No assignments yet" body="Assign a lesson to read, a quiz, an FRQ, a number of daily sets or a field quest, each with a due date." action={<Button onClick={() => setEditing("new")}><Plus /> New assignment</Button>} />
        </Card>
      ) : (
        <div className="space-y-6">
          {upcoming.length > 0 && (
            <Card className="px-4 py-2">
              <p className="px-2 pt-3 text-xs font-semibold tracking-[0.05em] text-fg-3 uppercase">Upcoming</p>
              <ul className="divide-y divide-line">{upcoming.map(row)}</ul>
            </Card>
          )}
          {past.length > 0 && (
            <Card className="px-4 py-2">
              <p className="px-2 pt-3 text-xs font-semibold tracking-[0.05em] text-fg-3 uppercase">Past due</p>
              <ul className="divide-y divide-line">{past.map(row)}</ul>
            </Card>
          )}
        </div>
      )}
      {editing && <AssignmentForm cls={cls} existing={editing === "new" ? null : editing} onClose={() => setEditing(null)} today={today} />}
    </>
  );
}

function AssignmentForm({ cls, existing, onClose, today }: { cls: WithId<ClassDoc>; existing: WithId<Omit<Assignment, "id">> | null; onClose: () => void; today: DayKey }) {
  const profile = useProfile();
  const toast = useToast();
  const [type, setType] = useState<AssignmentType>(existing?.type ?? "lesson");
  const [unit, setUnit] = useState<number>(existing?.unit ?? cls.current_unit ?? 1);
  const [lessonId, setLessonId] = useState<string>(existing && (existing.type === "lesson" || existing.type === "lesson_quiz") ? existing.ref : "");
  const [frqId, setFrqId] = useState<string>(existing?.type === "frq" ? existing.ref : "");
  const [count, setCount] = useState<number>(existing?.count ?? 3);
  const [minPct, setMinPct] = useState<number>(existing?.min_pct ?? 0);
  const [due, setDue] = useState<DayKey>(existing?.due_day ?? addDays(today, 7));
  const [notes, setNotes] = useState(existing?.notes ?? "");
  const [title, setTitle] = useState(existing?.title ?? "");
  const [titleTouched, setTitleTouched] = useState(!!existing);
  const [frqs, setFrqs] = useState<Frq[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void loadFrqs().then(setFrqs).catch(() => setFrqs([]));
  }, []);

  const lessons = (getUnit(unit)?.lessons ?? []).filter((l) => type !== "lesson_quiz" || l.hasQuiz);
  const unitFrqs = frqs.filter((f) => f.unit === unit);
  useEffect(() => {
    if ((type === "lesson" || type === "lesson_quiz") && !lessons.some((l) => l.id === lessonId)) setLessonId(lessons[0]?.id ?? "");
    if (type === "frq" && !unitFrqs.some((f) => f.id === frqId)) setFrqId(unitFrqs[0]?.id ?? "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type, unit, frqs.length]);

  const ref = type === "lesson" || type === "lesson_quiz" ? lessonId : type === "frq" ? frqId : type === "daily_sets" ? "" : `u${unit}`;
  const auto = defaultAssignmentTitle(type, ref, { count, frqTitle: unitFrqs.find((f) => f.id === frqId)?.title });
  const finalTitle = (titleTouched ? title : auto).trim();
  const scored = type === "lesson_quiz" || type === "unit_quiz" || type === "frq";
  const valid = !!finalTitle && isDayKey(due) && (type === "daily_sets" || type === "unit_quiz" || type === "field_quest" || !!ref) && (existing ? true : daysBetween(today, due) >= 0);

  const save = async () => {
    setBusy(true);
    const input: AssignmentInput = {
      type,
      ref,
      title: finalTitle,
      unit,
      count: type === "daily_sets" ? count : undefined,
      min_pct: scored && minPct ? minPct : undefined,
      notes,
      created_day: existing?.created_day ?? today,
      due_day: due,
    };
    try {
      if (existing) {
        await updateAssignment(cls.id, existing.id, profile.id, input, (existing as unknown as { created_at?: string }).created_at);
        toast.show({ tone: "success", title: "Assignment updated" });
      } else {
        await createAssignment(cls.id, profile.id, input);
        track("assignment_created", { type });
        toast.show({ tone: "success", title: "Assignment posted", body: "Students see it on their Today page now." });
      }
      onClose();
    } catch (err) {
      toast.show({ tone: "error", title: "Couldn't save the assignment", body: errorMessage(err) });
      setBusy(false);
    }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent title={existing ? "Edit assignment" : "New assignment"} description={`For ${cls.name}. Students complete it by doing the work in Ecoisland.`} wide>
        <div className="grid grid-cols-2 gap-5">
          <Field label="Type" className="col-span-2">
            <div className="grid grid-cols-3 gap-2">
              {ASSIGNMENT_TYPES.map((t) => {
                const Icon = TYPE_ICON[t.type];
                return (
                  <button
                    key={t.type}
                    type="button"
                    onClick={() => setType(t.type)}
                    aria-pressed={type === t.type}
                    className={cn(
                      "flex items-center gap-2.5 rounded-md border px-3 py-2.5 text-left text-base font-semibold transition-colors",
                      type === t.type ? "border-brand bg-brand-soft text-brand-ink" : "border-line-strong text-fg-2 hover:bg-surface-2",
                    )}
                  >
                    <Icon className="size-4" /> {t.label}
                  </button>
                );
              })}
            </div>
          </Field>
          <Field label="Unit" htmlFor="asg-unit">
            <Select id="asg-unit" value={unit} onChange={(e) => setUnit(Number(e.target.value))}>
              {UNITS.map((u) => (
                <option key={u.n} value={u.n}>
                  Unit {u.n}: {u.title}
                </option>
              ))}
            </Select>
          </Field>
          {(type === "lesson" || type === "lesson_quiz") && (
            <Field label="Lesson" htmlFor="asg-lesson">
              <Select id="asg-lesson" value={lessonId} onChange={(e) => setLessonId(e.target.value)}>
                {lessons.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.code} {l.title}
                  </option>
                ))}
              </Select>
            </Field>
          )}
          {type === "frq" && (
            <Field label="FRQ" htmlFor="asg-frq">
              <Select id="asg-frq" value={frqId} onChange={(e) => setFrqId(e.target.value)}>
                {unitFrqs.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.title}
                  </option>
                ))}
              </Select>
            </Field>
          )}
          {type === "daily_sets" && (
            <Field label="Daily sets required" htmlFor="asg-count" hint="Counted between today and the due date.">
              <Input id="asg-count" type="number" min={1} max={30} value={count} onChange={(e) => setCount(Math.max(1, Math.min(30, Number(e.target.value) || 1)))} />
            </Field>
          )}
          {type === "unit_quiz" && <Field label="Quiz" hint="20 questions drawn from the whole unit."><Input value={`Unit ${unit} practice quiz`} disabled /></Field>}
          {type === "field_quest" && <Field label="Quest" hint={questForUnit(unit)?.prompt}><Input value={questForUnit(unit)?.title ?? ""} disabled /></Field>}
          {scored && (
            <Field label="Score to complete" htmlFor="asg-min">
              <Select id="asg-min" value={minPct} onChange={(e) => setMinPct(Number(e.target.value))}>
                <option value={0}>Any attempt</option>
                <option value={50}>50% or better</option>
                <option value={70}>70% or better</option>
                <option value={80}>80% or better</option>
              </Select>
            </Field>
          )}
          <Field label="Due" htmlFor="asg-due">
            <Input id="asg-due" type="date" value={due} min={existing ? undefined : today} onChange={(e) => setDue(e.target.value)} />
          </Field>
          <Field label="Title" htmlFor="asg-title" className="col-span-2">
            <Input
              id="asg-title"
              value={titleTouched ? title : auto}
              maxLength={120}
              onChange={(e) => {
                setTitleTouched(true);
                setTitle(e.target.value);
              }}
            />
          </Field>
          <Field label="Note to students (optional)" htmlFor="asg-notes" className="col-span-2">
            <Textarea id="asg-notes" value={notes} maxLength={500} onChange={(e) => setNotes(e.target.value)} className="min-h-18 placeholder:text-fg-3" placeholder="Focus on part (c). We'll discuss it Friday." />
          </Field>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={save} loading={busy} disabled={!valid}>
            {existing ? "Save changes" : "Post assignment"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function StudentAssignments({ assignments, loading, today }: { assignments: WithId<Omit<Assignment, "id">>[]; loading: boolean; today: DayKey }) {
  const profile = useProfile();
  if (loading) return <Skeleton className="h-48 rounded-lg" />;
  if (assignments.length === 0) {
    return (
      <Card>
        <EmptyState icon={ListChecks} title="Nothing assigned yet" body="Your teacher's assignments will appear here and on your Today page." />
      </Card>
    );
  }
  const rows = assignments.map((a) => ({ a, st: evaluateAssignment(a, profile) })).sort((x, y) => Number(x.st.done) - Number(y.st.done) || x.a.due_day.localeCompare(y.a.due_day));
  return (
    <Card className="px-4 py-2">
      <ul className="divide-y divide-line">
        {rows.map(({ a, st }) => {
          const Icon = TYPE_ICON[a.type];
          const late = !st.done && daysBetween(a.due_day, today) > 0;
          return (
            <li key={a.id} className="flex items-center gap-4 px-2 py-3.5">
              <span className={cn("grid size-10 shrink-0 place-items-center rounded-md", st.done ? "bg-brand-soft text-brand-ink" : "bg-surface-2 text-fg-2")}>
                {st.done ? <Check className="size-4.5" strokeWidth={2.6} /> : <Icon className="size-4.5" />}
              </span>
              <div className="min-w-0 flex-1">
                <p className={cn("truncate text-md font-semibold", st.done ? "text-fg-3" : "text-fg")}>{a.title}</p>
                <p className="truncate text-sm text-fg-3">
                  <span className={cn(late && "font-semibold text-coral")}>{dueLabel(a.due_day, today)}</span>
                  {a.notes ? ` · ${a.notes}` : ""}
                </p>
              </div>
              <span className="t-num text-sm text-fg-3">{st.done ? (st.score !== null ? `Done · ${st.score}%` : "Done") : a.type === "daily_sets" ? `${st.progress} of ${st.target}` : st.score !== null ? `Best ${st.score}%` : "Not started"}</span>
              {!st.done && (
                <Button size="sm" variant={late ? "primary" : "secondary"} asChild>
                  <Link to={assignmentHref(a)}>Start</Link>
                </Button>
              )}
            </li>
          );
        })}
      </ul>
    </Card>
  );
}

// ─── Leaderboard ────────────────────────────────────────────────────────────

type Board = "week" | "growth" | "all" | "streak";

function Leaderboard({ members, loading, today, meId }: { members: WithId<MemberDoc>[]; loading: boolean; today: DayKey; meId: string }) {
  const [board, setBoard] = useState<Board>("week");
  const [view, setView] = useState<WithId<MemberDoc> | null>(null);
  const rows = useMemo(() => {
    const list = members.map((m) => {
      const s = weekStats(m, today);
      const value = board === "week" ? s.weekXp : board === "growth" ? s.growth : board === "all" ? m.xp_total ?? 0 : s.streak;
      return { m, value };
    });
    return list.sort((a, b) => b.value - a.value || a.m.username.localeCompare(b.m.username));
  }, [members, today, board]);
  const top = Math.max(1, ...rows.map((r) => Math.abs(r.value)));
  const unit = board === "streak" ? "days" : "XP";

  if (loading) return <Skeleton className="h-64 rounded-lg" />;
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_18.75rem] gap-6">
      <Card className="p-2">
        <div className="flex items-center justify-between px-4 pt-3 pb-2">
          <Segmented<Board>
            label="Leaderboard"
            size="sm"
            value={board}
            onChange={setBoard}
            options={[
              { value: "week", label: "This week" },
              { value: "growth", label: <><TrendingUp /> Growth</> },
              { value: "all", label: "All time" },
              { value: "streak", label: "Streaks" },
            ]}
          />
        </div>
        {rows.length === 0 ? (
          <EmptyState icon={Users} title="No one here yet" />
        ) : (
          <ol className="divide-y divide-line">
            {rows.map(({ m, value }, i) => {
              const me = m.uid === meId;
              return (
                <li key={m.uid}>
                  <button onClick={() => setView(m)} className={cn("flex w-full items-center gap-4 px-4 py-3 text-left hover:bg-surface-2/60", me && "bg-brand-soft/50")}>
                    <span className={cn("t-num w-7 text-center text-base font-bold", i === 0 ? "text-sun-ink" : i < 3 ? "text-fg-2" : "text-fg-3")}>{i + 1}</span>
                    <Avatar name={m.username} src={m.avatar_url} size={32} />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2 truncate text-md font-semibold text-fg">
                        {m.username} {me && <Badge tone="brand">You</Badge>}
                        {m.ambassador && (
                          <Badge tone="sun" title="Ecoisland Ambassador">
                            <Award /> Ambassador
                          </Badge>
                        )}
                      </span>
                    </span>
                    <span className="hidden w-40 lg:block">
                      <span className="block h-1.5 overflow-hidden rounded-full bg-surface-3">
                        <span className={cn("block h-full rounded-full", value < 0 ? "bg-coral/70" : "bg-brand")} style={{ width: `${(Math.abs(value) / top) * 100}%` }} />
                      </span>
                    </span>
                    <span className="t-num w-23 text-right text-base font-semibold text-fg">
                      {board === "growth" && value > 0 ? "+" : ""}
                      {value.toLocaleString()} <span className="text-xs font-medium text-fg-3">{unit}</span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>
        )}
      </Card>
      <Card className="self-start p-6">
        <p className="t-eyebrow">{board === "growth" ? "Growth" : board === "week" ? "This week" : board === "all" ? "All time" : "Streaks"}</p>
        <p className="mt-3 text-base text-fg-2">
          {board === "growth"
            ? "This week's XP minus last week's. Anyone can top it just by improving on themselves."
            : board === "week"
              ? "XP earned since Monday. Resets every week, so everyone gets a fresh start."
              : board === "all"
                ? "Total XP since joining Ecoisland."
                : "Days in a row with a daily set."}
        </p>
        <p className="mt-3 text-sm text-fg-3">Click a classmate to visit their island.</p>
      </Card>
      {view && (
        <Dialog open onOpenChange={(o) => !o && setView(null)}>
          <DialogContent title={view.island_name?.trim() || `${view.username}'s island`} description={`${stageForXp(view.xp_total ?? 0).name} · ${(view.masteries ?? []).length} of 9 landmarks`} wide>
            <div className="overflow-hidden rounded-lg border border-line">
              <IslandScene
                health={islandHealth(view.last_set_day ?? undefined, today).value}
                sky={findSky(view.island_skybox)?.id ?? "day"}
                growth={view.island_growth}
                decor={view.island_decor}
                landmarks={view.masteries}
                className="aspect-[5/3]"
              />
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

// ─── Field notes ────────────────────────────────────────────────────────────

function Notes({ classId, teacher, meId }: { classId: string; teacher: boolean; meId: string }) {
  const { items, loading } = useCollection<Omit<NoteDoc, "id">>(`classes/${classId}/notes`, { orderBy: ["created_at", "desc"], limit: 100 });
  const toast = useToast();
  if (loading) return <Skeleton className="h-48 rounded-lg" />;
  if (items.length === 0) {
    return (
      <Card>
        <EmptyState
          icon={Compass}
          title="No field notes yet"
          body="When classmates finish a field quest or an eco action, what they found shows up here."
          action={
            <Button variant="secondary" asChild>
              <Link to="/act">Find an eco action</Link>
            </Button>
          }
        />
      </Card>
    );
  }
  return (
    <div className="grid grid-cols-2 gap-6">
      {items.map((n) => (
        <Card key={n.id} className="p-6">
          <div className="flex items-start gap-3">
            <Avatar name={n.username} src={n.avatar_url} size={34} />
            <div className="min-w-0 flex-1">
              <p className="text-base font-semibold text-fg">{n.username}</p>
              <p className="text-sm text-fg-3">
                {n.kind === "action" ? "Eco action" : `Unit ${n.unit}`} · {n.title} · {new Date(n.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
              </p>
            </div>
            {(teacher || n.uid === meId) && (
              <Menu>
                <MenuTrigger asChild>
                  <Button variant="ghost" size="icon-sm" aria-label="Note options">
                    <MoreHorizontal />
                  </Button>
                </MenuTrigger>
                <MenuContent>
                  <MenuItem
                    danger
                    onSelect={async () => {
                      try {
                        await deleteDoc(doc(db, "classes", classId, "notes", n.id));
                      } catch (err) {
                        toast.show({ tone: "error", title: "Couldn't delete", body: errorMessage(err) });
                      }
                    }}
                  >
                    <Trash2 /> Delete note
                  </MenuItem>
                </MenuContent>
              </Menu>
            )}
          </div>
          <p className="mt-4 text-md leading-relaxed whitespace-pre-wrap text-fg-2">{n.text}</p>
        </Card>
      ))}
    </div>
  );
}

// ─── Settings ───────────────────────────────────────────────────────────────

function ClassSettings({ cls }: { cls: WithId<ClassDoc> }) {
  const toast = useToast();
  const navigate = useNavigate();
  const [name, setName] = useState(cls.name);
  const [unit, setUnit] = useState<number | "">(cls.current_unit ?? "");
  const [testDay, setTestDay] = useState(cls.test_day ?? "");
  const [testLabel, setTestLabel] = useState(cls.test_label ?? "");
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState("");
  const [deleting, setDeleting] = useState(false);
  const dirty = name !== cls.name || (unit || null) !== (cls.current_unit ?? null) || (testDay || null) !== (cls.test_day ?? null) || (testLabel || null) !== (cls.test_label ?? null);

  const save = async () => {
    setBusy(true);
    try {
      await updateClass(cls.id, {
        name: name.trim(),
        current_unit: unit === "" ? null : unit,
        test_day: testDay || null,
        test_label: testLabel.trim() || null,
      });
      toast.show({ tone: "success", title: "Class updated", body: unit ? `Students' daily sets now focus on Unit ${unit}.` : undefined });
    } catch (err) {
      toast.show({ tone: "error", title: "Couldn't save", body: errorMessage(err) });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid grid-cols-[minmax(0,1fr)_21.25rem] gap-6">
      <Card className="p-6">
        <h2 className="t-h3">Class details</h2>
        <div className="mt-5 grid grid-cols-2 gap-5">
          <Field label="Class name" htmlFor="cls-name" className="col-span-2">
            <Input id="cls-name" value={name} maxLength={60} onChange={(e) => setName(e.target.value)} />
          </Field>
          <Field label="Current unit" htmlFor="cls-unit" hint="Daily sets for every student focus on this unit." className="col-span-2">
            <Select id="cls-unit" value={unit} onChange={(e) => setUnit(e.target.value ? Number(e.target.value) : "")}>
              <option value="">Not set (students choose)</option>
              {UNITS.map((u) => (
                <option key={u.n} value={u.n}>
                  Unit {u.n}: {u.title}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Next test" htmlFor="cls-test" hint="Shows a countdown and readiness score on Today.">
            <Input id="cls-test" type="date" value={testDay} onChange={(e) => setTestDay(e.target.value)} />
          </Field>
          <Field label="Test name" htmlFor="cls-test-label">
            <Input id="cls-test-label" value={testLabel} maxLength={60} placeholder="Unit 4 test" className="placeholder:text-fg-3" onChange={(e) => setTestLabel(e.target.value)} />
          </Field>
        </div>
        <div className="mt-6 flex justify-end">
          <Button onClick={save} loading={busy} disabled={!dirty || name.trim().length < 2}>
            Save changes
          </Button>
        </div>
      </Card>
      <div className="space-y-6 self-start">
      <JoinCodeCard cls={cls} />
      <Card className="p-6">
        <h2 className="t-h3 text-coral">Delete class</h2>
        <p className="mt-2 text-base text-fg-3">Removes the roster, assignments, submissions and field notes. Students keep their own progress.</p>
        <Field label={`Type "${cls.name}" to confirm`} htmlFor="cls-del" className="mt-4">
          <Input id="cls-del" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
        </Field>
        <Button
          variant="danger"
          className="mt-4 w-full"
          disabled={confirm !== cls.name}
          loading={deleting}
          onClick={async () => {
            setDeleting(true);
            try {
              await api("class/delete", { classId: cls.id });
              toast.show({ tone: "info", title: `${cls.name} was deleted` });
              navigate("/class");
            } catch (err) {
              toast.show({ tone: "error", title: "Couldn't delete the class", body: errorMessage(err) });
              setDeleting(false);
            }
          }}
        >
          <Trash2 /> Delete class
        </Button>
      </Card>
      </div>
    </div>
  );
}

/** Reset the join code, and let removed students back in. */
function JoinCodeCard({ cls }: { cls: WithId<ClassDoc> }) {
  const toast = useToast();
  const { items: removed } = useCollection<{ uid: string; username: string; at: string }>(`classes/${cls.id}/removed`);
  const [busy, setBusy] = useState<string | null>(null);
  const run = async (key: string, route: string, body: Record<string, unknown>, done: (res: { code?: string }) => string) => {
    setBusy(key);
    try {
      const res = await api<{ code?: string }>(route, { classId: cls.id, ...body });
      toast.show({ tone: "success", title: done(res) });
    } catch (err) {
      toast.show({ tone: "error", title: "That didn't work", body: errorMessage(err) });
    } finally {
      setBusy(null);
    }
  };
  return (
    <Card className="p-6">
      <h2 className="t-h3">Join code</h2>
      <p className="mt-2 text-base text-fg-3">
        Current code <span className="font-mono font-semibold tracking-[0.12em] text-fg">{cls.code}</span>. Reset it if it was shared outside your class. Students already in the class stay.
      </p>
      <Button variant="secondary" className="mt-4 w-full" loading={busy === "reset"} onClick={() => run("reset", "class/reset-code", {}, (r) => `New code: ${r.code}`)}>
        Reset join code
      </Button>
      {removed.length > 0 && (
        <div className="mt-5 border-t border-line pt-4">
          <p className="text-sm font-semibold text-fg-3">Removed students can't rejoin</p>
          <ul className="mt-2 space-y-1.5">
            {removed.map((r) => (
              <li key={r.id} className="flex items-center justify-between gap-2 text-base text-fg-2">
                <span className="truncate">{r.username || "Student"}</span>
                <Button size="sm" variant="ghost" loading={busy === r.id} onClick={() => run(r.id, "class/unblock", { uid: r.id }, () => `${r.username || "They"} can join again`)}>
                  Allow back
                </Button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  );
}

