// @ts-nocheck
import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { motion, useScroll, useTransform } from "framer-motion";
import { createPageUrl } from "@/utils";
import {
  Leaf, Globe, Camera, BarChart3, Recycle, Trophy, BookOpen,
  ArrowRight, ChevronDown, Sparkles, TreePine, Zap, Users, Sun, Moon
} from "lucide-react";
import { User } from "@/entities/User";
import { useTheme } from "@/context/ThemeContext";
import { db } from "@/firebase";
import { collection, getDocs, orderBy, query, limit, getCountFromServer, getAggregateFromServer, sum } from "firebase/firestore";

const features = [
  { icon: TreePine, title: "Your Island", desc: "Build and customize a living Ecoisland that grows with every sustainable action you take.", color: "#00c896", delay: 0.1 },
  { icon: Leaf, title: "Carbon Footprint", desc: "Track and reduce your daily carbon output with intelligent logging and analysis.", color: "#0d845d", delay: 0.1 },
  { icon: Globe, title: "Regional Data", desc: "Discover AI-powered environmental scores and volunteer opportunities in your city.", color: "#06b6d4", delay: 0.1 },
  { icon: Camera, title: "Danger Scan", desc: "Capture possible environmental hazards and get instant AI analysis alongside action plans.", color: "#f97316", delay: 0.1 },
  { icon: Recycle, title: "Action Feed", desc: "Post and share your actions with a global community of sustainability activists.", color: "#8b5cf6", delay: 0.1 },
  { icon: BarChart3, title: "Impact Visualizer", desc: "Watch your contributions come to life in a parallax scroller cinematic data dashboard.", color: "#ec4899", delay: 0.1 },
  { icon: BookOpen, title: "APES Guide To A 5", desc: "Score higher on APES unit tests and exams with comprehensive, verified study materials.", color: "#ffffff", delay: 0.1 },
];

// Stats are loaded dynamically from Firebase

// Pixel art SVG clouds
const PixelCloud = ({ x, y, scale = 1, opacity = 0.7, delay = 0 }) => (
  <motion.div
    className="absolute select-none pointer-events-none"
    style={{ left: `${x}%`, top: `${y}%` }}
    animate={{ x: [0, 20, 0], y: [0, -6, 0] }}
    transition={{ duration: 14 + delay * 3, repeat: Infinity, ease: "easeInOut", delay }}
  >
    <svg width={120 * scale} height={60 * scale} viewBox="0 0 120 60" style={{ opacity }}>
      <rect x="20" y="30" width="80" height="20" fill="white" />
      <rect x="30" y="20" width="30" height="20" fill="white" />
      <rect x="60" y="15" width="25" height="20" fill="white" />
      <rect x="10" y="35" width="15" height="10" fill="white" />
      <rect x="95" y="35" width="15" height="10" fill="white" />
    </svg>
  </motion.div>
);

// Floating treecoin
const FloatingCoin = ({ x, y, delay = 0 }) => (
  <motion.div
    className="absolute pointer-events-none select-none"
    style={{ left: `${x}%`, top: `${y}%` }}
    animate={{ y: [0, -15, 0], rotate: [0, 360] }}
    transition={{ duration: 6 + delay * 2, repeat: Infinity, ease: "easeInOut", delay }}
  >
    <div className="w-8 h-8 rounded-full flex items-center justify-center shadow-lg" style={{ background: "linear-gradient(135deg, #00c896, #06b6d4)", boxShadow: "0 0 15px rgba(0,200,150,0.5)" }}>
      <TreePine className="w-4 h-4 text-white" />
    </div>
  </motion.div>
);

// Pixel island SVG
const PixelIsland = () => (
  <svg viewBox="0 0 400 220" className="w-full max-w-sm mx-auto" style={{ filter: "drop-shadow(0 20px 40px rgba(0,200,150,0.3))" }}>
    {/* Island base */}
    <ellipse cx="200" cy="173" rx="150" ry="35" fill="#2d5a3d" />
    <ellipse cx="200" cy="165" rx="140" ry="30" fill="#3d7a50" />
    {/* Ground */}
    <rect x="80" y="140" width="240" height="30" fill="#4ade80" rx="4" />
    <rect x="70" y="148" width="260" height="20" fill="#34d399" rx="4" />
    {/* Trees */}
    <rect x="100" y="100" width="8" height="45" fill="#92400e" />
    <polygon points="104,60 88,105 120,105" fill="#15803d" />
    <polygon points="104,45 85,95 123,95" fill="#16a34a" />
    <rect x="170" y="105" width="6" height="38" fill="#92400e" />
    <polygon points="173,70 160,108 186,108" fill="#15803d" />
    <rect x="270" y="95" width="10" height="48" fill="#92400e" />
    <polygon points="275,55 257,100 293,100" fill="#166534" />
    <polygon points="275,40 254,90 296,90" fill="#15803d" />
    {/* Buildings */}
    <rect x="210" y="100" width="30" height="45" fill="#1e40af" rx="2" />
    <rect x="213" y="103" width="8" height="10" fill="#93c5fd" rx="1" />
    <rect x="225" y="103" width="8" height="10" fill="#93c5fd" rx="1" />
    <rect x="213" y="118" width="8" height="10" fill="#93c5fd" rx="1" />
    <rect x="225" y="118" width="8" height="10" fill="#93c5fd" rx="1" />
    <polygon points="225,85 210,102 240,102" fill="#1d4ed8" />
    <rect x="240" y="115" width="22" height="30" fill="#7c3aed" rx="2" />
    <rect x="243" y="118" width="6" height="8" fill="#c4b5fd" rx="1" />
    <rect x="253" y="118" width="6" height="8" fill="#c4b5fd" rx="1" />
    {/* Car */}
    <rect x="135" y="136" width="28" height="12" fill="#ef4444" rx="3" />
    <rect x="139" y="130" width="20" height="10" fill="#fca5a5" rx="2" />
    <circle cx="141" cy="149" r="4" fill="#1f2937" />
    <circle cx="157" cy="149" r="4" fill="#1f2937" />
  </svg>
);

