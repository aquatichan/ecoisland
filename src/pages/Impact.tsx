// @ts-nocheck
/**
 * Ecoisland Impact — Atmospheric Descent Scroll Experience
 *
 * A cinematic 700vh scroll journey from deep space through Earth's
 * atmospheric layers, revealing the user's sustainability story.
 *
 * Animation library ownership:
 *   GSAP ScrollTrigger  → scroll progress, chapter pinning, clip-path mercury, progress dots
 *   framer-motion       → mount/unmount transitions, text reveals, counters, cross-dissolves
 *   anime.js v3         → SVG path draws, stroke-dashoffset, radial arcs, orbital/meteor animations
 */

import React, {
  useState, useEffect, useRef, useMemo, useCallback,
} from "react";
import { motion, AnimatePresence, useMotionValue, useTransform } from "framer-motion";
import { db, auth } from "@/firebase";
import { collection, query, where, getDocs, orderBy } from "firebase/firestore";
import { User } from "@/entities/User";

// ─── GSAP (loaded via CDN in index.html — declare to satisfy TS) ─────────────
declare const gsap: any;
declare const ScrollTrigger: any;
// ─── anime.js (loaded via CDN in index.html) ──────────────────────────────────
declare const anime: any;

// ─── Types ────────────────────────────────────────────────────────────────────
interface ImpactData {
  full_name: string;
  eco_level: number;
  treecoins: number;
  xp: number;
  city: string | undefined;
  postCount: number;
  topTag: string | null;
  topTagProportion: number;
  avgCO2: number; // kg per day
  hasCarbonData: boolean;
}

// ─── Chapter neon colors ──────────────────────────────────────────────────────
const CHAPTER_NEONS = [
  "#e2e8f0", // 1 Space
  "#00ff87", // 2 Exosphere
  "#ffd700", // 3 Thermosphere
  "#7b61ff", // 4 Mesosphere
  "#00e5ff", // 5 Stratosphere
  "#a78bfa", // 6 Troposphere
];
const CHAPTER_NAMES = ["SPACE", "EXOSPHERE", "THERMOSPHERE", "MESOSPHERE", "STRATOSPHERE", "TROPOSPHERE"];

// ─── Seeded random for deterministic star/particle placement ─────────────────
function seededRng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

// ─── Star field (Chapter 1 & 2) ──────────────────────────────────────────────
function StarField({ count = 220, opacity = 1 }: { count?: number; opacity?: number }) {
  const stars = useMemo(() => {
    const rng = seededRng(42);
    return Array.from({ length: count }, (_, i) => {
      // Milky-way clustering: bias toward edges
      const side = rng() > 0.5 ? 1 : 0;
      const x = side === 0 ? rng() * 35 : 65 + rng() * 35;
      const y = rng() * 100;
      const size = 0.5 + rng() * 2;
      const op = 0.2 + rng() * 0.8;
      return { x, y, size, op, key: i };
    });
  }, [count]);

  return (
    <svg
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }}
      aria-hidden="true"
    >
      {stars.map(s => (
        <circle
          key={s.key}
          cx={`${s.x}%`}
          cy={`${s.y}%`}
          r={s.size}
          fill={`rgba(180,200,255,${s.op * opacity})`}
        />
      ))}
    </svg>
  );
}

