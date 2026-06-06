// @ts-nocheck
import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { db, auth } from "@/firebase";
import { collection, getDocs, query, orderBy, where } from "firebase/firestore";
import { User } from "@/entities/User";
import confetti from 'canvas-confetti';
import { callAI, parseAIJson } from "@/config/ai";

import { Mouse } from "lucide-react";

import DarkVeil from "@/components/DarkVeil";
import SoftAurora from "@/components/SoftAurora";
import Radar from "@/components/Radar";
import { GridScan } from "@/components/GridScan";
import PrismaticBurst from "@/components/PrismaticBurst";
import LetterGlitch from "@/components/LetterGlitch";
import Orb from "@/components/Orb";
import TextType from "@/components/TextType";
import ScrollFloat from "@/components/ScrollFloat";
import ScrollReveal from "@/components/ScrollReveal";
import CircularGallery from "@/components/CircularGallery";

gsap.registerPlugin(ScrollTrigger);

// ─── Constants ──────────────────────────────────────────────────────────────
const SIDEBAR_W = () => (window.innerWidth >= 768 ? 288 : 0);
const HEADER_H = 64;

const SECTION_COLORS = [
  "#ffffff",
  "#00c896",
  "#00e5ff",
  "#00c896",
  "#7b61ff",
  "#f59e0b",
  "#ffffff",
];

const SECTION_NAMES = ["Init", "Level & Rank", "Carbon", "Regional", "Community", "APES", "Finale"];

// ─── Helpers ────────────────────────────────────────────────────────────────
function mean(arr) {
  if (!arr || arr.length === 0) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function mode(arr) {
  if (!arr || arr.length === 0) return null;
  const freq = {};
  arr.forEach((v) => { if (v != null) freq[v] = (freq[v] || 0) + 1; });
  return Object.entries(freq).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
}

function dayName(dateStr) {
  if (!dateStr) return "None";
  try {
    return ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"][new Date(dateStr).getDay()];
  } catch { return "None"; }
}

// AI-powered city tip generator
async function getCityTip(city) {
  if (!city) {
    return "Reducing meat consumption to 3 days per week is one of the highest-impact dietary changes a person can make.";
  }
  try {
    const tip = await callAI(
      "You are an environmental sustainability expert. Provide a single, concise, actionable tip for reducing carbon emissions in a specific city.",
      `Provide one eco-friendly tip for ${city}. Keep it under 100 characters and actionable.`,
      0.5
    );
    return tip.trim() || "Keep exploring ways to reduce your carbon footprint.";
  } catch (e) {
    console.warn("AI tip generation failed:", e);
    return "Reducing meat consumption to 3 days per week is one of the highest-impact dietary changes a person can make.";
  }
}

// AI-powered trend analysis
async function analyzeCarbonTrend(recentWeek, prevWeek) {
  const recentAvg = mean(recentWeek.map((e) => e.total_co2 || 0));
  const prevAvg = mean(prevWeek.map((e) => e.total_co2 || 0));
  
  if (recentAvg > prevAvg * 1.05) return "increased";
  if (recentAvg < prevAvg * 0.95) return "decreased";
  return "stayed steady";
}

// Cache for AI-generated tips
const tipCache = new Map();

// ─── Loading Screen ──────────────────────────────────────────────────────────
function LoadingScreen() {
  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 200,
        background: "#050a0e",
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        gap: 24,
      }}
    >
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 1.4, repeat: Infinity, ease: "linear" }}
        style={{
          width: 48, height: 48, borderRadius: "50%",
          border: "3px solid transparent",
          borderTop: "3px solid #00c896",
          borderBottom: "3px solid #7b61ff",
        }}
      />
      <motion.p
        animate={{ opacity: [0.4, 1, 0.4] }}
        transition={{ duration: 2, repeat: Infinity }}
        style={{ color: "rgba(255,255,255,0.5)", fontSize: 12, letterSpacing: "0.15em", textTransform: "uppercase" }}
      >
        Loading your impact…
      </motion.p>
    </div>
  );
}

// ─── Background wrapper ──────────────────────────────────────────────────────
function BgWrap({ children }) {
  return (
    <div style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}>
      {children}
    </div>
  );
}

