// @ts-nocheck
// AI-graded FRQ practice flow — pick a unit, write responses to each part,
// get rubric-based scoring back from Gemini via gradeFRQ(). Rewards TC/XP
// like the MC quiz, gated behind a full (non-empty) attempt to avoid farming.
import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Loader2, Sparkles, TreePine, Zap, Trophy, AlertCircle, CheckCircle2, ExternalLink } from "lucide-react";
import confetti from "canvas-confetti";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db, auth } from "@/firebase";
import { User } from "@/entities/User";
import { REWARDS, buildRewardUpdate } from "@/utils/progression";
import { gradeFRQ, type FRQ, type FRQGradeResult } from "@/utils/frqGrading";
import StimulusChart from "@/components/StimulusChart";

const COLLEGEBOARD_FRQ_URL = "https://nerd-notes.com/every-ap-environmental-sciences-apes-frq-sorted-by-unit/";

export default function FRQPractice({ frqs, onExit }: { frqs: FRQ[]; onExit: () => void }) {
  const [selected, setSelected] = useState<FRQ | null>(null);
  const [responses, setResponses] = useState<Record<string, string>>({});
  const [isGrading, setIsGrading] = useState(false);
  const [gradeResult, setGradeResult] = useState<FRQGradeResult | null>(null);
  const [gradeError, setGradeError] = useState("");
  const [reward, setReward] = useState<any>(null);

  const openFRQ = (frq: FRQ) => {
    setSelected(frq);
    setResponses({});
    setGradeResult(null);
    setGradeError("");
    setReward(null);
  };

  const backToList = () => {
    setSelected(null);
    setResponses({});
    setGradeResult(null);
    setGradeError("");
    setReward(null);
  };

  const allPartsAnswered = selected
    ? selected.parts.every(p => (responses[p.label] || "").trim().length > 0)
    : false;

  const submitForGrading = async () => {
    if (!selected || !allPartsAnswered || isGrading) return;
    setIsGrading(true);
    setGradeError("");
    try {
      const result = await gradeFRQ(selected, responses);
      setGradeResult(result);

      const pct = result.totalPossible > 0 ? result.totalEarned / result.totalPossible : 0;
      if (pct >= 0.8) confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });

      // Persist + reward, same pattern as the MC quiz's apes_sessions.
      try {
        const uid = auth.currentUser?.uid;
        if (uid) {
          await addDoc(collection(db, "users", uid, "apes_frq_sessions"), {
            frqId: selected.id,
            unit: `Unit ${selected.unit}`,
            pointsEarned: result.totalEarned,
            pointsPossible: result.totalPossible,
            date: new Date().toISOString().slice(0, 10),
            createdAt: serverTimestamp(),
          });

          const tc = REWARDS.FRQ_BASE_TC + Math.round(pct * REWARDS.FRQ_MAX_BONUS_TC);
          const xp = result.totalEarned * REWARDS.FRQ_XP_PER_POINT;
          const user = await User.me();
          const { update, result: xpResult } = buildRewardUpdate(user, { tc, xp });
          await User.updateMyUserData(update);
          setReward({ tc, xp, leveledUp: xpResult.leveledUp });
        }
      } catch (e) {
        console.error("FRQ reward sync failed:", e);
        setReward({ syncFailed: true });
      }
    } catch (e) {
      console.error("FRQ grading failed:", e);
      setGradeError("AI grading failed — check your connection and try again. Your answers weren't lost.");
    } finally {
      setIsGrading(false);
    }
  };

  // ── List view ──
  if (!selected) {
    return (
      <div className="page-root">
        <div className="max-w-5xl mx-auto">
          <button onClick={onExit} className="flex items-center gap-2 mb-6 text-sm font-medium" style={{ color: "var(--text-faint)" }}>
            <ArrowLeft className="w-4 h-4" /> Back to Dashboard
          </button>

          <div className="mb-8">
            <h1 className="text-3xl md:text-4xl font-black mb-2" style={{ letterSpacing: "-0.03em", color: "var(--text-primary)" }}>
              Free Response Practice
            </h1>
            <p className="text-base mb-4" style={{ color: "var(--text-muted)" }}>
              Original, AP-style FRQs with instant AI-graded rubric feedback. Earn Treecoins for every full attempt.
            </p>
            <a
              href={COLLEGEBOARD_FRQ_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-colors"
              style={{ background: "rgba(6,182,212,0.1)", border: "1.5px solid rgba(6,182,212,0.25)", color: "#06b6d4" }}
            >
              <ExternalLink className="w-4 h-4" /> Also practice real, official College Board FRQs by unit →
            </a>
          </div>

          {frqs.length === 0 ? (
            <div className="eco-card p-10 text-center">
              <AlertCircle className="w-10 h-10 mx-auto mb-3" style={{ color: "var(--text-faint)" }} />
              <p style={{ color: "var(--text-muted)" }}>FRQs couldn't be loaded. Check your connection and try again.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {frqs.map(frq => {
                const totalPoints = frq.parts.reduce((s, p) => s + p.points, 0);
                return (
                  <motion.button
                    key={frq.id}
                    whileHover={{ y: -3 }}
                    onClick={() => openFRQ(frq)}
                    className="eco-card p-5 text-left flex flex-col gap-2"
                  >
                    <span className="text-xs font-bold uppercase tracking-widest" style={{ color: "#00c896" }}>
                      Unit {frq.unit}
                    </span>
                    <h3 className="font-black text-base leading-tight" style={{ color: "var(--text-primary)" }}>{frq.title}</h3>
                    <div className="flex items-center gap-3 text-xs mt-1" style={{ color: "var(--text-faint)" }}>
                      <span>{frq.parts.length} parts</span>
                      <span>·</span>
                      <span>{totalPoints} points</span>
                      {frq.stimulus && <span className="flex items-center gap-1"><Sparkles className="w-3 h-3" /> has stimulus</span>}
                    </div>
                  </motion.button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── FRQ detail / answer view ──
  return (
    <div className="page-root">
      <div className="max-w-3xl mx-auto">
        <button onClick={backToList} className="flex items-center gap-2 mb-6 text-sm font-medium" style={{ color: "var(--text-faint)" }}>
          <ArrowLeft className="w-4 h-4" /> All FRQs
        </button>

        <div className="eco-card p-6 md:p-8">
          <span className="text-xs font-bold uppercase tracking-widest" style={{ color: "#00c896" }}>Unit {selected.unit}</span>
          <h1 className="text-2xl font-black mt-1 mb-4" style={{ color: "var(--text-primary)" }}>{selected.title}</h1>

          {selected.stimulus && <StimulusChart stimulus={selected.stimulus} />}

          <p className="leading-relaxed mb-6" style={{ color: "var(--text-body)" }}>{selected.prompt}</p>

          {!gradeResult && (
            <div className="space-y-5">
              {selected.parts.map(part => (
                <div key={part.label}>
                  <div className="flex items-baseline justify-between mb-1.5">
                    <label className="font-bold text-sm" style={{ color: "var(--text-secondary)" }}>{part.label} {part.prompt}</label>
                    <span className="text-xs font-mono flex-shrink-0 ml-3" style={{ color: "var(--text-faint)" }}>{part.points} pt{part.points > 1 ? "s" : ""}</span>
                  </div>
                  <textarea
                    className="eco-input resize-none w-full"
                    rows={3}
                    placeholder="Write your response…"
                    value={responses[part.label] || ""}
                    onChange={e => setResponses(prev => ({ ...prev, [part.label]: e.target.value }))}
                    disabled={isGrading}
                  />
                </div>
              ))}

              {gradeError && (
                <div className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium" style={{ background: "rgba(239,68,68,0.08)", border: "1.5px solid rgba(239,68,68,0.25)", color: "#dc2626" }}>
                  <AlertCircle className="w-4 h-4 flex-shrink-0" /> {gradeError}
                </div>
              )}

              <button
                onClick={submitForGrading}
                disabled={!allPartsAnswered || isGrading}
                className="w-full py-3.5 rounded-xl font-bold text-white flex items-center justify-center gap-2 transition-all disabled:opacity-40"
                style={{ background: "linear-gradient(135deg,#00c896,#06b6d4)" }}
              >
                {isGrading ? <><Loader2 className="w-4 h-4 animate-spin" /> AI is grading your response…</> : <><Sparkles className="w-4 h-4" /> Submit for AI Grading</>}
              </button>
              {!allPartsAnswered && (
                <p className="text-xs text-center" style={{ color: "var(--text-faint)" }}>Answer every part to submit.</p>
              )}
            </div>
          )}

          {/* ── Grade result ── */}
          <AnimatePresence>
            {gradeResult && (
              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
                <div className="text-center py-4">
                  <div className="text-6xl font-black mb-1" style={{
                    background: gradeResult.totalEarned / gradeResult.totalPossible >= 0.7 ? "linear-gradient(135deg,#00c896,#06b6d4)" : "linear-gradient(135deg,#f97316,#ef4444)",
                    WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
                  }}>
                    {gradeResult.totalEarned}/{gradeResult.totalPossible}
                  </div>
                  <p className="text-sm" style={{ color: "var(--text-muted)" }}>points earned</p>
                </div>

                {reward && !reward.syncFailed && (
                  <div className="rounded-2xl p-4" style={{ background: "rgba(0,200,150,0.08)", border: "1.5px solid rgba(0,200,150,0.25)" }}>
                    <div className="flex items-center justify-center gap-5">
                      <span className="flex items-center gap-1.5 font-black" style={{ color: "#00c896" }}><TreePine className="w-5 h-5" /> +{reward.tc} TC</span>
                      <span className="flex items-center gap-1.5 font-black" style={{ color: "#06b6d4" }}><Zap className="w-5 h-5" /> +{reward.xp} XP</span>
                    </div>
                    {reward.leveledUp && (
                      <div className="flex items-center justify-center gap-1.5 mt-2 text-sm font-bold" style={{ color: "#f59e0b" }}>
                        <Trophy className="w-4 h-4" /> Level up!
                      </div>
                    )}
                  </div>
                )}
                {reward?.syncFailed && (
                  <div className="text-xs text-center flex items-center justify-center gap-1.5" style={{ color: "var(--text-faint)" }}>
                    <AlertCircle className="w-3.5 h-3.5" /> Couldn't sync your reward, but your grade above is accurate.
                  </div>
                )}

                <div className="space-y-3">
                  {gradeResult.parts.map(p => (
                    <div key={p.label} className="p-4 rounded-xl" style={{ background: "var(--bg-subtle)", border: "1.5px solid var(--border-card)" }}>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="font-bold text-sm" style={{ color: "var(--text-secondary)" }}>{p.label}</span>
                        <span className="flex items-center gap-1.5 text-sm font-black" style={{ color: p.pointsEarned === p.pointsPossible ? "#00c896" : p.pointsEarned > 0 ? "#f59e0b" : "#ef4444" }}>
                          {p.pointsEarned === p.pointsPossible ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                          {p.pointsEarned}/{p.pointsPossible}
                        </span>
                      </div>
                      <p className="text-sm leading-relaxed" style={{ color: "var(--text-muted)" }}>{p.feedback}</p>
                    </div>
                  ))}
                </div>

                {gradeResult.overallFeedback && (
                  <div className="p-4 rounded-xl" style={{ background: "rgba(6,182,212,0.06)", border: "1.5px solid rgba(6,182,212,0.2)" }}>
                    <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>{gradeResult.overallFeedback}</p>
                  </div>
                )}

                <div className="flex gap-3">
                  <button onClick={() => openFRQ(selected)} className="flex-1 py-3 rounded-xl font-bold text-sm" style={{ background: "var(--bg-subtle)", color: "var(--text-secondary)", border: "2px solid var(--border-card)" }}>
                    Retry
                  </button>
                  <button onClick={backToList} className="flex-1 py-3 rounded-xl font-bold text-sm text-white" style={{ background: "linear-gradient(135deg,#00c896,#06b6d4)" }}>
                    More FRQs
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
