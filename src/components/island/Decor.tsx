// Shop decorations, drawn in SVG. Each is anchored at the point where it
// touches the ground (or water, or hangs in the sky) at (0,0).
import type { ReactElement } from "react";
import type { DecorId } from "@/shared/catalog";
import type { IslandPalette } from "./palette";

type Ctx = { p: IslandPalette; night: boolean };

const WOOD = "#9a6b45";
const WOOD_DARK = "#74492d";
const WOOD_LIGHT = "#bb8a5e";

function GroundShadow({ w }: { w: number }) {
  return <ellipse cx={0} cy={1} rx={w} ry={w * 0.24} fill="#1d2a1c" opacity={0.18} />;
}

function Bench() {
  return (
    <g>
      <GroundShadow w={26} />
      <path d="M-20 0 L-18 -10 M18 0 L16 -10 M-12 0 L-12 -9 M12 0 L12 -9" stroke={WOOD_DARK} strokeWidth={3} strokeLinecap="round" />
      <path d="M-25 -11 C -10 -14, 10 -14, 25 -11 L24 -7 C 10 -10, -10 -10, -24 -7 Z" fill={WOOD_LIGHT} />
      <path d="M-23 -20 C -8 -24, 8 -24, 23 -20 L22 -16 C 8 -19, -8 -19, -22 -16 Z" fill={WOOD} />
      <path d="M-16 -16 L-16 -11 M16 -16 L16 -11" stroke={WOOD_DARK} strokeWidth={2.4} />
    </g>
  );
}

function Kite() {
  return (
    <g className="isl-bob">
      <path d="M0 0 C -10 30, 14 60, -6 96" stroke="#6b6f78" strokeWidth={1} fill="none" opacity={0.7} />
      <path d="M0 -26 L18 0 L0 28 L-18 0 Z" fill="#f26a5a" />
      <path d="M0 -26 L18 0 L0 0 Z" fill="#ffd166" />
      <path d="M0 0 L0 28 L-18 0 Z" fill="#4fb3e8" />
      <path d="M0 -26 L0 28 M-18 0 L18 0" stroke="#ffffff" strokeWidth={1.2} opacity={0.8} />
      <path d="M0 28 C 6 38, -6 44, 2 54 C 8 62, -4 68, 2 76" stroke="#f26a5a" strokeWidth={1.6} fill="none" />
      {[38, 52, 66].map((y, i) => (
        <path key={i} d={`M-4 ${y} l8 -3 l-1 6 z`} fill={i % 2 ? "#ffd166" : "#4fb3e8"} />
      ))}
    </g>
  );
}

function Campfire() {
  return (
    <g>
      <GroundShadow w={18} />
      {[-14, -7, 0, 7, 14].map((x, i) => (
        <circle key={i} cx={x} cy={-1 + Math.abs(x) * 0.08} r={3.4} fill={i % 2 ? "#9d9e96" : "#b7b8b0"} />
      ))}
      <path d="M-12 -2 L10 -10 M12 -2 L-10 -10" stroke={WOOD_DARK} strokeWidth={4.5} strokeLinecap="round" />
      <g className="isl-flame">
        <path d="M0 -36 C 9 -26, 11 -16, 6 -8 C 3 -4, -3 -4, -6 -8 C -11 -16, -6 -24, 0 -36 Z" fill="#ff9a3c" />
        <path d="M0 -26 C 5 -19, 6 -13, 3 -8 C 1 -6, -2 -6, -3 -8 C -6 -13, -3 -18, 0 -26 Z" fill="#ffd25c" />
      </g>
    </g>
  );
}