// ─── Glassmorphic card ────────────────────────────────────────────────────────
function GlassCard({ children, style = {}, className = "" }) {
  return (
    <div
      className={className}
      style={{
        background: "rgba(255,255,255,0.04)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        border: "1px solid rgba(255,255,255,0.09)",
        borderRadius: 20,
        padding: "28px 32px",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

// ─── XP Bar ──────────────────────────────────────────────────────────────────
function XPBar({ xp, xpMax }) {
  const pct = xpMax > 0 ? Math.min((xp / xpMax) * 100, 100) : 0;
  return (
    <div style={{ marginTop: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
        <span style={{ color: "rgba(255,255,255,0.5)", fontSize: 14 }}>XP Progress</span>
        <span style={{ color: "#00c896", fontSize: 11 }}>{xp} / {xpMax}</span>
      </div>
      <div style={{ height: 6, background: "rgba(255,255,255,0.08)", borderRadius: 999, overflow: "hidden" }}>
        <motion.div
          initial={{ width: 0 }}
          whileInView={{ width: `${pct}%` }}
          transition={{ duration: 1.2, ease: "easeOut" }}
          viewport={{ once: true }}
          style={{ height: "100%", background: "linear-gradient(90deg, #00c896, #7b61ff)", borderRadius: 999 }}
        />
      </div>
    </div>
  );
}

// ─── Animated Bar Chart ───────────────────────────────────────────────────────
function BarBreakdown({ transport, energy, diet }) {
  const total = transport + energy + diet || 1;
  const bars = [
    { label: "Transport", value: transport, color: "#00e5ff" },
    { label: "Energy", value: energy, color: "#7b61ff" },
    { label: "Diet", value: diet, color: "#00c896" },
  ];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, marginTop: 8 }}>
      {bars.map((b) => {
        const pct = Math.round((b.value / total) * 100);
        return (
          <div key={b.label}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
              <span style={{ color: "rgba(255,255,255,0.7)", fontSize: 12 }}>{b.label}</span>
              <span style={{ color: b.color, fontSize: 12 }}>{pct}%</span>
            </div>
            <div style={{ height: 8, background: "rgba(255,255,255,0.08)", borderRadius: 999, overflow: "hidden" }}>
              <motion.div
                initial={{ width: 0 }}
                whileInView={{ width: `${pct}%` }}
                transition={{ duration: 1.0, ease: "easeOut", delay: 0.1 }}
                viewport={{ once: true }}
                style={{ height: "100%", background: b.color, borderRadius: 999 }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Section: Init ────────────────────────────────────────────────────────────
function InitSection({ data, scrollRef }) {
  const { user } = data;
  const [showSub, setShowSub] = useState(false);

  return (
    <section style={{ position: "relative", minHeight: "100vh" }}>
      <div style={{ position: "sticky", top: 0, height: "100vh", overflow: "hidden" }}>
        <BgWrap><DarkVeil speed={0.4} noiseIntensity={0.02} warpAmount={0.1} /></BgWrap>
        <div style={{ position: "relative", zIndex: 10, padding: "5vh 5vw", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "100vh", left: -SIDEBAR_W()/2, }}>
          <GlassCard style={{ maxWidth: 800, width: "100%", textAlign: "center" }}>
            <TextType
              text={["Ecoisland Impact Visualizer", user.username || user.full_name || "Explorer"]}
              typingSpeed={45}
              pauseDuration={1800}
              loop={false}
              className="text-center"
              style={{ fontSize: "clamp(2rem,5vw,4rem)", fontWeight: 900, color: "#fff", letterSpacing: "-0.02em", lineHeight: 1.15 }}
              showCursor
              startOnVisible
            />
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 2.4, duration: 0.8 }}
              style={{ color: "rgba(255,255,255,0.5)", marginTop: 16, fontSize: "clamp(0.9rem,2vw,1.1rem)" }}
            >
              Your environmental story, visualized.
            </motion.p>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 3.2 }}
              style={{ marginTop: 40, display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}
            >
              <Mouse color="#00c896" />
              <span style={{ color: "rgba(255,255,255,0.35)", fontSize: 12, letterSpacing: "0.2em", textTransform: "uppercase" }}>Scroll Down</span>
            </motion.div>
          </GlassCard>
        </div>
      </div>
    </section>
  );
}

// ─── Section: C1 — Level & Rank ───────────────────────────────────────────────
function C1Section({ data, scrollRef }) {
  const { user, rank } = data;

  return (
    <section style={{ position: "relative", minHeight: "250vh" }}>
      <div style={{ position: "sticky", top: 0, height: "100vh", overflow: "hidden" }}>
        <BgWrap>
          <SoftAurora speed={0.5} brightness={0.9} color1="#f7f7f7" color2="#e100ff" noiseFrequency={2.0} bandHeight={0.5} bandSpread={1.2} enableMouseInteraction />
        </BgWrap>
      </div>
      <div style={{ position: "relative", zIndex: 10, padding: "20vh 5vw", display: "flex", flexDirection: "column", gap: 48, maxWidth: 1000, margin: "0 auto", left: -SIDEBAR_W()/2, }}>
        <GlassCard>
          <ScrollFloat scrollContainerRef={scrollRef} textClassName="text-emerald-300" style={{ fontSize: "clamp(3rem,8vw,6rem)", fontWeight: 900 }}>
            {`Level ${user.eco_level || 1}`}
          </ScrollFloat>
          <XPBar xp={user.xp || 0} xpMax={user.xp_to_next_level || 25} />
        </GlassCard>

        <GlassCard>
          <ScrollFloat scrollContainerRef={scrollRef} textClassName="text-yellow-300">
            {`${(user.treecoins || 0).toLocaleString()} Treecoins`}
          </ScrollFloat>
          <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 14 }}>Total accumulated sustainability currency</p>
        </GlassCard>

        <GlassCard>
          <ScrollFloat scrollContainerRef={scrollRef} textClassName="text-purple-300">
            {`#${rank} Globally`}
          </ScrollFloat>
          <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 14 }}>Global rank by current Treecoins + Level</p>
        </GlassCard>
      </div>
    </section>
  );
}

// ─── Section: C2 — Carbon Footprint ──────────────────────────────────────────
function C2Section({ data, scrollRef }) {
  const { carbonDocs, user } = data;
  const [cityTip, setCityTip] = useState("");

  const stats = useMemo(() => {
    if (!carbonDocs || carbonDocs.length === 0) return null;
    const avgDaily = mean(carbonDocs.map((e) => e.total_co2 || 0));
    const annualProjected = avgDaily * 365;
    const avgTransport = mean(carbonDocs.map((e) => e.transportation_co2 || 0));
    const avgEnergy = mean(carbonDocs.map((e) => e.energy_co2 || 0));
    const avgDiet = mean(carbonDocs.map((e) => e.diet_co2 || 0));
    const recentWeek = carbonDocs.slice(0, 7);
    const prevWeek = carbonDocs.slice(7, 14);
    const recentAvg = mean(recentWeek.map((e) => e.total_co2 || 0));
    const prevAvg = mean(prevWeek.map((e) => e.total_co2 || 0));
    const trend = recentAvg > prevAvg * 1.05 ? "increased" : recentAvg < prevAvg * 0.95 ? "decreased" : "stayed steady";
    const peakDay = mode(carbonDocs.map((e) => dayName(e.date))) || "Saturday";
    return { avgDaily, annualProjected, avgTransport, avgEnergy, avgDiet, trend, peakDay };
  }, [carbonDocs]);

  // Load city tip with caching
  useEffect(() => {
    if (!user.city) return;
    if (tipCache.has(user.city)) {
      setCityTip(tipCache.get(user.city));
    } else {
      getCityTip(user.city).then((tip) => {
        tipCache.set(user.city, tip);
        setCityTip(tip);
      });
    }
  }, [user.city]);

  return (
    <section style={{ position: "relative", minHeight: "300vh" }}>
      <div style={{ position: "sticky", top: 0, height: "100vh", overflow: "hidden" }}>
        <BgWrap>
          <GridScan
            sensitivity={0.55}
          lineThickness={1}
          linesColor="#2F293A"
          gridScale={0.1}
          scanColor="#FF9FFC"
          scanOpacity={0.4}
          enablePost
          bloomIntensity={0.6}
          chromaticAberration={0.002}
          noiseIntensity={0.01}
          lineJitter={0.1}
          scanGlow={0.5}
          scanSoftness={2}
          enableWebcam={false}
          showPreview={false}
          />
        </BgWrap>
      </div>
      <div style={{ position: "relative", zIndex: 10, padding: "20vh 5vw", display: "flex", flexDirection: "column", gap: 48, maxWidth: 1200, margin: "0 auto", left: -SIDEBAR_W()/2, }}>
        {!stats ? (
          <GlassCard>
            <ScrollReveal scrollContainerRef={scrollRef}>
              {"No carbon logs yet. Every journey starts with a first step — head to Carbon Footprint to begin tracking."}
            </ScrollReveal>
          </GlassCard>
        ) : (
          <>
            <GlassCard>
              <ScrollFloat scrollContainerRef={scrollRef} textClassName="text-cyan-300">
                {`${stats.avgDaily.toFixed(1)} kg CO₂ / day`}
              </ScrollFloat>
              <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 14 }}>Global average: 13.7 kg/day (5,000 kg/year)</p>
            </GlassCard>

            <GlassCard>
              <ScrollFloat scrollContainerRef={scrollRef} textClassName="text-blue-300">
                {`${stats.annualProjected.toFixed(0)} kg CO₂ / year (projected)`}
              </ScrollFloat>
              <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 14 }}>Paris Agreement target: below 2,300 kg/year (6.3 kg/day)</p>
            </GlassCard>

            <GlassCard>
              <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 13, marginBottom: 16, textTransform: "uppercase", letterSpacing: "0.1em" }}>Breakdown by Category</p>
              <BarBreakdown transport={stats.avgTransport} energy={stats.avgEnergy} diet={stats.avgDiet} />
            </GlassCard>

            {cityTip && (
              <GlassCard>
                <ScrollReveal scrollContainerRef={scrollRef} enableBlur>
                  {cityTip}
                </ScrollReveal>
              </GlassCard>
            )}

            <GlassCard>
              <ScrollReveal scrollContainerRef={scrollRef} enableBlur textClassName="text-orange-300">
                {`Your emissions ${stats.trend} over the past two weeks.`}
              </ScrollReveal>
            </GlassCard>

            <GlassCard>
              <ScrollReveal scrollContainerRef={scrollRef} enableBlur textClassName="text-purple-300">
                {`Your highest-emission day tends to be ${stats.peakDay}.`}
              </ScrollReveal>
            </GlassCard>
          </>
        )}
      </div>
    </section>
  );
}

