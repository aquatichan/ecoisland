// One question at a time, built for a keyboard: A–D or 1–4 to answer,
// Enter to continue, Esc to leave. Each answer is checked by the server (the
// browser has no answer key), and the correct answer is always shown, so
// every question teaches something. The first answer is final.
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Check, Loader2, RotateCcw, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { SparkLayer, type ClickSparkHandle } from "@/components/fx/SparkLayer";
import StimulusChart from "@/components/StimulusChart";
import { Button } from "@/components/ui/button";
import { errorMessage } from "@/lib/api";
import type { Question } from "@/lib/content";
import { cn } from "@/lib/utils";

export type Checked = { correct: boolean; answer: number; choice: number };
export type Answer = { question: Question; choice: number; correct: boolean; answer: number };

const LETTERS = ["A", "B", "C", "D"];

export function QuizRunner({
  questions,
  eyebrow,
  title,
  check,
  onAnswer,
  onFinish,
  onExit,
}: {
  questions: Question[];
  eyebrow: string;
  title: string;
  /** Asks the server whether `choice` is right. */
  check: (q: Question, choice: number) => Promise<Checked>;
  onAnswer?: (a: Answer) => void;
  onFinish: (answers: Answer[]) => void;
  onExit: () => void;
}) {
  const [index, setIndex] = useState(0);
  const [choice, setChoice] = useState<number | null>(null);
  const [result, setResult] = useState<Checked | null>(null);
  const [checkError, setCheckError] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const sparks = useRef<Array<ClickSparkHandle | null>>([]);
  const buttons = useRef<Array<HTMLButtonElement | null>>([]);
  const continueRef = useRef<HTMLButtonElement>(null);
  // The source of truth for moving on. A card that is animating out still
  // has its old click handlers, so a quick second Enter or click must not
  // advance twice or let a late reply land on the wrong question.
  const live = useRef({ index: 0, pending: false, result: null as Checked | null, answers: [] as Answer[] });
  const q = questions[index];
  const answered = result !== null;
  const checking = choice !== null && !answered;
  const last = index === questions.length - 1;

  const pick = useCallback(
    (i: number) => {
      const state = live.current;
      if (state.pending || state.result || state.index !== index || !q || i < 0 || i >= q.choices.length) return;
      state.pending = true;
      const at = index;
      setChoice(i);
      setCheckError(null);
      check(q, i).then(
        (r) => {
          if (live.current.index !== at) return;
          live.current.pending = false;
          live.current.result = r;
          const a: Answer = { question: q, choice: r.choice, correct: r.correct, answer: r.answer };
          live.current.answers = [...live.current.answers, a];
          setChoice(r.choice);
          setResult(r);
          setAnswers(live.current.answers);
          onAnswer?.(a);
        },
        (err) => {
          if (live.current.index !== at) return;
          live.current.pending = false;
          setChoice(null);
          setCheckError(errorMessage(err));
        },
      );
    },
    [q, index, check, onAnswer],
  );

  // Celebrate a correct answer once the server confirms it.
  const sparkAt = result?.correct ? result.answer : null;
  useEffect(() => {
    if (sparkAt === null) return;
    const el = buttons.current[sparkAt];
    if (el) sparks.current[sparkAt]?.spark(el.offsetWidth - 40, el.offsetHeight / 2);
  }, [sparkAt]);

  const next = useCallback(() => {
    const state = live.current;
    if (!state.result) return;
    state.result = null;
    if (state.index >= questions.length - 1) {
      onFinish(state.answers);
      return;
    }
    state.index += 1;
    setIndex(state.index);
    setChoice(null);
    setResult(null);
    setCheckError(null);
  }, [questions.length, onFinish]);

  useEffect(() => {
    if (answered) continueRef.current?.focus({ preventScroll: true });
  }, [answered]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const k = e.key.toLowerCase();
      const letter = ["a", "b", "c", "d"].indexOf(k);
      const digit = ["1", "2", "3", "4"].indexOf(k);
      if (!answered && (letter >= 0 || digit >= 0)) {
        e.preventDefault();
        pick(letter >= 0 ? letter : digit);
      } else if (answered && (e.key === "Enter" || e.key === " ")) {
        if (document.activeElement !== continueRef.current) {
          e.preventDefault();
          next();
        }
      } else if (e.key === "Escape") {
        onExit();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [answered, pick, next, onExit]);

  if (!q) return null;

  return (
    <div className="mx-auto max-w-[780px]">
      <div className="mb-6 flex items-center gap-4">
        <div className="min-w-0 flex-1">
          <p className="t-eyebrow">{eyebrow}</p>
          <h1 className="mt-1.5 truncate text-xl font-semibold text-fg">{title}</h1>
        </div>
        <span className="t-num text-base font-semibold text-fg-3">
          {index + 1} / {questions.length}
        </span>
        <Button variant="ghost" size="sm" onClick={onExit} aria-label="Leave practice">
          <X /> <span className="kbd ml-0.5">esc</span>
        </Button>
      </div>

      <div className="mb-7 flex gap-1.5" aria-hidden>
        {questions.map((_, i) => {
          const a = answers[i];
          return (
            <span
              key={i}
              className={cn(
                "h-1.5 flex-1 rounded-full transition-colors duration-300",
                a ? (a.correct ? "bg-brand" : "bg-coral") : i === index ? "bg-fg-3/45" : "bg-surface-3",
              )}
            />
          );
        })}
      </div>

      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={q.id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
          className="card p-8"
        >
          {q.stimulus && <StimulusChart stimulus={q.stimulus} />}
          <h2 className="text-xl leading-[1.5] font-semibold text-fg">{q.prompt}</h2>

          <div className="mt-6 space-y-2.5" role="radiogroup" aria-label="Answer choices">
            {q.choices.map((text, i) => {
              const isPicked = choice === i;
              const isAnswer = result?.answer === i;
              const state = checking ? (isPicked ? "pending" : "dim") : !answered ? "idle" : isAnswer ? "right" : isPicked ? "wrong" : "dim";
              return (
                <SparkLayer
                  key={i}
                  ref={(h) => {
                    sparks.current[i] = h;
                  }}
                  disabled={sparkAt !== i}
                  sparkCount={10}
                  sparkRadius={26}
                  sparkSize={9}
                  className="rounded-md"
                >
                  <button
                    ref={(el) => {
                      buttons.current[i] = el;
                    }}
                    role="radio"
                    aria-checked={isPicked}
                    disabled={choice !== null}
                    onClick={() => pick(i)}
                    className={cn(
                      "group flex w-full items-start gap-3.5 rounded-md border px-4 py-3.5 text-left text-md leading-[1.5] transition-[background-color,border-color,opacity] duration-200",
                      state === "idle" && "border-line-strong bg-surface hover:border-[color-mix(in_srgb,var(--brand)_55%,transparent)] hover:bg-brand-soft/40",
                      state === "pending" && "border-brand bg-brand-soft/50 text-fg",
                      state === "right" && "border-brand bg-brand-soft text-fg",
                      state === "wrong" && "border-coral bg-coral-soft text-fg",
                      state === "dim" && "border-line bg-surface opacity-55",
                    )}
                  >
                    <span
                      className={cn(
                        "mt-px grid size-6 shrink-0 place-items-center rounded-sm border text-xs font-bold",
                        state === "right" ? "border-brand bg-brand text-brand-fg" : state === "wrong" ? "border-coral bg-coral text-white" : "border-line-strong text-fg-3 group-hover:border-brand group-hover:text-brand-ink",
                      )}
                    >
                      {state === "pending" ? (
                        <Loader2 className="size-3.5 animate-spin text-brand-ink" aria-label="Checking" />
                      ) : state === "right" ? (
                        <Check className="size-3.5" strokeWidth={3} />
                      ) : state === "wrong" ? (
                        <X className="size-3.5" strokeWidth={3} />
                      ) : (
                        LETTERS[i]
                      )}
                    </span>
                    <span className="flex-1 text-fg-2 group-disabled:text-inherit">{text}</span>
                  </button>
                </SparkLayer>
              );
            })}
          </div>

          <div className="mt-6 flex min-h-11 items-center justify-between gap-4">
            <AnimatePresence>
              {result && (
                <motion.p
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  className={cn("text-md font-semibold", result.correct ? "text-brand-ink" : "text-coral")}
                  role="status"
                >
                  {result.correct ? "Correct." : `Not quite. The answer is ${LETTERS[result.answer]}.`}
                </motion.p>
              )}
            </AnimatePresence>
            {checkError && (
              <p className="flex items-center gap-2 text-base font-medium text-coral" role="alert">
                <RotateCcw className="size-3.5" aria-hidden /> {checkError} Pick your answer again.
              </p>
            )}
            {!answered && !checkError && <p className="text-sm text-fg-4">{checking ? "Checking…" : "Press A–D or 1–4 to answer"}</p>}
            <Button ref={continueRef} onClick={next} disabled={!answered} className="ml-auto">
              {last ? "See results" : "Continue"} <ArrowRight />
            </Button>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