function Hammock({ p }: Ctx) {
  return (
    <g>
      <GroundShadow w={40} />
      <path d="M-34 0 L-32 -46 M34 0 L32 -46" stroke={p.trunk} strokeWidth={5} strokeLinecap="round" />
      <path d="M-32 -38 C -16 -10, 16 -10, 32 -38 C 18 -20, -18 -20, -32 -38 Z" fill="#e8d6b0" />
      <path d="M-32 -38 C -16 -10, 16 -10, 32 -38" stroke="#c9ad7c" strokeWidth={1.6} fill="none" />
      <path d="M-20 -26 L-18 -20 M-6 -21 L-6 -15 M8 -21 L8 -15 M20 -26 L18 -20" stroke="#d26b5e" strokeWidth={2} />
      <path d="M-36 -48 C -30 -60, -24 -60, -20 -56 M36 -48 C 30 -60, 24 -60, 20 -56" stroke={p.palmDark} strokeWidth={4} strokeLinecap="round" fill="none" />
    </g>
  );
}

function Dock() {
  const planks = [-36, -24, -12, 0, 12, 24, 36, 48];
  return (
    <g>
      {[-30, 0, 30, 54].map((x, i) => (
        <rect key={i} x={x - 2.5} y={-6} width={5} height={22} rx={1.5} fill={WOOD_DARK} />
      ))}
      <path d="M-44 -6 L60 -14 L64 -6 L-40 2 Z" fill={WOOD} />
      {planks.map((x) => (
        <path key={x} d={`M${x} ${-6 - (x + 44) * 0.077} l4 8`} stroke={WOOD_DARK} strokeWidth={1.2} opacity={0.55} />
      ))}
      <path d="M-40 2 L64 -6" stroke={WOOD_LIGHT} strokeWidth={1.4} opacity={0.6} />
      <ellipse cx={8} cy={14} rx={50} ry={4} fill="#ffffff" opacity={0.25} />
    </g>
  );
}

function Lanterns({ night }: Ctx) {
  const bulbs = [-30, -18, -6, 6, 18, 30];
  return (
    <g>
      <path d="M-40 0 L-40 -52 M40 0 L40 -52" stroke={WOOD_DARK} strokeWidth={3} strokeLinecap="round" />
      <path d="M-40 -50 Q 0 -28 40 -50" stroke="#4b4b4b" strokeWidth={1.2} fill="none" />
      {bulbs.map((x, i) => {
        const y = -50 + 22 * (1 - (x / 40) ** 2) - 2;
        const color = ["#ffd166", "#ff9e7a", "#9ad7ff"][i % 3];
        return (
          <g key={x}>
            {night && <circle cx={x} cy={y + 3} r={9} fill={color} opacity={0.28} />}
            <circle cx={x} cy={y + 3} r={3.2} fill={color} className={night ? "isl-twinkle" : undefined} style={{ animationDelay: `${i * 0.4}s` }} />
          </g>
        );
      })}
    </g>
  );
}

function TidePool() {
  return (
    <g>
      <ellipse cx={0} cy={-4} rx={30} ry={9} fill="#8f908a" />
      <ellipse cx={0} cy={-5} rx={24} ry={6.4} fill="#4fa7c9" />
      <ellipse cx={-6} cy={-6.5} rx={10} ry={2} fill="#ffffff" opacity={0.35} />
      {[-26, -14, 10, 24].map((x, i) => (
        <circle key={i} cx={x} cy={-3 + (i % 2) * 2} r={4.5 - (i % 2)} fill={i % 2 ? "#a4a59d" : "#b9bab2"} />
      ))}
      <path d="M8 -5 l2 -3 l1 3 l3 0 l-2.5 2 l1 3 l-2.5 -2 l-2.5 2 l1 -3 l-2.5 -2 z" fill="#f2845c" />
      <circle cx={-10} cy={-5} r={1.8} fill="#e86aa8" />
    </g>
  );
}

function Hut({ night }: Ctx) {
  return (
    <g>
      <GroundShadow w={34} />
      <rect x={-24} y={-30} width={48} height={30} fill="#e2c79a" />
      <rect x={-24} y={-30} width={10} height={30} fill="#cfb183" />
      <rect x={-6} y={-20} width={12} height={20} rx={2} fill={WOOD_DARK} />
      <rect x={10} y={-22} width={8} height={7} rx={1} fill={night ? "#ffd27a" : "#9ccbe0"} />
      <path d="M-34 -28 L0 -58 L34 -28 Z" fill="#c99a52" />
      <path d="M-34 -28 L0 -58 L-6 -28 Z" fill="#b7853f" />
      {[-26, -16, -6, 4, 14, 24].map((x) => (
        <path key={x} d={`M${x} -28 l${x < 0 ? 4 : -4} -8`} stroke="#a77634" strokeWidth={1.2} opacity={0.7} />
      ))}
    </g>
  );
}