// ─── Section: C3 — Regional Data ─────────────────────────────────────────────
function C3Section({ data, scrollRef }) {
  const { user, carbonDocs, postDocs } = data;

  return (
    <section style={{ position: "relative", minHeight: "200vh" }}>
      <div style={{ position: "sticky", top: 0, height: "100vh", overflow: "hidden" }}>
        <BgWrap>
          <Radar speed={0.8} color="#00c896" backgroundColor="#030d0a" ringCount={6} sweepSpeed={1.5} sweepWidth={0.4} brightness={1.1} enableMouseInteraction />
        </BgWrap>
      </div>
      <div style={{ position: "relative", zIndex: 10, padding: "20vh 5vw", display: "flex", flexDirection: "column", gap: 48, maxWidth: 1000, margin: "0 auto", left: -SIDEBAR_W()/2, }}>
        <GlassCard>
          <ScrollReveal scrollContainerRef={scrollRef} enableBlur textClassName="text-cyan-300">
            {`You've logged ${carbonDocs.length} environmental actions from ${user.city || "your location"}.`}
          </ScrollReveal>
        </GlassCard>

        <GlassCard>
          <ScrollReveal scrollContainerRef={scrollRef} enableBlur textClassName="text-purple-300">
            {`${postDocs.length} community posts published. Your local voice is part of a global movement.`}
          </ScrollReveal>
        </GlassCard>
      </div>
    </section>
  );
}

