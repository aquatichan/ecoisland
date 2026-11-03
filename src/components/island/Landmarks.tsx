// Unit landmarks. Scoring 70%+ on a unit quiz adds the matching landmark,
// so the island becomes a map of what the student has mastered.
import type { ReactElement } from "react";
import type { IslandPalette } from "./palette";
import { RIVER } from "./layout";

type L = { p: IslandPalette; night: boolean; animate: boolean };

// 1 · Ecosystems: a food web you can see: deer grazing, a fox watching.
function FoodWeb({ p }: L) {
  return (
    <g transform="translate(432 548)">
      <ellipse cx={-4} cy={2} rx={44} ry={8} fill="#1d2a1c" opacity={0.14} />
      <g transform="translate(-14 0)">
        <path d="M-12 -14 C -12 -22, 8 -24, 12 -16 L12 -12 C 6 -9, -6 -9, -12 -12 Z" fill="#b57b4b" />
        <path d="M-10 -12 L-11 0 M-5 -11 L-5 0 M6 -11 L7 0 M10 -12 L10 0" stroke="#8a5a34" strokeWidth={2.2} strokeLinecap="round" />
        <path d="M12 -16 L18 -26 L23 -24 L19 -16 Z" fill="#b57b4b" />
        <path d="M18 -26 L16 -33 M18 -26 L21 -34 M21 -25 L25 -31" stroke="#6b4a2f" strokeWidth={1.4} strokeLinecap="round" />
        <circle cx={-12} cy={-16} r={2.4} fill="#f3e6d3" />
        <circle cx={-6} cy={-17} r={1.2} fill="#f3e6d3" />
        <circle cx={0} cy={-18} r={1.2} fill="#f3e6d3" />
      </g>
      <g transform="translate(28 2)">
        <path d="M-10 -8 C -10 -14, 6 -15, 9 -9 L9 -6 C 4 -4, -6 -4, -10 -6 Z" fill="#e0773b" />
        <path d="M-10 -8 C -18 -10, -22 -4, -20 0 C -16 -4, -12 -5, -10 -6 Z" fill="#e0773b" />
        <path d="M-20 0 C -18 -2, -17 -3, -16 -3" stroke="#fff" strokeWidth={2} strokeLinecap="round" />
        <path d="M9 -9 L15 -13 L14 -7 Z" fill="#e0773b" />
        <path d="M12 -13 L12 -17 L14 -13 Z" fill="#7a3d1b" />
        <path d="M-7 -6 L-7 0 M5 -6 L5 0" stroke="#7a3d1b" strokeWidth={1.8} strokeLinecap="round" />
      </g>
      <path d="M-36 -2 q2 -8 4 -10 M-32 -2 q0 -6 -2 -9" stroke={p.grassDark} strokeWidth={1.6} fill="none" />
    </g>
  );
}

// 2 · Biodiversity: a wildflower meadow, a beehive and its bees.
function Meadow({ p }: L) {
  const flowers: Array<[number, number, number]> = [
    [-30, 4, 0],
    [-18, -2, 1],
    [-8, 6, 2],
    [4, -4, 3],
    [16, 4, 4],
    [28, -2, 0],
    [-24, 10, 3],
    [10, 10, 1],
    [34, 8, 2],
  ];
  return (
    <g transform="translate(762 548)">
      {flowers.map(([x, y, c], i) => (
        <g key={i} transform={`translate(${x} ${y})`}>
          <path d="M0 0 L0 -9" stroke={p.grassDark} strokeWidth={1.4} />
          {[0, 72, 144, 216, 288].map((a) => (
            <ellipse key={a} cx={0} cy={-11.5} rx={1.7} ry={2.6} fill={p.flowers[c]} transform={`rotate(${a} 0 -9)`} />
          ))}
          <circle cx={0} cy={-9} r={1.4} fill="#f6c95c" />
        </g>
      ))}
      <g transform="translate(4 -14)">
        <path d="M-2 14 L-2 4 M8 14 L8 4" stroke="#7a5233" strokeWidth={2} />
        <rect x={-6} y={-12} width={18} height={16} rx={2} fill="#e8b04a" />
        <path d="M-6 -6 L12 -6 M-6 0 L12 0" stroke="#c98d2a" strokeWidth={1.4} />
        <path d="M-8 -12 L3 -19 L14 -12 Z" fill="#c98d2a" />
        <circle cx={3} cy={-2} r={1.6} fill="#5a3a16" />
      </g>
      {[
        [20, -30],
        [-12, -26],
        [34, -18],
      ].map(([x, y], i) => (
        <g key={i} className="isl-bob" style={{ animationDuration: `${2.2 + i * 0.4}s`, animationDelay: `${-i}s` }}>
          <ellipse cx={x} cy={y} rx={2.6} ry={2} fill="#f6c443" />
          <path d={`M${x - 1} ${y} l2 0`} stroke="#3a2a10" strokeWidth={1} />
          <ellipse cx={x - 1} cy={y - 2.2} rx={1.6} ry={1.1} fill="#ffffff" opacity={0.8} />
        </g>
      ))}
    </g>
  );
}