// Deterministic pseudo-random so React doesn't re-generate on render
function seeded(seed) {
  let s = seed;
  return () => { s = (s * 1664525 + 1013904223) & 0xffffffff; return (s >>> 0) / 0xffffffff; };
}

const CityscapeHero = ({ isDark }) => {
  const sky = isDark
    ? { top: "#020818", mid: "#071428", bot: "#0a1f14" }
    : { top: "#4fc3f7", mid: "#81d4fa", bot: "#b2ebf2" };
  const groundFar = isDark ? "#0a1f14" : "#388e3c";
  const groundMid = isDark ? "#061510" : "#2e7d32";
  const groundNear = isDark ? "#040e09" : "#1b5e20";
  const roadColor = isDark ? "#111827" : "#37474f";
  const sunMoonY = isDark ? 55 : 68;
  const sunMoonR = isDark ? 18 : 32;
  const winLit = isDark ? "#fde68a" : "#1565c0";
  const winDark = isDark ? "#0d1f17" : "#bbdefb";
  const buildFar = isDark ? "#0d1b29" : "#90a4ae";
  const buildMid = isDark ? "#0a2218" : "#607d8b";
  const buildNear = isDark ? "#061510" : "#455a64";
  const rand = seeded(42);

  const farBuildings = Array.from({ length: 14 }, (_, i) => ({
    x: 30 + i * 68 + rand() * 20,
    w: 35 + rand() * 40,
    h: 80 + rand() * 140,
    windows: Math.floor(2 + rand() * 4),
    floors: Math.floor(3 + rand() * 8),
  }));

  const midBuildings = Array.from({ length: 10 }, (_, i) => ({
    x: 10 + i * 95 + rand() * 30,
    w: 50 + rand() * 55,
    h: 110 + rand() * 160,
    windows: Math.floor(2 + rand() * 5),
    floors: Math.floor(4 + rand() * 10),
  }));

  const nearBuildings = Array.from({ length: 6 }, (_, i) => ({
    x: 20 + i * 160 + rand() * 40,
    w: 70 + rand() * 80,
    h: 150 + rand() * 120,
    windows: Math.floor(3 + rand() * 4),
    floors: Math.floor(5 + rand() * 8),
  }));

  const stars = Array.from({ length: 80 }, () => ({
    cx: rand() * 960,
    cy: rand() * 200,
    r: rand() * 1.8 + 0.5,
    opacity: 0.4 + rand() * 0.6,
    dur: 2 + rand() * 4,
    delay: rand() * 4,
  }));

  const birds = Array.from({ length: 6 }, (_, i) => ({
    x: 60 + i * 130 + rand() * 60,
    y: 40 + rand() * 80,
    scale: 0.6 + rand() * 0.8,
    dur: 6 + rand() * 6,
    delay: rand() * 4,
  }));

  const carsRight = Array.from({ length: 5 }, (_, i) => ({
    id: `cr${i}`,
    startX: -120 + i * 220,
    y: 383,
    color: isDark ? "#ffffff" : ["#e53935", "#1e88e5", "#43a047", "#fdd835", "#e0e0e0"][i % 5],
    lightColor: isDark ? "#fffde7" : "transparent",
    dur: 7 + i * 1.2,
  }));

  const carsLeft = Array.from({ length: 4 }, (_, i) => ({
    id: `cl${i}`,
    startX: 980 + i * 200,
    y: 396,
    color: isDark ? "#334155" : ["#8d6e63", "#5e35b1", "#00897b", "#fb8c00"][i % 4],
    lightColor: isDark ? "#ef4444" : "transparent",
    dur: 8 + i * 1.5,
  }));

  return (
    <svg
      viewBox="0 0 960 450"
      xmlns="http://www.w3.org/2000/svg"
      style={{ width: "100%", display: "block", transition: "all 1.2s ease" }}
      aria-label="Cityscape"
    >
      <defs>
        <linearGradient id="skyGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={sky.top} />
          <stop offset="55%" stopColor={sky.mid} />
          <stop offset="100%" stopColor={sky.bot} />
        </linearGradient>
        <radialGradient id="sunGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={isDark ? "#fbbf24" : "#fff176"} stopOpacity="1" />
          <stop offset="60%" stopColor={isDark ? "#f59e0b" : "#ffee58"} stopOpacity="0.4" />
          <stop offset="100%" stopColor="transparent" stopOpacity="0" />
        </radialGradient>
        <filter id="glow">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
        <filter id="softBlur">
          <feGaussianBlur stdDeviation="1.5" />
        </filter>
        <filter id="headlightGlow">
          <feGaussianBlur stdDeviation="4" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>

      <rect width="960" height="450" fill="url(#skyGrad)" />
      {isDark && stars.map((s, i) => (
        <circle key={i} cx={s.cx} cy={s.cy} r={s.r} fill="white" opacity={s.opacity}>
          <animate attributeName="opacity" values={`${s.opacity};1;${s.opacity}`} dur={`${s.dur}s`} begin={`${s.delay}s`} repeatCount="indefinite" />
        </circle>
      ))}
      <circle cx={820} cy={sunMoonY} r={sunMoonR * 2.2} fill={isDark ? "url(#sunGlow)" : "rgba(255,236,64,0.18)"} filter="url(#softBlur)" />
      <circle cx={820} cy={sunMoonY} r={sunMoonR} fill={isDark ? "#fbbf24" : "#fff176"} stroke={isDark ? "#f59e0b" : "#ffee58"} strokeWidth={isDark ? 2 : 0} filter="url(#glow)" />
      {isDark && (
        <>
          <circle cx={810} cy={50} r={4} fill="#f59e0b" opacity="0.5" />
          <circle cx={828} cy={62} r={3} fill="#f59e0b" opacity="0.4" />
          <circle cx={815} cy={65} r={2} fill="#f59e0b" opacity="0.3" />
        </>
      )}
      {!isDark && Array.from({ length: 8 }, (_, i) => {
        const angle = (i / 8) * Math.PI * 2;
        const x1 = 820 + Math.cos(angle) * (sunMoonR + 6);
        const y1 = sunMoonY + Math.sin(angle) * (sunMoonR + 6);
        const x2 = 820 + Math.cos(angle) * (sunMoonR + 18);
        const y2 = sunMoonY + Math.sin(angle) * (sunMoonR + 18);
        return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#ffee58" strokeWidth="2.5" strokeLinecap="round" opacity="0.8" />;
      })}
      {!isDark && [
        { x: 60, y: 55, w: 110 }, { x: 220, y: 35, w: 90 }, { x: 400, y: 50, w: 130 }, { x: 580, y: 30, w: 100 }, { x: 700, y: 60, w: 80 },
      ].map((c, i) => (
        <g key={i} opacity="0.9">
          <ellipse cx={c.x + c.w * 0.5} cy={c.y + 12} rx={c.w * 0.5} ry={14} fill="white" />
          <ellipse cx={c.x + c.w * 0.3} cy={c.y + 8} rx={c.w * 0.3} ry={12} fill="white" />
          <ellipse cx={c.x + c.w * 0.7} cy={c.y + 6} rx={c.w * 0.28} ry={11} fill="white" />
          <animateTransform attributeName="transform" type="translate" values={`0,0; ${8 + i * 3},0; 0,0`} dur={`${14 + i * 3}s`} repeatCount="indefinite" />
        </g>
      ))}
      {isDark && [
        { x: 80, y: 45, w: 100 }, { x: 320, y: 30, w: 130 }, { x: 620, y: 50, w: 90 },
      ].map((c, i) => (
        <g key={i} opacity="0.25">
          <ellipse cx={c.x + c.w * 0.5} cy={c.y + 12} rx={c.w * 0.5} ry={14} fill="#60a5fa" />
          <ellipse cx={c.x + c.w * 0.3} cy={c.y + 8} rx={c.w * 0.3} ry={12} fill="#93c5fd" />
          <animateTransform attributeName="transform" type="translate" values={`0,0; ${6 + i * 2},0; 0,0`} dur={`${18 + i * 4}s`} repeatCount="indefinite" />
        </g>
      ))}
      {!isDark && birds.map((b, i) => (
        <g key={i} transform={`translate(${b.x},${b.y}) scale(${b.scale})`} opacity="0.7">
          <path d="M0,0 Q4,-4 8,0 Q4,-6 0,0" fill="none" stroke="#37474f" strokeWidth="1.5" />
          <animateTransform attributeName="transform" type="translate" from={`${b.x},${b.y}`} to={`${b.x + 200},${b.y - 20}`} dur={`${b.dur}s`} begin={`${b.delay}s`} repeatCount="indefinite" />
        </g>
      ))}
      {farBuildings.map((b, i) => {
        const groundY = 290;
        const top = groundY - b.h;
        return (
          <g key={i}>
            <rect x={b.x} y={top} width={b.w} height={b.h} fill={buildFar} />
            {i % 3 === 0 && <rect x={b.x + b.w / 2 - 1} y={top - 20} width={2} height={20} fill={buildFar} />}
            {Array.from({ length: b.floors }, (_, f) =>
              Array.from({ length: b.windows }, (_, w) => {
                const lit = isDark ? seeded(i * 100 + f * 10 + w)() > 0.35 : seeded(i * 100 + f * 10 + w)() > 0.6;
                return (
                  <rect key={`${f}-${w}`} x={b.x + 4 + w * ((b.w - 8) / b.windows)} y={top + 8 + f * (b.h / b.floors)} width={Math.max(3, (b.w - 8) / b.windows - 4)} height={Math.max(4, b.h / b.floors - 6)} fill={lit ? winLit : winDark} opacity={lit ? (isDark ? 0.9 : 0.6) : 0.4} />
                );
              })
            )}
          </g>
        );
      })}
      {midBuildings.map((b, i) => {
        const groundY = 320;
        const top = groundY - b.h;
        return (
          <g key={i}>
            <rect x={b.x} y={top} width={b.w} height={b.h} fill={buildMid} />
            {i % 2 === 0 && <rect x={b.x + b.w * 0.3} y={top - 10} width={b.w * 0.4} height={12} fill={buildMid} />}
            {Array.from({ length: b.floors }, (_, f) =>
              Array.from({ length: b.windows }, (_, w) => {
                const lit = isDark ? seeded(i * 200 + f * 10 + w)() > 0.3 : false;
                return (
                  <rect key={`${f}-${w}`} x={b.x + 5 + w * ((b.w - 10) / b.windows)} y={top + 8 + f * (b.h / b.floors)} width={Math.max(4, (b.w - 10) / b.windows - 5)} height={Math.max(5, b.h / b.floors - 7)} fill={lit ? winLit : winDark} opacity={lit ? 0.95 : 0.3} />
                );
              })
            )}
          </g>
        );
      })}
      <rect x="0" y="318" width="960" height="60" fill={groundFar} />
      {!isDark && [80, 180, 560, 660, 760].map((x, i) => (
        <g key={i}>
          <rect x={x + 4} y={310} width={5} height={18} fill="#5d4037" />
          <circle cx={x + 6} cy={308} r={10} fill="#388e3c" />
          <circle cx={x + 3} cy={312} r={7} fill="#43a047" />
          <circle cx={x + 9} cy={313} r={7} fill="#2e7d32" />
        </g>
      ))}
      {nearBuildings.map((b, i) => {
        const groundY = 355;
        const top = groundY - b.h;
        return (
          <g key={i}>
            <rect x={b.x} y={top} width={b.w} height={b.h} fill={buildNear} />
            <rect x={b.x - 3} y={top} width={b.w + 6} height={8} fill={buildNear} opacity="0.6" />
            {Array.from({ length: b.floors }, (_, f) =>
              Array.from({ length: b.windows }, (_, w) => {
                const lit = isDark ? seeded(i * 300 + f * 10 + w)() > 0.25 : false;
                const ww = Math.max(6, (b.w - 16) / b.windows - 6);
                const wh = Math.max(7, b.h / b.floors - 8);
                return (
                  <rect key={`${f}-${w}`} x={b.x + 8 + w * ((b.w - 16) / b.windows)} y={top + 14 + f * (b.h / b.floors)} width={ww} height={wh} fill={lit ? winLit : winDark} opacity={lit ? 1 : 0.25}>
                    {isDark && lit && (
                      <animate attributeName="opacity" values="1;0.85;1;0.9;1" dur={`${3 + seeded(i * f + w)() * 5}s`} repeatCount="indefinite" />
                    )}
                  </rect>
                );
              })
            )}
          </g>
        );
      })}
      <rect x="0" y="352" width="960" height="30" fill={groundMid} />
      <rect x="0" y="370" width="960" height="48" fill={roadColor} />
      <rect x="0" y="368" width="960" height="4" fill={isDark ? "#1f2937" : "#546e7a"} />
      <rect x="0" y="418" width="960" height="4" fill={isDark ? "#1f2937" : "#546e7a"} />
      {Array.from({ length: 20 }, (_, i) => (
        <rect key={i} x={i * 52} y={392} width={28} height={3} rx={1} fill={isDark ? "#4b5563" : "#78909c"} opacity="0.8" />
      ))}
      <rect x="0" y="372" width="960" height="2" fill={isDark ? "#374151" : "#607d8b"} opacity="0.5" />
      <rect x="0" y="415" width="960" height="2" fill={isDark ? "#374151" : "#607d8b"} opacity="0.5" />
      {carsRight.map(car => (
        <g key={car.id}>
          <rect x="0" y={car.y - 10} width="44" height="14" rx="4" fill={car.color}>
            <animateTransform attributeName="transform" type="translate" from={`${car.startX},0`} to={`${car.startX + 1080},0`} dur={`${car.dur}s`} repeatCount="indefinite" />
          </rect>
          <rect x="8" y={car.y - 18} width="24" height="10" rx="3" fill={car.color} opacity="0.9">
            <animateTransform attributeName="transform" type="translate" from={`${car.startX},0`} to={`${car.startX + 1080},0`} dur={`${car.dur}s`} repeatCount="indefinite" />
          </rect>
          {isDark && (
            <>
              <ellipse cx="45" cy={car.y - 3} rx="14" ry="5" fill={car.lightColor} opacity="0.3" filter="url(#headlightGlow)">
                <animateTransform attributeName="transform" type="translate" from={`${car.startX},0`} to={`${car.startX + 1080},0`} dur={`${car.dur}s`} repeatCount="indefinite" />
              </ellipse>
              <rect x="43" y={car.y - 6} width="4" height="4" rx="1" fill={car.lightColor}>
                <animateTransform attributeName="transform" type="translate" from={`${car.startX},0`} to={`${car.startX + 1080},0`} dur={`${car.dur}s`} repeatCount="indefinite" />
              </rect>
            </>
          )}
          <circle cx="8" cy={car.y + 5} r="5" fill={isDark ? "#111" : "#212121"}>
            <animateTransform attributeName="transform" type="translate" from={`${car.startX},0`} to={`${car.startX + 1080},0`} dur={`${car.dur}s`} repeatCount="indefinite" />
          </circle>
          <circle cx="36" cy={car.y + 5} r="5" fill={isDark ? "#111" : "#212121"}>
            <animateTransform attributeName="transform" type="translate" from={`${car.startX},0`} to={`${car.startX + 1080},0`} dur={`${car.dur}s`} repeatCount="indefinite" />
          </circle>
        </g>
      ))}
      {carsLeft.map(car => (
        <g key={car.id}>
          <rect x="0" y={car.y - 10} width="44" height="14" rx="4" fill={car.color}>
            <animateTransform attributeName="transform" type="translate" from={`${car.startX},0`} to={`${car.startX - 1080},0`} dur={`${car.dur}s`} repeatCount="indefinite" />
          </rect>
          <rect x="8" y={car.y - 18} width="24" height="10" rx="3" fill={car.color} opacity="0.9">
            <animateTransform attributeName="transform" type="translate" from={`${car.startX},0`} to={`${car.startX - 1080},0`} dur={`${car.dur}s`} repeatCount="indefinite" />
          </rect>
          {isDark && (
            <>
              <ellipse cx="-1" cy={car.y - 3} rx="12" ry="4" fill={car.lightColor} opacity="0.35" filter="url(#headlightGlow)">
                <animateTransform attributeName="transform" type="translate" from={`${car.startX},0`} to={`${car.startX - 1080},0`} dur={`${car.dur}s`} repeatCount="indefinite" />
              </ellipse>
              <rect x="-3" y={car.y - 6} width="4" height="4" rx="1" fill={car.lightColor}>
                <animateTransform attributeName="transform" type="translate" from={`${car.startX},0`} to={`${car.startX - 1080},0`} dur={`${car.dur}s`} repeatCount="indefinite" />
              </rect>
            </>
          )}
          <circle cx="8" cy={car.y + 5} r="5" fill={isDark ? "#111" : "#212121"}>
            <animateTransform attributeName="transform" type="translate" from={`${car.startX},0`} to={`${car.startX - 1080},0`} dur={`${car.dur}s`} repeatCount="indefinite" />
          </circle>
          <circle cx="36" cy={car.y + 5} r="5" fill={isDark ? "#111" : "#212121"}>
            <animateTransform attributeName="transform" type="translate" from={`${car.startX},0`} to={`${car.startX - 1080},0`} dur={`${car.dur}s`} repeatCount="indefinite" />
          </circle>
        </g>
      ))}
      {isDark && [100, 260, 440, 620, 800].map((x, i) => (
        <g key={i}>
          <rect x={x} y={345} width={4} height={30} fill="#374151" />
          <rect x={x - 10} y={343} width={24} height={5} rx={2} fill="#4b5563" />
          <ellipse cx={x + 2} cy={345} rx={18} ry={10} fill="#fde68a" opacity="0.18" filter="url(#headlightGlow)" />
          <circle cx={x + 2} cy={345} r={3} fill="#fde68a" opacity="0.9" />
        </g>
      ))}
      <rect x="0" y="422" width="960" height="28" fill={groundNear} />
      {!isDark && Array.from({ length: 40 }, (_, i) => (
        <rect key={i} x={i * 24 + (i % 2) * 6} y={420} width={3} height={6 + (i % 3) * 2} fill="#1b5e20" opacity="0.7" />
      ))}
      {isDark && <rect x="0" y="250" width="960" height="130" fill="url(#skyGrad)" opacity="0.25" filter="url(#softBlur)" />}
      {!isDark && <rect x="0" y="280" width="960" height="50" fill="white" opacity="0.08" filter="url(#softBlur)" />}
    </svg>
  );
};