function Telescope() {
  return (
    <g>
      <GroundShadow w={16} />
      <path d="M0 -22 L-12 0 M0 -22 L12 0 M0 -22 L0 0" stroke="#5f6670" strokeWidth={2.2} strokeLinecap="round" />
      <g transform="translate(0 -24) rotate(-28)">
        <rect x={-18} y={-4.5} width={34} height={9} rx={3} fill="#e8ecef" />
        <rect x={10} y={-5.5} width={9} height={11} rx={2} fill="#c0c7cf" />
        <rect x={-21} y={-3} width={4} height={6} rx={1} fill="#5f6670" />
        <rect x={-4} y={-4.5} width={3} height={9} fill="#f26a5a" />
      </g>
    </g>
  );
}

function Sailboat() {
  return (
    <g className="isl-bob">
      <path d="M-34 -8 L34 -8 L24 6 L-26 6 Z" fill="#f4efe6" />
      <path d="M-30 -3 L31 -3" stroke="#e36456" strokeWidth={3} />
      <path d="M-26 6 L24 6" stroke="#cfc8bb" strokeWidth={2} />
      <path d="M2 -8 L2 -78" stroke="#7a5233" strokeWidth={2.6} />
      <path d="M4 -76 C 26 -54, 30 -30, 26 -12 L4 -12 Z" fill="#ffffff" />
      <path d="M0 -70 C -16 -50, -20 -30, -18 -14 L0 -14 Z" fill="#ffd9a0" />
      <path d="M2 -80 l10 3 l-10 3 z" fill="#e36456" />
      <ellipse cx={0} cy={8} rx={40} ry={3.5} fill="#ffffff" opacity={0.35} />
    </g>
  );
}

function Stones() {
  const stones: Array<[number, number, number, number]> = [
    [-30, 0, 9, 26],
    [-14, -6, 8, 22],
    [4, -8, 8, 24],
    [22, -5, 8, 21],
    [34, 1, 9, 25],
    [0, 8, 10, 18],
  ];
  return (
    <g>
      <ellipse cx={2} cy={2} rx={46} ry={13} fill="#1d2a1c" opacity={0.14} />
      {stones
        .sort((a, b) => a[1] - b[1])
        .map(([x, y, w, h], i) => (
          <g key={i}>
            <path d={`M${x - w} ${y} C ${x - w} ${y - h * 0.8}, ${x - w * 0.6} ${y - h}, ${x} ${y - h} C ${x + w * 0.6} ${y - h}, ${x + w} ${y - h * 0.8}, ${x + w} ${y} Z`} fill="#a9aaa2" />
            <path d={`M${x} ${y - h} C ${x + w * 0.6} ${y - h}, ${x + w} ${y - h * 0.8}, ${x + w} ${y} L${x + w * 0.3} ${y} Z`} fill="#8b8c85" />
          </g>
        ))}
    </g>
  );
}

function Lighthouse({ night }: Ctx) {
  return (
    <g>
      {night && (
        <g opacity={0.5}>
          <path d="M0 -112 L-180 -140 L-180 -96 Z" fill="#fff3b0" opacity={0.35} />
          <path d="M0 -112 L170 -150 L170 -104 Z" fill="#fff3b0" opacity={0.25} />
        </g>
      )}
      <ellipse cx={0} cy={1} rx={30} ry={7} fill="#8e8f88" />
      <path d="M-18 0 L-12 -96 L12 -96 L18 0 Z" fill="#f7f4ee" />
      {[-80, -50, -20].map((y) => (
        <path key={y} d={`M${-12 - (y + 96) * 0.0625 - 0.3} ${y} L${12 + (y + 96) * 0.0625 + 0.3} ${y} L${12 + (y + 110) * 0.0625 + 0.6} ${y + 14} L${-12 - (y + 110) * 0.0625 - 0.6} ${y + 14} Z`} fill="#e15a4c" />
      ))}
      <path d="M2 0 L6 -96 L12 -96 L18 0 Z" fill="#000" opacity={0.08} />
      <rect x={-15} y={-100} width={30} height={5} rx={1.5} fill="#3e4650" />
      <rect x={-10} y={-118} width={20} height={18} rx={2} fill={night ? "#ffe27a" : "#cfe8f2"} />
      <path d="M-10 -118 L10 -118 M0 -118 L0 -100" stroke="#3e4650" strokeWidth={1.4} />
      <path d="M-13 -118 L0 -132 L13 -118 Z" fill="#e15a4c" />
      <rect x={-4} y={-22} width={8} height={22} rx={3} fill="#5a4b3c" />
    </g>
  );
}