// ─── Section: C4 — Community Reach ───────────────────────────────────────────
function C4Section({ data, scrollRef }) {
  const { postDocs } = data;

  const stats = useMemo(() => {
    const totalLikes = postDocs.reduce((s, p) => s + (p.likesCount || 0), 0);
    const totalComments = postDocs.reduce((s, p) => s + (p.commentsCount || 0), 0);
    const topPost = [...postDocs].sort((a, b) => (b.likesCount || 0) - (a.likesCount || 0))[0] || null;
    const topTag = mode(postDocs.map((p) => p.tag).filter(Boolean));
    return { totalLikes, totalComments, topPost, topTag };
  }, [postDocs]);

  return (
    <section style={{ position: "relative", minHeight: "250vh" }}>
      <div style={{ position: "sticky", top: 0, height: "100vh", overflow: "hidden", opacity: 0.8 }}>
        <BgWrap>
          <LetterGlitch
            glitchColors={["#7b61ff", "#00c896", "#06b6d4"]}
            glitchSpeed={45}
            centerVignette={false}
            outerVignette={true}
            smooth={true}
            characters="ABCDEFGHIJKLMNOPQRSTUVWXYZ!@#$&*()-_+=/[]{};:<>.,0123456789"
          />
        </BgWrap>
      </div>
      <div style={{ position: "relative", zIndex: 10, padding: "20vh 5vw", display: "flex", flexDirection: "column", gap: 48, maxWidth: 1000, margin: "0 auto", left: -SIDEBAR_W()/2, }}>
        <GlassCard>
          <ScrollFloat scrollContainerRef={scrollRef} textClassName="text-purple-300">
            {`${postDocs.length} posts shared`}
          </ScrollFloat>
        </GlassCard>

        <GlassCard>
          <ScrollFloat scrollContainerRef={scrollRef} textClassName="text-pink-300">
            {`${stats.totalLikes} likes received`}
          </ScrollFloat>
        </GlassCard>

        <GlassCard>
          <ScrollFloat scrollContainerRef={scrollRef} textClassName="text-violet-300">
            {`${stats.totalComments} conversations started`}
          </ScrollFloat>
        </GlassCard>

        <GlassCard>
          <ScrollReveal scrollContainerRef={scrollRef} enableBlur textClassName="text-blue-300">
            {stats.topPost
              ? `Your most resonant post: "${stats.topPost.title || stats.topPost.tag || "Untitled"}" — ${stats.topPost.likesCount || 0} likes.`
              : "Share your first action on the Action Feed to start your community story."}
          </ScrollReveal>
        </GlassCard>

        <GlassCard>
          <ScrollReveal scrollContainerRef={scrollRef} enableBlur textClassName="text-green-300">
            {`Your signature tag: #${stats.topTag || "sustainability"}`}
          </ScrollReveal>
        </GlassCard>

        {postDocs.length >= 3 && (
          <div style={{ height: 350, position: "relative", marginTop: 20 }}>
            <CircularGallery
              items={postDocs.slice(0, 8).map((p) => ({
                image: p.imageUrl || `https://picsum.photos/seed/${p.id || Math.random()}/400/300`,
                text: p.title || p.tag || "Post",
              }))}
              bend={3}
              textColor="#ffffff"
              borderRadius={0.05}
              scrollSpeed={0.5}
            />
          </div>
        )}
      </div>
    </section>
  );
}

