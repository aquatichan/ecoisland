// Practice sessions: the daily set (spaced repetition), unit quizzes, lesson
// quizzes and mixed review. The server checks every answer and computes the
// score and rewards (worker/attempts.ts).
import { ArrowRight, BookOpenCheck, CheckCircle2, Flame, RotateCcw, Sparkles, TriangleAlert } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import CountUp from "@/components/bits/CountUp";
import { Page } from "@/components/app/Guards";
import { Treecoin } from "@/components/app/Logo";
import { IslandScene } from "@/components/island/IslandScene";
import { QuizRunner, type Answer, type Checked } from "@/components/quiz/QuizRunner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState, Spinner } from "@/components/ui/empty";
import { ProgressRing } from "@/components/ui/progress";
import { track } from "@/lib/analytics";
import { api, errorMessage, type AttemptResult } from "@/lib/api";
import { lessonQuestions, unitBank, unitOfQuestion, unitPool, type Question } from "@/lib/content";
import { useDocumentTitle, useToday } from "@/lib/hooks";
import { useProfile } from "@/lib/session";
import { buildDailySet, loadSrs, nextCard, saveSrs, type SrsState } from "@/lib/srs";
import { useStudentContext } from "@/lib/student";
import { shuffle } from "@/lib/utils";
import type { CompletedAssignment } from "@/lib/types";
import { findLesson, getUnit } from "@/shared/curriculum";
import { DAILY_SET_SIZE, REWARD, masteredUnits, stageForXp, unlockedBetween } from "@/shared/economy";
import { useIslandHealth } from "@/lib/island";
import { visibleDecor, visibleGrowth } from "@/shared/island";
import { findSky } from "@/shared/catalog";
import { LANDMARK_INFO } from "@/shared/landmarks";

type Mode = "daily" | "unit" | "lesson" | "mixed";

type Setup = { questions: Question[]; eyebrow: string; title: string; unit: number | null; lessonId: string | null; attemptId: string };

type Outcome = {
  answers: Answer[];
  reward: { tc: number; xp: number } | null;
  already?: boolean;
  capped?: boolean;
  streak?: number;
  newLandmark?: number | null;
  completed: CompletedAssignment[];
  error?: string;
  xpBefore: number;
};

type SetupDraft = Omit<Setup, "attemptId">;

const UNIT_QUIZ_SIZE = 20;
const MIXED_SIZE = 25;

