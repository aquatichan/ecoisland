import { ArrowRight, Users } from "lucide-react";
import { Link, Navigate, useSearchParams } from "react-router-dom";
import { Page } from "@/components/app/Guards";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/empty";
import { useClasses } from "@/lib/data";
import { useDocumentTitle } from "@/lib/hooks";
import { useProfile } from "@/lib/session";
import { getUnit } from "@/shared/curriculum";
import { formatDay } from "@/shared/dates";
import { CreateFirstClass, JoinClassInline } from "./Today";

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
      <header className="mb-8 flex items-end justify-between gap-6">
        <div>
          <p className="t-eyebrow">{teacher ? "Teaching" : "Your classes"}</p>
          <h1 className="t-h1 mt-2.5">{teacher ? "Classes" : "Class"}</h1>
          <p className="mt-2 text-md text-fg-3">
            {teacher
              ? "Each class has its own join code, roster, assignments and leaderboard."
              : "Join with the code from your teacher to see assignments and your class leaderboard."}
          </p>
        </div>
      </header>

      {loading ? (
        <div className="grid grid-cols-3 gap-4">
          <Skeleton className="h-36 rounded-xl" />
          <Skeleton className="h-36 rounded-xl" />
        </div>
      ) : (
        <div className="space-y-8">
          {classes.length > 0 && (
            <div className="grid grid-cols-3 gap-4">
              {classes.map((c) => (
                <Card key={c.id} interactive className="p-0">
                  <Link to={`/class/${c.id}`} className="flex h-full flex-col p-5">
                    <div className="flex items-center justify-between">
                      <span className="grid size-10 place-items-center rounded-md bg-brand-soft text-brand-ink">
                        <Users className="size-[18px]" />
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
                </Card>
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
            <div className="max-w-[560px]">
              <JoinClassInline />
            </div>
          )}
        </div>
      )}
    </Page>
  );
}