// ─── Section: C5 — APES Learning ─────────────────────────────────────────────
function C5Section({ data, scrollRef }) {
  const { apesDocs } = data;

  const stats = useMemo(() => {
    if (!apesDocs || apesDocs.length === 0) return null;
    const scores = apesDocs.map((s) => (s.total > 0 ? (s.score / s.total) * 100 : 0));
    const avgScore = mean(scores);
    const bestScore = Math.max(...scores, 0);
    const unitsStudied = [...new Set(apesDocs.map((s) => s.unit).filter(Boolean))].join(", ");
    const predictedAP = avgScore >= 90 ? 5 : avgScore >= 75 ? 4 : avgScore >= 60 ? 3 : avgScore >= 45 ? 2 : 1;
    return { avgScore, bestScore, unitsStudied, predictedAP };
  }, [apesDocs]);

  return (
    <section style={{ position: "relative", minHeight: "200vh" }}>
      <div style={{ position: "sticky", top: 0, height: "100vh", overflow: "hidden" }}>
        <BgWrap>
          <PrismaticBurst
            animationType="rotate3d"
            intensity={2}
            speed={0.5}
            distort={0}
            paused={false}
            offset={{ x: 0, y: 0 }}
            hoverDampness={0.25}
            rayCount={0}
            mixBlendMode="lighten"
            color0="#A855F7"
            color1="#7C3AED"
            color2="#6366F1"
          />
        </BgWrap>
      </div>
      <div style={{ position: "relative", zIndex: 10, padding: "20vh 5vw", display: "flex", flexDirection: "column", gap: 48, maxWidth: 1000, margin: "0 auto", left: -SIDEBAR_W()/2, }}>
        {!stats ? (
          <GlassCard>
            <ScrollReveal scrollContainerRef={scrollRef} enableBlur textClassName="text-red-300">
              {"No quiz sessions yet. Head to AP Environmental Science to start practicing."}
            </ScrollReveal>
          </GlassCard>
        ) : (
          <>
            <GlassCard>
              <ScrollFloat scrollContainerRef={scrollRef} textClassName="text-orange-300">
                {`${apesDocs.length} quizzes completed`}
              </ScrollFloat>
            </GlassCard>

            <GlassCard>
              <ScrollFloat scrollContainerRef={scrollRef} textClassName="text-yellow-300">
                {`${stats.bestScore.toFixed(0)}% - best score`}
              </ScrollFloat>
            </GlassCard>

            <GlassCard>
              <ScrollFloat scrollContainerRef={scrollRef} textClassName="text-blue-300">
                {`${stats.avgScore.toFixed(0)}% - average score`}
              </ScrollFloat>
            </GlassCard>

            <GlassCard style={{ border: "1px solid rgba(245,158,11,0.3)", boxShadow: "0 0 40px rgba(245,158,11,0.12)" }}>
              <ScrollFloat
                scrollContainerRef={scrollRef}
                textClassName="text-cyan-300"
                style={{ fontSize: "clamp(2.5rem,6vw,5rem)", fontWeight: 900, textShadow: "0 0 30px rgba(245,158,11,0.5)" }}
              >
                {`Predicted AP Score: ${stats.predictedAP}`}
              </ScrollFloat>
            </GlassCard>

            <GlassCard>
              <ScrollReveal scrollContainerRef={scrollRef} enableBlur textClassName="text-green-300">
                {`Units studied: ${stats.unitsStudied || "None yet"}`}
              </ScrollReveal>
            </GlassCard>

            <GlassCard>
              <ScrollReveal scrollContainerRef={scrollRef} enableBlur textClassName="text-red-300">
                {"Every correct answer is one step closer to a 5. Keep going!"}
              </ScrollReveal>
            </GlassCard>
          </>
        )}
      </div>
    </section>
  );
}

