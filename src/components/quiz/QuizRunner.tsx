// One question at a time, built for a keyboard: A–D or 1–4 to answer,
// Enter to continue, Esc to leave. Feedback is instant and the correct answer
// is always shown, so every question teaches something.
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Check, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import ClickSpark, { type ClickSparkHandle } from "@/components/bits/ClickSpark";
import StimulusChart from "@/components/StimulusChart";
import { Button } from "@/components/ui/button";
import type { Question } from "@/lib/content";
import { cn } from "@/lib/utils";

export type Answer = { question: Question; choice: number; correct: boolean };

const LETTERS = ["A", "B", "C", "D"];

export function QuizRunner({
  questions,
  eyebrow,
  title,
  onAnswer,
  onFinish,
  onExit,
}: {
  questions: Question[];
  eyebrow: string;
  title: string;
  onAnswer?: (a: Answer) => void;
  onFinish: (answers: Answer[]) => void;
  onExit: () => void;
}) {
  const [index, setIndex] = useState(0);
  const [choice, setChoice] = useState<number | null>(null);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const sparks = useRef<Array<ClickSparkHandle | null>>([]);
  const buttons = useRef<Array<HTMLButtonElement | null>>([]);
  const continueRef = useRef<HTMLButtonElement>(null);
  const q = questions[index];
  const answered = choice !== null;
  const last = index === questions.length - 1;

  const pick = useCallback(
    (i: number, fromKeyboard = false) => {
      if (answered || !q || i < 0 || i >= q.choices.length) return;
      const correct = i === q.answer;
      setChoice(i);
      const a = { question: q, choice: i, correct };
      setAnswers((list) => [...list, a]);
      onAnswer?.(a);
      if (correct && fromKeyboard) {
        const el = buttons.current[i];
        if (el) sparks.current[i]?.spark(el.offsetWidth - 40, el.offsetHeight / 2);
      }
    },
    [answered, q, onAnswer],
  );

  const next = useCallback(() => {
    if (!answered) return;
    if (last) {
      onFinish(answers);
      return;
    }
    setIndex((n) => n + 1);
    setChoice(null);
  }, [answered, last, answers, onFinish]);

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
        pick(letter >= 0 ? letter : digit, true);
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
          <h1 className="mt-1.5 truncate text-[17px] font-semibold text-fg">{title}</h1>
        </div>
        <span className="t-num text-[13.5px] font-semibold text-fg-3">
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
          <h2 className="text-[18.5px] leading-[1.5] font-semibold text-fg">{q.prompt}</h2>

          <div className="mt-6 space-y-2.5" role="radiogroup" aria-label="Answer choices">
            {q.choices.map((text, i) => {
              const isPicked = choice === i;
              const isAnswer = q.answer === i;
              const state = !answered ? "idle" : isAnswer ? "right" : isPicked ? "wrong" : "dim";
              return (
                <ClickSpark
                  key={i}
                  ref={(h) => {
                    sparks.current[i] = h;
                  }}
                  disabled={answered || !isAnswer}
                  sparkColor={["#46c48a", "#f6c453", "#63ade6"]}
                  sparkCount={10}
                  sparkRadius={26}
                  sparkSize={9}
                  className="rounded-[13px]"
                >
                  <button
                    ref={(el) => {
                      buttons.current[i] = el;
                    }}
                    role="radio"
                    aria-checked={isPicked}
                    disabled={answered}
                    onClick={() => pick(i)}
                    className={cn(
                      "group flex w-full items-start gap-3.5 rounded-[13px] border px-4 py-3.5 text-left text-[15px] leading-[1.5] transition-[background-color,border-color,opacity] duration-200",
                      state === "idle" && "border-line-strong bg-surface hover:border-[color-mix(in_srgb,var(--brand)_55%,transparent)] hover:bg-brand-soft/40",
                      state === "right" && "border-brand bg-brand-soft text-fg",
                      state === "wrong" && "border-coral bg-coral-soft text-fg",
                      state === "dim" && "border-line bg-surface opacity-55",
                    )}
                  >
                    <span
                      className={cn(
                        "mt-px grid size-6 shrink-0 place-items-center rounded-[7px] border text-[12px] font-bold",
                        state === "right" ? "border-brand bg-brand text-brand-fg" : state === "wrong" ? "border-coral bg-coral text-white" : "border-line-strong text-fg-3 group-hover:border-brand group-hover:text-brand-ink",
                      )}
                    >
                      {state === "right" ? <Check className="size-3.5" strokeWidth={3} /> : state === "wrong" ? <X className="size-3.5" strokeWidth={3} /> : LETTERS[i]}
                    </span>
                    <span className="flex-1 text-fg-2 group-disabled:text-inherit">{text}</span>
                  </button>
                </ClickSpark>
              );
            })}
          </div>

          <div className="mt-6 flex min-h-11 items-center justify-between gap-4">
            <AnimatePresence>
              {answered && (
                <motion.p
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  className={cn("text-[14.5px] font-semibold", choice === q.answer ? "text-brand-ink" : "text-coral")}
                  role="status"
                >
                  {choice === q.answer ? "Correct." : `Not quite. The answer is ${LETTERS[q.answer]}.`}
                </motion.p>
              )}
            </AnimatePresence>
            {!answered && <p className="text-[13px] text-fg-4">Press A–D or 1–4 to answer</p>}
            <Button ref={continueRef} onClick={next} disabled={!answered} className="ml-auto">
              {last ? "See results" : "Continue"} <ArrowRight />
            </Button>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
