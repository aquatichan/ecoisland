// Colors for the island illustration. Foliage blends from lush to dry as the
// island's health drops, so a missed day is visible at a glance.
import type { SkyId } from "@/shared/catalog";

function parse(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

export function mix(a: string, b: string, t: number): string {
  const k = Math.max(0, Math.min(1, t));
  const [r1, g1, b1] = parse(a);
  const [r2, g2, b2] = parse(b);
  const c = (x: number, y: number) => Math.round(x + (y - x) * k).toString(16).padStart(2, "0");
  return `#${c(r1, r2)}${c(g1, g2)}${c(b1, b2)}`;
}

const HEALTHY = {
  grass: "#7cc46b",
  grassDark: "#57a85a",
  grassLight: "#a6dc86",
  leaf: "#5cab59",
  leafDark: "#3d8b49",
  leafLight: "#91d176",
  pine: "#3a8a5d",
  pineDark: "#296b48",
  palm: "#6ab65c",
  palmDark: "#4b9450",
};

const WILTED = {
  grass: "#c4b46e",
  grassDark: "#a89659",
  grassLight: "#d9cb8f",
  leaf: "#b39e58",
  leafDark: "#94783f",
  leafLight: "#cfb979",
  pine: "#807a4c",
  pineDark: "#635a37",
  palm: "#b2a45e",
  palmDark: "#94834a",
};

const FLOWERS_HEALTHY = ["#f4a6c4", "#ffd166", "#fbf7f0", "#b9a5f4", "#f58c6c"];
const FLOWERS_WILTED = ["#c8a4a4", "#d4be8b", "#ddd5c9", "#b3aac0", "#c69a86"];

export type IslandPalette = typeof HEALTHY & {
  flowers: string[];
  trunk: string;
  trunkDark: string;
  sand: string;
  sandDark: string;
  sandLight: string;
  soil: [string, string, string, string];
  rock: string;
  rockDark: string;
  rockLight: string;
  dirt: string;
};

export function islandPalette(health: number): IslandPalette {
  const t = Math.max(0, Math.min(1, (1 - health) / 0.8));
  const foliage = Object.fromEntries(Object.entries(HEALTHY).map(([k, v]) => [k, mix(v, WILTED[k as keyof typeof WILTED], t)])) as typeof HEALTHY;
  return {
    ...foliage,
    flowers: FLOWERS_HEALTHY.map((c, i) => mix(c, FLOWERS_WILTED[i], t)),
    trunk: "#8a5d3b",
    trunkDark: "#6a432a",
    sand: "#f1dba9",
    sandDark: "#dcbf87",
    sandLight: "#f9ebc9",
    soil: ["#7b5637", "#956b46", "#b08758", "#8e8d87"],
    rock: "#a6a79f",
    rockDark: "#83847d",
    rockLight: "#c3c4bc",
    dirt: "#b89467",
  };
}

export type SkyPalette = {
  top: string;
  mid: string;
  bottom: string;
  water: [string, string, string];
  foam: string;
  cloud: string;
  cloudShade: string;
  far: string;
  sun?: { x: number; y: number; r: number; color: string; glow: string };
  moon?: { x: number; y: number; r: number };
  stars?: boolean;
  rain?: boolean;
  night?: boolean;
  /** Animated skies draw a WebGL layer behind a transparent SVG sky. */
  transparentSky?: boolean;
};

export const SKY_PALETTES: Record<SkyId, SkyPalette> = {
  day: {
    top: "#8ecdf3",
    mid: "#bfe3f8",
    bottom: "#e9f6fb",
    water: ["#7fcbe6", "#3f97c9", "#21679c"],
    foam: "#f4fbff",
    cloud: "#ffffff",
    cloudShade: "#dcecf6",
    far: "#a9cfe0",
    sun: { x: 905, y: 232, r: 34, color: "#ffe08a", glow: "#fff4c7" },
  },
  dawn: {
    top: "#c9b8e6",
    mid: "#f4c3c8",
    bottom: "#fde6c9",
    water: ["#e6c6c9", "#9fb2d6", "#5b78a8"],
    foam: "#fff4ef",
    cloud: "#fff0f0",
    cloudShade: "#efcbd3",
    far: "#c3b3cf",
    sun: { x: 300, y: 402, r: 34, color: "#ffd2a1", glow: "#ffe9d2" },
  },
  sunset: {
    top: "#e9876b",
    mid: "#f6b27e",
    bottom: "#fbdca8",
    water: ["#f0b08a", "#a58aa6", "#4f5e8e"],
    foam: "#fff0dc",
    cloud: "#fbd0b0",
    cloudShade: "#e39b84",
    far: "#c98b86",
    sun: { x: 880, y: 396, r: 50, color: "#ffcf7a", glow: "#ffe1a8" },
  },
  rain: {
    top: "#8f9fae",
    mid: "#b4c0cb",
    bottom: "#d6dee5",
    water: ["#a2b6c4", "#6f8ca1", "#4a6379"],
    foam: "#eef3f6",
    cloud: "#c9d1d8",
    cloudShade: "#98a6b2",
    far: "#a3b0ba",
    rain: true,
  },
  night: {
    top: "#0a1430",
    mid: "#16244c",
    bottom: "#2a3c6c",
    water: ["#2b4170", "#1b2c52", "#0f1c38"],
    foam: "#9fb3d8",
    cloud: "#3a4a78",
    cloudShade: "#2b3966",
    far: "#25365e",
    moon: { x: 900, y: 232, r: 26 },
    stars: true,
    night: true,
  },
  aurora: {
    top: "#050b18",
    mid: "#0a1630",
    bottom: "#132448",
    water: ["#173055", "#0f2140", "#08142a"],
    foam: "#8fe3c6",
    cloud: "#22325a",
    cloudShade: "#1a2748",
    far: "#14284a",
    stars: true,
    night: true,
    transparentSky: true,
  },
  cosmos: {
    top: "#03040c",
    mid: "#080b1c",
    bottom: "#0f1430",
    water: ["#1b2147", "#10152f", "#070a1a"],
    foam: "#b9b2ff",
    cloud: "#1c2048",
    cloudShade: "#14173a",
    far: "#151a3c",
    night: true,
    transparentSky: true,
  },
};
