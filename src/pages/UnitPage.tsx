import { ArrowLeft, ArrowRight, BookOpen, Check, CheckCircle2, Compass, Layers, Lock, PenLine, Target } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, Navigate, useParams, useSearchParams } from "react-router-dom";
import { Page } from "@/components/app/Guards";
import { Treecoin } from "@/components/app/Logo";
import { LANDMARK_INFO } from "@/shared/landmarks";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/field";
import { track } from "@/lib/analytics";
import { api, errorMessage, type QuestResult } from "@/lib/api";
import { frqs as loadFrqs, type Frq } from "@/lib/content";
import { useDocumentTitle } from "@/lib/hooks";
import { useProfile } from "@/lib/session";
import { useToast } from "@/lib/toast";
import { cn, storageGet, storageSet } from "@/lib/utils";
import { getUnit, lessonKey, safeKey } from "@/shared/curriculum";
import { MASTERY_PCT, REWARD } from "@/shared/economy";
import { QUEST_MAX_CHARS, QUEST_MIN_CHARS, questForUnit } from "@/shared/quests";

export default function UnitPage() {
  const { unit: unitParam } = useParams();
  const n = Number(unitParam);
  const unit = getUnit(n);
  const profile = useProfile();
  const [params, setParams] = useSearchParams();
  const [frqs, setFrqs] = useState<Frq[]>([]);
  const questOpen = params.get("quest") === "1";
  useDocumentTitle(unit ? `Unit ${unit.n}` : "Unit");

  useEffect(() => {
    void loadFrqs()
      .then((all) => setFrqs(all.filter((f) => f.unit === n)))
      .catch(() => setFrqs([]));
  }, [n]);

  if (!unit) return <Navigate to="/study" replace />;
  const done = new Set(profile.lessons_done ?? []);
  const best = profile.unit_best?.[`u${n}`];
  const mastered = (best ?? 0) >= MASTERY_PCT;
  const quest = questForUnit(n);
  const questDone = (profile.quests_done ?? []).includes(n);
  const read = unit.lessons.filter((l) => done.has(l.id)).length;

  const setQuest = (open: boolean) => {
    const next = new URLSearchParams(params);
    if (open) next.set("quest", "1");
    else next.delete("quest");
    setParams(next, { replace: true });
  };

  return (
    <Page>
      <Link to="/study" className="mb-5 inline-flex items-center gap-1.5 text-base font-medium text-fg-3 hover:text-fg">
        <ArrowLeft className="size-4" /> Study
      </Link>
      <header className="mb-8 flex items-end justify-between gap-6">
        <div>
          <p className="t-eyebrow">
            Unit {unit.n} · {unit.examWeight} of the exam
          </p>
          <h1 className="t-h1 mt-2.5">{unit.title}</h1>
          <p className="mt-2 text-md text-fg-3">
            {read} of {unit.lessons.length} lessons read{best !== undefined ? ` · best unit quiz ${best}%` : ""}
          </p>
        </div>
        <div className="flex gap-2.5">
          <Button variant="secondary" asChild>
            <Link to={`/study/flashcards?unit=${n}`}>
              <Layers /> Flashcards
            </Link>
          </Button>
          <Button asChild>
            <Link to={`/practice?mode=unit&unit=${n}`}>
              <Target /> Unit quiz · 20 questions
            </Link>
          </Button>
        </div>
      </header>

      <div className="grid grid-cols-[minmax(0,1fr)_340px] gap-6">
        <Card className="p-2">
          <ul className="divide-y divide-line">
            {unit.lessons.map((l) => {
              const isRead = done.has(l.id);
              const quiz = profile.quiz_best?.[lessonKey(l.id)];
              return (
                <li key={l.id} className="flex items-center gap-4 px-4 py-3.5">
                  <span className={cn("grid size-8 shrink-0 place-items-center rounded-full text-xs font-bold", isRead ? "bg-brand text-brand-fg" : "bg-surface-2 text-fg-3")}>
                    {isRead ? <Check className="size-4" strokeWidth={3} /> : l.code.split(".")[1]}
                  </span>
                  <Link to={`/study/unit/${n}/${encodeURIComponent(l.id)}`} className="min-w-0 flex-1 hover:underline hover:decoration-line-strong hover:underline-offset-4">
                    <span className="t-num mr-2 text-sm text-fg-4">{l.code}</span>
                    <span className="text-md font-medium text-fg">{l.title}</span>
                  </Link>
                  {quiz !== undefined && <Badge tone={quiz >= 70 ? "brand" : "neutral"}>Quiz {quiz}%</Badge>}
                  <Button variant="ghost" size="sm" asChild>
                    <Link to={`/study/unit/${n}/${encodeURIComponent(l.id)}`}>
                      <BookOpen /> Read
                    </Link>
                  </Button>
                  {l.hasQuiz ? (
                    <Button variant="ghost" size="sm" asChild>
                      <Link to={`/practice?mode=lesson&lesson=${encodeURIComponent(l.id)}`}>
                        <Target /> Quiz
                      </Link>
                    </Button>
                  ) : (
                    <span className="w-[68px] text-center text-xs text-fg-4">Overview</span>
                  )}
                </li>
              );
            })}
          </ul>
        </Card>

        <div className="space-y-6">
          <Card className="p-6">
            <p className="t-eyebrow">Landmark</p>
            <p className="mt-3 flex items-center gap-2 text-lg font-semibold text-fg">
              {mastered ? <CheckCircle2 className="size-[18px] text-brand" /> : <Lock className="size-4 text-fg-3" />} {LANDMARK_INFO[n].name}
            </p>
            <p className="mt-1.5 text-base text-fg-3">{LANDMARK_INFO[n].detail}</p>
            <p className="mt-3 text-sm text-fg-2">
              {mastered ? "Unlocked and growing on your island." : `Score ${MASTERY_PCT}%+ on the Unit ${n} quiz to add it to your island.`}
            </p>
          </Card>

          {quest && (
            <Card className="p-6">
              <p className="t-eyebrow flex items-center gap-1.5">
                <Compass className="size-3.5" /> Field quest
              </p>
              <p className="mt-3 text-lg font-semibold text-fg">{quest.title}</p>
              <p className="mt-1.5 text-base text-fg-3">{quest.prompt}</p>
              {questDone ? (
                <p className="mt-4 flex items-center gap-2 text-base font-semibold text-brand-ink">
                  <CheckCircle2 className="size-4" /> Field note submitted
                </p>
              ) : (
                <Button variant="soft" className="mt-4 w-full" onClick={() => setQuest(true)}>
                  Start quest · +{REWARD.QUEST_TC} TC
                </Button>
              )}
            </Card>
          )}

          {frqs.length > 0 && (
            <Card className="p-6">
              <p className="t-eyebrow flex items-center gap-1.5">
                <PenLine className="size-3.5" /> Free response
              </p>
              <ul className="mt-3 space-y-1">
                {frqs.map((f) => {
                  const b = profile.frq_best?.[safeKey(f.id)];
                  return (
                    <li key={f.id}>
                      <Link to={`/study/frq/${encodeURIComponent(f.id)}`} className="-mx-2 flex items-center gap-3 rounded-md px-2 py-2 hover:bg-surface-2">
                        <span className="min-w-0 flex-1 text-base leading-snug text-fg-2">{f.title}</span>
                        {b !== undefined ? <Badge tone="brand">{b}%</Badge> : <ArrowRight className="size-4 text-fg-4" />}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </Card>
          )}
        </div>
      </div>

      {quest && !questDone && <QuestDialog unit={n} open={questOpen} onOpenChange={setQuest} />}
    </Page>
  );
}

function QuestDialog({ unit, open, onOpenChange }: { unit: number; open: boolean; onOpenChange: (o: boolean) => void }) {
  const quest = questForUnit(unit)!;
  const draftKey = `eco-quest-draft-${unit}`;
  const [text, setText] = useState(() => storageGet(draftKey) ?? "");
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  const length = text.trim().length;
  const ok = length >= QUEST_MIN_CHARS && length <= QUEST_MAX_CHARS;

  useEffect(() => {
    storageSet(draftKey, text);
  }, [draftKey, text]);

  const remaining = useMemo(() => Math.max(0, QUEST_MIN_CHARS - length), [length]);

  const submit = async () => {
    setBusy(true);
    try {
      const res = await api<QuestResult>("quest/submit", { unit, text: text.trim() });
      storageSet(draftKey, "");
      track("quest_submitted", { unit });
      toast.show({ tone: "success", title: `Field note saved · +${res.reward.tc} TC`, body: res.completed.length ? `Completed: ${res.completed.map((c) => c.title).join(", ")}` : "Your class can read it in Field notes." });
      onOpenChange(false);
    } catch (err) {
      toast.show({ tone: "error", title: "Couldn't save your field note", body: errorMessage(err) });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title={quest.title} description={`Unit ${unit} field quest. Go outside, look closely, then write what you found.`} wide>
        <p className="text-md text-fg-2">{quest.prompt}</p>
        <ol className="mt-4 space-y-2">
          {quest.steps.map((s, i) => (
            <li key={i} className="flex gap-3 text-base text-fg-2">
              <span className="grid size-6 shrink-0 place-items-center rounded-full bg-surface-2 text-xs font-bold text-fg-3">{i + 1}</span>
              {s}
            </li>
          ))}
        </ol>
        <Textarea
          className="mt-5 min-h-[180px]"
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={QUEST_MAX_CHARS}
          placeholder="What did you see, measure or find out?"
          aria-label="Your field note"
        />
        <div className="mt-3 flex items-center justify-between gap-4">
          <p className="text-sm text-fg-3">
            {remaining > 0 ? `${remaining} more characters to go.` : "Your teacher and classmates will be able to read this."} Drafts save automatically.
          </p>
          <Button onClick={submit} loading={busy} disabled={!ok}>
            Submit · <Treecoin size={15} /> +{REWARD.QUEST_TC}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