// 3 · Populations: a flock of seabirds circling overhead.
function Flock({ night }: L) {
  const birds: Array<[number, number, number]> = [
    [0, 0, 1],
    [-22, 10, 0.85],
    [20, 12, 0.9],
    [-40, 22, 0.7],
    [38, 26, 0.75],
  ];
  return (
    <g transform="translate(330 250)" opacity={night ? 0.6 : 1}>
      <g className="isl-drift" style={{ animationDuration: "18s" }}>
        {birds.map(([x, y, s], i) => (
          <path
            key={i}
            d={`M${x - 9 * s} ${y} Q ${x - 4 * s} ${y - 6 * s} ${x} ${y} Q ${x + 4 * s} ${y - 6 * s} ${x + 9 * s} ${y}`}
            stroke={night ? "#c7d2ea" : "#3f4a55"}
            strokeWidth={2}
            fill="none"
            strokeLinecap="round"
          />
        ))}
      </g>
    </g>
  );
}

// 4 · Earth systems: a river carving down to a waterfall off the cliff.
function River() {
  const d = `M${RIVER[0][0]} ${RIVER[0][1]} C 584 474, 600 500, 622 514 S 650 546, 656 566 L 661 584`;
  return (
    <g>
      <path d={d} stroke="#3d8fc1" strokeWidth={14} fill="none" strokeLinecap="round" />
      <path d={d} stroke="#6cc0e6" strokeWidth={8} fill="none" strokeLinecap="round" />
      <path d={d} stroke="#c8ecfa" strokeWidth={2} fill="none" strokeLinecap="round" strokeDasharray="6 14" className="isl-water" style={{ animationDuration: "3s" }} />
      <ellipse cx={572} cy={454} rx={14} ry={5} fill="#3d8fc1" />
      <path d="M654 588 C 652 600, 654 618, 656 632 L 670 632 C 671 618, 670 600, 668 588 Z" fill="#7fcdec" opacity={0.95} />
      <path d="M658 592 L 658 630 M664 592 L 665 630" stroke="#e6f7fd" strokeWidth={1.6} strokeDasharray="5 6" className="isl-rain" style={{ animationDuration: "1.6s" }} />
      <ellipse cx={663} cy={634} rx={16} ry={4} fill="#ffffff" opacity={0.7} />
    </g>
  );
}

// 5 · Land use: contour-terraced farm rows.
function Farm({ p }: L) {
  const rows = [-14, -4, 6, 16];
  return (
    <g transform="translate(392 470)">
      <ellipse cx={0} cy={4} rx={50} ry={20} fill={p.dirt} />
      {rows.map((y, i) => (
        <g key={y}>
          <path d={`M${-44 + Math.abs(y) * 0.6} ${y} Q 0 ${y - 7} ${44 - Math.abs(y) * 0.6} ${y}`} stroke="#9c7a50" strokeWidth={5} fill="none" strokeLinecap="round" />
          {Array.from({ length: 7 }, (_, k) => {
            const x = -34 + k * 11 + (i % 2) * 5;
            const yy = y - 4 * (1 - (x / 44) ** 2) - 2;
            return <circle key={k} cx={x} cy={yy} r={3} fill={i % 2 ? p.grassDark : "#9fcf5e"} />;
          })}
        </g>
      ))}
      <path d="M46 -4 L46 18 M40 2 L52 2" stroke="#7a5233" strokeWidth={2} />
      <circle cx={46} cy={-7} r={3.4} fill="#e9c58a" />
    </g>
  );
}

