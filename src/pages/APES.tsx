// @ts-nocheck
import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Clock, TreePine, ChevronDown, ChevronUp, BookOpen, Layers, FlipHorizontal, TestTube, BarChart2, Loader2, CheckCircle, XCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { learningModules } from "../data/units";

export default function ApesPage() {
  const [openModules, setOpenModules]   = useState({});
  const [questions, setQuestions]       = useState([]);
  const [currentQuestion, setCurrent]   = useState(0);
  const [selectedAnswer, setSelected]   = useState(null);
  const [score, setScore]               = useState(0);
  const [timer, setTimer]               = useState(0);
  const [flashcards, setFlashcards]     = useState([]);
  const [view, setView]                 = useState("dashboard");
  const [flashIndex, setFlashIndex]     = useState(0);
  const [flipped, setFlipped]           = useState(false);
  const [loading, setLoading]           = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    let interval;
    if (view === "quiz") interval = setInterval(() => setTimer(t => t + 1), 1000);
    else setTimer(0);
    return () => clearInterval(interval);
  }, [view]);

  const toggleModule = i => setOpenModules(prev => ({ ...prev, [i]: !prev[i] }));

  const loadQuestions = async unitNumber => {
    setLoading(true);
    try {
      const res = await fetch(`/APES/APES_Unit${unitNumber}.json`);
      const data = await res.json();
      setQuestions(data); setCurrent(0); setScore(0); setSelected(null); setView("quiz");
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const loadAllQuestions = async () => {
    setLoading(true);
    try {
      const all = await Promise.all(Array.from({ length: 9 }, (_, i) => fetch(`/APES/APES_Unit${i + 1}.json`).then(r => r.json())));
      setQuestions(all.flat()); setCurrent(0); setScore(0); setSelected(null); setView("quiz");
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const loadFlashcards = async () => {
    setLoading(true);
    try {
      const res = await fetch("/APES/APES_Vocab.json");
      const data = await res.json();
      setFlashcards(data); setFlashIndex(0); setFlipped(false); setView("flashcards");
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const goToLesson = lesson => {
    const unit = lesson.code.split(".")[0];
    const folderName = lesson.code + "_" + lesson.title.replaceAll(" ", "_");
    navigate(`/apes/unit/${unit}/${folderName}`);
  };

  const checkAnswer = choice => {
    setSelected(choice);
    if (choice === questions[currentQuestion].answer) setScore(s => s + 1);
  };

  const nextQuestion = () => {
    if (currentQuestion < questions.length - 1) { setCurrent(c => c + 1); setSelected(null); }
    else setView("result");
  };

  const fmt = s => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;

  /* ── QUIZ VIEW ── */
  if (view === "quiz") {
    const q = questions[currentQuestion];
    const pct = Math.round(((currentQuestion + 1) / questions.length) * 100);
    return (
      <div className="page-root min-h-screen flex items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-2xl eco-card p-8"
        >
          {/* Progress */}
          <div className="flex items-center justify-between mb-5">
            <span className="text-xs font-bold uppercase tracking-widest" style={{ color: "var(--text-faint)" }}>
              Question {currentQuestion + 1} / {questions.length}
            </span>
            <span className="text-xs font-mono" style={{ color: "var(--text-faint)" }}>⏱ {fmt(timer)}</span>
          </div>
          <div className="h-1.5 rounded-full mb-7 overflow-hidden" style={{ background: "var(--bg-muted)" }}>
            <motion.div
              className="h-full rounded-full"
              style={{ background: "linear-gradient(90deg,#00c896,#06b6d4)" }}
              animate={{ width: `${pct}%` }}
              transition={{ duration: 0.4 }}
            />
          </div>

          <h2 className="text-xl font-bold mb-7 leading-relaxed" style={{ color: "var(--text-primary)" }}>{q.question}</h2>

          <div className="space-y-3">
            {["A", "B", "C", "D"].map(choice => {
              const isSelected = selectedAnswer === choice;
              const isCorrect  = choice === q.answer;
              let bg = "var(--bg-subtle)";
              let border = "var(--border-input)";
              let textColor = "var(--text-body)";
              if (isSelected && isCorrect)  { bg = "rgba(0,200,150,0.12)"; border = "#00c896"; textColor = "#059669"; }
              if (isSelected && !isCorrect) { bg = "rgba(239,68,68,0.1)";  border = "#ef4444"; textColor = "#dc2626"; }
              if (!isSelected && selectedAnswer && isCorrect) { bg = "rgba(0,200,150,0.08)"; border = "#00c896"; }
              return (
                <button
                  key={choice}
                  onClick={() => !selectedAnswer && checkAnswer(choice)}
                  disabled={!!selectedAnswer}
                  className="w-full text-left px-5 py-3.5 rounded-xl font-medium text-sm flex items-center gap-3 transition-all"
                  style={{ background: bg, border: `2px solid ${border}`, color: textColor, cursor: selectedAnswer ? "default" : "pointer" }}
                >
                  <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-black flex-shrink-0"
                    style={{ background: "var(--bg-muted)", color: "var(--text-muted)" }}>
                    {choice}
                  </span>
                  {q[choice]}
                  {isSelected && isCorrect  && <CheckCircle className="w-4 h-4 ml-auto text-emerald-500" />}
                  {isSelected && !isCorrect && <XCircle    className="w-4 h-4 ml-auto text-red-500" />}
                </button>
              );
            })}
          </div>

          <div className="flex gap-3 mt-7">
            {selectedAnswer && (
              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                onClick={nextQuestion}
                className="flex-1 py-3 rounded-xl font-bold text-white"
                style={{ background: "linear-gradient(135deg,#00c896,#06b6d4)" }}
              >
                {currentQuestion < questions.length - 1 ? "Next Question →" : "See Results"}
              </motion.button>
            )}
            <button onClick={() => setView("dashboard")} className="px-5 py-3 rounded-xl text-sm font-medium"
              style={{ background: "var(--bg-subtle)", color: "var(--text-muted)", border: "2px solid var(--border-card)" }}>
              Quit
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  /* ── RESULT VIEW ── */
  if (view === "result") {
    const pct = Math.round((score / questions.length) * 100);
    return (
      <div className="page-root min-h-screen flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md eco-card p-10 text-center"
        >
          <div className="text-7xl font-black mb-2" style={{
            background: pct >= 70 ? "linear-gradient(135deg,#00c896,#06b6d4)" : "linear-gradient(135deg,#f97316,#ef4444)",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent"
          }}>{pct}%</div>
          <p className="font-bold text-lg mb-1" style={{ color: "var(--text-primary)" }}>
            {pct >= 80 ? "Excellent work! 🌟" : pct >= 60 ? "Good effort! Keep studying 📚" : "Keep practicing! You've got this 💪"}
          </p>
          <p className="text-sm mb-8" style={{ color: "var(--text-muted)" }}>
            {score} correct out of {questions.length} questions · {fmt(timer)}
          </p>
          <button onClick={() => setView("dashboard")} className="w-full py-3.5 rounded-xl font-bold text-white"
            style={{ background: "linear-gradient(135deg,#00c896,#06b6d4)" }}>
            Back to Dashboard
          </button>
        </motion.div>
      </div>
    );
  }

  /* ── FLASHCARDS VIEW ── */
  if (view === "flashcards") {
    const card = flashcards[flashIndex];
    return (
      <div className="page-root min-h-screen flex flex-col items-center justify-center px-4">
        {/* Progress */}
        <p className="text-sm font-medium mb-6" style={{ color: "var(--text-muted)" }}>
          {flashIndex + 1} / {flashcards.length}
        </p>

        {/* Card */}
        <motion.div
          key={`${flashIndex}-${flipped}`}
          initial={{ rotateY: 90, opacity: 0 }}
          animate={{ rotateY: 0, opacity: 1 }}
          transition={{ duration: 0.25 }}
          onClick={() => setFlipped(f => !f)}
          className="w-full max-w-lg cursor-pointer eco-card p-12 text-center select-none"
          style={{ minHeight: 240, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}
        >
          <p className="text-xs font-bold uppercase tracking-widest mb-4" style={{ color: "#00c896" }}>
            {flipped ? "Definition" : "Term"}
          </p>
          <h2 className="text-2xl font-bold leading-relaxed" style={{ color: "var(--text-primary)" }}>
            {flipped ? card?.definition : card?.term}
          </h2>
          <p className="text-xs mt-6" style={{ color: "var(--text-faint)" }}>tap to flip</p>
        </motion.div>

        {/* Controls */}
        <div className="flex gap-3 mt-6">
          <button
            onClick={() => { setFlashIndex(i => (i > 0 ? i - 1 : flashcards.length - 1)); setFlipped(false); }}
            className="px-6 py-3 rounded-xl font-bold text-sm"
            style={{ background: "var(--bg-subtle)", color: "var(--text-secondary)", border: "2px solid var(--border-card)" }}
          >← Prev</button>
          <button
            onClick={() => { setFlashIndex(i => (i + 1) % flashcards.length); setFlipped(false); }}
            className="px-6 py-3 rounded-xl font-bold text-sm text-white"
            style={{ background: "linear-gradient(135deg,#00c896,#06b6d4)" }}
          >Next →</button>
        </div>
        <button onClick={() => setView("dashboard")} className="mt-4 text-sm"
          style={{ color: "var(--text-faint)" }}>
          ← Back to Dashboard
        </button>
      </div>
    );
  }

  /* ── DASHBOARD VIEW ── */
  return (
    <div className="page-root">
      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <div className="mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold mb-4"
            style={{ background: "rgba(0,200,150,0.1)", border: "1px solid rgba(0,200,150,0.2)", color: "#00c896" }}>
            <BookOpen className="w-3.5 h-3.5" /> AP Environmental Science
          </div>
          <h1 className="text-4xl md:text-5xl font-black mb-3" style={{ letterSpacing: "-0.03em", color: "var(--text-primary)" }}>
            APES Study Guide
          </h1>
          <p className="text-lg" style={{ color: "var(--text-muted)" }}>
            Earn Treecoins as you review for the AP Environmental Science Exam
          </p>
        </div>

        {/* Quick actions */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
          {[
            { icon: Layers,         label: "All-Unit Quiz",  sub: "Practice every unit",  action: loadAllQuestions, color: "#00c896" },
            { icon: FlipHorizontal, label: "Flashcards",      sub: "Key terms & vocabulary",    action: loadFlashcards,   color: "#06b6d4" },
            { icon: TestTube,       label: "Practice Tests",  sub: "Full-length exams (coming soon)",    action: () => window.open("https://highschooltestprep.com/ap/environmental-science/", "_blank"), color: "#8b5cf6" },
            { icon: BarChart2,      label: "Key Diagrams",    sub: "Coming soon",          action: null,             color: "#f59e0b" },
          ].map(item => (
            <motion.button
              key={item.label}
              whileHover={item.action ? { y: -3 } : {}}
              whileTap={item.action ? { scale: 0.97 } : {}}
              onClick={item.action || undefined}
              disabled={!item.action || loading}
              className="eco-card p-5 text-left flex flex-col gap-3"
              style={{ cursor: item.action ? "pointer" : "not-allowed", opacity: item.action ? 1 : 0.5 }}
            >
              <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: `${item.color}15`, border: `1.5px solid ${item.color}30` }}>
                <item.icon className="w-5 h-5" style={{ color: item.color }} />
              </div>
              <div>
                <p className="font-bold text-sm" style={{ color: "var(--text-primary)" }}>{item.label}</p>
                <p className="text-xs mt-0.5" style={{ color: "var(--text-faint)" }}>{item.sub}</p>
              </div>
            </motion.button>
          ))}
        </div>

        {/* Unit modules */}
        <h2 className="text-xl font-black mb-4" style={{ color: "var(--text-primary)", letterSpacing: "-0.02em" }}>Units</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {learningModules.map((module, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.04 }}
              className="eco-card overflow-hidden"
            >
              <div className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: "#00c896" }}>
                      Unit {index + 1}
                    </p>
                    <h3 className="font-black text-base leading-tight" style={{ color: "var(--text-primary)" }}>
                      {module.title}
                    </h3>
                  </div>
                </div>
                <p className="text-sm mb-4 leading-relaxed" style={{ color: "var(--text-muted)" }}>
                  {module.description}
                </p>
                <div className="flex items-center gap-4 mb-4 text-xs" style={{ color: "var(--text-faint)" }}>
                  <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{module.duration}</span>
                  <span className="flex items-center gap-1"><TreePine className="w-3.5 h-3.5 text-emerald-500" />{module.treecoins} TC</span>
                </div>

                {/* Lessons dropdown */}
                <button
                  onClick={() => toggleModule(index)}
                  className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-semibold mb-2 transition-all"
                  style={{ background: "var(--bg-subtle)", color: "var(--text-secondary)", border: "1.5px solid var(--border-card)" }}
                >
                  <span>{module.lessons.length} Lessons</span>
                  {openModules[index] ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>

                <AnimatePresence initial={false}>
                  {openModules[index] && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="space-y-1 pt-1 pb-2">
                        {module.lessons.map((lesson, i) => (
                          <button
                            key={i}
                            onClick={() => goToLesson(lesson)}
                            className="w-full text-left px-3 py-1.5 rounded-lg text-sm transition-colors"
                            style={{ color: "var(--text-body)" }}
                            onMouseEnter={e => e.currentTarget.style.color = "#00c896"}
                            onMouseLeave={e => e.currentTarget.style.color = "var(--text-body)"}
                          >
                            <span className="font-mono text-xs mr-2" style={{ color: "var(--text-faint)" }}>{lesson.code}</span>
                            {lesson.title}
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <button
                  onClick={() => loadQuestions(index + 1)}
                  disabled={loading}
                  className="w-full py-2.5 rounded-xl font-bold text-sm text-white mt-1"
                  style={{ background: "linear-gradient(135deg,#00c896,#06b6d4)" }}
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : "Start Unit Practice"}
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}