// ─── Chapter 1: SPACE ────────────────────────────────────────────────────────
function ChapterSpace({ data, visible }: { data: ImpactData; visible: boolean }) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [revealed, setRevealed] = useState(false);
  const animeInstancesRef = useRef<any[]>([]);

  const rings = useMemo(() => [
    { r: 58, dur: 72000, color: "rgba(180,200,255,0.55)", planet: { color: "#b4c8ff", size: 5 }, startAngle: 0 },
    { r: 94, dur: 105000, color: "rgba(255,255,255,0.38)", planet: { color: "#f5cba0", size: 7 }, startAngle: 1.8 },
    { r: 136, dur: 148000, color: "rgba(255,255,255,0.28)", planet: { color: "#a8d8a0", size: 6 }, startAngle: 3.4 },
    { r: 180, dur: 196000, color: "rgba(255,255,255,0.22)", planet: { color: "#b0c4de", size: 9 }, startAngle: 0.6 },
    { r: 228, dur: 256000, color: "rgba(255,255,255,0.16)", planet: { color: "#d4a8b0", size: 6 }, startAngle: 2.2 },
    { r: 284, dur: 328000, color: "rgba(255,255,255,0.11)", planet: { color: "#a0c0ff", size: 8 }, startAngle: 4.2 },
  ], []);

  useEffect(() => {
    if (!visible || revealed) return;
    if (typeof anime === "undefined") return;

    let delay = 0;
    const instances: any[] = [];

    rings.forEach((ring, i) => {
      const circumference = 2 * Math.PI * ring.r;
      const el = svgRef.current?.querySelector(`#ring-${i}`) as SVGCircleElement;
      if (!el) return;
      el.style.strokeDasharray = `${circumference}`;
      el.style.strokeDashoffset = `${circumference}`;

      instances.push(
        anime({
          targets: el,
          strokeDashoffset: [circumference, 0],
          easing: "easeInOutQuart",
          duration: 1200,
          delay,
          complete: () => {
            // After ring draws, animate planet via angle property
            const planetEl = svgRef.current?.querySelector(`#planet-${i}`) as SVGCircleElement;
            if (!planetEl) return;

            // Fade in planet
            anime({ targets: planetEl, opacity: [0, 0.9], duration: 600, easing: "easeInSine" });

            // Orbit animation — update cx/cy each frame
            const angleObj = { angle: ring.startAngle };
            instances.push(
              anime({
                targets: angleObj,
                angle: ring.startAngle + 2 * Math.PI * 1000,
                duration: ring.dur * 1000,
                easing: "linear",
                loop: true,
                update: () => {
                  planetEl.setAttribute("cx", String(ring.r * Math.cos(angleObj.angle)));
                  planetEl.setAttribute("cy", String(ring.r * Math.sin(angleObj.angle)));
                },
              })
            );
          },
        })
      );
      delay += 200;
    });

    animeInstancesRef.current = instances;
    setTimeout(() => setRevealed(true), delay + 800);

    return () => {
      instances.forEach(a => a?.pause?.());
    };
  }, [visible, revealed, rings]);

  return (
    <div style={{ position: "absolute", inset: 0, background: "#000000", overflow: "hidden" }}>
      <StarField count={220} />

      {/* Orbital system — centered */}
      <svg
        ref={svgRef}
        viewBox="-300 -300 600 600"
        style={{
          position: "absolute",
          top: "50%", left: "50%",
          transform: "translate(-50%, -50%)",
          width: "min(620px, 88vw)", height: "min(620px, 88vw)",
          overflow: "visible",
        }}
        aria-hidden="true"
      >
        {/* Sun bloom */}
        <circle cx="0" cy="0" r="32" fill="rgba(255,240,150,0.04)" />
        <circle cx="0" cy="0" r="22" fill="rgba(255,240,150,0.08)" />
        <circle cx="0" cy="0" r="14" fill="#fff8e0"
          style={{ filter: "drop-shadow(0 0 20px #fff5c0) drop-shadow(0 0 50px rgba(255,240,150,0.5))" }} />

        {rings.map((ring, i) => {
          const px = ring.r * Math.cos(ring.startAngle);
          const py = ring.r * Math.sin(ring.startAngle);
          return (
            <g key={i}>
              <circle
                id={`ring-${i}`}
                cx="0" cy="0"
                r={ring.r}
                fill="none"
                stroke={ring.color}
                strokeWidth="1"
                style={{ filter: "drop-shadow(0 0 3px rgba(255,255,255,0.15))" }}
              />
              <circle
                id={`planet-${i}`}
                cx={px} cy={py}
                r={ring.planet.size}
                fill={ring.planet.color}
                opacity="0"
                style={{ filter: `drop-shadow(0 0 6px ${ring.planet.color})` }}
              />
            </g>
          );
        })}
      </svg>

      {/* Text reveals */}
      <div style={{
        position: "absolute", bottom: "18%", left: 0, right: 0,
        display: "flex", flexDirection: "column", alignItems: "center", gap: 14,
        zIndex: 10,
      }}>
        <AnimatePresence>
          {revealed && (
            <>
              <motion.h1
                key="name"
                initial={{ opacity: 0, filter: "blur(12px)", letterSpacing: "0.5em" }}
                animate={{ opacity: 1, filter: "blur(0px)", letterSpacing: "0.02em" }}
                transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                style={{
                  fontWeight: 900,
                  fontSize: "clamp(2.5rem, 8vw, 7rem)",
                  color: "white",
                  lineHeight: 1,
                  textAlign: "center",
                  padding: "0 1.5rem",
                  fontVariationSettings: "'wght' 900",
                }}
              >
                {data.full_name || "—"}
              </motion.h1>

              <motion.p
                key="tagline"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5, duration: 0.6 }}
                style={{
                  fontWeight: 400, fontSize: "0.72rem",
                  letterSpacing: "0.25em", textTransform: "uppercase",
                  color: "rgba(255,255,255,0.45)",
                }}
              >
                {"your Ecoisland story begins here".split(" ").map((w, i) => (
                  <motion.span key={i}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.6 + i * 0.08 }}
                    style={{ marginRight: 6 }}
                  >
                    {w}
                  </motion.span>
                ))}
              </motion.p>

              <motion.div
                key="xp"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.4, duration: 0.5 }}
                style={{
                  padding: "6px 20px",
                  border: "1px solid rgba(255,255,255,0.18)",
                  borderRadius: 9999,
                  background: "rgba(255,255,255,0.04)",
                  fontSize: "0.72rem",
                  letterSpacing: "0.22em",
                  color: "rgba(255,255,255,0.55)",
                  textTransform: "uppercase",
                }}
              >
                {data.xp ?? 0} XP
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ─── Chapter 2: EXOSPHERE ────────────────────────────────────────────────────
function ChapterExosphere({ data, visible }: { data: ImpactData; visible: boolean }) {
  const arcRef = useRef<SVGCircleElement>(null);
  const [arcDone, setArcDone] = useState(false);
  const circumference = 2 * Math.PI * 140;

  useEffect(() => {
    if (!visible || arcDone) return;
    if (!arcRef.current || typeof anime === "undefined") return;

    arcRef.current.style.strokeDasharray = `${circumference}`;
    arcRef.current.style.strokeDashoffset = `${circumference}`;

    anime({
      targets: arcRef.current,
      strokeDashoffset: [circumference, 0],
      easing: "easeInOutQuart",
      duration: 2400,
      complete: () => {
        setArcDone(true);
        // Pulse glow
        anime({
          targets: arcRef.current,
          filter: [
            "drop-shadow(0 0 12px #00ff87)",
            "drop-shadow(0 0 28px #00ff87) drop-shadow(0 0 60px rgba(0,255,135,0.3))",
            "drop-shadow(0 0 12px #00ff87)",
          ],
          easing: "easeInOutSine",
          duration: 3000,
          loop: true,
        });
      },
    });
  }, [visible, arcDone, circumference]);

  // Counter
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!arcDone) return;
    let start = 0;
    const target = data.eco_level || 1;
    const steps = 60;
    const inc = target / steps;
    const interval = setInterval(() => {
      start += inc;
      if (start >= target) { setCount(target); clearInterval(interval); }
      else setCount(Math.floor(start));
    }, 1800 / steps);
    return () => clearInterval(interval);
  }, [arcDone, data.eco_level]);

  return (
    <div style={{
      position: "absolute", inset: 0,
      background: "linear-gradient(180deg, #000810 0%, #020d1a 60%, #031428 100%)",
      overflow: "hidden",
    }}>
      <StarField count={160} opacity={0.7} />

      {/* Earth limb — bottom third */}
      <svg
        style={{ position: "absolute", bottom: 0, left: 0, width: "100%", height: "40%", overflow: "visible" }}
        viewBox="0 0 1440 300" preserveAspectRatio="xMidYMax meet"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="atmo-grad" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="rgba(80,160,255,0.5)" />
            <stop offset="100%" stopColor="rgba(10,30,80,0.2)" />
          </linearGradient>
        </defs>
        <ellipse cx="720" cy="800" rx="900" ry="700"
          fill="none"
          stroke="rgba(100,180,255,0.55)"
          strokeWidth="2"
          style={{ filter: "drop-shadow(0 0 10px rgba(100,180,255,0.4))" }}
        />
        <ellipse cx="720" cy="800" rx="920" ry="716"
          fill="url(#atmo-grad)"
          opacity="0.15"
        />
      </svg>

      {/* Sun flare — top right */}
      <svg
        style={{ position: "absolute", top: "8%", right: "8%", width: 120, height: 120 }}
        viewBox="0 0 120 120" aria-hidden="true"
      >
        <circle cx="60" cy="60" r="6" fill="white"
          style={{ filter: "drop-shadow(0 0 10px white) drop-shadow(0 0 25px white)" }} />
        {[0, 35, 70, 105, 145, 190, 230, 270, 310].map((angle, i) => {
          const len = 18 + (i % 3) * 6;
          const rad = (angle * Math.PI) / 180;
          return (
            <line key={i}
              x1={60} y1={60}
              x2={60 + Math.cos(rad) * (8 + len)} y2={60 + Math.sin(rad) * (8 + len)}
              stroke="white" strokeWidth="1"
              strokeOpacity={0.2 + (i % 3) * 0.1}
            />
          );
        })}
        {[20, 35, 50].map((r, i) => (
          <circle key={i} cx="60" cy="60" r={r} fill="none"
            stroke={`rgba(255,255,255,${0.12 - i * 0.03})`} strokeWidth="0.5" />
        ))}
      </svg>

      {/* Eco Level Arc */}
      <div style={{
        position: "absolute", top: "50%", left: "50%",
        transform: "translate(-50%, -55%)",
        display: "flex", flexDirection: "column", alignItems: "center",
      }}>
        <svg
          width="320" height="320"
          viewBox="-160 -160 320 320"
          style={{ overflow: "visible" }}
          aria-hidden="true"
        >
          {/* Track */}
          <circle cx="0" cy="0" r="140" fill="none"
            stroke="rgba(0,255,135,0.1)" strokeWidth="3" />
          {/* Animated arc */}
          <circle
            ref={arcRef}
            cx="0" cy="0" r="140"
            fill="none"
            stroke="#00ff87"
            strokeWidth="3"
            strokeLinecap="round"
            transform="rotate(-90)"
            style={{
              filter: "drop-shadow(0 0 12px #00ff87)",
              strokeDasharray: circumference,
              strokeDashoffset: circumference,
            }}
          />
        </svg>

        {/* Number inside arc */}
        <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -55%)", textAlign: "center" }}>
          <AnimatePresence>
            {arcDone && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              >
                <div style={{
                  fontWeight: 900,
                  fontSize: "clamp(4rem, 10vw, 7rem)",
                  color: "#00ff87",
                  lineHeight: 1,
                  fontVariationSettings: "'wght' 900",
                }}>
                  {count}
                </div>
                <div style={{
                  fontWeight: 400, fontSize: "0.75rem",
                  letterSpacing: "0.2em", textTransform: "uppercase",
                  color: "#94a3b8", marginTop: 6,
                }}>
                  ECO LEVEL
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

// ─── Chapter 3: THERMOSPHERE ─────────────────────────────────────────────────
function ChapterThermosphere({ data, visible }: { data: ImpactData; visible: boolean }) {
  const meteorContainerRef = useRef<SVGSVGElement>(null);
  const leafContainerRef = useRef<SVGGElement>(null);
  const [digitsVisible, setDigitsVisible] = useState(false);
  const neons = ["#00ff87", "#ffd700", "#7b61ff", "#00e5ff", "#ff6b35", "#a78bfa"];

  useEffect(() => {
    if (!visible || typeof anime === "undefined") return;

    // Meteors
    const svg = meteorContainerRef.current;
    if (svg) {
      const meteors = Array.from({ length: 25 }, (_, i) => {
        const rng = seededRng(i * 17 + 7);
        const x1 = rng() * 100;
        const y1 = rng() * 60;
        const angle = -25 - rng() * 20;
        const len = 80 + rng() * 140;
        const color = neons[i % neons.length];
        const sw = 1.5 + rng() * 1.5;
        const id = `meteor-${i}`;
        const gradId = `mg-${i}`;

        const rad = (angle * Math.PI) / 180;
        const x2 = x1 + (Math.cos(rad) * len) / 10;
        const y2 = y1 + (Math.sin(rad) * len) / 10;

        const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
        line.id = id;
        line.setAttribute("x1", `${x1}%`);
        line.setAttribute("y1", `${y1}%`);
        line.setAttribute("x2", `${x2}%`);
        line.setAttribute("y2", `${y2}%`);
        line.setAttribute("stroke", color);
        line.setAttribute("stroke-width", `${sw}`);
        line.setAttribute("opacity", "0");
        line.style.filter = `drop-shadow(0 0 4px ${color})`;
        svg.appendChild(line);

        return { id, dur: 800 + rng() * 600, delay: rng() * 3000 };
      });

      meteors.forEach(({ id, dur, delay }) => {
        const el = document.getElementById(id);
        if (!el) return;
        anime({
          targets: el,
          opacity: [0, 1, 0],
          translateX: ["0%", "30%"],
          translateY: ["0%", "20%"],
          easing: "linear",
          duration: dur,
          delay,
          loop: true,
        });
      });
    }

    // Show digits after short delay
    setTimeout(() => setDigitsVisible(true), 600);
  }, [visible]); // eslint-disable-line

  const treecoinStr = String(data.treecoins || 0);

  return (
    <div style={{
      position: "absolute", inset: 0,
      background: "linear-gradient(180deg, #0a0a2e 0%, #12082e 50%, #1a0a3e 100%)",
      overflow: "hidden",
    }}>
      {/* Leaf SVG background */}
      <svg
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }}
        aria-hidden="true"
      >
        {Array.from({ length: 30 }, (_, i) => {
          const rng = seededRng(i * 23 + 3);
          const x = rng() * 100;
          const scale = 0.5 + rng() * 1;
          const color = [neons[0], neons[1], neons[5]][i % 3];
          const delay = rng() * 4;
          const dur = 6 + rng() * 8;
          return (
            <path
              key={i}
              d="M0,-12 C5,-8 8,0 5,10 C2,18 -2,18 -5,10 C-8,0 -5,-8 0,-12 Z"
              fill={color}
              opacity="0.5"
              style={{
                transform: `translate(${x}vw, 110vh) scale(${scale})`,
                animation: `leaf-rise-${i} ${dur}s ${delay}s linear infinite`,
                filter: `drop-shadow(0 0 4px ${color})`,
              }}
            />
          );
        })}
      </svg>

      {/* Meteor shower canvas */}
      <svg
        ref={meteorContainerRef}
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }}
        aria-hidden="true"
      />

      {/* Treecoin counter */}
      <div style={{
        position: "absolute", top: "50%", left: "50%",
        transform: "translate(-50%, -50%)",
        textAlign: "center", zIndex: 10,
      }}>
        <AnimatePresence>
          {digitsVisible && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
            >
              <div style={{ display: "flex", justifyContent: "center", gap: 4, overflow: "hidden" }}>
                {treecoinStr.split("").map((digit, i) => (
                  <motion.div
                    key={`${digit}-${i}`}
                    initial={{ y: 40, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{
                      delay: i * 0.08,
                      duration: 0.6,
                      ease: [0.16, 1, 0.3, 1],
                    }}
                    style={{
                      fontWeight: 900,
                      fontSize: "clamp(4rem, 12vw, 9rem)",
                      color: "#ffd700",
                      lineHeight: 1,
                      fontVariationSettings: "'wght' 900",
                      textShadow: "0 0 40px rgba(255,215,0,0.4), 0 0 80px rgba(255,215,0,0.2)",
                    }}
                  >
                    {digit}
                  </motion.div>
                ))}
              </div>

              <motion.div
                initial={{ opacity: 0, filter: "blur(8px)", letterSpacing: "0.5em" }}
                animate={{ opacity: 1, filter: "blur(0px)", letterSpacing: "0.25em" }}
                transition={{ delay: treecoinStr.length * 0.08 + 0.2, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                style={{
                  fontWeight: 400, fontSize: "0.75rem",
                  letterSpacing: "0.25em", textTransform: "uppercase",
                  color: "#94a3b8", marginTop: 12,
                }}
              >
                TREECOINS
              </motion.div>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.5 }}
                transition={{ delay: treecoinStr.length * 0.08 + 0.5 }}
                style={{
                  fontSize: "0.75rem", color: "#ffd700",
                  letterSpacing: "0.15em", marginTop: 6,
                }}
              >
                your green currency
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Inline keyframes for leaf rise */}
      <style>{`
        ${Array.from({ length: 30 }, (_, i) => {
          const rng = seededRng(i * 23 + 3);
          const dx = (rng() - 0.5) * 20;
          const rot = (rng() - 0.5) * 360;
          return `
            @keyframes leaf-rise-${i} {
              0%   { transform: translate(calc(${rng() * 100}vw), 110vh) scale(${0.5 + rng() * 1}) rotate(0deg); opacity: 0; }
              10%  { opacity: 0.6; }
              90%  { opacity: 0.3; }
              100% { transform: translate(calc(${rng() * 100}vw + ${dx}vw), -10vh) scale(${0.5 + rng() * 1}) rotate(${rot}deg); opacity: 0; }
            }
          `;
        }).join("")}
      `}</style>
    </div>
  );
}

