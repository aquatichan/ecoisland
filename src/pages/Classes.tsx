import { ArrowRight, Users } from "lucide-react";
import { Link, Navigate, useSearchParams } from "react-router-dom";
import { Page } from "@/components/app/Guards";
import { Card } from "@/components/ui/card";
import { Tray } from "@/components/ui/tray";
import { Skeleton } from "@/components/ui/empty";
import { useClasses } from "@/lib/data";
import { useDocumentTitle } from "@/lib/hooks";
import { useProfile } from "@/lib/session";
import { getUnit } from "@/shared/curriculum";
import { formatDay } from "@/shared/dates";
import { CreateFirstClass, JoinClassInline } from "./Today";


// A class is one card, and the whole card is the link: the same tile as an event card on Act, with the shared focus
// ring composed over the card's own shadow (a shadow utility would otherwise hide the base ring).
const CLASS_CARD = "card group flex h-full flex-col p-6 transition-[border-color,box-shadow,transform] duration-200 hover:-translate-y-px hover:border-line-strong hover:shadow-md focus-visible:shadow-[var(--ring),var(--shadow-sm)] hover:focus-visible:shadow-[var(--ring),var(--shadow-md)]";

export default function Classes() {
  const profile = useProfile();
  const [params] = useSearchParams();
  const teacher = profile.role === "teacher";
  const { classes, loading } = useClasses(teacher ? profile.teaching_ids : profile.class_ids);
  useDocumentTitle(teacher ? "Classes" : "Class");

  if (!teacher && !loading && classes.length === 1 && params.get("join") !== "1") {
    return <Navigate to={`/class/${classes[0].id}`} replace />;
  }

  return (
    <Page>
      <header className="page-hero">
        <div className="max-w-1/2">
          <p className="t-eyebrow text-fg-2">{teacher ? "Teaching" : "Your classes"}</p>
          <h1 className="t-hero mt-2.5">{teacher ? "Classes" : "Class"}</h1>
          <p className="mt-2 text-md text-fg-2">
            {teacher
              ? "Each class has its own join code, roster, assignments and leaderboard."
              : "Join with the code from your teacher to see assignments and your class leaderboard."}
          </p>
        </div>
      </header>

      {loading ? (
        <div className="grid grid-cols-3 gap-6">
          <Skeleton className="h-36 rounded-lg" />
          <Skeleton className="h-36 rounded-lg" />
        </div>
      ) : (
        <Tray className="space-y-3">
          {classes.length > 0 && (
            <div className="grid grid-cols-3 gap-3">
              {classes.map((c) => (
                <Link key={c.id} to={`/class/${c.id}`} className={CLASS_CARD}>
                  <div className="flex items-center justify-between">
                    <span className="grid size-10 place-items-center rounded-md bg-brand-soft text-brand-ink">
                      <Users className="size-4.5" />
                    </span>
                    {teacher && <span className="font-mono text-sm font-semibold tracking-[0.14em] text-fg-3">{c.code}</span>}
                  </div>
                  <p className="mt-4 text-lg font-semibold text-fg">{c.name}</p>
                  <p className="mt-1 text-sm text-fg-3">
                    {teacher ? `${c.member_count ?? 0} students` : `Taught by ${c.teacher_name}`}
                    {c.current_unit ? ` · Unit ${c.current_unit}: ${getUnit(c.current_unit)?.title}` : ""}
                  </p>
                  {c.test_day && (
                    <p className="mt-1 text-sm text-fg-3">
                      {c.test_label || "Test"} on {formatDay(c.test_day, { weekday: "short", month: "short", day: "numeric" })}
                    </p>
                  )}
                  <span className="mt-auto inline-flex items-center gap-1 pt-4 text-sm font-semibold text-brand-ink">
                    Open <ArrowRight className="size-3.5" />
                  </span>
                </Link>
              ))}
            </div>
          )}
          {teacher ? (
            classes.length === 0 || params.get("new") === "1" ? (
              <CreateFirstClass />
            ) : (
              <Card className="p-6">
                <p className="text-md font-semibold text-fg">Teaching another section?</p>
                <p className="mt-1 text-base text-fg-3">Create a class for each period so rosters and leaderboards stay separate.</p>
                <Link to="/class?new=1" className="mt-3 inline-flex items-center gap-1 text-base font-semibold text-brand-ink hover:underline">
                  Create a class <ArrowRight className="size-4" />
                </Link>
              </Card>
            )
          ) : (
            <div className="card max-w-140 px-5 pt-1 pb-5">
              <JoinClassInline />
            </div>
          )}
        </Tray>
      )}
    </Page>
  );
}
