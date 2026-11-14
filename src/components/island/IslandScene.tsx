// The living island: a painted base with painted growth, landmarks and
// decorations standing on it, over a gradient sky and sea.
//
// Only what the student owns is drawn: callers pass `growth` and `decor`
// already filtered through src/shared/island.ts, and landmarks come from the
// units they have mastered. Items stand where their art says (src/shared/
// catalog.ts, landmarks.ts), nearer ones in front.
//
// A thirsty island fades through a CSS filter on the image wrapper only; the
// sky, the sea and the interface around it are never filtered.
import { useReducedMotion } from "framer-motion";
import { useRef, useState, type CSSProperties, type KeyboardEvent as ReactKeyboardEvent, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";
import { AuroraSky } from "@/components/fx/AuroraSky";
import { GalaxySky } from "@/components/fx/GalaxySky";
import { cn } from "@/lib/utils";
import { GROWTH, findDecor, type Anchor, type SkyId } from "@/shared/catalog";
import { LANDMARK_LAYOUT } from "@/shared/landmarks";
import type { PlacedDecor } from "@/shared/types";
import { ART } from "./assets";
import { BASE, H, HORIZON, PLACE, VIEW, W, clamp, depthScale, pctW, pctX, pctY, sceneFromView } from "./geometry";
import { healthFilter } from "./health";
import { SKY_LOOKS } from "./skies";

export type IslandSceneProps = {
  /** 1 (thriving) down to 0.2 (withered). */
  health: number;
  sky: SkyId;
  /** Owned growth ids (see visibleGrowth). */
  growth?: readonly string[];
  /** Owned, placed decorations (see visibleDecor). */
  decor?: PlacedDecor[];
  /** Units whose landmark has been earned. */
  landmarks?: readonly number[];
  /** Ambient motion for the animated skies (always off when the user prefers reduced motion). */
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
  /** A slow float for the island and everything on it; the sky, the sea and the island's shadow stay put. Still when motion is reduced. */
  float?: boolean;
  /** Draws only the island and what stands on it: no sky, no sea and no ground shadow. For a page that paints its own (the landing hero's scene). */
  bare?: boolean;
};

type Interactive = {
  onPointerDown?: (e: ReactPointerEvent<HTMLDivElement>) => void;
  onKeyDown?: (e: ReactKeyboardEvent<HTMLDivElement>) => void;
  tabIndex?: number;
  role?: string;
  "aria-label"?: string;
  cursor?: string;
};

/** One sprite standing at (sx, sy) in scene px, `sw` px wide, held by its anchor. */
function Placed({ art, sx, sy, sw, anchor, scale = 1, z, interactive }: { art: string; sx: number; sy: number; sw: number; anchor: Anchor; scale?: number; z: number; interactive?: Interactive }) {
  const asset = ART[art];
  if (!asset) return null;
  const { cursor, ...handlers } = interactive ?? {};
  const style: CSSProperties = {
    position: "absolute",
    left: `${pctX(sx)}%`,
    top: `${pctY(sy)}%`,
    width: `${pctW(sw)}%`,
    transformOrigin: `${anchor.x * 100}% ${anchor.y * 100}%`,
    transform: `translate(${-anchor.x * 100}%, ${-anchor.y * 100}%) scale(${scale})`,
    zIndex: z,
    pointerEvents: interactive ? "auto" : "none",
    cursor,
    outline: "none",
    touchAction: interactive ? "none" : undefined,
  };
  return (
    <div style={style} {...handlers}>
      <img src={asset.src} width={asset.w} height={asset.h} alt="" draggable={false} decoding="async" className="block h-auto w-full select-none" />
    </div>
  );
}

function Stars() {
  const dots = [
    "radial-gradient(1.4px 1.4px at 30px 40px, #fff, transparent)",
    "radial-gradient(1px 1px at 120px 90px, rgba(255,255,255,.8), transparent)",
    "radial-gradient(1.2px 1.2px at 200px 30px, #fff, transparent)",
    "radial-gradient(1px 1px at 260px 130px, rgba(255,255,255,.7), transparent)",
    "radial-gradient(1.3px 1.3px at 70px 150px, rgba(255,255,255,.9), transparent)",
  ];
  return <div aria-hidden className="absolute inset-x-0 top-0" style={{ height: `${HORIZON * 100}%`, backgroundImage: dots.join(","), backgroundSize: "300px 190px", opacity: 0.85 }} />;
}

function Disc({ x, y, r, color, glow }: { x: number; y: number; r: number; color: string; glow?: string }) {
  return (
    <div
      aria-hidden
      className="absolute aspect-square"
      style={{
        left: `${pctX(x)}%`,
        top: `${pctY(y)}%`,
        width: `${pctW(r * 2)}%`,
        transform: "translate(-50%, -50%)",
        borderRadius: "50%",
        background: glow ? `radial-gradient(circle, ${color} 0 46%, ${glow}cc 47%, transparent 72%)` : color,
      }}
    />
  );
}

export function IslandScene({
  health,
  sky,
  growth = [],
  decor = [],
  landmarks = [],
  animate = true,
  editable = false,
  onMoveDecor,
  selected = null,
  onSelect,
  className,
  label,
  fit = "cover",
  float = false,
  bare = false,
}: IslandSceneProps) {
  const reduced = useReducedMotion();
  const motion = animate && !reduced;
  const look = SKY_LOOKS[sky] ?? SKY_LOOKS.day;
  // The sky is a generated picture; its gradient (SKY_LOOKS) fills in around it and stands in if a sky has none.
  const skyArt = ART[`sky-${sky}`];
  const stageRef = useRef<HTMLDivElement>(null);
  const [drag, setDrag] = useState<{ index: number; x: number; y: number; ox: number; oy: number } | null>(null);
  const dragging = editable ? drag : null;

  const toScene = (clientX: number, clientY: number) => {
    const rect = stageRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0 || rect.height === 0) return { x: 0, y: 0 };
    return sceneFromView((clientX - rect.left) / rect.width, (clientY - rect.top) / rect.height);
  };

  const onDecorDown = (index: number) => (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!editable) return;
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    const at = toScene(e.clientX, e.clientY);
    const item = decor[index];
    setDrag({ index, x: item.x, y: item.y, ox: at.x - item.x, oy: at.y - item.y });
    onSelect?.(index);
  };
  const onMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!dragging) return;
    const at = toScene(e.clientX, e.clientY);
    setDrag({ ...dragging, x: clamp(at.x - dragging.ox, PLACE.x0, PLACE.x1), y: clamp(at.y - dragging.oy, PLACE.y0, PLACE.y1) });
  };
  const onUp = () => {
    if (!dragging) return;
    onMoveDecor?.(dragging.index, dragging.x, dragging.y);
    setDrag(null);
  };
  const onDecorKey = (index: number) => (e: ReactKeyboardEvent<HTMLDivElement>) => {
    if (!editable) return;
    const step = e.shiftKey ? 0.04 : 0.01;
    const item = decor[index];
    const moves: Record<string, [number, number]> = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] };
    const mv = moves[e.key];
    if (!mv) return;
    e.preventDefault();
    onMoveDecor?.(index, clamp(item.x + mv[0], PLACE.x0, PLACE.x1), clamp(item.y + mv[1], PLACE.y0, PLACE.y1));
  };

  // Everything standing on the island, back to front by where its feet are.
  const stand: Array<{ y: number; make: (z: number) => ReactNode }> = [];
  for (const unit of landmarks) {
    const lm = LANDMARK_LAYOUT[unit];
    if (!lm) continue;
    stand.push({ y: lm.y * H, make: (z) => <Placed key={`l${unit}`} art={`landmark-${unit}`} sx={lm.x * W} sy={lm.y * H} sw={lm.w * W} anchor={{ x: 0.5, y: lm.ay ?? 1 }} z={z} /> });
  }
  for (const g of GROWTH) {
    if (!growth.includes(g.id)) continue;
    stand.push({ y: g.y * H, make: (z) => <Placed key={`g${g.id}`} art={g.art} sx={g.x * W} sy={g.y * H} sw={g.w * W} anchor={g.anchor} z={z} /> });
  }
  decor.forEach((d, index) => {
    const item = findDecor(d.id);
    if (!item) return;
    const at = dragging?.index === index ? { x: dragging.x, y: dragging.y } : { x: d.x, y: d.y };
    const interactive: Interactive | undefined = editable
      ? {
          onPointerDown: onDecorDown(index),
          onKeyDown: onDecorKey(index),
          tabIndex: 0,
          role: "button",
          "aria-label": `${item.name}: drag or use arrow keys to move`,
          cursor: dragging?.index === index ? "grabbing" : "grab",
        }
      : undefined;
    stand.push({
      y: at.y * H,
      make: (z) => <Placed key={`d${index}`} art={item.art} sx={at.x * W} sy={at.y * H} sw={item.w * W} anchor={item.anchor} scale={depthScale(at.y)} z={z} interactive={interactive} />,
    });
  });
  stand.sort((a, b) => a.y - b.y);

  const selectedDecor = editable && selected !== null ? decor[selected] : undefined;
  const sel = selectedDecor && (dragging?.index === selected ? { x: dragging.x, y: dragging.y } : { x: selectedDecor.x, y: selectedDecor.y });

  // The sky and sea are drawn on a box three times the stage's height, so they fill any container
  // the stage is cropped to. Stops are given in that taller box.
  const at = (p: number) => `${(((1 + p) / 3) * 100).toFixed(2)}%`;
  const gradient = `linear-gradient(180deg, ${look.sky[0]} 0%, ${look.sky[0]} ${at(0)}, ${look.sky[1]} ${at(HORIZON * 0.6)}, ${look.sky[2]} ${at(HORIZON)}, ${look.sea[0]} ${at(HORIZON)}, ${look.sea[1]} ${at((HORIZON + 1) / 2)}, ${look.sea[2]} ${at(1)}, ${look.sea[2]} 100%)`;

  return (
    <div className={cn("relative overflow-hidden", className)} style={{ containerType: "size" }} role="img" aria-label={label ?? "Your island"}>
      <div
        ref={stageRef}
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 select-none"
        style={{ aspectRatio: `${VIEW.w} / ${VIEW.h}`, width: fit === "cover" ? "max(100cqw, calc(100cqh * 5 / 3))" : "min(100cqw, calc(100cqh * 5 / 3))" }}
        onPointerMove={editable ? onMove : undefined}
        onPointerUp={editable ? onUp : undefined}
        onPointerCancel={editable ? onUp : undefined}
      >
        {!bare && (
          <>
            <div aria-hidden className="absolute inset-x-0" style={{ top: "-100%", height: "300%", background: gradient }} />
            {skyArt ? (
              <img src={skyArt.src} width={skyArt.w} height={skyArt.h} alt="" draggable={false} decoding="async" className="absolute inset-0 size-full object-cover" />
            ) : (
              <>
                {look.stars && <Stars />}
                {look.sun && <Disc {...look.sun} />}
                {look.moon && <Disc x={look.moon.x} y={look.moon.y} r={look.moon.r} color="#f3f1de" glow="#f3f1de55" />}
              </>
            )}
            {motion && look.animated === "aurora" && <AuroraSky key={sky} />}
            {motion && look.animated === "cosmos" && <GalaxySky key={sky} />}
          </>
        )}
        {!bare && (
          <div
            aria-hidden
            className="absolute aspect-[8/1]"
            style={{ left: `${pctX(BASE.x)}%`, top: `${pctY(BASE.y - 6)}%`, width: `${pctW(BASE.w * 1.25)}%`, transform: "translate(-50%, -50%)", background: "radial-gradient(ellipse at center, rgba(6,22,40,0.38) 0%, transparent 70%)" }}
          />
        )}
        <div className={cn("absolute inset-0 transition-[filter] duration-700", float && "fx-float")} data-island-layer style={{ filter: healthFilter(health) }}>
          <Placed art="island-base" sx={BASE.x} sy={BASE.y} sw={BASE.w} anchor={{ x: BASE.ax, y: BASE.ay }} z={1} />
          {stand.map((s, i) => s.make(10 + i))}
        </div>
        {sel && (
          <div
            aria-hidden
            className="pointer-events-none absolute aspect-[4/1] border-2 border-dashed border-white/90"
            style={{ left: `${pctX(sel.x * W)}%`, top: `${pctY(sel.y * H)}%`, width: `${pctW(90)}%`, transform: "translate(-50%, -50%)", borderRadius: "50%", zIndex: 999 }}
          />
        )}
      </div>
    </div>
  );
}