// ─── Section: C6 — Final ─────────────────────────────────────────────────────
function C6Section({ data, scrollRef, onExit }) {
  const { user, postDocs } = data;
  const firstName = user.full_name?.split(" ")[0] || user.username || "Explorer";

  return (
    <section style={{ position: "relative", minHeight: "150vh" }}>
      <div style={{ position: "sticky", top: 0, height: "100vh", overflow: "hidden" }}>
        <BgWrap>
          <Orb hue={120} hoverIntensity={1} rotateOnHover backgroundColor="#000000" enableMouseInteraction/>
        </BgWrap>
      </div>
      <div
        style={{
          position: "relative", zIndex: 10,
          minHeight: "150vh",
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
          padding: "20vh 5vw", textAlign: "center", left: -SIDEBAR_W()/2,
        }}
      >
        <TextType
          text={[
            "That's all for now…",
            `Keep going, ${firstName}.`,
            "Every action counts. 🌿",
          ]}
          typingSpeed={50}
          pauseDuration={2200}
          deletingSpeed={25}
          loop={true}
          className="text-center"
          style={{ fontSize: "clamp(2.5rem,7vw,6rem)", fontWeight: 900, color: "#fff", lineHeight: 1.15 }}
          showCursor
          startOnVisible
        />

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 3, duration: 0.8 }}
          style={{ color: "rgba(255,255,255,0.3)", fontSize: 12, letterSpacing: "0.2em", textTransform: "uppercase", marginTop: 32 }}
        >
          {postDocs.length} posts · Level {user.eco_level || 1} · {(user.treecoins || 0).toLocaleString()} TC
        </motion.div>

        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 4 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.97 }}
          onClick={onExit}
          onMouseEnter={() => {
            confetti({
              particleCount: 40,
              spread: 70,
              origin: { y: 0.6 },
              colors: ['#00c896', '#06b6d4', '#7b61ff', '#ffffff'],
              gravity: 0.8,
              scalar: 1.2,
            });
          }}
          style={{
            marginTop: 48,
            padding: "14px 36px",
            borderRadius: 999,
            border: "none",
            cursor: "pointer",
            fontSize: 14,
            fontWeight: 600,
            color: "#fff",
            background: "linear-gradient(135deg, #c80000, #900000)",
            boxShadow: "0 0 36px rgba(175, 0, 0, 0.6)",
          }}
        >
          EXIT EXPERIENCE
        </motion.button>
      </div>
    </section>
  );
}

// ─── Progress Indicator ───────────────────────────────────────────────────────
function ProgressIndicator({ scrollProgress, activeSection }) {
  const handleDotClick = useCallback((idx) => {
    // navigation via dot is a bonus; main scroll is driven by inner container
  }, []);

  return (
    <>
      {/* Vertical bar */}
      <div style={{ position: "absolute", right: 0, top: 0, width: 3, height: "100%", background: "rgba(255,255,255,0.06)", zIndex: 20 }}>
        <div
          style={{
            width: "100%",
            background: "linear-gradient(to bottom, #00c896, #7b61ff)",
            height: `${scrollProgress * 100}%`,
            transition: "height 0.1s linear",
          }}
        />
      </div>

      {/* Section dots */}
      <div
        style={{
          position: "absolute",
          right: 20,
          top: "50%",
          transform: "translateY(-50%)",
          display: "flex",
          flexDirection: "column",
          gap: 12,
          zIndex: 20,
        }}
      >
        {SECTION_COLORS.map((color, i) => (
          <div
            key={i}
            title={SECTION_NAMES[i]}
            style={{
              width: activeSection === i ? 10 : 6,
              height: activeSection === i ? 10 : 6,
              borderRadius: "50%",
              background: activeSection === i ? color : "rgba(255,255,255,0.2)",
              boxShadow: activeSection === i ? `0 0 8px ${color}` : "none",
              cursor: "default",
              transition: "all 0.3s ease",
            }}
          />
        ))}
      </div>
    </>
  );
}