export default function Practice() {
  const profile = useProfile();
  const today = useToday();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const mode = (["daily", "unit", "lesson", "mixed"].includes(params.get("mode") ?? "") ? params.get("mode") : "daily") as Mode;
  const unitParam = Number(params.get("unit"));
  const lessonParam = params.get("lesson") ?? "";
  const { focusUnit, loading: ctxLoading } = useStudentContext(profile, today);

  const [setup, setSetup] = useState<Setup | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [phase, setPhase] = useState<"loading" | "intro" | "running" | "saving" | "done">("loading");
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const srs = useRef<SrsState>({});
  const srsUpdates = useRef<SrsState>({});
  const [attempt, setAttempt] = useState(0);

  const doneToday = profile.last_set_day === today;
  useDocumentTitle(mode === "daily" ? "Daily set" : "Practice");

  useEffect(() => {
    if (mode === "daily" && ctxLoading) return;
    let cancelled = false;
    setPhase("loading");
    setLoadError(null);
    setOutcome(null);
    srsUpdates.current = {};
    (async () => {
      try {
        const state = await loadSrs(profile.id);
        srs.current = state;
        let s: SetupDraft;
        if (mode === "daily") {
          const focusPool = await unitPool(focusUnit);
          // Reviews can come from any unit the student has seen before.
          const reviewUnits = new Set<number>([focusUnit]);
          for (const id of Object.keys(state)) {
            const u = unitOfQuestion(id);
            if (u && reviewUnits.size < 4) reviewUnits.add(u);
          }
          const reviewPool = (await Promise.all([...reviewUnits].map((u) => (u === focusUnit ? Promise.resolve(focusPool) : unitPool(u))))).flat();
          const questions = buildDailySet({ focusPool, reviewPool, state, today });
          s = { questions, eyebrow: `Daily set · Unit ${focusUnit}`, title: getUnit(focusUnit)?.title ?? "", unit: focusUnit, lessonId: null };
        } else if (mode === "unit") {
          const unit = unitParam >= 1 && unitParam <= 9 ? unitParam : focusUnit;
          const pool = await unitPool(unit);
          s = { questions: shuffle(pool).slice(0, UNIT_QUIZ_SIZE), eyebrow: `Unit ${unit} quiz`, title: getUnit(unit)?.title ?? "", unit, lessonId: null };
        } else if (mode === "lesson") {
          const found = findLesson(lessonParam);
          if (!found) throw new Error("That lesson doesn't exist.");
          const questions = shuffle(await lessonQuestions(lessonParam));
          s = { questions, eyebrow: `Lesson ${found.lesson.code} quiz`, title: found.lesson.title, unit: found.unit.n, lessonId: lessonParam };
        } else {
          const banks = await Promise.all([1, 2, 3, 4, 5, 6, 7, 8, 9].map((u) => unitBank(u).catch(() => [] as Question[])));
          const perUnit = Math.ceil(MIXED_SIZE / 9);
          const picked = shuffle(banks.flatMap((b) => shuffle(b).slice(0, perUnit))).slice(0, MIXED_SIZE);
          s = { questions: picked, eyebrow: "Mixed review", title: "Questions from all nine units", unit: null, lessonId: null };
        }
        if (cancelled) return;
        if (s.questions.length < REWARD.QUIZ_MIN_QUESTIONS) throw new Error("There aren't enough questions here yet.");
        const { attemptId } = await api<{ attemptId: string }>("attempt/start", {
          mode,
          unit: s.unit ?? undefined,
          lesson: s.lessonId ?? undefined,
          qids: s.questions.map((q) => q.id),
        });
        if (cancelled) return;
        setSetup({ ...s, attemptId });
        setPhase(mode === "daily" ? "intro" : "running");
        if (mode !== "daily") track("quiz_start", { mode, unit: s.unit ?? 0 });
      } catch (err) {
        if (!cancelled) setLoadError(errorMessage(err));
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, unitParam, lessonParam, ctxLoading, attempt]);

  const onAnswer = (a: Answer) => {
    const card = nextCard(srs.current[a.question.id], a.correct, today);
    srs.current[a.question.id] = card;
    srsUpdates.current[a.question.id] = card;
  };

  const check = useCallback(
    (q: Question, choice: number) => api<Checked>("attempt/answer", { attemptId: setup?.attemptId, qid: q.id, choice }),
    [setup?.attemptId],
  );

  const onFinish = async (answers: Answer[]) => {
    if (!setup) return;
    setPhase("saving");
    void saveSrs(profile.id, srsUpdates.current).catch(() => undefined);
    await save(answers, profile.xp_total ?? 0);
    setPhase("done");
  };

  /** Asks the server to score the attempt. Safe to repeat: it is saved once. */
  const save = async (answers: Answer[], xpBefore: number) => {
    if (!setup) return;
    try {
      const res = await api<AttemptResult>("attempt/finish", { attemptId: setup.attemptId });
      setOutcome({
        answers,
        reward: res.reward ?? null,
        already: res.already,
        streak: res.streak,
        capped: res.capped,
        newLandmark: res.newLandmark,
        completed: res.completed ?? [],
        xpBefore,
      });
      if (mode === "daily") {
        if (!res.already && !res.replay) track("daily_set_complete", { correct: res.correct ?? 0, streak: res.streak ?? 0 });
      } else if (!res.replay) {
        track("quiz_complete", { mode, correct: res.correct ?? 0, total: res.total ?? answers.length });
      }
    } catch (err) {
      setOutcome({ answers, reward: null, completed: [], error: errorMessage(err), xpBefore });
    }
  };

  if (loadError) {
    return (
      <Page>
        <div className="card mx-auto max-w-[560px]">
          <EmptyState
            icon={TriangleAlert}
            title="Couldn't load these questions"
            body={loadError}
            action={
              <Button onClick={() => setAttempt((a) => a + 1)}>
                <RotateCcw /> Try again
              </Button>
            }
          />
        </div>
      </Page>
    );
  }

  if (phase === "loading" || !setup) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Spinner />
      </div>
    );
  }

  if (phase === "intro") {
    return (
      <DailyIntro
        setup={setup}
        doneToday={doneToday}
        onStart={() => {
          track("daily_set_start", { unit: setup.unit ?? 0 });
          setPhase("running");
        }}
      />
    );
  }

  if (phase === "running") {
    return (
      <Page>
        <QuizRunner
          questions={setup.questions}
          eyebrow={setup.eyebrow}
          title={setup.title}
          check={check}
          onAnswer={onAnswer}
          onFinish={onFinish}
          onExit={() => navigate(-1)}
        />
      </Page>
    );
  }

  if (phase === "saving" || !outcome) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 text-base text-fg-3">
        <Spinner /> Saving your results…
      </div>
    );
  }

  return (
    <Results
      mode={mode}
      setup={setup}
      outcome={outcome}
      onAgain={() => setAttempt((a) => a + 1)}
      onRetrySave={() => save(outcome.answers, outcome.xpBefore)}
    />
  );
}