// 6 · Energy: a wind turbine and a small solar array.
function Energy({ animate }: L) {
  return (
    <g transform="translate(812 462)">
      <path d="M-2 0 L-1 -96 L1 -96 L2 0 Z" fill="#eef1f3" />
      <path d="M0 0 L1 -96 L2 0 Z" fill="#c9d0d6" />
      <circle cx={0} cy={-97} r={3.4} fill="#dfe4e8" />
      <g transform="translate(0 -97)">
        <g>
          {animate && <animateTransform attributeName="transform" type="rotate" from="0" to="360" dur="7s" repeatCount="indefinite" />}
          {[0, 120, 240].map((a) => (
            <path key={a} d="M0 0 C 3 -10, 3 -30, 0 -42 C -2 -30, -2 -10, 0 0 Z" fill="#f7f9fa" stroke="#c9d0d6" strokeWidth={0.6} transform={`rotate(${a})`} />
          ))}
        </g>
      </g>
      <g transform="translate(-34 2)">
        {[0, 1, 2].map((i) => (
          <g key={i} transform={`translate(${i * 15} 0)`}>
            <path d="M0 0 L0 -6" stroke="#5f6670" strokeWidth={1.4} />
            <path d="M-7 -6 L7 -6 L4 -14 L-9 -14 Z" fill="#2b4f7e" />
            <path d="M-2.5 -6 L-4.5 -14 M2.5 -6 L0.5 -14 M-8 -10 L5.5 -10" stroke="#5d86b8" strokeWidth={0.7} />
          </g>
        ))}
      </g>
    </g>
  );
}

// 7 · Atmosphere: a weather station measuring the air.
function Weather({ animate }: L) {
  return (
    <g transform="translate(702 466)">
      <ellipse cx={0} cy={1} rx={12} ry={3} fill="#1d2a1c" opacity={0.15} />
      <path d="M0 0 L0 -52" stroke="#9aa3ab" strokeWidth={2} />
      <rect x={-7} y={-26} width={14} height={12} rx={1.5} fill="#ffffff" stroke="#c9d0d6" strokeWidth={1} />
      <path d="M-7 -22 L7 -22 M-7 -18 L7 -18" stroke="#c9d0d6" strokeWidth={0.8} />
      <g transform="translate(0 -54)">
        <g>
          {animate && <animateTransform attributeName="transform" type="rotate" from="0" to="360" dur="2.4s" repeatCount="indefinite" />}
          {[0, 120, 240].map((a) => (
            <g key={a} transform={`rotate(${a})`}>
              <path d="M0 0 L10 0" stroke="#9aa3ab" strokeWidth={1.2} />
              <circle cx={11} cy={0} r={2.6} fill="#f26a5a" />
            </g>
          ))}
        </g>
      </g>
      <path d="M0 -44 L10 -44 L14 -46 L10 -42 Z" fill="#4fb3e8" />
    </g>
  );
}

// 8 · Pollution: a clean lagoon, with lily pads and fish jumping.
function Lagoon() {
  return (
    <g>
      {[
        [952, 610, 12],
        [978, 622, 9],
        [930, 628, 8],
      ].map(([x, y, r], i) => (
        <g key={i}>
          <ellipse cx={x} cy={y} rx={r} ry={r * 0.42} fill="#4e9e55" />
          <path d={`M${x} ${y} L${x + r} ${y - 1}`} stroke="#2f7a3c" strokeWidth={1} />
          {i === 0 && <circle cx={x - 3} cy={y - 2} r={2.6} fill="#f6b6cf" />}
        </g>
      ))}
      <g className="isl-bob" style={{ animationDuration: "2.6s" }}>
        <path d="M1010 640 C 1016 626, 1030 624, 1036 634" stroke="#ffffff" strokeWidth={1.2} fill="none" strokeDasharray="2 4" opacity={0.8} />
        <path d="M1018 628 C 1022 623, 1030 623, 1033 628 C 1030 632, 1022 632, 1018 628 Z M1018 628 L1013 624 L1014 632 Z" fill="#f2a14a" />
      </g>
      <ellipse cx={1036} cy={638} rx={9} ry={2.4} fill="#ffffff" opacity={0.5} />
    </g>
  );
}

