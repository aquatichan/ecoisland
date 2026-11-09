import { ArrowRight, FileText, Layers, PenLine, Target } from "lucide-react";
import { Link } from "react-router-dom";
import { ArtBackdrop } from "@/components/app/ArtBackdrop";
import { Page } from "@/components/app/Guards";
import type { PlateScrim } from "@/components/landing/plates";
import { UnitCard } from "@/components/study/UnitCard";
import { LANDMARK_INFO } from "@/shared/landmarks";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select } from "@/components/ui/field";
import { ProgressBar } from "@/components/ui/progress";
import { useDocumentTitle, useToday } from "@/lib/hooks";
import { updateProfile } from "@/lib/profile";
import { useProfile } from "@/lib/session";
import { useStudentContext } from "@/lib/student";
import { cn } from "@/lib/utils";
import { ALL_LESSONS, UNITS, getUnit } from "@/shared/curriculum";
import { MASTERY_PCT } from "@/shared/economy";

// The sky behind the page title (existing art, from the manifest). The title is at the left, so that is
// where the scrim is; the sun and clouds show on the right.
const BANNER_SCRIM: PlateScrim = { kind: "start", alpha: 0.92, hold: 0.4, fade: 0.2 };

export default function Study() {
  const profile = useProfile();
  const today = useToday();
  const { focusUnit, classes } = useStudentContext(profile, today);
  const teacherSet = classes.some((c) => typeof c.current_unit === "number");
  const done = new Set(profile.lessons_done ?? []);
  const unit = getUnit(focusUnit)!;
  const unitDone = unit.lessons.filter((l) => done.has(l.id)).length;
  const next = unit.lessons.find((l) => !done.has(l.id)) ?? unit.lessons[0];
  const best = profile.unit_best?.[`u${focusUnit}`];
  const teacher = profile.role === "teacher";
  useDocumentTitle("Study");

  return (
    <Page>
      <header className="mb-8">
        <div className="relative isolate flex min-h-40 flex-col justify-center overflow-hidden rounded-2xl border border-line px-8 py-9 shadow-sm">
          <ArtBackdrop art="sky-day" scrim={BANNER_SCRIM} />
          <p className="t-eyebrow">AP Environmental Science</p>
          <h1 className="t-h1 mt-2.5">Study</h1>
        </div>
        <div className="mt-4 flex items-center justify-between gap-6">
          <p className="text-lg text-fg-3">
            9 units · {ALL_LESSONS.length} lessons · 1,221 practice questions · 27 free-response questions
          </p>
          <span className="shrink-0 text-sm text-fg-3">
            Search any lesson with <span className="kbd">⌘K</span>
          </span>
        </div>
      </header>

      {!teacher && (
        <Card className="mb-6 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-8 p-7">
          <div className="min-w-0">
            <div className="flex items-center gap-3">
              <p className="t-eyebrow">Your focus</p>
              {teacherSet ? (
                <Badge tone="ocean">Set by your teacher</Badge>
              ) : (
                <Select
                  value={focusUnit}
                  onChange={(e) => void updateProfile(profile.id, { focus_unit: Number(e.target.value) })}
                  className="h-7 w-37.5 py-0 text-sm"
                  aria-label="Choose your focus unit"
                >
                  {UNITS.map((u) => (
                    <option key={u.n} value={u.n}>
                      Unit {u.n}
                    </option>
                  ))}
                </Select>
              )}
            </div>
            <h2 className="t-h2 mt-3">
              Unit {unit.n}: {unit.title}
            </h2>
            <div className="mt-4 flex max-w-130 items-center gap-4">
              <ProgressBar value={(unitDone / unit.lessons.length) * 100} label="Lessons read" />
              <span className="t-num shrink-0 text-sm text-fg-3">
                {unitDone}/{unit.lessons.length} lessons
              </span>
            </div>
            <p className="mt-3 text-base text-fg-3">
              {best !== undefined ? `Best unit quiz: ${best}%. ` : ""}
              {best !== undefined && best >= MASTERY_PCT
                ? `${LANDMARK_INFO[unit.n].name} is on your island.`
                : `Score ${MASTERY_PCT}% on the unit quiz to add the ${LANDMARK_INFO[unit.n].name.toLowerCase()} to your island.`}
            </p>
          </div>
          <div className="flex flex-col gap-2.5">
            <Button asChild>
              <Link to={`/study/unit/${unit.n}/${encodeURIComponent(next.id)}`}>
                {unitDone === 0 ? "Start" : "Continue"}: {next.code} <ArrowRight />
              </Link>
            </Button>
            <Button variant="secondary" asChild>
              <Link to={`/practice?mode=unit&unit=${unit.n}`}>
                <Target /> Unit {unit.n} quiz
              </Link>
            </Button>
          </div>
        </Card>
      )}

      <div className="mb-10 grid grid-cols-3 gap-4">
        {[
          { to: "/study/frq", icon: PenLine, title: "FRQ practice", body: "27 original FRQs, graded part by part against an AP-style rubric.", tone: "bg-sun-soft text-sun-ink" },
          { to: "/study/flashcards", icon: Layers, title: "Flashcards", body: "Every key term in the course, by unit or lesson.", tone: "bg-ocean-soft text-ocean" },
          { to: "/study/guide", icon: FileText, title: "Exam guide", body: "How the exam is scored, unit weights and test-day tips.", tone: "bg-brand-soft text-brand-ink" },
        ].map((t) => (
          <Card key={t.to} interactive className="p-0">
            <Link to={t.to} className="flex h-full items-start gap-4 rounded-lg p-5">
              <div className={cn("grid size-10 shrink-0 place-items-center rounded-md", t.tone)}>
                <t.icon className="size-4.5" aria-hidden />
              </div>
              <div>
                <p className="text-md font-semibold text-fg">{t.title}</p>
                <p className="mt-1 text-base text-fg-3">{t.body}</p>
              </div>
            </Link>
          </Card>
        ))}
      </div>

      <h2 className="t-h2 mb-4">Units</h2>
      <div className="grid grid-cols-3 gap-4">
        {UNITS.map((u) => {
          const read = u.lessons.filter((l) => done.has(l.id)).length;
          const b = profile.unit_best?.[`u${u.n}`];
          const mastered = (b ?? 0) >= MASTERY_PCT;
          return <UnitCard key={u.n} unit={u} read={read} total={u.lessons.length} best={b} mastered={mastered} isFocus={u.n === focusUnit && !teacher} />;
        })}
      </div>
    </Page>
  );
}
