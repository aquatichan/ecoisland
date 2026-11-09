// The living island: an SVG illustration composed from the student's real
// progress. XP grows plants, mastered units add landmarks, missed days dry
// the foliage out, and Treecoins buy skies and decorations.
import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactElement,
} from "react";
import { useReducedMotion } from "framer-motion";
import { AuroraSky } from "@/components/fx/AuroraSky";
import { GalaxySky } from "@/components/fx/GalaxySky";
import { findDecor, type SkyId } from "@/shared/catalog";
import { floraCount, stageForXp } from "@/shared/economy";
import type { PlacedDecor } from "@/shared/types";
import { cn } from "@/lib/utils";
import { DecorLights, DecorShape } from "./Decor";
import { HeartTree, Plant } from "./Flora";
import { Landmark } from "./Landmarks";
import { H, PLACE, VIEW, W, floraSlots, rng } from "./layout";
import { SKY_PALETTES, islandPalette, type SkyPalette } from "./palette";


export type IslandSceneProps = {
  xp: number;
  health: number;
  sky: SkyId;
  decor?: PlacedDecor[];
  landmarks?: number[];
  seed?: string;
  /** Ambient motion (always off when the user prefers reduced motion). */
  animate?: boolean;
  /** Lets the student drag decorations around. */
  editable?: boolean;
  onMoveDecor?: (index: number, x: number, y: number) => void;
  selected?: number | null;
  onSelect?: (index: number | null) => void;
  className?: string;
  label?: string;
  /** cover crops to fill the container (default); contain shows the whole scene. */
  fit?: "cover" | "contain";
};

const BEACH =
  "M286 508 C290 462 400 424 540 416 C660 410 800 418 878 448 C930 468 936 512 905 540 C858 580 732 598 600 598 C458 598 330 584 298 552 C286 540 284 524 286 508 Z";
const GRASS =
  "M334 500 C340 466 428 438 544 432 C652 427 768 432 840 456 C880 470 884 502 860 524 C822 556 718 568 600 568 C478 568 384 558 352 534 C338 524 332 512 334 500 Z";
const CLIFF =
  "M287 520 C296 560 420 598 600 600 C770 600 892 568 910 532 L906 578 C880 626 760 650 600 652 C440 652 316 628 292 580 Z";

/** A soft, irregular closed shape: used for the first grass patches. */
function blobPath(cx: number, cy: number, rx: number, ry: number, seed: number, lobes = 7): string {
  const pts: Array<[number, number]> = [];
  const n = 18;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const wobble = 1 + 0.13 * Math.sin(a * lobes + seed) + 0.07 * Math.sin(a * (lobes + 3) + seed * 2.3);
    pts.push([cx + Math.cos(a) * rx * wobble, cy + Math.sin(a) * ry * wobble]);
  }
  const mid = (i: number) => {
    const [x1, y1] = pts[i];
    const [x2, y2] = pts[(i + 1) % n];
    return [(x1 + x2) / 2, (y1 + y2) / 2];
  };
  let d = `M${mid(n - 1)[0].toFixed(1)} ${mid(n - 1)[1].toFixed(1)}`;
  for (let i = 0; i < n; i++) {
    const [x, y] = pts[i];
    const [mx, my] = mid(i);
    d += ` Q${x.toFixed(1)} ${y.toFixed(1)} ${mx.toFixed(1)} ${my.toFixed(1)}`;
  }
  return `${d} Z`;
}

const SPROUT_PATCHES: Array<{ cx: number; cy: number; rx: number; ry: number; seed: number }> = [
  { cx: 548, cy: 510, rx: 104, ry: 30, seed: 1.2 },
  { cx: 712, cy: 494, rx: 70, ry: 20, seed: 3.4 },
  { cx: 424, cy: 498, rx: 52, ry: 16, seed: 5.1 },
  { cx: 640, cy: 538, rx: 44, ry: 12, seed: 0.4 },
];
const SPROUT_TUFTS: Array<[number, number, number]> = [
  [506, 505, 1],
  [578, 518, 0.9],
  [545, 496, 0.8],
  [700, 490, 0.9],
  [736, 498, 0.75],
  [418, 495, 0.85],
  [646, 535, 0.7],
  [610, 520, 0.6],
];