// 9 · Global change: a coral reef offshore and mangroves on the shore.
function Reef({ p }: L) {
  return (
    <g>
      <g opacity={0.78}>
        {[
          [170, 656, "#ff8a7a"],
          [196, 664, "#ffb36b"],
          [222, 654, "#e86aa8"],
          [150, 668, "#ffd166"],
        ].map(([x, y, c], i) => (
          <g key={i} transform={`translate(${x} ${y})`}>
            <path d="M0 0 C -2 -8, -8 -10, -8 -16 M0 0 C 0 -8, 2 -12, 0 -20 M0 0 C 2 -6, 8 -8, 8 -14" stroke={c as string} strokeWidth={3.4} strokeLinecap="round" fill="none" />
          </g>
        ))}
        <ellipse cx={186} cy={670} rx={48} ry={7} fill="#e9d8a8" opacity={0.5} />
      </g>
      <g transform="translate(352 532)">
        {[-12, 8].map((x, i) => (
          <g key={i} transform={`translate(${x} ${i * 4})`}>
            <path d="M0 -14 C -4 -8, -8 -4, -10 4 M0 -14 C 0 -6, 0 -2, 0 4 M0 -14 C 4 -8, 8 -4, 10 4" stroke={p.trunk} strokeWidth={2} fill="none" strokeLinecap="round" />
            <circle cx={-6} cy={-22} r={9} fill={p.leafDark} />
            <circle cx={6} cy={-22} r={9} fill={p.leafDark} />
            <circle cx={0} cy={-28} r={10} fill={p.leaf} />
          </g>
        ))}
      </g>
    </g>
  );
}

const LANDMARKS: Record<number, (l: L) => ReactElement> = {
  1: (l) => <FoodWeb {...l} />,
  2: (l) => <Meadow {...l} />,
  3: (l) => <Flock {...l} />,
  4: () => <River />,
  5: (l) => <Farm {...l} />,
  6: (l) => <Energy {...l} />,
  7: (l) => <Weather {...l} />,
  8: () => <Lagoon />,
  9: (l) => <Reef {...l} />,
};

/** Landmarks that sit on top of the island surface, in back-to-front order. */
export const SURFACE_LANDMARKS = [5, 6, 7, 4, 9, 1, 2];
/** Landmarks drawn in the sky or the water. */
export const SKY_LANDMARKS = [3];
export const WATER_LANDMARKS = [8];

export function Landmark({ unit, p, night, animate }: { unit: number; p: IslandPalette; night: boolean; animate: boolean }) {
  const draw = LANDMARKS[unit];
  return draw ? draw({ p, night, animate }) : null;
}

export const LANDMARK_INFO: Record<number, { name: string; detail: string }> = {
  1: { name: "Food web", detail: "Deer graze while a fox watches: producers, consumers and the energy between them." },
  2: { name: "Wildflower meadow", detail: "A meadow, a beehive and pollinators: biodiversity at work." },
  3: { name: "Seabird flock", detail: "A growing population circling overhead." },
  4: { name: "River and waterfall", detail: "Water carving through soil layers on its way to the sea." },
  5: { name: "Terraced farm", detail: "Contour terraces that hold soil in place." },
  6: { name: "Wind and solar", detail: "A turbine and a solar array power the island." },
  7: { name: "Weather station", detail: "Instruments tracking the air you learned about." },
  8: { name: "Clean lagoon", detail: "Lily pads and leaping fish in clean water." },
  9: { name: "Reef and mangroves", detail: "A coral reef offshore and mangroves guarding the shore." },
};