// ─── Entry Card ───────────────────────────────────────────────────────────────
function EntryCard({ user }) {
  return (
    <div
      style={{
        height: "100%",
        width: "100%",
        background: "#050a0e",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 16,
        padding: "5vw",
        textAlign: "center",
      }}
    >
      {/* Logo mark */}
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.6 }}
        style={{
          width: 64, height: 64, borderRadius: "50%",
          background: "linear-gradient(135deg, #00c896, #7b61ff)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 28, marginBottom: 8,
          boxShadow: "0 0 40px rgba(0,200,150,0.35)",
        }}
      >
        🌿
      </motion.div>

      <motion.h1
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.6 }}
        style={{ fontSize: "clamp(2rem,5vw,4rem)", fontWeight: 900, color: "#fff", letterSpacing: "-0.02em", margin: 0 }}
      >
        Impact Visualizer
      </motion.h1>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        style={{ color: "rgba(255,255,255,0.45)", fontSize: "clamp(0.85rem,2vw,1rem)", maxWidth: 380 }}
      >
        Welcome back, {user?.username || user?.full_name || "Explorer"}
      </motion.p>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.9 }}
        style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, marginTop: 16 }}
      >
        <motion.div
          animate={{ y: [0, 6, 0] }}
          transition={{ repeat: Infinity, duration: 1.6, ease: "easeInOut" }}
          style={{ color: "rgba(255,255,255,0.3)", fontSize: 22 }}
        >
          ↓
        </motion.div>
        <span style={{ color: "rgba(255,255,255,0.25)", fontSize: 11, letterSpacing: "0.2em", textTransform: "uppercase" }}>
          Scroll to begin
        </span>
      </motion.div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function Impact() {
  const triggerRef = useRef(null);
  const panelRef = useRef(null);
  const innerScrollRef = useRef(null);
  const gsapCtxRef = useRef(null);
  const sectionRefs = useRef([]);

  const [isLoading, setIsLoading] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [data, setData] = useState(null);
  const [activeSection, setActiveSection] = useState(0);
  const [innerScrollProgress, setInnerScrollProgress] = useState(0);

  // ── Data loading ─────────────────────────────────────────────────────────
  useEffect(() => {
    async function loadAll() {
      try {
        const user = await User.me();
        const uid = auth.currentUser?.uid;
        if (!uid) throw new Error("No auth");

        const [carbonSnap, postsSnap, apesSnap, allUsersSnap] = await Promise.allSettled([
          getDocs(query(collection(db, "users", uid, "carbon_entries"), orderBy("date", "desc"))),
          getDocs(query(collection(db, "posts"), where("userId", "==", uid))),
          getDocs(collection(db, "users", uid, "apes_sessions")),
          getDocs(collection(db, "users")),
        ]);

        const carbonDocs = carbonSnap.status === "fulfilled"
          ? carbonSnap.value.docs.map((d) => d.data()) : [];
        const postDocs = postsSnap.status === "fulfilled"
          ? postsSnap.value.docs.map((d) => ({ id: d.id, ...d.data() })) : [];
        const apesDocs = apesSnap.status === "fulfilled"
          ? apesSnap.value.docs.map((d) => d.data()) : [];

        let rank = 1;
        if (allUsersSnap.status === "fulfilled") {
          const sorted = allUsersSnap.value.docs
            .map((d) => ({ id: d.id, treecoins: d.data().treecoins || 0 }))
            .sort((a, b) => b.treecoins - a.treecoins);
          rank = sorted.findIndex((u) => u.id === uid) + 1 || 1;
        }

        setData({ user, carbonDocs, postDocs, rank, apesDocs });
      } catch (e) {
        console.error("Impact load error:", e);
        setData({
          user: { full_name: "Explorer", eco_level: 1, treecoins: 0, xp: 0, xp_to_next_level: 25, city: "" },
          carbonDocs: [], postDocs: [], rank: 1, apesDocs: [],
        });
      } finally {
        setIsLoading(false);
      }
    }
    loadAll();
  }, []);

  // ── Panel expansion GSAP + inner scroller proxy ──────────────────────────
  useEffect(() => {
    if (isLoading || !data || !panelRef.current || !triggerRef.current) return;

    const sw = SIDEBAR_W();

    gsap.set(panelRef.current, {
      top: HEADER_H, left: sw, right: -sw, bottom: 0, borderRadius: 12,
    });

    const ctx = gsap.context(() => {
      gsap.to(panelRef.current, {
        top: 0, left: 0, borderRadius: 0,
        ease: "none",
        scrollTrigger: {
          trigger: triggerRef.current,
          start: "top top",
          end: "+=100%",
          scrub: 0.6,
          pin: true,
          onUpdate: (self) => {
            if (self.progress > 0.98) {
              document.body.style.overflow = "hidden";
              setIsFullscreen(true);
            } else {
              document.body.style.overflow = "";
              setIsFullscreen(false);
            }
          },
        },
      });
    });

    gsapCtxRef.current = ctx;

    // Inner scroller proxy
    const inner = innerScrollRef.current;
    if (inner) {
      ScrollTrigger.scrollerProxy(inner, {
        scrollTop(value) {
          if (arguments.length) inner.scrollTop = value;
          return inner.scrollTop;
        },
        getBoundingClientRect() {
          return { top: 0, left: 0, width: window.innerWidth, height: window.innerHeight };
        },
      });

      const onScroll = () => {
        ScrollTrigger.update();
        const totalH = inner.scrollHeight - inner.clientHeight;
        const prog = totalH > 0 ? inner.scrollTop / totalH : 0;
        setInnerScrollProgress(prog);

        // Track active section
        const sections = inner.querySelectorAll("section");
        let activeIdx = 0;
        sections.forEach((sec, i) => {
          const rect = sec.getBoundingClientRect();
          if (rect.top <= window.innerHeight * 0.5) activeIdx = i;
        });
        setActiveSection(activeIdx);
      };

      inner.addEventListener("scroll", onScroll);

      return () => {
        ctx.revert();
        ScrollTrigger.getAll().forEach((t) => t.kill());
        document.body.style.overflow = "";
        document.body.style.height = "";
        inner.removeEventListener("scroll", onScroll);
      };
    }

    return () => {
      ctx.revert();
      ScrollTrigger.getAll().forEach((t) => t.kill());
      document.body.style.overflow = "";
    };
  }, [isLoading, data]);

  // ── Exit handler ──────────────────────────────────────────────────────────
  const handleExit = useCallback(() => {
    if (!panelRef.current) return;
    // Scroll inner container to top
    if (innerScrollRef.current) innerScrollRef.current.scrollTop = 0;
    const sw = SIDEBAR_W();
    gsap.to(panelRef.current, {
      top: HEADER_H,
      left: sw,
      borderRadius: 12,
      duration: 0.8,
      ease: "power2.inOut",
      onComplete: () => {
        document.body.style.overflow = "";
        setIsFullscreen(false);
        window.scrollTo({ top: 0, behavior: "smooth" });
      },
    });
  }, []);

  if (isLoading) return <LoadingScreen />;
  if (!data) return null;

  return (
    <div style={{ background: "#050a0e", minHeight: "100vh" }}>
      {/* ── In-flow trigger element ── */}
      <div ref={triggerRef} style={{ height: "100vh" }}>
        <EntryCard user={data.user} />
      </div>

      {/* ── Fixed expanding panel ── */}
      <div
        ref={panelRef}
        style={{
          position: "fixed",
          top: HEADER_H,
          left: SIDEBAR_W(),
          right: -SIDEBAR_W(),
          bottom: 0,
          zIndex: 60,
          borderRadius: 12,
          overflow: "hidden",
          background: "#050a0e",
        }}
      >
        {/* Progress indicators */}
        {isFullscreen && (
          <ProgressIndicator scrollProgress={innerScrollProgress} activeSection={activeSection} />
        )}

        {/* Inner scroll container */}
        <div
          ref={innerScrollRef}
          style={{
            width: "100%",
            height: "100%",
            overflowY: "scroll",
            overflowX: "hidden",
            scrollbarWidth: "none",
          }}
        >
          {/* Hide scrollbar for webkit */}
          <style>{`
            ::-webkit-scrollbar { display: none; }
          `}</style>

          <InitSection data={data} scrollRef={innerScrollRef} />
          <C1Section data={data} scrollRef={innerScrollRef} />
          <C2Section data={data} scrollRef={innerScrollRef} />
          <C3Section data={data} scrollRef={innerScrollRef} />
          <C4Section data={data} scrollRef={innerScrollRef} />
          <C5Section data={data} scrollRef={innerScrollRef} />
          <C6Section data={data} scrollRef={innerScrollRef} onExit={handleExit} />
        </div>
      </div>
    </div>
  );
}
