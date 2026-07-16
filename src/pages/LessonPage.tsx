// @ts-nocheck
import "../styles/content.css";
import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { units, learningModules } from "../data/units";
import { ChevronDown, ChevronUp, ArrowLeft, ArrowRight, BookOpen, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import StimulusChart from "@/components/StimulusChart";

type ContentBlock =
  | { type: "heading";   text: string }
  | { type: "paragraph"; html: string | { __html: string } }
  | { type: "image";     src: string; width?: string; height?: string }
  | { type: "table";     html: string }
  | { type: "list";      ordered: boolean; html: string | { __html: string } };

export default function LessonPage() {
  const { unit, lesson } = useParams();
  const unitNum = Number(unit);

  const [content, setContent]     = useState<ContentBlock[]>([]);
  const [title, setTitle]         = useState("");
  const [questions, setQuestions] = useState<any[]>([]);
  const [vocab, setVocab]         = useState({});
  const [openUnits, setOpenUnits] = useState<Record<number, boolean>>({ [unitNum]: true });

  // Inline practice quiz state (no rewards — that's the graded quiz on /apes)
  const [quizOpen, setQuizOpen]   = useState(false);
  const [qIndex, setQIndex]       = useState(0);
  const [qSelected, setQSelected] = useState<number | null>(null);
  const [qScore, setQScore]       = useState(0);
  const [qDone, setQDone]         = useState(false);

  // Inline vocab flashcards state
  const [vocabOpen, setVocabOpen] = useState(false);
  const [vIndex, setVIndex]       = useState(0);
  const [vFlipped, setVFlipped]   = useState(false);

  const lessons      = units[unitNum];
  const lessonFolder = lessons?.find(l => l === lesson);

  const LETTERS = ["A", "B", "C", "D", "E", "F"];
  // questions.json stores `correct` as a letter (A–D). Some rows carry a
  // corrupt placeholder ("!") — return -1 so the quiz simply doesn't mark any
  // option correct rather than crashing or mislabeling a real answer.
  const letterToIndex = (c: unknown): number => {
    if (typeof c !== "string") return -1;
    const idx = LETTERS.indexOf(c.trim().toUpperCase());
    return idx;
  };

  // vocab.json is a flat { term: definition } map — flatten to cards.
  const vocabCards = Object.entries(vocab || {}).map(([term, definition]) => ({
    term,
    definition: String(definition),
  }));

  const openQuiz = () => { setQIndex(0); setQSelected(null); setQScore(0); setQDone(false); setQuizOpen(true); };
  const openVocab = () => { setVIndex(0); setVFlipped(false); setVocabOpen(true); };

  const answerQuiz = (idx: number) => {
    if (qSelected !== null) return;
    setQSelected(idx);
    if (idx === letterToIndex(questions[qIndex]?.correct)) setQScore(s => s + 1);
  };

  const nextQuiz = () => {
    if (qIndex < questions.length - 1) { setQIndex(i => i + 1); setQSelected(null); }
    else setQDone(true);
  };

  useEffect(() => {
    if (!lessonFolder) return;
    window.scrollTo(0, 0);
    const base = `/APES_Modules/Unit_${unitNum}/${lessonFolder}`;
    fetch(`${base}/content.json`).then(r => r.json()).then(data => {
      setContent(data.content);
      setTitle(data.title);
    }).catch(() => {});
    fetch(`${base}/questions.json`).then(r => r.json()).then(setQuestions).catch(() => setQuestions([]));
    fetch(`${base}/vocab.json`).then(r => r.json()).then(setVocab).catch(() => setVocab({}));
  }, [lessonFolder]);

  const toggleUnit = (u: number) => setOpenUnits(prev => ({ ...prev, [u]: !prev[u] }));

  const currentIndex = lessons?.findIndex(l => l === lessonFolder);
  const prevLesson = currentIndex > 0 ? lessons[currentIndex - 1]
    : (unitNum > 1 ? units[unitNum - 1][units[unitNum - 1].length - 1] : null);
  const nextLesson = currentIndex < lessons?.length - 1 ? lessons[currentIndex + 1]
    : (unitNum < 9 ? units[unitNum + 1][0] : null);

  function renderBlock(obj: ContentBlock, i: number) {
    const htmlProps = (value: string | { __html: string }) =>
      typeof value === "string" ? { __html: value } : value;

    if (obj.type === "heading")
      return <h2 key={i} className="text-2xl font-bold mt-8" style={{ color: "var(--text-primary)" }}>{obj.text}</h2>;
    if (obj.type === "paragraph")
      return <p key={i} className="mt-4 leading-relaxed" style={{ color: "var(--text-body)" }} dangerouslySetInnerHTML={htmlProps(obj.html)} />;
    if (obj.type === "image")
      return <img key={i} src={obj.src} className="my-6 rounded-xl shadow-md max-w-full h-auto mx-auto block" style={{ border: "2px solid var(--border-card)" }} />;
    if (obj.type === "table")
      return <div key={i} className="my-6 overflow-x-auto rounded-xl" style={{ border: "2px solid var(--border-card)" }} dangerouslySetInnerHTML={htmlProps(obj.html)} />;
    if (obj.type === "list")
      return <div key={i} className="mt-4 ml-6 list-disc" dangerouslySetInnerHTML={htmlProps(obj.html)} />;
    return null;
  }

  return (
    <div className="flex min-h-screen" style={{ background: "var(--bg-page)" }}>

      {/* ── TOC Sidebar ── */}
      <aside className="hidden lg:block w-72 flex-shrink-0 sticky top-16 self-start h-[calc(100vh-4rem)] overflow-y-auto"
        style={{ background: "var(--bg-card)", borderRight: "2px solid var(--border-card)" }}>
        <div className="p-5">
          <div className="flex items-center gap-2 mb-6 pb-4" style={{ borderBottom: "2px solid var(--border-card)" }}>
            <BookOpen className="w-4 h-4" style={{ color: "#00c896" }} />
            <span className="font-black text-sm uppercase tracking-wider" style={{ color: "var(--text-primary)" }}>APES</span>
          </div>

          {Object.entries(units).map(([u, ls]) => {
            const un = Number(u);
            const isOpen = openUnits[un];
            return (
              <div key={u} className="mb-3">
                <button
                  onClick={() => toggleUnit(un)}
                  className="flex items-center justify-between w-full text-left px-3 py-2 rounded-xl text-sm font-bold transition-all"
                  style={{
                    color: un === unitNum ? "#00c896" : "var(--text-secondary)",
                    background: un === unitNum ? "rgba(0,200,150,0.08)" : "transparent",
                  }}
                >
                  <span className="truncate pr-2">Unit {un}: {learningModules[un - 1]?.title?.split(":")[0]}</span>
                  {isOpen ? <ChevronUp className="w-3.5 h-3.5 flex-shrink-0" /> : <ChevronDown className="w-3.5 h-3.5 flex-shrink-0" />}
                </button>

                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.18 }}
                      className="overflow-hidden"
                    >
                      <div className="ml-2 mt-1 space-y-0.5">
                        {(ls as string[]).map((l, i) => {
                          const [code] = l.split("_");
                          const isActive = lesson === l;
                          return (
                            <Link key={l} to={`/apes/unit/${u}/${l}`}
                              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs transition-all"
                              style={{
                                background: isActive ? "rgba(0,200,150,0.12)" : "transparent",
                                color: isActive ? "#00c896" : "var(--text-muted)",
                                fontWeight: isActive ? 700 : 400,
                                borderLeft: isActive ? "2px solid #00c896" : "2px solid transparent",
                              }}
                            >
                              <span className="font-mono opacity-60">{code}</span>
                              <span className="truncate">{learningModules[Number(code[0]) - 1]?.lessons[i]?.realTitle || learningModules[Number(code[0]) - 1]?.lessons[i]?.title}</span>
                            </Link>
                          );
                        })}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </aside>

      {/* ── Main Content ── */}
      <main className="flex-1 min-w-0">
        <div className="max-w-3xl mx-auto px-6 md:px-10 py-10">

          {/* Lesson header */}
          <div className="mb-10 pb-8" style={{ borderBottom: "2px solid var(--border-card)" }}>
            <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: "#00c896" }}>
              Unit {unitNum} · Lesson {title.split(" ")[0]}
            </p>
            <h1 className="text-3xl md:text-4xl font-black leading-tight" style={{ color: "var(--text-primary)", letterSpacing: "-0.03em" }}>
              {title}
            </h1>
          </div>

          {/* Content blocks */}
          <div className="article">
            {content.map(renderBlock)}
          </div>

          {/* Quiz / Vocab buttons */}
          {(questions.length > 0 || Object.keys(vocab).length > 0) && (
            <div className="flex gap-3 mt-12 pt-8" style={{ borderTop: "2px solid var(--border-card)" }}>
              {questions.length > 0 && (
                <button onClick={openQuiz} className="px-6 py-3 rounded-xl font-bold text-sm text-white"
                  style={{ background: "linear-gradient(135deg,#00c896,#06b6d4)" }}>
                  Take Quiz ({questions.length})
                </button>
              )}
              {vocabCards.length > 0 && (
                <button onClick={openVocab} className="px-6 py-3 rounded-xl font-bold text-sm"
                  style={{ background: "var(--bg-subtle)", color: "var(--text-secondary)", border: "2px solid var(--border-card)" }}>
                  Study Vocab ({vocabCards.length})
                </button>
              )}
            </div>
          )}

          {/* Prev / Next navigation */}
          <div className="flex items-center justify-between mt-12 pt-6 gap-4" style={{ borderTop: "2px solid var(--border-card)" }}>
            {prevLesson ? (
              <Link
                to={`/apes/unit/${prevLesson.split(".")[0]}/${prevLesson}`}
                className="flex items-center gap-2 px-5 py-3 rounded-xl font-bold text-sm transition-all"
                style={{ background: "var(--bg-subtle)", color: "var(--text-secondary)", border: "2px solid var(--border-card)" }}
              >
                <ArrowLeft className="w-4 h-4" /> Previous
              </Link>
            ) : <div />}
            {nextLesson ? (
              <Link
                to={`/apes/unit/${nextLesson.split(".")[0]}/${nextLesson}`}
                className="flex items-center gap-2 px-5 py-3 rounded-xl font-bold text-sm text-white transition-all"
                style={{ background: "linear-gradient(135deg,#00c896,#06b6d4)" }}
              >
                Next <ArrowRight className="w-4 h-4" />
              </Link>
            ) : <div />}
          </div>
        </div>
      </main>

      {/* ── Practice Quiz overlay ── */}
      <AnimatePresence>
        {quizOpen && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center px-4"
            style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }}
            onClick={() => setQuizOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 20, scale: 0.97 }}
              onClick={e => e.stopPropagation()}
              className="w-full max-w-2xl eco-card p-8 max-h-[90vh] overflow-y-auto"
            >
              {!qDone ? (() => {
                const q = questions[qIndex];
                const correctIdx = letterToIndex(q?.correct);
                const pct = Math.round(((qIndex + 1) / questions.length) * 100);
                return (
                  <>
                    <div className="flex items-center justify-between mb-5">
                      <span className="text-xs font-bold uppercase tracking-widest" style={{ color: "var(--text-faint)" }}>
                        Question {qIndex + 1} / {questions.length}
                      </span>
                      <button onClick={() => setQuizOpen(false)} className="p-1 rounded-lg transition-colors"
                        style={{ color: "var(--text-faint)" }}><X className="w-5 h-5" /></button>
                    </div>
                    <div className="h-1.5 rounded-full mb-7 overflow-hidden" style={{ background: "var(--bg-muted)" }}>
                      <motion.div className="h-full rounded-full" style={{ background: "linear-gradient(90deg,#00c896,#06b6d4)" }}
                        animate={{ width: `${pct}%` }} transition={{ duration: 0.4 }} />
                    </div>

                    {q?.stimulus && <StimulusChart stimulus={q.stimulus} />}

                    <h2 className="text-xl font-bold mb-7 leading-relaxed" style={{ color: "var(--text-primary)" }}>{q?.question}</h2>

                    <div className="space-y-3">
                      {(q?.answers || []).map((opt: string, idx: number) => {
                        const isSelected = qSelected === idx;
                        const isCorrect  = idx === correctIdx;
                        let bg = "var(--bg-subtle)", border = "var(--border-input)", textColor = "var(--text-body)";
                        if (isSelected && isCorrect)  { bg = "rgba(0,200,150,0.12)"; border = "#00c896"; textColor = "#059669"; }
                        if (isSelected && !isCorrect) { bg = "rgba(239,68,68,0.1)";  border = "#ef4444"; textColor = "#dc2626"; }
                        if (!isSelected && qSelected !== null && isCorrect) { bg = "rgba(0,200,150,0.08)"; border = "#00c896"; }
                        return (
                          <button
                            key={idx}
                            onClick={() => answerQuiz(idx)}
                            disabled={qSelected !== null}
                            className="w-full text-left px-5 py-3.5 rounded-xl font-medium text-sm flex items-center gap-3 transition-all"
                            style={{ background: bg, border: `2px solid ${border}`, color: textColor, cursor: qSelected !== null ? "default" : "pointer" }}
                          >
                            <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-black flex-shrink-0"
                              style={{ background: "var(--bg-muted)", color: "var(--text-muted)" }}>
                              {LETTERS[idx]}
                            </span>
                            {opt}
                            {isSelected && isCorrect  && <CheckCircle className="w-4 h-4 ml-auto text-emerald-500" />}
                            {isSelected && !isCorrect && <XCircle    className="w-4 h-4 ml-auto text-red-500" />}
                          </button>
                        );
                      })}
                    </div>

                    {qSelected !== null && (
                      <motion.button
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                        onClick={nextQuiz}
                        className="w-full mt-7 py-3 rounded-xl font-bold text-white"
                        style={{ background: "linear-gradient(135deg,#00c896,#06b6d4)" }}
                      >
                        {qIndex < questions.length - 1 ? "Next Question →" : "See Results"}
                      </motion.button>
                    )}
                  </>
                );
              })() : (
                <div className="text-center py-6">
                  <div className="text-6xl font-black mb-2" style={{
                    background: qScore / questions.length >= 0.7 ? "linear-gradient(135deg,#00c896,#06b6d4)" : "linear-gradient(135deg,#f97316,#ef4444)",
                    WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent"
                  }}>{Math.round((qScore / questions.length) * 100)}%</div>
                  <p className="text-sm mb-8" style={{ color: "var(--text-muted)" }}>
                    {qScore} correct out of {questions.length} questions
                  </p>
                  <div className="flex gap-3">
                    <button onClick={openQuiz} className="flex-1 py-3 rounded-xl font-bold text-sm"
                      style={{ background: "var(--bg-subtle)", color: "var(--text-secondary)", border: "2px solid var(--border-card)" }}>
                      Retake
                    </button>
                    <button onClick={() => setQuizOpen(false)} className="flex-1 py-3 rounded-xl font-bold text-sm text-white"
                      style={{ background: "linear-gradient(135deg,#00c896,#06b6d4)" }}>
                      Back to Lesson
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Vocab flashcards overlay ── */}
      <AnimatePresence>
        {vocabOpen && vocabCards.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex flex-col items-center justify-center px-4"
            style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }}
            onClick={() => setVocabOpen(false)}
          >
            <div onClick={e => e.stopPropagation()} className="w-full max-w-lg flex flex-col items-center">
              <div className="flex items-center justify-between w-full mb-4">
                <p className="text-sm font-medium" style={{ color: "rgba(255,255,255,0.85)" }}>
                  {vIndex + 1} / {vocabCards.length}
                </p>
                <button onClick={() => setVocabOpen(false)} className="p-1 rounded-lg"
                  style={{ color: "rgba(255,255,255,0.7)" }}><X className="w-5 h-5" /></button>
              </div>

              <motion.div
                key={`${vIndex}-${vFlipped}`}
                initial={{ rotateY: 90, opacity: 0 }} animate={{ rotateY: 0, opacity: 1 }} transition={{ duration: 0.25 }}
                onClick={() => setVFlipped(f => !f)}
                className="w-full cursor-pointer eco-card p-12 text-center select-none"
                style={{ minHeight: 240, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}
              >
                <p className="text-xs font-bold uppercase tracking-widest mb-4" style={{ color: "#00c896" }}>
                  {vFlipped ? "Definition" : "Term"}
                </p>
                <h2 className="text-2xl font-bold leading-relaxed" style={{ color: "var(--text-primary)" }}>
                  {vFlipped ? vocabCards[vIndex]?.definition : vocabCards[vIndex]?.term}
                </h2>
                <p className="text-xs mt-6" style={{ color: "var(--text-faint)" }}>tap to flip</p>
              </motion.div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => { setVIndex(i => (i > 0 ? i - 1 : vocabCards.length - 1)); setVFlipped(false); }}
                  className="px-6 py-3 rounded-xl font-bold text-sm"
                  style={{ background: "var(--bg-subtle)", color: "var(--text-secondary)", border: "2px solid var(--border-card)" }}
                >← Prev</button>
                <button
                  onClick={() => { setVIndex(i => (i + 1) % vocabCards.length); setVFlipped(false); }}
                  className="px-6 py-3 rounded-xl font-bold text-sm text-white"
                  style={{ background: "linear-gradient(135deg,#00c896,#06b6d4)" }}
                >Next →</button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}