function Treehouse({ p, night }: Ctx) {
  return (
    <g>
      <GroundShadow w={36} />
      <path d="M-7 0 C -6 -30, -5 -60, -4 -90 L5 -90 C 6 -60, 7 -30, 9 0 Z" fill={p.trunk} />
      <path d="M-14 0 C -10 -2, -8 -6, -7 -12 M16 0 C 12 -2, 10 -6, 9 -12" stroke={p.trunk} strokeWidth={4} strokeLinecap="round" />
      <g className="isl-sway" style={{ animationDuration: "7s" }}>
        <circle cx={-34} cy={-100} r={24} fill={p.leafDark} />
        <circle cx={34} cy={-104} r={24} fill={p.leafDark} />
        <circle cx={0} cy={-126} r={30} fill={p.leaf} />
        <circle cx={-12} cy={-138} r={13} fill={p.leafLight} opacity={0.75} />
      </g>
      <path d="M-30 -70 L30 -70 L28 -64 L-28 -64 Z" fill={WOOD_DARK} />
      <rect x={-22} y={-94} width={44} height={24} fill={WOOD_LIGHT} />
      <rect x={-6} y={-88} width={12} height={12} rx={1.5} fill={night ? "#ffd27a" : "#9ccbe0"} />
      <path d="M-28 -92 L0 -112 L28 -92 Z" fill="#c4573f" />
      <path d="M14 -64 L14 0 M22 -64 L22 0" stroke={WOOD} strokeWidth={2} />
      {[-54, -42, -30, -18, -6].map((y) => (
        <path key={y} d={`M14 ${y} L22 ${y}`} stroke={WOOD} strokeWidth={2} />
      ))}
    </g>
  );
}

function Balloon() {
  return (
    <g className="isl-bob" style={{ animationDuration: "7s" }}>
      <path d="M-34 -70 C -34 -112, 34 -112, 34 -70 C 34 -46, 12 -30, 6 -18 L-6 -18 C -12 -30, -34 -46, -34 -70 Z" fill="#f26a5a" />
      <path d="M-12 -104 C -22 -92, -22 -50, -6 -18 L0 -18 C -6 -50, -6 -90, -12 -104 Z" fill="#ffd166" />
      <path d="M12 -104 C 22 -92, 22 -50, 6 -18 L0 -18 C 6 -50, 6 -90, 12 -104 Z" fill="#4fb3e8" />
      <path d="M-34 -70 C -34 -112, 34 -112, 34 -70" fill="none" stroke="#ffffff" strokeOpacity={0.35} strokeWidth={3} transform="translate(-6 4) scale(0.8)" />
      <path d="M-6 -18 L-8 -4 M6 -18 L8 -4" stroke="#6b4a2f" strokeWidth={1.2} />
      <rect x={-9} y={-5} width={18} height={11} rx={2} fill={WOOD} />
      <rect x={-9} y={-5} width={18} height={3} fill={WOOD_DARK} />
    </g>
  );
}

