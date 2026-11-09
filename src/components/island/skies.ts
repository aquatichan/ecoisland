// The island's skies as CSS gradients: a sky above the horizon, sea below it.
// Painted backdrops can replace these later. The two animated skies draw a WebGL
// layer over theirs (see AuroraSky and GalaxySky in src/components/fx).
import type { SkyId } from "@/shared/catalog";

export type SkyLook = {
  /** Top, middle and horizon colors of the sky. */
  sky: [string, string, string];
  /** Colors of the sea from the horizon down. */
  sea: [string, string, string];
  stars?: boolean;
  /** Sun or moon, in scene px. */
  sun?: { x: number; y: number; r: number; color: string; glow: string };
  moon?: { x: number; y: number; r: number };
  /** The WebGL sky drawn over the gradient. */
  animated?: "aurora" | "cosmos";
};

export const SKY_LOOKS: Record<SkyId, SkyLook> = {
  day: { sky: ["#8ecdf3", "#bfe3f8", "#e9f6fb"], sea: ["#7fcbe6", "#3f97c9", "#21679c"], sun: { x: 905, y: 232, r: 34, color: "#ffe08a", glow: "#fff4c7" } },
  dawn: { sky: ["#c9b8e6", "#f4c3c8", "#fde6c9"], sea: ["#e6c6c9", "#9fb2d6", "#5b78a8"], sun: { x: 300, y: 402, r: 34, color: "#ffd2a1", glow: "#ffe9d2" } },
  sunset: { sky: ["#e9876b", "#f6b27e", "#fbdca8"], sea: ["#f0b08a", "#a58aa6", "#4f5e8e"], sun: { x: 880, y: 396, r: 50, color: "#ffcf7a", glow: "#ffe1a8" } },
  rain: { sky: ["#8f9fae", "#b4c0cb", "#d6dee5"], sea: ["#a2b6c4", "#6f8ca1", "#4a6379"] },
  night: { sky: ["#0a1430", "#16244c", "#2a3c6c"], sea: ["#2b4170", "#1b2c52", "#0f1c38"], stars: true, moon: { x: 900, y: 232, r: 26 } },
  aurora: { sky: ["#050b18", "#0a1630", "#132448"], sea: ["#173055", "#0f2140", "#08142a"], stars: true, animated: "aurora" },
  cosmos: { sky: ["#03040c", "#080b1c", "#0f1430"], sea: ["#1b2147", "#10152f", "#070a1a"], animated: "cosmos" },
};
