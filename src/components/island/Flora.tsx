// Plants, drawn by hand in SVG. Each shape is anchored at its base (0,0)
// and grows upward.
import type { ReactElement } from "react";
import type { IslandPalette } from "./palette";
import { mix } from "./palette";
import type { Slot } from "./layout";

type P = { p: IslandPalette; tint: number };

function Shadow({ w, o = 0.18 }: { w: number; o?: number }) {
  return <ellipse cx={0} cy={1} rx={w} ry={w * 0.28} fill="#1d2a1c" opacity={o} />;
}

function Tuft({ p }: P) {
  return (
    <g>
      <Shadow w={9} o={0.12} />
      <path d="M-7 0 Q-8 -9 -11 -14 M-3 0 Q-3 -11 -4 -18 M1 0 Q2 -12 5 -17 M5 0 Q7 -8 11 -12" stroke={p.grassDark} strokeWidth={2.2} strokeLinecap="round" fill="none" />
      <path d="M-1 0 Q0 -8 -1 -13" stroke={p.grassLight} strokeWidth={1.8} strokeLinecap="round" fill="none" />
    </g>
  );
}

function Flower({ p, tint }: P) {
  const petal = p.flowers[Math.floor(tint * p.flowers.length) % p.flowers.length];
  const heads: Array<[number, number, number]> = [
    [-6, -14, 1],
    [3, -19, 1.15],
    [9, -11, 0.9],
  ];
  return (
    <g>
      <Shadow w={11} o={0.12} />
      <path d="M-6 0 Q-6 -7 -6 -12 M3 0 Q3 -10 3 -17 M9 0 Q9 -6 9 -9" stroke={p.grassDark} strokeWidth={1.8} strokeLinecap="round" fill="none" />
      <path d="M-2 -4 q-5 -3 -7 -8 q5 1 7 8z M5 -6 q5 -3 7 -8 q-5 1 -7 8z" fill={p.grass} />
      {heads.map(([x, y, s], i) => (
        <g key={i} transform={`translate(${x} ${y}) scale(${s})`}>
          {[0, 72, 144, 216, 288].map((a) => (
            <ellipse key={a} cx={0} cy={-3.2} rx={2.4} ry={3.4} fill={petal} transform={`rotate(${a})`} />
          ))}
          <circle r={1.9} fill="#f6c95c" />
        </g>
      ))}
    </g>
  );
}

function Shrub({ p, tint }: P) {
  const base = mix(p.leaf, p.grassDark, tint * 0.6);
  return (
    <g>
      <Shadow w={17} />
      <circle cx={-8} cy={-9} r={9} fill={p.leafDark} />
      <circle cx={7} cy={-9} r={10} fill={p.leafDark} />
      <circle cx={0} cy={-14} r={11} fill={base} />
      <circle cx={-7} cy={-11} r={7.5} fill={base} />
      <circle cx={-3} cy={-18} r={5} fill={p.leafLight} opacity={0.9} />
      <circle cx={6} cy={-12} r={3.2} fill={p.leafLight} opacity={0.55} />
    </g>
  );
}

function RoundTree({ p, tint, big }: P & { big?: boolean }) {
  const k = big ? 1.35 : 1;
  const mid = mix(p.leaf, p.leafDark, tint * 0.35);
  return (
    <g transform={`scale(${k})`}>
      <Shadow w={22} />
      <path d="M-3.4 0 L-2.4 -30 L2.4 -30 L3.4 0 Z" fill={p.trunk} />
      <path d="M0 -24 L-7 -33 M0 -20 L6 -28" stroke={p.trunk} strokeWidth={2.4} strokeLinecap="round" />
      <path d="M-1 0 L0 -30 L2.4 -30 L3.4 0 Z" fill={p.trunkDark} opacity={0.55} />
      <g className="isl-sway" style={{ animationDelay: `${-tint * 5}s` }}>
        <circle cx={-12} cy={-40} r={15} fill={p.leafDark} />
        <circle cx={13} cy={-41} r={15} fill={p.leafDark} />
        <circle cx={0} cy={-52} r={19} fill={mid} />
        <circle cx={-13} cy={-45} r={13} fill={mid} />
        <circle cx={12} cy={-47} r={12} fill={mid} />
        <circle cx={-6} cy={-58} r={9} fill={p.leafLight} opacity={0.85} />
        <circle cx={8} cy={-52} r={5} fill={p.leafLight} opacity={0.5} />
        <circle cx={-15} cy={-46} r={4} fill={p.leafLight} opacity={0.45} />
      </g>
    </g>
  );
}

function Pine({ p, tint }: P) {
  const mid = mix(p.pine, p.pineDark, tint * 0.4);
  return (
    <g>
      <Shadow w={15} />
      <rect x={-2.6} y={-14} width={5.2} height={14} fill={p.trunkDark} />
      <g className="isl-sway" style={{ animationDelay: `${-tint * 5}s` }}>
        <path d="M0 -70 L16 -38 L-16 -38 Z" fill={p.pineDark} />
        <path d="M0 -58 L20 -22 L-20 -22 Z" fill={mid} />
        <path d="M0 -44 L23 -10 L-23 -10 Z" fill={p.pineDark} />
        <path d="M0 -70 L-16 -38 L-4 -38 Z" fill={p.pine} opacity={0.55} />
        <path d="M0 -58 L-20 -22 L-6 -22 Z" fill={p.leafLight} opacity={0.22} />
        <path d="M0 -44 L-23 -10 L-7 -10 Z" fill={p.pine} opacity={0.5} />
      </g>
    </g>
  );
}