// ─── Chapter 4: MESOSPHERE ───────────────────────────────────────────────────
function ChapterMesosphere({ data, visible }: { data: ImpactData; visible: boolean }) {
  const [cardsVisible, setCardsVisible] = useState(false);
  const [snapped, setSnapped] = useState(false);

  useEffect(() => {
    if (!visible || cardsVisible) return;
    setTimeout(() => setCardsVisible(true), 300);
  }, [visible, cardsVisible]);

  useEffect(() => {
    if (cardsVisible && !snapped) {
      setTimeout(() => setSnapped(true), 1800);
    }
  }, [cardsVisible, snapped]);

  const postCount = data.postCount || 0;
  const topTag = data.topTag;
  const proportion = data.topTagProportion || 0;
  const arcCircum = 2 * Math.PI * 60;
  const arcRef = useRef<SVGCircleElement>(null);

  useEffect(() => {
    if (!snapped || !arcRef.current || typeof anime === "undefined") return;
    const fill = arcCircum * (1 - proportion);
    arcRef.current.style.strokeDasharray = `${arcCircum}`;
    arcRef.current.style.strokeDashoffset = `${arcCircum}`;
    anime({
      targets: arcRef.current,
      strokeDashoffset: [arcCircum, fill],
      duration: 1600,
      easing: "easeInOutQuart",
    });
  }, [snapped, arcCircum, proportion]);

  const cardVariants = [
    { rotate: -15, x: -200 },
    { rotate: 0, x: 0 },
    { rotate: 15, x: 200 },
  ];

  return (
    <div style={{
      position: "absolute", inset: 0,
      background: "#030818",
      overflow: "hidden",
    }}>
      {/* Aurora curtain */}
      <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
        {Array.from({ length: 8 }, (_, i) => {
          const rng = seededRng(i * 31);
          const w = 6 + rng() * 8;
          const left = (i / 8) * 100 + (rng() - 0.5) * 5;
          const colors = i % 3 === 0
            ? ["#00ff87", "#0a1628"]
            : i % 3 === 1
            ? ["#a78bfa", "#030818"]
            : ["#00ff87", "#a78bfa"];
          const dur = 6 + rng() * 8;
          const delay = rng() * 3;
          const opacity = 0.15 + rng() * 0.2;

          return (
            <div
              key={i}
              style={{
                position: "absolute",
                left: `${left}%`,
                top: 0,
                width: `${w}vw`,
                height: "100vh",
                background: `linear-gradient(180deg, ${colors[0]} 0%, ${colors[1]} 100%)`,
                opacity,
                filter: "blur(24px)",
                animation: `aurora-sway-${i} ${dur}s ${delay}s ease-in-out infinite`,
                transformOrigin: "center center",
              }}
            />
          );
        })}
      </div>

      {/* Aurora animation keyframes */}
      <style>{`
        ${Array.from({ length: 8 }, (_, i) => {
          const rng = seededRng(i * 31);
          const skewX = (rng() - 0.5) * 6;
          return `
            @keyframes aurora-sway-${i} {
              0%, 100% { transform: scaleY(1) skewX(0deg); }
              33%       { transform: scaleY(1.12) skewX(${skewX}deg); }
              66%       { transform: scaleY(0.88) skewX(${-skewX}deg); }
            }
          `;
        }).join("")}
      `}</style>

      {/* Post cards */}
      <div style={{
        position: "absolute", top: "30%", left: "50%",
        transform: "translate(-50%, 0)",
        width: 260, height: 340,
        zIndex: 10,
      }}>
        <AnimatePresence>
          {cardsVisible && (
            <>
              {[0, 1, 2].map((idx) => {
                const fanPos = cardVariants[idx];
                return (
                  <motion.div
                    key={idx}
                    initial={{ rotate: 0, x: 0, opacity: 0 }}
                    animate={snapped
                      ? { rotate: 0, x: 0, opacity: 1 }
                      : { rotate: fanPos.rotate, x: fanPos.x, opacity: 1 }
                    }
                    transition={snapped
                      ? { type: "spring", stiffness: 400, damping: 30 }
                      : { duration: 0.6, delay: idx * 0.1 }
                    }
                    style={{
                      position: "absolute",
                      width: 240, height: 320,
                      borderRadius: 16,
                      backdropFilter: "blur(20px)",
                      background: "rgba(123,97,255,0.08)",
                      border: "1px solid rgba(123,97,255,0.25)",
                      padding: 20,
                      transformOrigin: "bottom center",
                    }}
                  >
                    <div style={{ width: 40, height: 40, borderRadius: "50%", background: "rgba(123,97,255,0.3)" }} />
                    <div style={{ marginTop: 12, width: "80%", height: 10, borderRadius: 5, background: "rgba(255,255,255,0.1)" }} />
                    <div style={{ marginTop: 8, width: "60%", height: 8, borderRadius: 5, background: "rgba(255,255,255,0.06)" }} />
                    <div style={{ marginTop: 20, width: "100%", height: 80, borderRadius: 8, background: "rgba(123,97,255,0.1)" }} />
                  </motion.div>
                );
              })}
            </>
          )}
        </AnimatePresence>
      </div>

      {/* Post count text */}
      <AnimatePresence>
        {snapped && (
          <motion.div
            initial={{ opacity: 0, filter: "blur(8px)", letterSpacing: "0.4em" }}
            animate={{ opacity: 1, filter: "blur(0px)", letterSpacing: "0.02em" }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            style={{
              position: "absolute",
              top: "18%", left: "50%",
              transform: "translateX(-50%)",
              textAlign: "center", zIndex: 15,
              fontWeight: 900,
              fontSize: "clamp(1.5rem, 4vw, 2.8rem)",
              color: "white",
              width: "80%",
              maxWidth: 600,
            }}
          >
            {postCount > 0
              ? `You shared ${postCount} moment${postCount !== 1 ? "s" : ""}.`
              : "Your story starts with the first post."
            }
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top action arc */}
      <AnimatePresence>
        {snapped && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            style={{
              position: "absolute",
              bottom: "12%", left: "50%",
              transform: "translateX(-50%)",
              display: "flex", flexDirection: "column",
              alignItems: "center", gap: 8, zIndex: 15,
            }}
          >
            <svg width="160" height="160" viewBox="-80 -80 160 160" aria-hidden="true">
              <circle cx="0" cy="0" r="60" fill="none"
                stroke="rgba(255,107,53,0.15)" strokeWidth="3" />
              <circle
                ref={arcRef}
                cx="0" cy="0" r="60"
                fill="none"
                stroke="#ff6b35"
                strokeWidth="3"
                strokeLinecap="round"
                transform="rotate(-90)"
                style={{
                  strokeDasharray: arcCircum,
                  strokeDashoffset: arcCircum,
                  filter: "drop-shadow(0 0 8px #ff6b35)",
                }}
              />
              <text x="0" y="6" textAnchor="middle"
                fill="#ff6b35" fontSize="18" fontWeight="900">
                {proportion > 0 ? `${Math.round(proportion * 100)}%` : "—"}
              </text>
            </svg>
            <div style={{
              fontSize: "0.75rem", letterSpacing: "0.2em",
              textTransform: "uppercase", color: "#94a3b8",
            }}>
              {topTag ? `#${topTag}` : "Start your first action."}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Chapter 5: STRATOSPHERE ──────────────────────────────────────────────────
function ChapterStratosphere({ data, visible }: { data: ImpactData; visible: boolean }) {
  const arcRef = useRef<SVGPathElement>(null);
  const [arcDone, setArcDone] = useState(false);
  const r = 160;
  const sweep = 270;
  const circumference = 2 * Math.PI * r * (sweep / 360);
  const annualCO2 = data.avgCO2 > 0 ? Math.round(data.avgCO2 * 365) : null;

  useEffect(() => {
    if (!visible || arcDone) return;
    if (!arcRef.current || typeof anime === "undefined") return;

    // Get actual path length for accurate dasharray
    const pathLength = arcRef.current.getTotalLength?.() || circumference;
    arcRef.current.style.strokeDasharray = `${pathLength}`;
    arcRef.current.style.strokeDashoffset = `${pathLength}`;

    const targetOffset = data.hasCarbonData ? 0 : pathLength * 0.7;

    anime({
      targets: arcRef.current,
      strokeDashoffset: [pathLength, targetOffset],
      easing: "easeInOutExpo",
      duration: 3000,
      complete: () => setArcDone(true),
    });
  }, [visible, arcDone, circumference, data.hasCarbonData, r]);

  // Compute SVG arc path for 270° gauge
  const gaugeArc = useMemo(() => {
    const startAngle = -225 * (Math.PI / 180);
    const endAngle = 45 * (Math.PI / 180);
    const x1 = 200 + r * Math.cos(startAngle);
    const y1 = 200 + r * Math.sin(startAngle);
    const x2 = 200 + r * Math.cos(endAngle);
    const y2 = 200 + r * Math.sin(endAngle);
    return `M ${x1} ${y1} A ${r} ${r} 0 1 1 ${x2} ${y2}`;
  }, [r]);

  return (
    <div style={{
      position: "absolute", inset: 0,
      background: "linear-gradient(180deg, #020d1a 0%, #051528 50%, #0a1628 100%)",
      overflow: "hidden",
    }}>
      {/* Earth curvature */}
      <svg
        style={{ position: "absolute", bottom: 0, left: 0, width: "100%", height: "30%", overflow: "visible" }}
        viewBox="0 0 1440 200" preserveAspectRatio="xMidYMax meet"
        aria-hidden="true"
      >
        <ellipse cx="720" cy="600" rx="1000" ry="600"
          fill="none"
          stroke="rgba(100,180,255,0.35)"
          strokeWidth="1.5"
          style={{ filter: "drop-shadow(0 0 8px rgba(100,180,255,0.2))" }}
        />
      </svg>

      {/* Tron perspective grid */}
      <svg
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }}
        aria-hidden="true"
      >
        {/* Horizontal lines */}
        {Array.from({ length: 12 }, (_, i) => {
          const y = 50 + i * 4.5;
          const spread = 10 + i * 8;
          return (
            <line key={`h-${i}`}
              x1={`${50 - spread}%`} y1={`${y}%`}
              x2={`${50 + spread}%`} y2={`${y}%`}
              stroke="rgba(0,229,255,0.08)"
              strokeWidth="1"
            />
          );
        })}
        {/* Vertical/perspective lines */}
        {Array.from({ length: 9 }, (_, i) => {
          const t = (i / 8);
          const xTop = 50 + (t - 0.5) * 5;
          const xBot = 50 + (t - 0.5) * 100;
          return (
            <line key={`v-${i}`}
              x1={`${xTop}%`} y1="50%"
              x2={`${xBot}%`} y2="100%"
              stroke="rgba(0,229,255,0.06)"
              strokeWidth="1"
            />
          );
        })}
      </svg>

      {/* Carbon gauge */}
      <div style={{
        position: "absolute", top: "50%", left: "50%",
        transform: "translate(-50%, -55%)",
        display: "flex", flexDirection: "column", alignItems: "center",
      }}>
        <svg width="400" height="400" viewBox="0 0 400 400"
          style={{ overflow: "visible" }} aria-hidden="true">
          {/* Gauge track */}
          <path d={gaugeArc} fill="none"
            stroke="rgba(0,229,255,0.1)"
            strokeWidth="4" strokeLinecap="round" />
          {/* Animated gauge */}
          <path
            ref={arcRef}
            d={gaugeArc}
            fill="none"
            stroke="#00e5ff"
            strokeWidth="4"
            strokeLinecap="round"
            style={{
              filter: "drop-shadow(0 0 16px #00e5ff)",
            }}
          />

          {/* Leaf icon inside arc — appears when arc completes */}
          <AnimatePresence>
            {arcDone && data.hasCarbonData && (
              <motion.g
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                style={{ transformOrigin: "200px 185px" }}
              >
                <path d="M200,175 C208,165 220,168 220,178 C220,192 208,200 200,200 C192,200 180,192 180,178 C180,168 192,165 200,175 Z"
                  fill="rgba(0,229,255,0.2)" stroke="#00e5ff" strokeWidth="1.5"
                  style={{ filter: "drop-shadow(0 0 6px #00e5ff)" }}
                />
              </motion.g>
            )}
          </AnimatePresence>
        </svg>

        {/* Value */}
        <AnimatePresence>
          {arcDone && (
            <motion.div
              initial={{ opacity: 0, filter: "blur(8px)" }}
              animate={{ opacity: 1, filter: "blur(0px)" }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              style={{ textAlign: "center", marginTop: -80 }}
            >
              <div style={{
                fontWeight: 900,
                fontSize: "clamp(3rem, 9vw, 7rem)",
                color: "#00e5ff",
                lineHeight: 1,
                fontVariationSettings: "'wght' 900",
                textShadow: "0 0 40px rgba(0,229,255,0.3)",
              }}>
                {data.hasCarbonData ? annualCO2 : "No data yet."}
              </div>
              {data.hasCarbonData && (
                <>
                  <div style={{
                    fontSize: "0.75rem", letterSpacing: "0.2em",
                    textTransform: "uppercase", color: "#94a3b8", marginTop: 8,
                  }}>
                    kg CO₂e / year
                  </div>
                  <div style={{
                    fontSize: "0.75rem", color: "rgba(148,163,184,0.6)",
                    marginTop: 6, letterSpacing: "0.1em",
                  }}>
                    your annual footprint
                  </div>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ─── Chapter 6: TROPOSPHERE ──────────────────────────────────────────────────
function ChapterTroposphere({ data, visible }: { data: ImpactData; visible: boolean }) {
  const lineRef = useRef<SVGLineElement>(null);
  const [lineDrawn, setLineDrawn] = useState(false);
  const [namesVisible, setNamesVisible] = useState(false);

  useEffect(() => {
    if (!visible || lineDrawn) return;
    if (!lineRef.current || typeof anime === "undefined") return;

    setTimeout(() => {
      anime({
        targets: lineRef.current,
        x1: ["50vw", "0vw"],
        x2: ["50vw", "100vw"],
        easing: "easeOutExpo",
        duration: 1800,
        complete: () => {
          setLineDrawn(true);
          setTimeout(() => setNamesVisible(true), 200);
        },
      });
    }, 400);
  }, [visible, lineDrawn]);

  // Sonar rings via anime.js
  const sonarRing1Ref = useRef<SVGCircleElement>(null);
  const sonarRing2Ref = useRef<SVGCircleElement>(null);
  const sonarRing3Ref = useRef<SVGCircleElement>(null);

  useEffect(() => {
    if (!lineDrawn) return;
    if (typeof anime === "undefined") return;

    [sonarRing1Ref, sonarRing2Ref, sonarRing3Ref].forEach((ref, i) => {
      if (!ref.current) return;
      anime({
        targets: ref.current,
        r: [0, 200],
        opacity: [0.7, 0],
        strokeWidth: [3, 0.5],
        easing: "easeOutQuad",
        duration: 2400,
        delay: i * 600,
        loop: true,
      });
    });
  }, [lineDrawn]);

  const city = data.city || "Somewhere on Earth.";
  const neons = ["#00ff87", "#ffd700", "#7b61ff", "#00e5ff", "#ff6b35", "#a78bfa"];
  const glowPositions = [
    { x: "15%", y: "20%", color: neons[0] },
    { x: "80%", y: "15%", color: neons[1] },
    { x: "5%", y: "65%", color: neons[2] },
    { x: "75%", y: "70%", color: neons[3] },
    { x: "45%", y: "5%", color: neons[4] },
    { x: "60%", y: "85%", color: neons[5] },
  ];

  return (
    <div style={{
      position: "absolute", inset: 0,
      background: "linear-gradient(180deg, #0a1020 0%, #0c1820 60%, #0d1a0a 100%)",
      overflow: "hidden",
    }}>
      {/* Horizon glow */}
      <div style={{
        position: "absolute", bottom: 0, left: 0, right: 0, height: "40%",
        background: "radial-gradient(ellipse at 50% 100%, rgba(0,255,135,0.08) 0%, transparent 60%)",
        pointerEvents: "none",
      }} />

      {/* All six chapter radial glows */}
      {glowPositions.map((g, i) => (
        <div key={i} style={{
          position: "absolute",
          left: g.x, top: g.y,
          width: "40vw", height: "40vw",
          borderRadius: "50%",
          background: `radial-gradient(ellipse, ${g.color} 0%, transparent 70%)`,
          opacity: 0.07,
          transform: "translate(-50%, -50%)",
          pointerEvents: "none",
          animation: "aurora-hue 20s linear infinite",
          animationDelay: `${i * -3}s`,
        }} />
      ))}

      {/* Floating particles */}
      {Array.from({ length: 30 }, (_, i) => {
        const rng = seededRng(i * 13 + 99);
        const size = 2 + rng() * 4;
        const left = rng() * 100;
        const color = neons[i % neons.length];
        const dur = 8 + rng() * 12;
        const delay = rng() * 8;
        return (
          <div
            key={i}
            className="impact-particle"
            style={{
              width: size, height: size,
              left: `${left}%`,
              bottom: `-${size}px`,
              background: color,
              animationDuration: `${dur}s`,
              animationDelay: `${delay}s`,
              opacity: 0.6,
              boxShadow: `0 0 ${size * 2}px ${color}`,
            }}
          />
        );
      })}

      {/* Sonar rings */}
      <svg
        style={{
          position: "absolute", top: "50%", left: "50%",
          transform: "translate(-50%, -50%)",
          width: 400, height: 400,
          pointerEvents: "none",
        }}
        viewBox="-200 -200 400 400" aria-hidden="true"
      >
        <circle ref={sonarRing1Ref} cx="0" cy="0" r="0" fill="none"
          stroke="#a78bfa" strokeWidth="3" opacity="0" />
        <circle ref={sonarRing2Ref} cx="0" cy="0" r="0" fill="none"
          stroke="#a78bfa" strokeWidth="3" opacity="0" />
        <circle ref={sonarRing3Ref} cx="0" cy="0" r="0" fill="none"
          stroke="#a78bfa" strokeWidth="3" opacity="0" />
      </svg>

      {/* Center line + text */}
      <svg
        style={{
          position: "absolute", top: "50%", left: 0,
          width: "100%", height: 2,
          transform: "translateY(-50%)",
          pointerEvents: "none",
          zIndex: 5,
        }}
        aria-hidden="true"
      >
        <line
          ref={lineRef}
          x1="50vw" y1="1"
          x2="50vw" y2="1"
          stroke="rgba(255,255,255,0.4)"
          strokeWidth="1"
        />
      </svg>

      <div style={{
        position: "absolute", top: "50%", left: "50%",
        transform: "translate(-50%, -50%)",
        textAlign: "center", zIndex: 10,
        width: "90%", maxWidth: 800,
      }}>
        {/* City name */}
        <AnimatePresence>
          {visible && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              style={{
                fontWeight: 900,
                fontSize: "clamp(2.5rem, 8vw, 7rem)",
                color: "#a78bfa",
                lineHeight: 1,
                marginBottom: 8,
                fontVariationSettings: "'wght' 900",
                textShadow: "0 0 40px rgba(167,139,250,0.3)",
              }}
            >
              {city.split("").map((char, i) => (
                <motion.span
                  key={i}
                  initial={{ opacity: 0, filter: "blur(8px)" }}
                  animate={{ opacity: 1, filter: "blur(0px)" }}
                  transition={{ delay: 0.6 + i * 0.06, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                >
                  {char}
                </motion.span>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {visible && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.2 }}
              style={{
                fontSize: "0.75rem", letterSpacing: "0.2em",
                textTransform: "uppercase", color: "#94a3b8",
                marginBottom: 48,
              }}
            >
              your corner of Earth
            </motion.div>
          )}
        </AnimatePresence>

        {/* Closing text */}
        <AnimatePresence>
          {namesVisible && (
            <>
              <motion.div
                initial={{ x: -40, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                style={{
                  fontWeight: 400,
                  fontSize: "clamp(1.5rem, 4vw, 3.5rem)",
                  color: "rgba(255,255,255,0.7)",
                  lineHeight: 1.2,
                  marginBottom: 4,
                }}
              >
                Keep going,
              </motion.div>
              <motion.div
                initial={{ x: 40, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.2, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              >
                <motion.span
                  animate={{
                    x: [0, 4, -4, 0],
                    filter: ["hue-rotate(0deg)", "hue-rotate(90deg)", "hue-rotate(-90deg)", "hue-rotate(0deg)"],
                  }}
                  transition={{ delay: 1.2, duration: 0.24, repeat: 2 }}
                  style={{
                    display: "inline-block",
                    fontWeight: 900,
                    fontSize: "clamp(2rem, 7vw, 6rem)",
                    color: "white",
                    fontVariationSettings: "'wght' 900",
                    lineHeight: 1,
                  }}
                >
                  {data.full_name || "—"}
                </motion.span>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>

      {/* Aurora hue keyframe */}
      <style>{`
        @keyframes aurora-hue {
          0%   { filter: hue-rotate(0deg); }
          100% { filter: hue-rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

// ─── Progress Dots ────────────────────────────────────────────────────────────
function ProgressDots({ activeChapter }: { activeChapter: number }) {
  return (
    <div style={{
      position: "fixed",
      right: 24, top: "50%",
      transform: "translateY(-50%)",
      display: "flex", flexDirection: "column",
      gap: 14, zIndex: 100,
      pointerEvents: "none",
    }}>
      {CHAPTER_NAMES.map((name, i) => (
        <div key={i} style={{
          display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
        }}>
          <div style={{
            width: activeChapter === i ? 10 : 6,
            height: activeChapter === i ? 10 : 6,
            borderRadius: "50%",
            background: activeChapter === i ? CHAPTER_NEONS[i] : "rgba(255,255,255,0.25)",
            boxShadow: activeChapter === i ? `0 0 10px ${CHAPTER_NEONS[i]}, 0 0 20px ${CHAPTER_NEONS[i]}55` : "none",
            transition: "all 0.3s ease",
          }} />
          <div style={{
            fontSize: 7,
            letterSpacing: "0.15em",
            textTransform: "uppercase",
            color: activeChapter === i ? CHAPTER_NEONS[i] : "rgba(255,255,255,0.2)",
            transition: "color 0.3s ease",
            writingMode: "vertical-rl",
            display: "none", // hidden on small; show via media query in CSS
          }}>
            {name}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Chapter Transition Overlay ───────────────────────────────────────────────
function ChapterTransition({ fromChapter, progress }: { fromChapter: number; progress: number }) {
  return (
    <div style={{
      position: "absolute", inset: 0,
      background: `rgba(5,10,14,${Math.sin(Math.PI * progress) * 0.7})`,
      pointerEvents: "none",
      zIndex: 5,
    }} />
  );
}

// ─── Main Impact component ────────────────────────────────────────────────────
export default function Impact() {
  const containerRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const [data, setData] = useState<ImpactData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeChapter, setActiveChapter] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [chapterProgress, setChapterProgress] = useState(0);
  const originRef = useRef({ x: 50, y: 50 });
  const gsapCtxRef = useRef<any>(null);

  // ── Load data from Firebase ──────────────────────────────────────────────
  useEffect(() => {
    async function load() {
      try {
        const user = await User.me();
        const uid = auth.currentUser?.uid;
        if (!uid) throw new Error("No auth");

        const [carbonSnap, postsSnap] = await Promise.all([
          getDocs(query(collection(db, "carbon_logs"), where("userId", "==", uid))).catch(() => ({ docs: [] })),
          getDocs(query(collection(db, "posts"), where("userId", "==", uid))).catch(() => ({ docs: [] })),
        ]);

        // Carbon
        const carbonDocs = (carbonSnap as any).docs.map((d: any) => d.data());
        const hasCarbonData = carbonDocs.length > 0;
        const avgCO2 = hasCarbonData
          ? carbonDocs.reduce((sum: number, d: any) => sum + (d.total_co2 || d.total_emissions || 0), 0) / carbonDocs.length
          : 0;

        // Posts
        const postDocs = (postsSnap as any).docs.map((d: any) => d.data());
        const postCount = postDocs.length;
        const tagCounts: Record<string, number> = {};
        postDocs.forEach((p: any) => { if (p.tag) tagCounts[p.tag] = (tagCounts[p.tag] || 0) + 1; });
        const topTag = Object.keys(tagCounts).sort((a, b) => tagCounts[b] - tagCounts[a])[0] || null;
        const totalWithTags = postDocs.filter((p: any) => p.tag).length;
        const topTagProportion = topTag && totalWithTags > 0 ? tagCounts[topTag] / totalWithTags : 0;

        setData({
          full_name: user.full_name || user.username || "Explorer",
          eco_level: user.eco_level || 1,
          treecoins: user.treecoins || 0,
          xp: user.xp || 0,
          city: user.city,
          postCount,
          topTag,
          topTagProportion,
          avgCO2,
          hasCarbonData,
        });
      } catch (e) {
        console.error("Impact data load error:", e);
        // Fallback empty state
        setData({
          full_name: "Explorer",
          eco_level: 1, treecoins: 0, xp: 0, city: undefined,
          postCount: 0, topTag: null, topTagProportion: 0,
          avgCO2: 0, hasCarbonData: false,
        });
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, []);

  // ── GSAP ScrollTrigger setup ─────────────────────────────────────────────
  useEffect(() => {
    if (isLoading || !data) return;
    if (typeof gsap === "undefined" || typeof ScrollTrigger === "undefined") return;

    // Capture origin for mercury pop-out
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      originRef.current = {
        x: ((rect.left + rect.width / 2) / window.innerWidth) * 100,
        y: ((rect.top + rect.height / 2) / window.innerHeight) * 100,
      };
    }

    gsap.registerPlugin(ScrollTrigger);
    const ctx = gsap.context(() => {
      const { x, y } = originRef.current;

      // Mercury pop-out — clip-path reveal
      if (overlayRef.current) {
        gsap.fromTo(
          overlayRef.current,
          { clipPath: `circle(0% at ${x}% ${y}%)` },
          {
            clipPath: `circle(150% at ${x}% ${y}%)`,
            ease: "none",
            scrollTrigger: {
              trigger: containerRef.current,
              start: "top 80%",
              end: "top 20%",
              scrub: 0.5,
              onUpdate: (self: any) => {
                if (self.progress >= 0.5 && !document.body.classList.contains("impact-fullscreen")) {
                  document.body.classList.add("impact-fullscreen");
                  setIsFullscreen(true);
                } else if (self.progress < 0.5 && document.body.classList.contains("impact-fullscreen")) {
                  document.body.classList.remove("impact-fullscreen");
                  setIsFullscreen(false);
                }
              },
              onLeaveBack: () => {
                document.body.classList.remove("impact-fullscreen");
                setIsFullscreen(false);
              },
            },
          }
        );
      }

      // Chapter tracking
      for (let i = 0; i < 6; i++) {
        const chEl = document.getElementById(`impact-chapter-${i}`);
        if (!chEl) continue;
        ScrollTrigger.create({
          trigger: chEl,
          start: "top center",
          end: "bottom center",
          onEnter: () => setActiveChapter(i),
          onEnterBack: () => setActiveChapter(i),
        });
      }
    });
    gsapCtxRef.current = ctx;

    return () => {
      ctx.revert();
      document.body.classList.remove("impact-fullscreen");
    };
  }, [isLoading, data]);

  // ── Intersection Observer for chapter visibility ─────────────────────────
  const [visibleChapters, setVisibleChapters] = useState<boolean[]>([false, false, false, false, false, false]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          const id = entry.target.id;
          const idx = parseInt(id.replace("impact-chapter-", ""));
          if (!isNaN(idx) && entry.isIntersecting) {
            setVisibleChapters(prev => {
              const next = [...prev];
              next[idx] = true;
              return next;
            });
          }
        });
      },
      { threshold: 0.3 }
    );

    for (let i = 0; i < 6; i++) {
      const el = document.getElementById(`impact-chapter-${i}`);
      if (el) observer.observe(el);
    }

    return () => observer.disconnect();
  }, [isLoading]);

  // ── Loading state ─────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div style={{
        minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
        background: "#050a0e",
      }}>
        <div style={{ textAlign: "center" }}>
          <div style={{
            width: 48, height: 48, border: "2px solid rgba(0,255,135,0.3)",
            borderTopColor: "#00ff87", borderRadius: "50%",
            animation: "spin 1s linear infinite", margin: "0 auto 16px",
          }} />
          <p style={{
            color: "#00ff87", fontSize: "0.75rem",
            letterSpacing: "0.25em", textTransform: "uppercase",
          }}>
            Scanning the cosmos…
          </p>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!data) return null;

  const chapters = [
    <ChapterSpace key="space" data={data} visible={visibleChapters[0]} />,
    <ChapterExosphere key="exo" data={data} visible={visibleChapters[1]} />,
    <ChapterThermosphere key="thermo" data={data} visible={visibleChapters[2]} />,
    <ChapterMesosphere key="meso" data={data} visible={visibleChapters[3]} />,
    <ChapterStratosphere key="strato" data={data} visible={visibleChapters[4]} />,
    <ChapterTroposphere key="tropo" data={data} visible={visibleChapters[5]} />,
  ];

  return (
    <>
      {/* ── GSAP + anime.js CDN scripts ── */}
      {/* These should be loaded in index.html. If not present, nothing will break; 
          animations will simply not fire. Add to index.html <head>:
          <script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js"></script>
          <script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/ScrollTrigger.min.js"></script>
          <script src="https://cdnjs.cloudflare.com/ajax/libs/animejs/3.2.1/anime.min.js"></script>
      */}

      {/* ── Entry card — triggers mercury pop-out on scroll ── */}
      <div
        ref={containerRef}
        style={{
          position: "relative",
          minHeight: "100vh",
        }}
      >
        {/* Mercury overlay — clips to reveal the full experience */}
        <div
          ref={overlayRef}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 40,
            backdropFilter: "blur(40px) saturate(180%)",
            background: "rgba(5,10,14,0.88)",
            clipPath: `circle(0% at ${originRef.current.x}% ${originRef.current.y}%)`,
            pointerEvents: isFullscreen ? "none" : "all",
          }}
        />

        {/* ── 6 pinned chapters ── */}
        <div style={{ position: "relative", zIndex: 50 }}>
          {chapters.map((chap, i) => (
            <div
              key={i}
              id={`impact-chapter-${i}`}
              style={{
                position: "sticky",
                top: 0,
                height: "100vh",
                overflow: "hidden",
              }}
            >
              {/* Chapter background gradient glow */}
              <div style={{
                position: "absolute", inset: 0,
                background: `radial-gradient(ellipse at center, ${CHAPTER_NEONS[i]} 0%, transparent 65%)`,
                opacity: 0.07,
                pointerEvents: "none",
                zIndex: 1,
              }} />

              {/* Chapter content */}
              <div style={{ position: "relative", zIndex: 2, width: "100%", height: "100%" }}>
                {chap}
              </div>

              {/* Layer label — bottom left */}
              <div style={{
                position: "absolute",
                bottom: 24, left: 24,
                zIndex: 20,
                fontWeight: 400,
                fontSize: "0.65rem",
                letterSpacing: "0.3em",
                textTransform: "uppercase",
                color: `${CHAPTER_NEONS[i]}88`,
              }}>
                {CHAPTER_NAMES[i]}
              </div>

              {/* Scroll indicator on first chapter */}
              {i === 0 && (
                <motion.div
                  animate={{ y: [0, 8, 0] }}
                  transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                  style={{
                    position: "absolute",
                    bottom: 24, left: "50%",
                    transform: "translateX(-50%)",
                    zIndex: 20,
                    display: "flex", flexDirection: "column",
                    alignItems: "center", gap: 6,
                  }}
                >
                  <div style={{
                    width: 1, height: 40,
                    background: "linear-gradient(180deg, transparent, rgba(255,255,255,0.4))",
                  }} />
                  <div style={{
                    fontSize: "0.6rem", letterSpacing: "0.3em",
                    color: "rgba(255,255,255,0.3)", textTransform: "uppercase",
                  }}>
                    SCROLL
                  </div>
                </motion.div>
              )}
            </div>
          ))}

          {/* Exit spacer — scrolling through this reverses the mercury pop-out */}
          <div style={{ height: "20vh", background: "#050a0e" }} />
        </div>

        {/* Progress dots — visible during experience */}
        <AnimatePresence>
          {isFullscreen && <ProgressDots activeChapter={activeChapter} />}
        </AnimatePresence>
      </div>

    </>
  );
}