const DRAW: Record<DecorId, (c: Ctx) => ReactElement> = {
  bench: () => <Bench />,
  kite: () => <Kite />,
  campfire: () => <Campfire />,
  hammock: (c) => <Hammock {...c} />,
  dock: () => <Dock />,
  lanterns: (c) => <Lanterns {...c} />,
  tidepool: () => <TidePool />,
  hut: (c) => <Hut {...c} />,
  telescope: () => <Telescope />,
  sailboat: () => <Sailboat />,
  stones: () => <Stones />,
  lighthouse: (c) => <Lighthouse {...c} />,
  treehouse: (c) => <Treehouse {...c} />,
  balloon: () => <Balloon />,
};

export function DecorShape({ id, p, night }: { id: DecorId; p: IslandPalette; night: boolean }) {
  const draw = DRAW[id];
  return draw ? draw({ p, night }) : null;
}

/** A standalone preview for the shop grid. */
export function DecorPreview({ id, p }: { id: DecorId; p: IslandPalette }) {
  const box: Record<DecorId, [number, number, number, number]> = {
    bench: [-34, -34, 68, 44],
    kite: [-40, -36, 80, 120],
    campfire: [-30, -44, 60, 52],
    hammock: [-46, -66, 92, 74],
    dock: [-50, -30, 120, 54],
    lanterns: [-48, -60, 96, 66],
    tidepool: [-36, -24, 72, 30],
    hut: [-40, -64, 80, 70],
    telescope: [-26, -50, 52, 56],
    sailboat: [-44, -86, 88, 100],
    stones: [-48, -36, 96, 52],
    lighthouse: [-36, -138, 72, 144],
    treehouse: [-62, -162, 124, 168],
    balloon: [-40, -112, 80, 124],
  };
  const [x, y, w, h] = box[id];
  return (
    <svg viewBox={`${x} ${y} ${w} ${h}`} className="h-full w-full" aria-hidden>
      <DecorShape id={id} p={p} night={false} />
    </svg>
  );
}

/** The bright parts of lit decorations, drawn above the night shading. */
export function DecorLights({ id }: { id: DecorId }) {
  switch (id) {
    case "campfire":
      return (
        <g>
          <circle cx={0} cy={-14} r={40} fill="url(#eco-glow-warm)" />
          <g className="isl-flame">
            <path d="M0 -36 C 9 -26, 11 -16, 6 -8 C 3 -4, -3 -4, -6 -8 C -11 -16, -6 -24, 0 -36 Z" fill="#ff9a3c" />
            <path d="M0 -26 C 5 -19, 6 -13, 3 -8 C 1 -6, -2 -6, -3 -8 C -6 -13, -3 -18, 0 -26 Z" fill="#ffd25c" />
          </g>
        </g>
      );
    case "lanterns":
      return (
        <g>
          {[-30, -18, -6, 6, 18, 30].map((x, i) => {
            const y = -50 + 22 * (1 - (x / 40) ** 2) - 2;
            const color = ["#ffd166", "#ff9e7a", "#9ad7ff"][i % 3];
            return (
              <g key={x}>
                <circle cx={x} cy={y + 3} r={8} fill={color} opacity={0.22} />
                <circle cx={x} cy={y + 3} r={3.2} fill={color} className="isl-twinkle" style={{ animationDelay: `${i * 0.4}s` }} />
              </g>
            );
          })}
        </g>
      );
    case "lighthouse":
      return (
        <g>
          <path d="M0 -110 L-200 -146 L-200 -82 Z" fill="#fff3b0" opacity={0.16} />
          <path d="M0 -110 L190 -150 L190 -96 Z" fill="#fff3b0" opacity={0.12} />
          <circle cx={0} cy={-109} r={26} fill="url(#eco-glow-warm)" />
          <rect x={-10} y={-118} width={20} height={18} rx={2} fill="#ffe27a" />
        </g>
      );
    case "hut":
      return (
        <g>
          <circle cx={14} cy={-18} r={16} fill="url(#eco-glow-warm)" />
          <rect x={10} y={-22} width={8} height={7} rx={1} fill="#ffd27a" />
        </g>
      );
    case "treehouse":
      return (
        <g>
          <circle cx={0} cy={-82} r={18} fill="url(#eco-glow-warm)" />
          <rect x={-6} y={-88} width={12} height={12} rx={1.5} fill="#ffd27a" />
        </g>
      );
    default:
      return null;
  }
}