function Palm({ p, tint }: P) {
  const lean = tint > 0.5 ? 1 : -1;
  return (
    <g transform={`scale(${lean} 1)`}>
      <Shadow w={18} o={0.14} />
      <path d="M-3 0 C -2 -22, 3 -44, 12 -62 L16 -60 C 8 -42, 3 -21, 3 0 Z" fill={p.trunk} />
      {[
        [-1.2, -11],
        [1.2, -23],
        [4, -35],
        [7.5, -47],
      ].map(([x, y], i) => (
        <path key={i} d={`M${x} ${y} l5.4 -1.2`} stroke={p.trunkDark} strokeWidth={1.3} strokeLinecap="round" opacity={0.55} />
      ))}
      <g className="isl-sway" style={{ animationDelay: `${-tint * 5}s` }} transform="translate(14 -62)">
        <path d="M0 0 C -14 -8, -28 -4, -36 8 C -24 0, -12 0, 0 2 Z" fill={p.palmDark} />
        <path d="M0 0 C 14 -10, 30 -6, 38 6 C 26 -1, 12 0, 0 2 Z" fill={p.palmDark} />
        <path d="M0 0 C -6 -16, -2 -26, 8 -32 C 2 -20, 2 -10, 2 0 Z" fill={p.palm} />
        <path d="M0 0 C -18 -2, -30 6, -32 20 C -22 8, -12 4, 0 2 Z" fill={p.palm} />
        <path d="M0 0 C 18 -2, 30 8, 30 22 C 22 10, 12 4, 0 2 Z" fill={p.palm} />
        <circle cx={-2} cy={4} r={3.2} fill="#7a5233" />
        <circle cx={3} cy={5} r={3} fill="#6a452a" />
      </g>
    </g>
  );
}

export function Plant({ slot, p }: { slot: Slot; p: IslandPalette }) {
  const props = { p, tint: slot.tint };
  // Plants further back are drawn slightly smaller for depth.
  const depth = 0.82 + ((slot.y - 436) / 128) * 0.3;
  let el: ReactElement;
  switch (slot.kind) {
    case "tuft":
      el = <Tuft {...props} />;
      break;
    case "flower":
      el = <Flower {...props} />;
      break;
    case "shrub":
      el = <Shrub {...props} />;
      break;
    case "round":
      el = <RoundTree {...props} />;
      break;
    case "bigRound":
      el = <RoundTree {...props} big />;
      break;
    case "pine":
      el = <Pine {...props} />;
      break;
    case "palm":
      el = <Palm {...props} />;
      break;
  }
  return <g transform={`translate(${slot.x.toFixed(1)} ${slot.y.toFixed(1)}) scale(${(slot.s * depth).toFixed(3)})`}>{el}</g>;
}

/** The great tree that crowns a stage-5 island. */
export function HeartTree({ p }: { p: IslandPalette }) {
  return (
    <g transform="translate(560 456)">
      <ellipse cx={0} cy={2} rx={46} ry={11} fill="#1d2a1c" opacity={0.2} />
      <path d="M-9 0 C -7 -20, -6 -40, -4 -62 L6 -62 C 7 -40, 8 -20, 10 0 Z" fill={p.trunk} />
      <path d="M-2 -40 C -14 -50, -24 -52, -34 -58 M3 -46 C 14 -54, 24 -58, 34 -66 M0 -56 C -6 -70, -4 -80, 0 -90" stroke={p.trunk} strokeWidth={4} strokeLinecap="round" fill="none" />
      <path d="M2 0 C 4 -24, 5 -44, 6 -62 L6 -62 C 7 -40, 8 -20, 10 0 Z" fill={p.trunkDark} opacity={0.5} />
      <g className="isl-sway" style={{ animationDuration: "8s" }}>
        <circle cx={-38} cy={-72} r={26} fill={p.leafDark} />
        <circle cx={38} cy={-78} r={27} fill={p.leafDark} />
        <circle cx={0} cy={-104} r={34} fill={p.leaf} />
        <circle cx={-30} cy={-88} r={24} fill={p.leaf} />
        <circle cx={30} cy={-94} r={25} fill={p.leaf} />
        <circle cx={-12} cy={-116} r={16} fill={p.leafLight} opacity={0.8} />
        <circle cx={22} cy={-104} r={9} fill={p.leafLight} opacity={0.5} />
        <circle cx={-40} cy={-80} r={8} fill={p.leafLight} opacity={0.45} />
        {[-26, 6, 28, -8, 40].map((x, i) => (
          <circle key={i} cx={x} cy={-78 - ((i * 13) % 34)} r={2.6} fill={p.flowers[i % p.flowers.length]} />
        ))}
      </g>
    </g>
  );
}