function DailyIntro({ setup, doneToday, onStart }: { setup: Setup; doneToday: boolean; onStart: () => void }) {
  const profile = useProfile();
  const health = useIslandHealth();
  const count = setup.questions.length;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // A focused button handles Enter itself.
      if (e.key === "Enter" && !(document.activeElement instanceof HTMLButtonElement)) onStart();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onStart]);
  return (
    <Page className="mx-auto grid min-h-[calc(100dvh-220px)] max-w-[980px] grid-cols-[1fr_400px] items-center gap-10">
      <div>
        <p className="t-eyebrow">{setup.eyebrow}</p>
        <h1 className="t-h1 mt-3">{doneToday ? "Extra practice" : "Today's daily set"}</h1>
        <p className="mt-3 max-w-[46ch] text-lg text-fg-3">
          {doneToday
            ? "You've already finished today's set, so this round is practice only. Your answers still sharpen tomorrow's reviews."
            : `${count} questions from ${setup.title}, mixed with reviews of ones you've missed before. About five minutes.`}
        </p>
        <ul className="mt-6 space-y-2.5 text-md text-fg-2">
          <li className="flex items-center gap-2.5">
            <Sparkles className="size-4 text-brand" aria-hidden /> Spaced repetition: questions you miss come back sooner
          </li>
          <li className="flex items-center gap-2.5">
            <Treecoin size={16} /> Up to {REWARD.DAILY_SET_BASE_TC + DAILY_SET_SIZE + REWARD.DAILY_SET_STREAK_BONUS_TC} Treecoins and {REWARD.DAILY_SET_BASE_XP + DAILY_SET_SIZE * REWARD.DAILY_SET_XP_PER_CORRECT} XP
          </li>
          <li className="flex items-center gap-2.5">
            <Flame className="size-4 text-sun" aria-hidden /> Keeps your streak and your island alive
          </li>
        </ul>
        <div className="mt-8 flex items-center gap-3">
          <Button size="lg" onClick={onStart} autoFocus>
            Start <ArrowRight />
          </Button>
          <span className="text-sm text-fg-3">
            or press <span className="kbd">Enter</span>
          </span>
        </div>
      </div>
      <div className="overflow-hidden rounded-2xl border border-line shadow-md">
        <IslandScene
          health={health.value}
          sky={findSky(profile.island_skybox)?.id ?? "day"}
          growth={visibleGrowth(profile.owned_items)}
          decor={visibleDecor(profile.owned_items, profile.island_decor)}
          landmarks={masteredUnits(profile.unit_best)}
          className="aspect-[5/3]"
        />
      </div>
    </Page>
  );
}

