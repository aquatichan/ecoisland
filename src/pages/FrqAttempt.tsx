import { ArrowLeft, CheckCircle2, CircleDashed, RotateCcw, Sparkles, TriangleAlert } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import CountUp from "@/components/bits/CountUp";
import { Page } from "@/components/app/Guards";
import { Treecoin } from "@/components/app/Logo";
import StimulusChart from "@/components/StimulusChart";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Spinner } from "@/components/ui/empty";
import { Textarea } from "@/components/ui/field";
import { ProgressRing } from "@/components/ui/progress";
import { track } from "@/lib/analytics";
import { api, errorMessage, type FrqGradeResult } from "@/lib/api";
import { frqs as loadFrqs, type Frq } from "@/lib/content";
import { useDocumentTitle } from "@/lib/hooks";
import { useToast } from "@/lib/toast";
import { cn, storageGet, storageSet } from "@/lib/utils";

const MIN_PART = 8;

export default function FrqAttempt() {
  const { frqId = "" } = useParams();
  const [frq, setFrq] = useState<Frq | null | undefined>(undefined);
  const draftKey = `eco-frq-draft-${frqId}`;
  const [answers, setAnswers] = useState<Record<string, string>>(() => {
    try {
      return JSON.parse(storageGet(draftKey) ?? "{}");
    } catch {
      return {};
    }
  });
  const [result, setResult] = useState<FrqGradeResult | null>(null);
  const [grading, setGrading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const toast = useToast();
  useDocumentTitle(frq?.title ?? "FRQ");

  useEffect(() => {
    void loadFrqs()
      .then((all) => setFrq(all.find((f) => f.id === frqId) ?? null))
      .catch(() => setFrq(null));
  }, [frqId]);

  useEffect(() => {
    storageSet(draftKey, JSON.stringify(answers));
  }, [draftKey, answers]);

  const ready = useMemo(() => !!frq && frq.parts.every((p) => (answers[p.label] ?? "").trim().length >= MIN_PART), [frq, answers]);

  if (frq === null) return <Navigate to="/study/frq" replace />;
  if (frq === undefined) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Spinner />
      </div>
    );
  }

  const total = frq.parts.reduce((s, p) => s + p.points, 0);

  const submit = async () => {
    setGrading(true);
    setError(null);
    try {
      const res = await api<FrqGradeResult>("frq/grade", { frq: frq.id, responses: answers });
      setResult(res);
      track("frq_graded", { unit: frq.unit, pct: Math.round((res.grade.totalEarned / Math.max(1, res.grade.totalPossible)) * 100) });
      if (res.completed.length) toast.show({ tone: "success", title: "Assignment complete", body: res.completed.map((c) => c.title).join(", ") });
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setGrading(false);
    }
  };

  const restart = () => {
    setResult(null);
    setAnswers({});
    storageSet(draftKey, "{}");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const gradeFor = (label: string) => result?.grade.parts.find((p) => p.label === label);
  const pct = result ? Math.round((result.grade.totalEarned / Math.max(1, result.grade.totalPossible)) * 100) : 0;

  return (
    <Page className="mx-auto max-w-[860px]">
      <Link to="/study/frq" className="mb-5 inline-flex items-center gap-1.5 text-[13.5px] font-medium text-fg-3 hover:text-fg">
        <ArrowLeft className="size-4" /> FRQ practice
      </Link>
      <p className="t-eyebrow">
        Unit {frq.unit} · {total} points
      </p>
      <h1 className="t-h1 mt-2.5">{frq.title}</h1>

      {result && (
        <Card className="mt-7 p-7">
          <div className="flex items-center gap-6">
            <ProgressRing value={pct} size={96} stroke={8}>
              <span className="font-display t-num text-[22px] font-[600] text-fg">
                <CountUp to={result.grade.totalEarned} duration={0.8} />/{result.grade.totalPossible}
              </span>
            </ProgressRing>
            <div className="min-w-0 flex-1">
              <p className="text-[17px] font-semibold text-fg">{pct >= 80 ? "Strong answer." : pct >= 50 ? "Solid start." : "Good practice. Check the feedback below."}</p>
              {result.grade.overallFeedback && <p className="mt-1.5 text-[14.5px] text-fg-2">{result.grade.overallFeedback}</p>}
              <div className="mt-3 flex items-center gap-3 text-[13.5px]">
                {result.capped ? (
                  <span className="text-fg-3">Scored for practice. Today's FRQ rewards are used up, or you've already been rewarded for this one today.</span>
                ) : (
                  <>
                    <Badge tone="sun">
                      <Treecoin size={13} /> +{result.reward.tc} TC
                    </Badge>
                    <Badge tone="brand">
                      <Sparkles /> +{result.reward.xp} XP
                    </Badge>
                  </>
                )}
              </div>
            </div>
            <Button variant="secondary" onClick={restart}>
              <RotateCcw /> Try again
            </Button>
          </div>
        </Card>
      )}

      <Card className="mt-7 p-7">
        <p className="text-[15.5px] leading-relaxed text-fg-2">{frq.prompt}</p>
        {frq.stimulus && <StimulusChart stimulus={frq.stimulus} />}
      </Card>

      <div className="mt-6 space-y-5">
        {frq.parts.map((p) => {
          const g = gradeFor(p.label);
          const len = (answers[p.label] ?? "").trim().length;
          return (
            <Card key={p.label} className="p-7">
              <div className="flex items-start justify-between gap-4">
                <p className="text-[15.5px] leading-relaxed text-fg">
                  <span className="mr-2 font-semibold">{p.label}</span>
                  {p.prompt}
                </p>
                {g ? (
                  <Badge tone={g.pointsEarned === g.pointsPossible ? "brand" : g.pointsEarned > 0 ? "sun" : "coral"}>
                    {g.pointsEarned}/{g.pointsPossible}
                  </Badge>
                ) : (
                  <Badge tone="outline">
                    {p.points} {p.points === 1 ? "pt" : "pts"}
                  </Badge>
                )}
              </div>
              <Textarea
                className="mt-4 min-h-[120px]"
                value={answers[p.label] ?? ""}
                onChange={(e) => setAnswers((a) => ({ ...a, [p.label]: e.target.value }))}
                maxLength={2500}
                readOnly={!!result}
                placeholder="Write in full sentences. Name the cause, the effect, and why."
                aria-label={`Answer for part ${p.label}`}
              />
              {g ? (
                <p className={cn("mt-3 flex items-start gap-2 text-[14px]", g.pointsEarned === g.pointsPossible ? "text-brand-ink" : "text-fg-2")}>
                  {g.pointsEarned === g.pointsPossible ? <CheckCircle2 className="mt-0.5 size-4 shrink-0" /> : <CircleDashed className="mt-0.5 size-4 shrink-0 text-fg-3" />}
                  {g.feedback}
                </p>
              ) : (
                <p className="mt-2 text-right text-[12px] text-fg-4">{len < MIN_PART ? "Write a little more to submit" : `${len} characters`}</p>
              )}
            </Card>
          );
        })}
      </div>

      {!result && (
        <div className="sticky bottom-6 mt-8">
          <div className="glass flex items-center justify-between gap-4 rounded-xl border px-5 py-4 shadow-lg">
            <p className="text-[13.5px] text-fg-3">
              {error ? (
                <span className="flex items-center gap-2 text-coral">
                  <TriangleAlert className="size-4" /> {error}
                </span>
              ) : ready ? (
                "Ready to grade. Drafts are saved on this device."
              ) : (
                "Answer every part to submit. Drafts are saved on this device."
              )}
            </p>
            <Button onClick={submit} loading={grading} disabled={!ready}>
              {grading ? "Grading…" : "Submit for grading"}
            </Button>
          </div>
        </div>
      )}
    </Page>
  );
}
