import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Layers, Shuffle } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Page } from "@/components/app/Guards";
import { Button } from "@/components/ui/button";
import { EmptyState, Spinner } from "@/components/ui/empty";
import { Select } from "@/components/ui/field";
import { courseVocab, lessonVocab, type Card as Flashcard } from "@/lib/content";
import { useDocumentTitle } from "@/lib/hooks";
import { shuffle } from "@/lib/utils";
import { UNITS, findLesson } from "@/shared/curriculum";

export default function Flashcards() {
  const [params, setParams] = useSearchParams();
  const lessonId = params.get("lesson");
  const unit = Number(params.get("unit")) || 0;
  const lesson = lessonId ? findLesson(lessonId) : undefined;
  const [cards, setCards] = useState<Flashcard[] | null>(null);
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  useDocumentTitle("Flashcards");

  useEffect(() => {
    setCards(null);
    setIndex(0);
    setFlipped(false);
    const load = lesson ? lessonVocab(lesson.lesson.id) : courseVocab().then((all) => (unit ? all.filter((c) => c.unit === unit) : all));
    void load.then((c) => setCards(c)).catch(() => setCards([]));
  }, [lesson, unit]);

  const deck = useMemo(() => cards ?? [], [cards]);
  const card = deck[index];
  const go = useCallback(
    (d: number) => {
      if (!deck.length) return;
      setFlipped(false);
      setIndex((i) => (i + d + deck.length) % deck.length);
    },
    [deck.length],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === "SELECT") return;
      if (e.key === "ArrowRight") go(1);
      else if (e.key === "ArrowLeft") go(-1);
      else if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        setFlipped((f) => !f);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go]);

  const title = lesson ? `${lesson.lesson.code} ${lesson.lesson.title}` : unit ? `Unit ${unit} vocabulary` : "All vocabulary";

  return (
    <Page className="mx-auto max-w-[820px]">
      <Link to={lesson ? `/study/unit/${lesson.unit.n}/${encodeURIComponent(lesson.lesson.id)}` : "/study"} className="mb-5 inline-flex items-center gap-1.5 text-base font-medium text-fg-3 hover:text-fg">
        <ArrowLeft className="size-4" /> {lesson ? "Back to lesson" : "Study"}
      </Link>
      <header className="mb-7 flex items-end justify-between gap-6">
        <div>
          <p className="t-eyebrow">Flashcards</p>
          <h1 className="t-h1 mt-2.5">{title}</h1>
        </div>
        {!lesson && (
          <Select
            value={unit}
            onChange={(e) => {
              const v = Number(e.target.value);
              setParams(v ? { unit: String(v) } : {});
            }}
            className="w-[190px]"
            aria-label="Choose a unit"
          >
            <option value={0}>All units</option>
            {UNITS.map((u) => (
              <option key={u.n} value={u.n}>
                Unit {u.n}
              </option>
            ))}
          </Select>
        )}
      </header>

      {!cards ? (
        <div className="flex min-h-[300px] items-center justify-center">
          <Spinner />
        </div>
      ) : deck.length === 0 ? (
        <div className="card">
          <EmptyState icon={Layers} title="No cards here yet" body="This lesson doesn't have a vocabulary list. Try the unit deck instead." />
        </div>
      ) : (
        <>
          <div className="[perspective:1600px]">
            <AnimatePresence mode="wait" initial={false}>
              <motion.button
                key={`${index}-${card.term}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.18 }}
                onClick={() => setFlipped((f) => !f)}
                className="relative block h-[340px] w-full text-left"
                aria-label={flipped ? "Show term" : "Show definition"}
              >
                <motion.div
                  className="absolute inset-0 [transform-style:preserve-3d]"
                  animate={{ rotateY: flipped ? 180 : 0 }}
                  transition={{ type: "spring", stiffness: 260, damping: 26 }}
                >
                  <div className="card absolute inset-0 flex flex-col items-center justify-center p-10 text-center [backface-visibility:hidden]">
                    <p className="t-eyebrow">Term</p>
                    <p className="font-display mt-4 text-4xl leading-tight font-[560] text-fg">{card.term}</p>
                    <p className="mt-8 text-sm text-fg-4">
                      Click or press <span className="kbd">Space</span> to flip
                    </p>
                  </div>
                  <div className="card absolute inset-0 flex flex-col items-center justify-center bg-surface p-10 text-center [backface-visibility:hidden] [transform:rotateY(180deg)]">
                    <p className="t-eyebrow">{card.term}</p>
                    <p className="mt-4 max-w-[56ch] text-xl leading-relaxed text-fg">{card.definition}</p>
                  </div>
                </motion.div>
              </motion.button>
            </AnimatePresence>
          </div>
          <div className="mt-6 flex items-center justify-between">
            <Button variant="secondary" onClick={() => go(-1)} aria-label="Previous card">
              <ArrowLeft /> Previous
            </Button>
            <div className="flex items-center gap-4">
              <span className="t-num text-base font-semibold text-fg-3">
                {index + 1} / {deck.length}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setCards(shuffle(deck));
                  setIndex(0);
                  setFlipped(false);
                }}
              >
                <Shuffle /> Shuffle
              </Button>
            </div>
            <Button onClick={() => go(1)} aria-label="Next card">
              Next <ArrowRight />
            </Button>
          </div>
          <p className="mt-4 text-center text-sm text-fg-4">
            Use <span className="kbd">←</span> <span className="kbd">→</span> to move between cards
          </p>
        </>
      )}
    </Page>
  );
}