export default function Homepage() {
  const containerRef = useRef(null);
  const { scrollYProgress } = useScroll({ target: containerRef });
  const skyY = useTransform(scrollYProgress, [0, 0.4], ["0%", "-20%"]);
  const islandY = useTransform(scrollYProgress, [0, 0.4], ["0%", "10%"]);
  const { theme, toggleTheme } = useTheme();
  const [heroVisible, setHeroVisible] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [topUsers, setTopUsers] = useState([]);
  const [siteStats, setSiteStats] = useState([
    { value: "—", label: "Eco Actions", icon: Sparkles },
    { value: "—", label: "Active Members", icon: Users },
    { value: "—", label: "Treecoins Earned", icon: TreePine },
    { value: "—", label: "Carbon Logs", icon: Leaf },
  ]);

  useEffect(() => {
    setTimeout(() => setHeroVisible(true), 100);
  }, []);

  useEffect(() => {
    // Load current user (non-blocking — homepage is public)
    User.me().then(setCurrentUser).catch(() => {});

    // Load top 3 users by treecoins from Firebase
    getDocs(query(collection(db, "users"), orderBy("treecoins", "desc"), limit(3)))
      .then(snap => {
        const badges = ["🌿", "🌊", "☀️"];
        setTopUsers(snap.docs.map((d, i) => ({
          rank: i + 1,
          name: d.data().username || d.data().full_name || "Explorer",
          tc: d.data().treecoins || 0,
          badge: badges[i],
        })));
      })
      .catch(() => {});

    // Live platform stats via server-side aggregation — no document downloads.
    const usersCol = collection(db, "users");
    Promise.all([
      getCountFromServer(collection(db, "carbon_logs")),
      getCountFromServer(usersCol),
      getCountFromServer(collection(db, "posts")),
      getAggregateFromServer(usersCol, { totalTreecoins: sum("treecoins") }),
    ]).then(([logsCount, usersCount, postsCount, tcAgg]) => {
      const logs = logsCount.data().count;
      const members = usersCount.data().count;
      const ecoActions = logs + postsCount.data().count;
      const totalTC = tcAgg.data().totalTreecoins || 0;

      const fmt = (n) => n >= 1000 ? `${(n / 1000).toFixed(1)}K` : String(n);

      setSiteStats([
        { value: fmt(ecoActions), label: "Eco Actions", icon: Sparkles },
        { value: fmt(members),    label: "Active Members", icon: Users },
        { value: fmt(totalTC),    label: "Treecoins Earned", icon: TreePine },
        { value: fmt(logs),       label: "Carbon Logs", icon: Leaf },
      ]);
    }).catch(() => {});
  }, []);

  return (
    <div ref={containerRef} className="overflow-x-hidden">
      {/* ===== HERO SECTION - Sky World ===== */}
      <section className="relative min-h-screen overflow-hidden" style={{ background: "linear-gradient(180deg, #0a1628 0%, #0d2840 25%, #0f3d2e 75%, #062d1e 100%)" }}>
        {/* Stars */}
        {[...Array(50)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute rounded-full bg-white"
            style={{ left: `${Math.random() * 100}%`, top: `${Math.random() * 45}%`, width: Math.random() * 3 + 1, height: Math.random() * 3 + 1 }}
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{ duration: 2 + Math.random() * 3, repeat: Infinity, delay: Math.random() * 3 }}
          />
        ))}

        {/* Pixel clouds */}
        <motion.div style={{ y: skyY }} className="absolute inset-0 pointer-events-none">
          <PixelCloud x={5} y={8} scale={1.2} opacity={0.6} delay={0} />
          <PixelCloud x={25} y={12} scale={0.8} opacity={0.5} delay={2} />
          <PixelCloud x={55} y={6} scale={1.0} opacity={0.55} delay={1} />
          <PixelCloud x={72} y={14} scale={1.3} opacity={0.5} delay={3} />
          <PixelCloud x={88} y={9} scale={0.9} opacity={0.4} delay={1.5} />
        </motion.div>

        {/* Floating treecoins */}
        <FloatingCoin x={8} y={35} delay={0} />
        <FloatingCoin x={20} y={55} delay={1.5} />
        <FloatingCoin x={75} y={30} delay={0.8} />
        <FloatingCoin x={90} y={50} delay={2.2} />
        <FloatingCoin x={65} y={65} delay={1.2} />

        {/* Main hero content */}
        <div className="relative z-10 max-w-6xl mx-auto px-6 pt-24 pb-16 text-center">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: heroVisible ? 1 : 0, y: heroVisible ? 0 : -20 }}
            transition={{ duration: 0.8 }}
            className="flex items-center justify-center gap-3 mb-8"
          >
            <img src="/ecoisland_logo_new.png" alt="Ecoisland" className="w-24 h-24 object-contain" style={{ filter: "drop-shadow(0 0 12px rgba(0,200,150,0.6))" }} />
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: heroVisible ? 1 : 0, y: heroVisible ? 0 : 30 }}
            transition={{ duration: 0.9, delay: 0.2 }}
            className="text-5xl md:text-7xl font-black text-white leading-tight mb-6"
            style={{ letterSpacing: "-0.03em" }}
          >
            <span style={{ fontFamily: "'Playfair Display', sans-serif", fontStyle: "normal" }}>
              Your Planet,
            </span>
            <br />
            <span style={{ background: "linear-gradient(135deg, #00c896, #06b6d4)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", fontFamily: "'Bell MT', serif", fontStyle: "italic" }}>
              Your Island.
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: heroVisible ? 1 : 0, y: heroVisible ? 0 : 20 }}
            transition={{ duration: 0.9, delay: 0.4 }}
            className="text-lg md:text-xl text-slate-300 max-w-2xl mx-auto mb-10 leading-relaxed"
          >
            Grow your Ecoisland, earn Treecoins, and help direct our planet towards a cleaner, more sustainable future; for real.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: heroVisible ? 1 : 0, scale: heroVisible ? 1 : 0.9 }}
            transition={{ duration: 0.8, delay: 0.6 }}
            className="flex flex-col sm:flex-row gap-4 justify-center mb-16"
          >
            <Link to={createPageUrl("Onboarding")}>
              <motion.button
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.97 }}
                className="px-8 py-4 rounded-2xl font-bold text-lg text-black flex items-center gap-2 mx-auto"
                style={{ background: "linear-gradient(135deg, #00c896, #06b6d4)", boxShadow: "0 0 30px rgba(0,200,150,0.4)" }}
              >
                Start Building <ArrowRight className="w-5 h-5" />
              </motion.button>
            </Link>
            <Link to={createPageUrl("Dashboard")}>
              <motion.button
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.97 }}
                className="px-8 py-4 rounded-2xl font-bold text-lg text-white flex items-center gap-2 mx-auto"
                style={{ background: "rgba(255,255,255,0.06)", border: "1.5px solid rgba(255,255,255,0.2)" }}
              >
                Open Dashboard
              </motion.button>
            </Link>
          </motion.div>
        </div>

        {/* Scroll hint */}
        <motion.div
          className="absolute bottom-8 left-1/2 -translate-x-1/2"
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <ChevronDown className="w-6 h-6 text-white" />
        </motion.div>

        {/* Underground transition gradient */}
        <div className="absolute bottom-0 left-0 right-0 h-32" style={{ background: "linear-gradient(to bottom, transparent, #050e0a)" }} />
      </section>

      {/* ===== STATS STRIP ===== */}
      <section style={{ background: "#050e0a", borderTop: "1px solid rgba(0,200,150,0.12)", borderBottom: "1px solid rgba(0,200,150,0.12)" }}>
        <div className="max-w-5xl mx-auto px-6 py-12 grid grid-cols-2 md:grid-cols-4 gap-8">
          {siteStats.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="text-center"
            >
              <stat.icon className="w-6 h-6 text-emerald-400 mx-auto mb-2" />
              <div className="text-3xl font-black text-white mb-1">{stat.value}</div>
              <div className="text-sm text-slate-500">{stat.label}</div>
            </motion.div>
          ))}
          <motion.div className="col-span-full flex justify-center">
            <div className="relative max-w-4xl w-full">
              <div className="absolute inset-0 rounded-full blur-3xl opacity-20" style={{ background: "radial-gradient(ellipse, #00c896, transparent)" }} />
              <div className="relative rounded-[2rem] overflow-hidden shadow-2xl" style={{ background: theme === "dark" ? "rgba(0,0,0,0.16)" : "rgba(255,255,255,0.06)" }}>
                <CityscapeHero isDark={theme === "dark"} />
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ===== UNDERGROUND - FEATURES SECTION ===== */}
      <section className="relative py-24 px-6 overflow-hidden" style={{ background: "linear-gradient(180deg, #050e0a 0%, #030a06 40%, #020805 100%)" }}>
        {/* Underground rock texture dots */}
        {[...Array(30)].map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full opacity-10"
            style={{
              background: "#00c896",
              width: Math.random() * 4 + 1,
              height: Math.random() * 4 + 1,
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
          />
        ))}

        <div className="max-w-6xl mx-auto relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-6 text-sm font-medium text-emerald-300" style={{ background: "rgba(0,200,150,0.1)", border: "1px solid rgba(0,200,150,0.2)" }}>
              <Sparkles className="w-4 h-4" /> Everything you need to go green
            </div>
            <h2 className="text-4xl md:text-5xl font-black text-white mb-4" style={{ letterSpacing: "-0.03em" }}>
              The full sustainability
              <br />
              <span style={{ background: "linear-gradient(135deg, #00c896, #06b6d4)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                ecosystem
              </span>
            </h2>
            <p className="text-slate-400 text-lg max-w-xl mx-auto">
              Seven powerful tools working together to make sustainability measurable, rewarding, and social.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map((feat, i) => (
              <motion.div
                key={feat.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: feat.delay }}
                whileHover={{ y: -4, scale: 1.01 }}
                className="p-6 rounded-2xl cursor-pointer group"
                style={{ background: "rgba(255,255,255,0.03)", border: "1.5px solid rgba(255,255,255,0.07)", transition: "all 0.2s ease" }}
              >
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center mb-4 transition-all duration-300 group-hover:scale-110"
                  style={{ background: `${feat.color}18`, border: `1px solid ${feat.color}30` }}
                >
                  <feat.icon className="w-6 h-6" style={{ color: feat.color }} />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">{feat.title}</h3>
                <p className="text-sm text-slate-400 leading-relaxed">{feat.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== GAMIFICATION SECTION ===== */}
      <section className="relative py-24 px-6" style={{ background: "#030a06" }}>
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <motion.div
              initial={{ opacity: 0, x: -40 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-6 text-sm text-amber-300" style={{ background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.2)" }}>
                <Zap className="w-4 h-4" /> Gamified Sustainability
              </div>
              <h2 className="text-4xl font-black text-white mb-6" style={{ letterSpacing: "-0.03em" }}>
                Every action
                <br />
                <span style={{ color: "#f59e0b" }}>earns rewards.</span>
              </h2>
              <p className="text-slate-400 text-lg leading-relaxed mb-8">
                Earn Treecoins for carbon logging, danger reports, and community posts. Level up, compete on leaderboards, and watch your island flourish.
              </p>
              <div className="space-y-4">
                {[
                  { action: "Log daily carbon footprint", coins: "+10 TC", color: "#10b981" },
                  { action: "Report environmental hazard", coins: "+15 TC", color: "#f97316" },
                  { action: "Post to Action Feed", coins: "+5 TC", color: "#8b5cf6" },
                  { action: "Accepted as an Ambassador", coins: "+100 TC", color: "#06b6d4" },
                ].map(item => (
                  <div key={item.action} className="flex items-center justify-between p-4 rounded-xl" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                    <span className="text-slate-300 text-sm">{item.action}</span>
                    <span className="font-bold text-sm" style={{ color: item.color }}>{item.coins}</span>
                  </div>
                ))}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 40 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="relative"
            >
              {/* Trophy / leaderboard visual */}
              <div className="rounded-2xl overflow-hidden p-6" style={{ background: "rgba(255,255,255,0.03)", border: "1.5px solid rgba(245,158,11,0.2)" }}>
                <div className="flex items-center gap-3 mb-6">
                  <Trophy className="w-6 h-6 text-amber-400" />
                  <h3 className="font-bold text-white">Global Leaderboard</h3>
                </div>
                {topUsers.length === 0 ? (
                  <p className="text-slate-500 text-sm text-center py-4">Be the first on the leaderboard!</p>
                ) : (
                  topUsers.map(p => (
                    <div key={p.rank} className="flex items-center gap-4 py-3 border-b last:border-0" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
                      <div className="w-8 text-center font-black text-sm" style={{ color: "#f59e0b" }}>#{p.rank}</div>
                      <div className="text-lg">{p.badge}</div>
                      <div className="flex-1 text-sm text-slate-300">{p.name}</div>
                      <div className="text-sm font-bold text-emerald-400">{p.tc} TC</div>
                    </div>
                  ))
                )}
                {currentUser && (
                  <div className="flex items-center gap-4 py-3 mt-1 rounded-xl" style={{ background: "rgba(0,200,150,0.08)", border: "1px solid rgba(0,200,150,0.2)" }}>
                    <div className="w-8 text-center text-xs font-bold text-emerald-400">You</div>
                    <div className="text-lg">🌱</div>
                    <div className="flex-1 text-sm text-emerald-300 font-medium">{currentUser.username || currentUser.full_name || "Explorer"}</div>
                    <div className="text-sm font-bold text-emerald-400">{currentUser.treecoins || 0} TC</div>
                  </div>
                )}
                {!currentUser && (
                  <div className="flex items-center gap-4 py-3 mt-1 rounded-xl" style={{ background: "rgba(255,255,255,0.03)", border: "1px dashed rgba(255,255,255,0.1)" }}>
                    <div className="w-8 text-center text-xs text-slate-500">—</div>
                    <div className="text-lg">🌱</div>
                    <div className="flex-1 text-sm text-slate-500 italic">Join to claim your rank</div>
                    <div className="text-sm font-bold text-slate-500">? TC</div>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ===== CTA SECTION ===== */}
      <section className="relative py-32 px-6 text-center overflow-hidden" style={{ background: "linear-gradient(135deg, #030a06 0%, #051a10 50%, #030a06 100%)" }}>
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full opacity-10" style={{ background: "radial-gradient(ellipse, #00c896, transparent)" }} />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="relative z-10 max-w-2xl mx-auto"
        >
          <img src="/ecoisland_logo_new.png" alt="" className="w-24 h-24 mx-auto mb-6 object-contain" style={{ filter: "drop-shadow(0 0 20px rgba(0,200,150,0.5))" }} />
          <h2 className="text-4xl md:text-5xl font-black text-white mb-6" style={{ letterSpacing: "-0.03em" }}>
            Ready to make a
            <br />
            <span style={{ background: "linear-gradient(135deg, #00c896, #06b6d4)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              real impact?
            </span>
          </h2>
          <p className="text-slate-400 text-lg mb-10">
            Join students around the world building a greener tomorrow — one action at a time.
          </p>
          <Link to={createPageUrl("Onboarding")}>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.97 }}
              className="px-10 py-5 rounded-2xl font-bold text-xl text-black inline-flex items-center gap-3"
              style={{ background: "linear-gradient(135deg, #00c896, #06b6d4)", boxShadow: "0 0 40px rgba(0,200,150,0.4)" }}
            >
              <TreePine className="w-6 h-6" /> Launch Your Island
            </motion.button>
          </Link>
        </motion.div>
        <motion.div
          style={{ y: islandY }}
          initial={{ opacity: 0, y: 60 }}
          animate={{ opacity: heroVisible ? 1 : 0, y: heroVisible ? 0 : 60 }}
          transition={{ duration: 1.2, delay: 0.5 }}
          className="relative max-w-lg mx-auto"
        >
          <div className="absolute inset-0 rounded-full blur-3xl opacity-20" style={{ background: "radial-gradient(ellipse, #00c896, transparent)" }} />
          <PixelIsland />
        </motion.div>
      </section>

      {/* Floating theme toggle */}
      <div className="fixed top-4 right-4 z-50">
        <button
          onClick={toggleTheme}
          title={theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
          className="p-2.5 rounded-xl shadow-lg transition-all hover:scale-105"
          style={{ background: "rgba(4,15,10,0.9)", border: "1px solid rgba(0,200,150,0.25)", backdropFilter: "blur(12px)" }}
        >
          {theme === "dark"
            ? <Sun  className="w-4 h-4 text-amber-300" />
            : <Moon className="w-4 h-4 text-slate-300" />}
        </button>
      </div>

      {/* Footer */}
      <footer style={{ background: "#020805", borderTop: "1px solid rgba(0,200,150,0.1)" }}>
        <div className="max-w-6xl mx-auto px-6 py-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <img src="/ecoisland_logo_new.png" alt="" className="w-8 h-8 object-contain opacity-70" />
            <span className="text-slate-500 text-sm">ⓒ 2026 Ecoisland - All for a greener future</span>
          </div>
          <div className="flex items-center gap-6 text-sm text-slate-600">
            <a href="mailto:aaronhanqin@gmail.com">Contact Us</a>
            <Link to="/privacy-policy" target="_blank" rel="noopener noreferrer" className="hover:text-emerald-400 transition-colors">Privacy Policy</Link>
            <Link to="/tos" target="_blank" rel="noopener noreferrer" className="hover:text-emerald-400 transition-colors">Terms Of Service</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
