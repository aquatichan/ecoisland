// @ts-nocheck
import "../styles/content.css";
import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { units, learningModules } from "../data/units";
import { ChevronDown, ChevronUp, ArrowLeft, ArrowRight, BookOpen } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

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

  const lessons      = units[unitNum];
  const lessonFolder = lessons?.find(l => l === lesson);

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
                <button className="px-6 py-3 rounded-xl font-bold text-sm text-white"
                  style={{ background: "linear-gradient(135deg,#00c896,#06b6d4)" }}>
                  Take Quiz
                </button>
              )}
              {Object.keys(vocab).length > 0 && (
                <button className="px-6 py-3 rounded-xl font-bold text-sm"
                  style={{ background: "var(--bg-subtle)", color: "var(--text-secondary)", border: "2px solid var(--border-card)" }}>
                  Study Vocab
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
    </div>
  );
}