function Results({
  mode,
  setup,
  outcome,
  onAgain,
  onRetrySave,
}: {
  mode: Mode;
  setup: Setup;
  outcome: Outcome;
  onAgain: () => void;
  onRetrySave: () => Promise<void>;
}) {
  const profile = useProfile();
  const today = useToday();
  const [showReview, setShowReview] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const total = outcome.answers.length;
  const correct = outcome.answers.filter((a) => a.correct).length;
  const pct = total ? Math.round((correct / total) * 100) : 0;
  const xpAfter = outcome.xpBefore + (outcome.reward?.xp ?? 0);
  const opened = unlockedBetween(outcome.xpBefore, xpAfter);
  // Right after a daily set the profile may not have caught up, so count today as watered.
  const health = useIslandHealth(mode === "daily" && !outcome.error ? today : undefined);
  const stageUp = stageForXp(xpAfter).n > stageForXp(outcome.xpBefore).n;
  const mistakes = outcome.answers.filter((a) => !a.correct);
  useDocumentTitle(`${pct}% · Results`);

  const headline = useMemo(() => {
    if (pct >= 90) return "Outstanding.";
    if (pct >= 70) return "Nicely done.";
    if (pct >= 50) return "Good practice.";
    return "Every miss is a lesson.";
  }, [pct]);

  useEffect(() => {
    if (stageUp) track("island_stage_up", { stage: stageForXp(xpAfter).n });
  }, [stageUp, xpAfter]);

  return (
    <Page className="mx-auto max-w-[980px]">
      <div className="grid grid-cols-[1fr_420px] gap-6">
        <div className="card p-8">
          <p className="t-eyebrow">{setup.eyebrow}</p>
          <div className="mt-5 flex items-center gap-6">
            <ProgressRing value={pct} size={112} stroke={9}>
              <span className="font-display t-num text-3xl font-[600] text-fg">
                <CountUp to={pct} duration={0.9} />%
              </span>
            </ProgressRing>
            <div>
              <h1 className="t-h1">{headline}</h1>
              <p className="mt-1.5 text-md text-fg-3">
                {correct} of {total} correct
              </p>
            </div>
          </div>

          {outcome.error ? (
            <div className="mt-7 flex items-start gap-3 rounded-lg bg-coral-soft p-4 text-base text-coral">
              <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
              <div className="min-w-0 flex-1">
                <p>Your answers were checked, but the results couldn't be saved: {outcome.error}</p>
                <Button
                  size="sm"
                  variant="secondary"
                  className="mt-3"
                  disabled={retrying}
                  onClick={async () => {
                    setRetrying(true);
                    await onRetrySave();
                    setRetrying(false);
                  }}
                >
                  {retrying ? <Spinner className="size-4" /> : <RotateCcw />} Try saving again
                </Button>
              </div>
            </div>
          ) : (
            <div className="mt-7 flex flex-wrap gap-3">
              <RewardChip label="Treecoins" value={outcome.reward?.tc ?? 0} icon={<Treecoin size={18} />} />
              <RewardChip label="XP" value={outcome.reward?.xp ?? 0} icon={<Sparkles className="size-[18px] text-brand" />} />
              {mode === "daily" && !outcome.already && outcome.streak ? (
                <RewardChip label="day streak" value={outcome.streak} icon={<Flame className="size-[18px] fill-sun/30 text-sun" />} plain />
              ) : null}
            </div>
          )}
          {outcome.already && <p className="mt-3 text-base text-fg-3">Today's set was already done, so this round was practice only.</p>}
          {outcome.capped && <p className="mt-3 text-base text-fg-3">You've reached today's {REWARD.QUIZ_DAILY_CAP} rewarded quizzes. Scores still count for assignments and mastery.</p>}

          {outcome.completed.length > 0 && (
            <div className="mt-6 rounded-lg border border-line bg-surface-2/60 p-4">
              <p className="text-sm font-semibold text-fg-2">Assignment complete</p>
              <ul className="mt-2 space-y-1.5">
                {outcome.completed.map((c) => (
                  <li key={c.assignmentId} className="flex items-center gap-2 text-base text-fg">
                    <CheckCircle2 className="size-4 text-brand" aria-hidden /> {c.title}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="mt-8 flex flex-wrap gap-2.5">
            <Button asChild>
              <Link to="/today">
                Back to Today <ArrowRight />
              </Link>
            </Button>
            {mistakes.length > 0 && (
              <Button variant="secondary" onClick={() => setShowReview((s) => !s)}>
                <BookOpenCheck /> {showReview ? "Hide" : "Review"} {mistakes.length} {mistakes.length === 1 ? "mistake" : "mistakes"}
              </Button>
            )}
            {mode !== "daily" && (
              <Button variant="ghost" onClick={onAgain}>
                <RotateCcw /> New set
              </Button>
            )}
          </div>
        </div>

        <div className="card overflow-hidden">
          <IslandScene
            health={health.value}
            sky={findSky(profile.island_skybox)?.id ?? "day"}
            growth={visibleGrowth(profile.owned_items)}
            decor={visibleDecor(profile.owned_items, profile.island_decor)}
            landmarks={masteredUnits(profile.unit_best)}
            className="aspect-[5/3]"
          />
          <div className="p-5">
            {outcome.newLandmark ? (
              <>
                <Badge tone="brand">New landmark</Badge>
                <p className="mt-2 text-md font-semibold text-fg">{LANDMARK_INFO[outcome.newLandmark]?.name}</p>
                <p className="mt-1 text-base text-fg-3">You mastered Unit {outcome.newLandmark}. {LANDMARK_INFO[outcome.newLandmark]?.detail}</p>
              </>
            ) : stageUp ? (
              <>
                <Badge tone="brand">New stage</Badge>
                <p className="mt-2 text-md font-semibold text-fg">{stageForXp(xpAfter).name}</p>
                <p className="mt-1 text-base text-fg-3">{stageForXp(xpAfter).blurb}</p>
              </>
            ) : opened.length > 0 ? (
              <>
                <p className="text-md font-semibold text-fg">{opened.length === 1 ? "New in the island market" : `${opened.length} new things in the island market`}</p>
                <p className="mt-1 text-base text-fg-3">
                  Your XP opened {opened.length === 1 ? "something" : "more"} to grow your island. <Link to="/island" className="font-semibold text-brand-ink underline-offset-2 hover:underline">Take a look</Link>. {mode === "daily" ? "See you tomorrow." : ""}
                </p>
              </>
            ) : (
              <>
                <p className="text-md font-semibold text-fg">{stageForXp(xpAfter).name}</p>
                <p className="mt-1 text-base text-fg-3">Keep going. More XP grows more of your island.</p>
              </>
            )}
          </div>
        </div>
      </div>

      {showReview && (
        <div className="mt-6 space-y-3">
          {mistakes.map(({ question: q, choice, answer }) => (
            <div key={q.id} className="card p-6">
              <p className="text-md leading-relaxed font-semibold text-fg">{q.prompt}</p>
              <p className="mt-3 flex gap-2 text-base text-coral">
                <span className="font-semibold">You:</span> {q.choices[choice]}
              </p>
              <p className="mt-1.5 flex gap-2 text-base text-brand-ink">
                <span className="font-semibold">Answer:</span> {q.choices[answer]}
              </p>
              {q.lessonId && (
                <Link to={`/study/unit/${q.unit}/${encodeURIComponent(q.lessonId)}`} className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-brand-ink hover:underline">
                  Reread {findLesson(q.lessonId)?.lesson.code} {findLesson(q.lessonId)?.lesson.title} <ArrowRight className="size-3.5" />
                </Link>
              )}
            </div>
          ))}
        </div>
      )}
    </Page>
  );
}

function RewardChip({ label, value, icon, plain }: { label: string; value: number; icon: ReactNode; plain?: boolean }) {
  return (
    <div className="flex items-center gap-2.5 rounded-md border border-line bg-surface-2/70 px-4 py-2.5">
      {icon}
      <span className="font-display t-num text-2xl font-[600] text-fg">
        {plain ? "" : "+"}
        <CountUp to={value} duration={0.8} />
      </span>
      <span className="text-sm text-fg-3">{label}</span>
    </div>
  );
}