const ROCKS: Array<[number, number, number]> = [
  [468, 522, 11],
  [702, 506, 8],
  [560, 548, 7],
  [792, 522, 10],
  [404, 502, 8],
];

function wavePath(y: number, amp: number): string {
  let d = `M-240 ${y}`;
  for (let x = -240; x < W + 240; x += 60) d += ` q15 ${-amp} 30 0 t30 0`;
  return d;
}

function Cloud({ x, y, s, sp, i, animate }: { x: number; y: number; s: number; sp: SkyPalette; i: number; animate: boolean }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <g className={animate ? "isl-drift" : undefined} style={{ animationDuration: `${26 + i * 9}s`, animationDelay: `${-i * 7}s` }}>
        <ellipse cx={4} cy={14} rx={70} ry={11} fill={sp.cloudShade} opacity={0.9} />
        <circle cx={-34} cy={4} r={20} fill={sp.cloud} />
        <circle cx={-4} cy={-8} r={28} fill={sp.cloud} />
        <circle cx={30} cy={0} r={22} fill={sp.cloud} />
        <circle cx={54} cy={8} r={14} fill={sp.cloud} />
        <rect x={-54} y={4} width={120} height={14} rx={7} fill={sp.cloud} />
      </g>
    </g>
  );
}

export function IslandScene({
  xp,
  health,
  sky,
  decor = [],
  landmarks = [],
  seed = "ecoisland",
  animate = true,
  editable = false,
  onMoveDecor,
  selected = null,
  onSelect,
  className,
  label,
  fit = "cover",
}: IslandSceneProps) {
  const reduced = useReducedMotion();
  const motion = animate && !reduced;
  const sp = SKY_PALETTES[sky] ?? SKY_PALETTES.day;
  const p = useMemo(() => islandPalette(health), [health]);
  const stage = stageForXp(xp).n;
  const flora = useMemo(() => floraSlots(seed).slice(0, floraCount(xp)), [seed, xp]);
  const has = (u: number) => landmarks.includes(u);
  const night = !!sp.night;

  const stars = useMemo(() => {
    const r = rng("stars");
    return Array.from({ length: 80 }, () => ({ x: r() * W, y: r() * 380, r: 0.5 + r() * 1.3, o: 0.35 + r() * 0.65, tw: r() < 0.3, d: r() * 4 }));
  }, []);
  const rain = useMemo(() => {
    const r = rng("rain");
    return Array.from({ length: 140 }, () => ({ x: r() * (W + 200) - 100, y: r() * H * 2 - H, l: 10 + r() * 14 }));
  }, []);
  const fireflies = useMemo(() => {
    const r = rng(`ff:${seed}`);
    return Array.from({ length: 14 }, () => ({ x: 360 + r() * 480, y: 410 + r() * 140, d: r() * 3 }));
  }, [seed]);
  const leaves = useMemo(() => {
    const r = rng(`lv:${seed}`);
    return Array.from({ length: 16 }, () => ({ x: 360 + r() * 480, y: 460 + r() * 95, a: r() * 180 }));
  }, [seed]);

  // ── dragging decorations ──
  const svgRef = useRef<SVGSVGElement>(null);
  const [drag, setDrag] = useState<{ index: number; x: number; y: number; ox: number; oy: number } | null>(null);
  useEffect(() => {
    if (!editable) setDrag(null);
  }, [editable]);

  const toScene = (clientX: number, clientY: number) => {
    const svg = svgRef.current;
    const m = svg?.getScreenCTM();
    if (!svg || !m) return { x: 0, y: 0 };
    const pt = new DOMPoint(clientX, clientY).matrixTransform(m.inverse());
    return { x: pt.x / W, y: pt.y / H };
  };
  const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

  const onDecorDown = (index: number) => (e: ReactPointerEvent<SVGGElement>) => {
    if (!editable) return;
    e.preventDefault();
    e.stopPropagation();
    (e.currentTarget.ownerSVGElement ?? svgRef.current)?.setPointerCapture?.(e.pointerId);
    const at = toScene(e.clientX, e.clientY);
    const item = decor[index];
    setDrag({ index, x: item.x, y: item.y, ox: at.x - item.x, oy: at.y - item.y });
    onSelect?.(index);
  };
  const onMove = (e: ReactPointerEvent<SVGSVGElement>) => {
    if (!drag) return;
    const at = toScene(e.clientX, e.clientY);
    setDrag({ ...drag, x: clamp(at.x - drag.ox, PLACE.x0, PLACE.x1), y: clamp(at.y - drag.oy, PLACE.y0, PLACE.y1) });
  };
  const onUp = () => {
    if (!drag) return;
    onMoveDecor?.(drag.index, drag.x, drag.y);
    setDrag(null);
  };
  const onDecorKey = (index: number) => (e: ReactKeyboardEvent<SVGGElement>) => {
    if (!editable) return;
    const step = e.shiftKey ? 0.04 : 0.01;
    const item = decor[index];
    const moves: Record<string, [number, number]> = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] };
    const mv = moves[e.key];
    if (!mv) return;
    e.preventDefault();
    onMoveDecor?.(index, clamp(item.x + mv[0], PLACE.x0, PLACE.x1), clamp(item.y + mv[1], PLACE.y0, PLACE.y1));
  };

  const placed = decor
    .map((d, index) => ({ ...d, index, ...(drag?.index === index ? { x: drag.x, y: drag.y } : {}) }))
    .filter((d) => findDecor(d.id));

  // Everything standing on the island, drawn back to front.
  type Obj = { y: number; key: string; node: ReactElement };
  const objects: Obj[] = [];
  for (const s of flora) objects.push({ y: s.y, key: `f${s.x}`, node: <Plant key={`f${s.x}`} slot={s} p={p} /> });
  const standing: Array<[number, number]> = [
    [6, 462],
    [7, 466],
    [9, 532],
    [1, 548],
    [2, 548],
  ];
  for (const [u, y] of standing) {
    if (has(u)) objects.push({ y, key: `l${u}`, node: <Landmark key={`l${u}`} unit={u} p={p} night={night} animate={motion} /> });
  }
  if (stage >= 5) objects.push({ y: 456, key: "heart", node: <HeartTree key="heart" p={p} /> });
  for (const d of placed) {
    const depth = 0.85 + clamp((d.y - 0.55) / 0.35, 0, 1) * 0.3;
    objects.push({
      y: d.y * H,
      key: `d${d.index}`,
      node: (
        <g
          key={`d${d.index}`}
          transform={`translate(${(d.x * W).toFixed(1)} ${(d.y * H).toFixed(1)}) scale(${depth.toFixed(3)})`}
          onPointerDown={onDecorDown(d.index)}
          onKeyDown={onDecorKey(d.index)}
          tabIndex={editable ? 0 : undefined}
          role={editable ? "button" : undefined}
          aria-label={editable ? `${findDecor(d.id)?.name}: drag or use arrow keys to move` : undefined}
          style={editable ? { cursor: drag?.index === d.index ? "grabbing" : "grab", outline: "none" } : undefined}
        >
          {editable && selected === d.index && <ellipse cx={0} cy={2} rx={34} ry={9} fill="none" stroke="#ffffff" strokeWidth={2} strokeDasharray="5 4" opacity={0.9} />}
          <DecorShape id={d.id} p={p} night={night} />
        </g>
      ),
    });
  }
  objects.sort((a, b) => a.y - b.y);

  // Colour grading for the island under each sky (sky and sea are already graded).
  const TINTS: Partial<Record<SkyId, string>> = {
    night: "0.34 0.04 0.06 0 0.02  0.04 0.4 0.08 0 0.03  0.06 0.1 0.6 0 0.07  0 0 0 1 0",
    aurora: "0.32 0.05 0.06 0 0.02  0.05 0.42 0.08 0 0.04  0.06 0.12 0.6 0 0.08  0 0 0 1 0",
    cosmos: "0.3 0.04 0.08 0 0.03  0.04 0.34 0.1 0 0.03  0.08 0.1 0.6 0 0.09  0 0 0 1 0",
    sunset: "1.02 0.06 0 0 0.03  0.02 0.86 0.02 0 0.01  0 0.02 0.7 0 0  0 0 0 1 0",
    dawn: "1 0.04 0.02 0 0.02  0.02 0.9 0.04 0 0.01  0.02 0.04 0.92 0 0.02  0 0 0 1 0",
    rain: "0.78 0.12 0.06 0 0.01  0.08 0.8 0.08 0 0.01  0.06 0.12 0.82 0 0.02  0 0 0 1 0",
  };
  const tint = TINTS[sky];
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const id = (name: string) => `${name}-${uid}`;
  const tintRef = tint ? `url(#${id("tint")})` : undefined;

  return (
    <div className={cn("relative overflow-hidden", !motion && "island-paused", className)}>
      {sp.transparentSky && (
        <div className="absolute inset-0" aria-hidden>
          <div className="absolute inset-0" style={{ background: `linear-gradient(${sp.top}, ${sp.mid} 55%, ${sp.bottom})` }} />
          {motion && (sky === "aurora" ? <AuroraSky key={sky} /> : <GalaxySky key={sky} />)}
        </div>
      )}
      <svg
        ref={svgRef}
        viewBox={`${VIEW.x} ${VIEW.y} ${VIEW.w} ${VIEW.h}`}
        preserveAspectRatio={fit === "cover" ? "xMidYMid slice" : "xMidYMid meet"}
        className="relative block h-full w-full select-none"
        role="img"
        aria-label={label ?? "Your island"}
        onPointerMove={editable ? onMove : undefined}
        onPointerUp={editable ? onUp : undefined}
        onPointerCancel={editable ? onUp : undefined}
        onPointerDown={editable ? () => onSelect?.(null) : undefined}
        style={{ touchAction: editable ? "none" : undefined }}
      >
        <defs>
          <linearGradient id={id("sky")} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={sp.top} />
            <stop offset="0.55" stopColor={sp.mid} />
            <stop offset="1" stopColor={sp.bottom} />
          </linearGradient>
          <linearGradient id={id("sea")} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={sp.water[0]} />
            <stop offset="0.45" stopColor={sp.water[1]} />
            <stop offset="1" stopColor={sp.water[2]} />
          </linearGradient>
          <linearGradient id={id("cliff")} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={p.soil[0]} />
            <stop offset="0.35" stopColor={p.soil[1]} />
            <stop offset="0.7" stopColor={p.soil[2]} />
            <stop offset="1" stopColor={p.soil[3]} />
          </linearGradient>
          <linearGradient id={id("grass")} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={p.grassLight} />
            <stop offset="0.6" stopColor={p.grass} />
            <stop offset="1" stopColor={p.grassDark} />
          </linearGradient>
          <linearGradient id={id("sand")} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={p.sandLight} />
            <stop offset="1" stopColor={p.sand} />
          </linearGradient>
          <radialGradient id={id("hill")} cx="0.45" cy="0.35" r="0.7">
            <stop offset="0" stopColor={p.grassLight} />
            <stop offset="1" stopColor={p.grass} />
          </radialGradient>
          <clipPath id={id("cliffclip")}>
            <path d={CLIFF} />
          </clipPath>
          <radialGradient id="eco-glow-warm">
            <stop offset="0" stopColor="#ffcf73" stopOpacity="0.55" />
            <stop offset="1" stopColor="#ffcf73" stopOpacity="0" />
          </radialGradient>
          {tint && (
            <filter id={id("tint")} colorInterpolationFilters="sRGB">
              <feColorMatrix type="matrix" values={tint} />
            </filter>
          )}
        </defs>

        {/* sky */}
        {!sp.transparentSky && <rect width={W} height={470} fill={`url(#${id("sky")})`} />}
        {sp.stars &&
          stars.map((s, i) => (
            <circle key={i} cx={s.x} cy={s.y} r={s.r} fill="#ffffff" opacity={s.o} className={s.tw && motion ? "isl-twinkle" : undefined} style={{ animationDelay: `${-s.d}s` }} />
          ))}
        {sp.sun && (
          <g>
            <circle cx={sp.sun.x} cy={sp.sun.y} r={sp.sun.r * 2.6} fill={sp.sun.glow} opacity={0.32} />
            <circle cx={sp.sun.x} cy={sp.sun.y} r={sp.sun.r * 1.55} fill={sp.sun.glow} opacity={0.55} />
            <circle cx={sp.sun.x} cy={sp.sun.y} r={sp.sun.r} fill={sp.sun.color} />
          </g>
        )}
        {sp.moon && (
          <g>
            <circle cx={sp.moon.x} cy={sp.moon.y} r={sp.moon.r * 2.6} fill="#c9d6ff" opacity={0.08} />
            <circle cx={sp.moon.x} cy={sp.moon.y} r={sp.moon.r} fill="#f3efe0" />
            <circle cx={sp.moon.x - 10} cy={sp.moon.y - 6} r={6} fill="#e2dcc6" />
            <circle cx={sp.moon.x + 9} cy={sp.moon.y + 9} r={4.5} fill="#e2dcc6" />
            <circle cx={sp.moon.x + 12} cy={sp.moon.y - 11} r={2.6} fill="#e2dcc6" />
          </g>
        )}
        {sky !== "cosmos" &&
          (sky === "rain"
            ? [
                [230, 190, 1.3],
                [520, 172, 1.5],
                [830, 196, 1.4],
                [1030, 180, 1.2],
                [380, 262, 0.9],
                [700, 270, 1],
              ]
            : [
                [250, 214, 0.9],
                [600, 186, 0.7],
                [1010, 300, 0.75],
                [430, 318, 0.5],
              ]
          ).map(([x, y, s], i) => <Cloud key={i} x={x} y={y} s={s} sp={sp} i={i} animate={motion} />)}
        {has(3) && <Landmark unit={3} p={p} night={night} animate={motion} />}

        {/* sea */}
        <rect y={430} width={W} height={H - 430} fill={`url(#${id("sea")})`} />
        <path d="M0 430 H1200" stroke="#ffffff" strokeOpacity={0.35} strokeWidth={1.5} />
        <path d="M60 432 C110 412 170 410 230 432 Z M960 432 C1010 418 1080 416 1140 432 Z" fill={sp.far} opacity={0.85} />
        {sp.sun && (
          <g opacity={sky === "day" ? 0.4 : 0.6}>
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <ellipse key={i} cx={sp.sun!.x + (i % 2 ? 6 : -4)} cy={442 + i * 16} rx={34 - i * 4.5} ry={1.6} fill={sp.sun!.glow} />
            ))}
          </g>
        )}
        {sp.moon && (
          <g opacity={0.45}>
            {[0, 1, 2, 3].map((i) => (
              <ellipse key={i} cx={sp.moon!.x + (i % 2 ? 5 : -3)} cy={442 + i * 15} rx={22 - i * 4} ry={1.4} fill="#dfe6ff" />
            ))}
          </g>
        )}
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <path
            key={i}
            d={wavePath(462 + i * 44, 3 + i * 0.6)}
            stroke={sp.foam}
            strokeOpacity={0.16 + i * 0.03}
            strokeWidth={1.4}
            fill="none"
            className={motion ? "isl-water" : undefined}
            style={{ animationDuration: `${10 + i * 3}s`, animationDirection: i % 2 ? "reverse" : "normal" }}
          />
        ))}

        {/* island body */}
        <g filter={tintRef}>
        <ellipse cx={600} cy={642} rx={340} ry={26} fill="#000000" opacity={0.13} />
        <path d={CLIFF} fill={`url(#${id("cliff")})`} />
        <g clipPath={`url(#${id("cliffclip")})`} opacity={0.5}>
          {[14, 28, 42].map((k) => (
            <path key={k} d={`M280 ${532 + k} C296 ${572 + k} 420 ${610 + k} 600 ${612 + k} C770 ${612 + k} 892 ${580 + k} 916 ${544 + k}`} stroke="#3e2a1a" strokeOpacity={0.35} strokeWidth={1.4} fill="none" />
          ))}
          {[340, 420, 520, 660, 760, 850].map((x, i) => (
            <circle key={x} cx={x} cy={600 + (i % 3) * 14} r={3 + (i % 2) * 2} fill="#5d4128" opacity={0.5} />
          ))}
        </g>
        {has(9) && <Landmark unit={9} p={p} night={night} animate={motion} />}
        </g>
        <path d="M0 622 C300 612 900 612 1200 622 L1200 720 L0 720 Z" fill={sp.water[1]} opacity={0.62} />
        <path d="M296 606 C420 634 780 634 906 600" stroke={sp.foam} strokeWidth={7} strokeLinecap="round" fill="none" opacity={0.22} />
        <path d="M300 607 C420 633 780 633 902 601" stroke={sp.foam} strokeWidth={2} strokeLinecap="round" fill="none" opacity={0.7} />
        <g filter={tintRef}>
        <path d={BEACH} fill={`url(#${id("sand")})`} />
        <path d="M298 552 C330 584 458 598 600 598 C732 598 858 580 905 540" stroke={p.sandDark} strokeWidth={3} fill="none" opacity={0.5} />

        {/* ground */}
        {stage === 0 && (
          <g>
            <path d={GRASS} fill={p.dirt} opacity={0.75} transform="translate(600 500) scale(0.82 0.8) translate(-600 -500)" />
            <path d="M470 492 l18 6 l10 -4 l16 8 M640 512 l14 -5 l12 6 l20 -3 M560 528 l-12 6 l-8 -2" stroke="#8c6c46" strokeWidth={1.6} strokeLinecap="round" fill="none" opacity={0.55} />
          </g>
        )}
        {stage === 1 && (
          <g>
            <path d={GRASS} fill={p.dirt} opacity={0.6} transform="translate(600 500) scale(0.86) translate(-600 -500)" />
            {SPROUT_PATCHES.map((b, i) => (
              <g key={i}>
                <path d={blobPath(b.cx, b.cy + 3, b.rx, b.ry, b.seed)} fill={p.grassDark} opacity={0.75} />
                <path d={blobPath(b.cx, b.cy, b.rx, b.ry, b.seed)} fill={`url(#${id("grass")})`} />
                <path d={blobPath(b.cx - b.rx * 0.18, b.cy - b.ry * 0.25, b.rx * 0.5, b.ry * 0.42, b.seed + 1)} fill={p.grassLight} opacity={0.45} />
              </g>
            ))}
            {SPROUT_TUFTS.map(([x, y, k], i) => (
              <path
                key={i}
                d={`M${x - 5 * k} ${y} q-1 -7 -4 -10 M${x - 1.5 * k} ${y} q0 -9 -1 -13 M${x + 2 * k} ${y} q1 -8 4 -11 M${x + 5 * k} ${y} q2 -5 5 -7`}
                stroke={p.grassDark}
                strokeWidth={1.8}
                strokeLinecap="round"
                fill="none"
              />
            ))}
          </g>
        )}
        {stage >= 2 && <path d={GRASS} fill={`url(#${id("grass")})`} />}
        {stage >= 2 && <path d="M352 534 C384 558 478 568 600 568 C718 568 822 556 860 524" stroke={p.grassDark} strokeWidth={4} fill="none" opacity={0.6} />}
        {stage >= 3 && (
          <g>
            <ellipse cx={548} cy={458} rx={128} ry={30} fill={`url(#${id("hill")})`} />
            <path d="M424 466 C470 482 620 486 676 462" stroke={p.grassDark} strokeWidth={3} fill="none" opacity={0.35} />
          </g>
        )}
        {ROCKS.slice(0, Math.max(0, 5 - stage * 2)).map(([x, y, r], i) => (
          <g key={i}>
            <ellipse cx={x} cy={y + r * 0.35} rx={r * 1.2} ry={r * 0.4} fill="#1d2a1c" opacity={0.14} />
            <path d={`M${x - r} ${y} C${x - r} ${y - r * 0.9} ${x + r} ${y - r * 1.1} ${x + r} ${y} Z`} fill={p.rock} />
            <path d={`M${x - r * 0.4} ${y - r * 0.6} C${x} ${y - r} ${x + r * 0.6} ${y - r * 0.9} ${x + r * 0.8} ${y - r * 0.3}`} stroke={p.rockLight} strokeWidth={2} fill="none" opacity={0.7} />
          </g>
        ))}
        {health < 0.6 &&
          stage >= 2 &&
          leaves.map((l, i) => <ellipse key={i} cx={l.x} cy={l.y} rx={3} ry={1.5} fill={i % 2 ? "#b8893f" : "#a3732f"} transform={`rotate(${l.a} ${l.x} ${l.y})`} opacity={0.8} />)}
        {has(5) && <Landmark unit={5} p={p} night={night} animate={motion} />}
        {has(4) && <Landmark unit={4} p={p} night={night} animate={motion} />}

        {/* life */}
        {objects.map((o) => o.node)}
        {has(8) && <Landmark unit={8} p={p} night={night} animate={motion} />}

        {stage >= 4 &&
          !night &&
          sky !== "rain" &&
          health >= 0.6 &&
          [
            [470, 470, "#ffd166"],
            [690, 500, "#f4a6c4"],
            [800, 440, "#9ad7ff"],
          ].map(([x, y, c], i) => (
            <g key={i} className={motion ? "isl-bob" : undefined} style={{ animationDuration: `${2 + i * 0.6}s`, animationDelay: `${-i}s` }}>
              <ellipse cx={(x as number) - 3} cy={y as number} rx={3.4} ry={2.4} fill={c as string} transform={`rotate(-30 ${x} ${y})`} />
              <ellipse cx={(x as number) + 3} cy={y as number} rx={3.4} ry={2.4} fill={c as string} transform={`rotate(30 ${x} ${y})`} />
            </g>
          ))}

        </g>

        {/* light and weather */}
        {night && (
          <g>
            {placed.map((d) => {
              const depth = 0.85 + clamp((d.y - 0.55) / 0.35, 0, 1) * 0.3;
              return (
                <g key={d.index} transform={`translate(${(d.x * W).toFixed(1)} ${(d.y * H).toFixed(1)}) scale(${depth.toFixed(3)})`} pointerEvents="none">
                  <DecorLights id={d.id} />
                </g>
              );
            })}
            {stage >= 2 &&
              fireflies.map((f, i) => (
                <circle key={i} cx={f.x} cy={f.y} r={1.8} fill="#e9ff9a" className={motion ? "isl-twinkle" : undefined} style={{ animationDelay: `${-f.d}s` }} />
              ))}
          </g>
        )}
        {sp.rain && (
          <g className={motion ? "isl-rain" : undefined} opacity={0.5}>
            {rain.map((r, i) => (
              <path key={i} d={`M${r.x} ${r.y} l-4 ${r.l}`} stroke="#eef4f8" strokeWidth={1.2} strokeLinecap="round" />
            ))}
          </g>
        )}
      </svg>
    </div>
  );
}
