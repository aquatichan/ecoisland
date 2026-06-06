// @ts-nocheck
import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence, useMotionValue } from "framer-motion";
import { User } from "@/entities/User";
import {
  ShoppingCart,
  TreePine,
  CheckCircle,
  Loader2,
  Star,
  Lock,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import Galaxy from "../components/Galaxy";

type IslandCategory = "skybox" | "island" | "decoration";

type IslandItem = {
  id: string;
  name: string;
  cost: number;
  category: IslandCategory;
  description: string;
  emoji: string;
  color: string;
  image: string;
};

type IslandOwnership = {
  item_id: string;
  item_type: IslandCategory;
  active: boolean;
  purchased_date?: string;
};

type IslandLayoutEntry = {
  item_id: string;
  x: number; // normalized 0..1 (center-based)
  y: number; // normalized 0..1 (center-based)
  width: number;
  height: number;
  zIndex: number;
  rotation?: number;
};

type MessageState = { type: "success" | "error"; text: string } | null;

const ASSET_BASE = "/islandDecor";

const ISLAND_ITEMS: IslandItem[] = [
  // * SKYBOXES *
  {
    id: "aurora_dreams",
    name: "Aurora Dreams",
    cost: 100,
    category: "skybox",
    description: "Glistening with the color of jewels",
    emoji: "🌈",
    color: "#b008d6",
    image: `${ASSET_BASE}/Aurora Dreams.png`,
  },
  {
    id: "environment_advocate",
    name: "Environment Advocate",
    cost: 5,
    category: "skybox",
    description: "Probably your first skybox, also Ecoisland's favorite",
    emoji: "🍃",
    color: "#32fd50",
    image: `${ASSET_BASE}/Environment Advocate.png`,
  },
  {
    id: "faint_snowfall",
    name: "Faint Snowfall",
    cost: 50,
    category: "skybox",
    description: "The comfort of snowflakes and shivers",
    emoji: "🌨",
    color: "#88deee",
    image: `${ASSET_BASE}/Faint Snowfall.png`,
  },
  {
    id: "futurismo",
    name: "Futurismo",
    cost: 220,
    category: "skybox",
    description: "Pixels worthy for a startup pitch",
    emoji: "🔮",
    color: "#5512ac",
    image: `${ASSET_BASE}/Futurismo.png`,
  },
  {
    id: "glitchy",
    name: "GLITCHY",
    cost: 666,
    category: "skybox",
    description: "!Ëćøįšłåñ∂ îś šō çöòł¡",
    emoji: "👾",
    color: "#063104",
    image: `${ASSET_BASE}/GLITCHY.png`,
  },
  {
    id: "metropolis_sunset",
    name: "Metropolis Sunset",
    cost: 210,
    category: "skybox",
    description: "Imagine a drive in this environment, makes you want to save it",
    emoji: "🌅",
    color: "#f97316",
    image: `${ASSET_BASE}/Metropolis Sunset.png`,
  },
  {
    id: "moonshine",
    name: "Moonshine",
    cost: 130,
    category: "skybox",
    description: "Fun fact: our moon dictates our tides",
    emoji: "🌕",
    color: "#f1d983",
    image: `${ASSET_BASE}/Moonshine.png`,
  },
  {
    id: "mystic_divinity",
    name: "Mystic Divinity",
    cost: 1111,
    category: "skybox",
    description: "YOU, ALONE, ARE THE CHOSEN ONE.",
    emoji: "👑",
    color: "#e8cd01",
    image: `${ASSET_BASE}/Mystic Divinity.png`,
  },
  {
    id: "partly_cloudy",
    name: "Partly cloudy",
    cost: 25,
    category: "skybox",
    description: "Calm, clear horizons with clouds",
    emoji: "⛅️",
    color: "#61d4fe",
    image: `${ASSET_BASE}/Partly Cloudy.png`,
  },
  {
    id: "perfection",
    name: "Perfection",
    cost: 999,
    category: "skybox",
    description: "The best looking skyline. Can Earth be like this more?",
    emoji: "🤩",
    color: "#ec854d",
    image: `${ASSET_BASE}/Perfection.png`,
  },
  {
    id: "retrowave",
    name: "Retrowave",
    cost: 380,
    category: "skybox",
    description: "Headphones on type shi",
    emoji: "🦄",
    color: "#9626dc",
    image: `${ASSET_BASE}/Retrowave.png`,
  },
  {
    id: "the_cosmos",
    name: "The Cosmos",
    cost: 420,
    category: "skybox",
    description: "Intergalactic visuals",
    emoji: "🪐",
    color: "#13035a",
    image: `${ASSET_BASE}/The Cosmos.png`,
  },
  // * ISLAND BASES *
  {
    id: "desertified",
    name: "Desertified",
    cost: 90,
    category: "island",
    description: "PLEASE find water",
    emoji: "🌵",
    color: "#b2e00b",
    image: `${ASSET_BASE}/Desertified.png`,
  },
  {
    id: "lush_grass",
    name: "Lush Grass",
    cost: 10,
    category: "island",
    description: "The gold standard of islands",
    emoji: "🌱",
    color: "#6ef613",
    image: `${ASSET_BASE}/Lush Grass.png`,
  },
  {
    id: "magma_bed",
    name: "Magma Bed",
    cost: 50,
    category: "island",
    description: "Don't dig straight down",
    emoji: "🔥",
    color: "#a6410f",
    image: `${ASSET_BASE}/Magma Bed.png`,
  },
  {
    id: "purple_mountains",
    name: "Purple Mountains",
    cost: 125,
    category: "island",
    description: "Notice the symmetry?",
    emoji: "🗻",
    color: "#9b5ee5",
    image: `${ASSET_BASE}/Purple Mountains.png`,
  },
  {
    id: "reflection",
    name: "Reflection",
    cost: 240,
    category: "island",
    description: "¿ʎuunɟ os s,ʇɐɥʍ",
    emoji: "🪞",
    color: "#c7c7c7",
    image: `${ASSET_BASE}/Reflection.png`,
  },
  {
    id: "sand_dunes",
    name: "Sand Dunes",
    cost: 75,
    category: "island",
    description: "Geometrically amazing.",
    emoji: "🏜️",
    color: "#a6a10f",
    image: `${ASSET_BASE}/Sand Dunes.png`,
  },
  {
    id: "the_end",
    name: "The End",
    cost: 150,
    category: "island",
    description: "But this time, you have to beat the Ecoisland dragon",
    emoji: "🕳️",
    color: "#d3ca8b",
    image: `${ASSET_BASE}/The End.png`,
  },
  {
    id: "uneven_elevation",
    name: "Uneven Elevation",
    cost: 60,
    category: "island",
    description: "We always love some variety in our islands",
    emoji: "🛗",
    color: "#33bf89",
    image: `${ASSET_BASE}/Uneven Elevation.png`,
  },
  // * DECORATIONS *
  {
    id: "ambassador_badge",
    name: "Ambassador Badge",
    cost: 999999999,
    category: "decoration",
    description: "Unobtainable except if you're an ambassador",
    emoji: "🎖️",
    color: "#116fff",
    image: `${ASSET_BASE}/Ambassador Badge.png`,
  },
  {
    id: "rock_shower",
    name: "Rock Shower",
    cost: 160,
    category: "decoration",
    description: "A dance of fire and ice. Wait...",
    emoji: "☄️",
    color: "#00ffff",
    image: `${ASSET_BASE}/Rock Shower.png`,
  },
    {
    id: "crops",
    name: "Crops",
    cost: 35,
    category: "decoration",
    description: "A basket of whole foods for healthy routines",
    emoji: "🧺",
    color: "#84cc16",
    image: `${ASSET_BASE}/Crops.png`,
  },
  {
    id: "crystal_waterfall",
    name: "Crystal Waterfall",
    cost: 120,
    category: "decoration",
    description: "A shimmering glacier cascade",
    emoji: "💎",
    color: "#38bdf8",
    image: `${ASSET_BASE}/Crystal Waterfall.png`,
  },
  {
    id: "emblem_of_care",
    name: "Emblem of Care",
    cost: 50,
    category: "decoration",
    description: "A symbol celebrating stewardship and compassion to our planet",
    emoji: "💚",
    color: "#22c55e",
    image: `${ASSET_BASE}/Emblem of Care.png`,
  },
  {
    id: "environmental_orbs",
    name: "Environmental Orbs",
    cost: 140,
    category: "decoration",
    description: "Floating spheres radiating environmental content",
    emoji: "🟢",
    color: "#10b981",
    image: `${ASSET_BASE}/Environmental Orbs.png`,
  },
  {
    id: "giant_cursor",
    name: "Giant Cursor",
    cost: 100,
    category: "decoration",
    description: "An oversized computer cursor",
    emoji: "🖱️",
    color: "#a855f7",
    image: `${ASSET_BASE}/Giant Cursor.png`,
  },
  {
    id: "thunderstorm",
    name: "Thunderstorm",
    cost: 75,
    category: "decoration",
    description: "Just a natural form of weather, don't worry",
    emoji: "⛈",
    color: "#f97316",
    image: `${ASSET_BASE}/Thunderstorm.png`,
  },
  {
    id: "suburban_beachhouse",
    name: "Suburban Beachhouse",
    cost: 125,
    category: "decoration",
    description: "A sizeable home for the conscious families",
    emoji: "🏠",
    color: "#3b82f6",
    image: `${ASSET_BASE}/Suburban Beachhouse.png`,
  },
  {
    id: "forest",
    name: "Forest",
    cost: 60,
    category: "decoration",
    description: "Premium oxygen suppliers",
    emoji: "🌲",
    color: "#15803d",
    image: `${ASSET_BASE}/Forest.png`,
  },
  {
    id: "renewable_energy",
    name: "Renewable Energy",
    cost: 120,
    category: "decoration",
    description: "A tribute to sustainable power generation (wind, solar, hydro, etc.)",
    emoji: "⚡️",
    color: "#eab308",
    image: `${ASSET_BASE}/Renewable Energy.png`,
  },
  {
    id: "the_grand_oak",
    name: "The Grand Oak",
    cost: 45,
    category: "decoration",
    description: "A timeless giant that has witnessed generations of change",
    emoji: "🌳",
    color: "#166534",
    image: `${ASSET_BASE}/The Grand Oak.png`,
  },
  {
    id: "together",
    name: "Together",
    cost: 70,
    category: "decoration",
    description: "A reminder that change happens together.",
    emoji: "🤝",
    color: "#ec4899",
    image: `${ASSET_BASE}/Together.png`,
  },
  {
    id: "treecoins",
    name: "Treecoins",
    cost: 65,
    category: "decoration",
    description: "This guy is rich!",
    emoji: "🪙",
    color: "#dffa15",
    image: `${ASSET_BASE}/Treecoins.png`,
  },
  {
    id: "trophy",
    name: "Trophy",
    cost: 200,
    category: "decoration",
    description: "For those who go above and beyond",
    emoji: "🏆",
    color: "#f59e0b",
    image: `${ASSET_BASE}/Trophy.png`,
  },
  {
    id: "volcano",
    name: "Volcano",
    cost: 240,
    category: "decoration",
    description: "A powerful peak with molten magma energy inside",
    emoji: "🌋",
    color: "#dc2626",
    image: `${ASSET_BASE}/Volcano.png`,
  },
  {
    id: "eco_car",
    name: "Eco Car",
    cost: 95,
    category: "decoration",
    description: "Reminder: go log your carbon emissions!",
    emoji: "🚗",
    color: "#dc2626",
    image: `${ASSET_BASE}/Eco Car.png`,
  },
  {
    id: "nuke",
    name: "Nuke",
    cost: 350,
    category: "decoration",
    description: "A mushroom cloud frozen in time, right before your island fades away",
    emoji: "💥",
    color: "#dc2626",
    image: `${ASSET_BASE}/Nuke.png`,
  },
  
];

const CATEGORIES = [
  { key: "all", label: "All Items" },
  { key: "skybox", label: "Skyboxes" },
  { key: "island", label: "Islands" },
  { key: "decoration", label: "Decorations" },
] as const;

const ITEM_BY_ID = Object.fromEntries(ISLAND_ITEMS.map((item) => [item.id, item]));

const DEFAULT_LAYOUT: Record<string, IslandLayoutEntry> = {
  forest_small: { item_id: "forest_small", x: 0.28, y: 0.62, width: 110, height: 110, zIndex: 30 },
  windmill: { item_id: "windmill", x: 0.76, y: 0.56, width: 90, height: 130, zIndex: 35 },
  solar_panel: { item_id: "solar_panel", x: 0.58, y: 0.67, width: 120, height: 75, zIndex: 32 },
  waterfall: { item_id: "waterfall", x: 0.82, y: 0.66, width: 120, height: 150, zIndex: 33 },
  volcano: { item_id: "volcano", x: 0.52, y: 0.52, width: 150, height: 150, zIndex: 40 },
};

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

function toLayoutMap(layout: any): Record<string, IslandLayoutEntry> {
  const entries: Record<string, IslandLayoutEntry> = {};
  if (!Array.isArray(layout)) return entries;

  for (const raw of layout) {
    if (!raw?.item_id) continue;
    entries[raw.item_id] = {
      item_id: raw.item_id,
      x: typeof raw.x === "number" ? raw.x : 0.5,
      y: typeof raw.y === "number" ? raw.y : 0.5,
      width: typeof raw.width === "number" ? raw.width : 120,
      height: typeof raw.height === "number" ? raw.height : 120,
      zIndex: typeof raw.zIndex === "number" ? raw.zIndex : 20,
      rotation: typeof raw.rotation === "number" ? raw.rotation : 0,
    };
  }

  return entries;
}

function getLayoutForItem(itemId: string, current?: IslandLayoutEntry) {
  return current || DEFAULT_LAYOUT[itemId] || {
    item_id: itemId,
    x: 0.5,
    y: 0.55,
    width: 120,
    height: 120,
    zIndex: 25,
    rotation: 0,
  };
}

/**
 * DraggableDecoration
 *
 * Why offset-based and not point-based:
 *   Framer Motion's `drag` applies its own CSS transform on top of the element's
 *   existing `left/top` position. When we read `info.point` (viewport coords) at
 *   drag-end the element has already been visually moved, but `left/top` in the
 *   DOM still reflects the OLD position — so converting `info.point` → scene
 *   coords produces a jump/clamp artifact.
 *
 *   Instead we:
 *     1. Record the scene's pixel dimensions at pointer-down.
 *     2. On drag-end, take the accumulated pixel offset (`info.offset`) and
 *        convert it to a normalized delta (0..1) relative to the scene size.
 *     3. Add that delta to the item's previous normalized x/y — no snapping,
 *        full floating-point precision.
 *     4. Reset Framer's internal transform to zero (via `motionValue`) so the
 *        element re-renders at the new `left/top` without a visual jump.
 */
function DraggableDecoration({
  item,
  layout,
  sceneRef,
  onDragEndItem,
}: {
  item: IslandItem;
  layout: IslandLayoutEntry;
  sceneRef: React.RefObject<HTMLDivElement>;
  onDragEndItem: (itemId: string, offsetNorm: { dx: number; dy: number }) => void;
}) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  // Keep a ref to the scene rect captured at pointer-down so it doesn't change mid-drag
  const sceneSizeRef = useRef<{ width: number; height: number } | null>(null);

  const handleDragStart = () => {
    if (!sceneRef.current) return;
    const r = sceneRef.current.getBoundingClientRect();
    sceneSizeRef.current = { width: r.width, height: r.height };
  };

  const handleDragEnd = (_e: any, info: any) => {
    const size = sceneSizeRef.current;
    if (!size || !size.width || !size.height) return;

    const dx = info.offset.x / size.width;
    const dy = info.offset.y / size.height;

    // Reset Framer's internal translate so the element sits cleanly on the
    // new CSS left/top after the parent re-renders with updated layout.
    x.set(0);
    y.set(0);

    onDragEndItem(item.id, { dx, dy });
  };

  return (
    <motion.img
      src={item.image}
      alt={item.name}
      drag
      dragMomentum={false}
      dragElastic={0}
      dragConstraints={sceneRef}
      style={{
        position: "absolute",
        left: `${layout.x * 100}%`,
        top: `${layout.y * 100}%`,
        width: layout.width,
        height: layout.height,
        zIndex: layout.zIndex,
        x,
        y,
        translateX: "-50%",
        translateY: "-50%",
        rotate: layout.rotation || 0,
        filter: "drop-shadow(0 10px 20px rgba(0,0,0,0.28))",
        cursor: "grab",
      }}
      className="absolute select-none active:cursor-grabbing"
      draggable={false}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      whileDrag={{ scale: 1.04 }}
    />
  );
}

function IslandScene({
  skybox,
  island,
  decorations,
  layoutMap,
  onDragEndItem,
  sceneRef,
}: {
  skybox: IslandItem | null;
  island: IslandItem | null;
  decorations: IslandItem[];
  layoutMap: Record<string, IslandLayoutEntry>;
  onDragEndItem: (itemId: string, offsetNorm: { dx: number; dy: number }) => void;
  sceneRef: React.RefObject<HTMLDivElement>;
}) {
  return (
    <div
      ref={sceneRef}
      className="relative w-full overflow-hidden rounded-2xl"
      style={{ height: 340, background: "#0f172a" }}
    >
      {/* Sky background */}
      {skybox ? (
        <img
          src={skybox.image}
          alt={skybox.name}
          className="absolute inset-0 h-full w-full object-cover select-none pointer-events-none"
          draggable={false}
        />
      ) : (
        <div className="absolute inset-0">
          <Galaxy mouseRepulsion mouseInteraction density={1.5} glowIntensity={0.8} saturation={0.8} hueShift={240} />
        </div>
      )}

      {/* Distant haze / horizon overlay */}
      <div
        className="absolute inset-x-0 bottom-0 h-[36%] pointer-events-none"
        style={{ background: "linear-gradient(to top, rgba(15,23,42,0.45), rgba(15,23,42,0.02))" }}
      />

      {/* Base island image */}
      {island && (
        <img
          src={island.image}
          alt={island.name}
          className="absolute inset-x-0 bottom-0 w-full select-none pointer-events-none"
          draggable={false}
          style={{
            objectFit: "cover",
            objectPosition: "top center",
            height: "115%",
            zIndex: 20,
            // Reflection island is upside-down by design — anchor it to the top instead of bottom
            ...(island.id === "reflection" && {
              top: 0,
              bottom: "auto",
              objectPosition: "bottom center",
            }),
          }}
        />
      )}

      {/* Decorations / placeable objects */}
      {decorations.map((item) => {
        const layout = getLayoutForItem(item.id, layoutMap[item.id]);
        return (
          <DraggableDecoration
            key={item.id}
            item={item}
            layout={layout}
            sceneRef={sceneRef}
            onDragEndItem={onDragEndItem}
          />
        );
      })}

      {/* Subtle foreground grass line */}
      <div
        className="absolute inset-x-0 bottom-0 h-[26px] pointer-events-none"
        style={{ background: "linear-gradient(to top, rgba(34,197,94,0.28), rgba(34,197,94,0))" }}
      />
    </div>
  );
}

export default function Island() {
  const [user, setUser] = useState<any>(null);
  const [category, setCategory] = useState<string>("all");
  const [message, setMessage] = useState<MessageState>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [activeSkybox, setActiveSkybox] = useState<string | null>(null);
  const [activeIsland, setActiveIsland] = useState<string | null>(null);
  const [activeDecorations, setActiveDecorations] = useState<string[]>([]);
  const [layoutMap, setLayoutMap] = useState<Record<string, IslandLayoutEntry>>({});

  const sceneRef = useRef<HTMLDivElement>(null);
  const saveTimerRef = useRef<any>(null);

  const showMessage = (next: MessageState, ms = 2500) => {
    setMessage(next);
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => setMessage(null), ms);
  };

  useEffect(() => {
    let mounted = true;

    User.me()
      .then((u: any) => {
        if (!mounted) return;
        setUser(u);

        const items: IslandOwnership[] = u?.island_items || [];
        const skyboxId = items.find((i) => i.item_type === "skybox" && i.active)?.item_id || null;
        const islandId = items.find((i) => i.item_type === "island" && i.active)?.item_id || null;
        const decorationIds = items.filter((i) => i.item_type === "decoration" && i.active).map((i) => i.item_id);

        setActiveSkybox(skyboxId);
        setActiveIsland(islandId);
        setActiveDecorations(decorationIds);

        const savedLayout = toLayoutMap(u?.island_layout || []);
        const merged: Record<string, IslandLayoutEntry> = { ...savedLayout };

        // Give every active decoration a sane default position if no saved layout exists yet.
        for (const id of decorationIds) {
          if (!merged[id]) merged[id] = { ...getLayoutForItem(id) };
        }

        setLayoutMap(merged);
      })
      .catch(() => {
        // keep empty state
      })
      .finally(() => {
        if (mounted) setIsLoading(false);
      });

    return () => {
      mounted = false;
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, []);

  const ownedItemIds = useMemo(() => (user?.island_items || []).map((i: IslandOwnership) => i.item_id), [user]);

  const activeSkyboxItem = activeSkybox ? ITEM_BY_ID[activeSkybox] || null : null;
  const activeIslandItem = activeIsland ? ITEM_BY_ID[activeIsland] || null : null;
  const activeDecorationItems = activeDecorations.map((id) => ITEM_BY_ID[id]).filter(Boolean) as IslandItem[];

  const saveIslandData = async (nextUserPatch: Record<string, any>, nextLayoutMap?: Record<string, IslandLayoutEntry>) => {
    const payload: Record<string, any> = { ...nextUserPatch };
    if (nextLayoutMap) payload.island_layout = Object.values(nextLayoutMap);
    await User.updateMyUserData(payload);
  };

  const handleBuy = async (item: IslandItem) => {
    if (!user) return;

    if ((user.treecoins || 0) < item.cost) {
      showMessage({ type: "error", text: "Not enough Treecoins!" }, 3000);
      return;
    }

    const existing: IslandOwnership[] = user.island_items || [];
    const alreadyOwned = existing.some((i) => i.item_id === item.id);
    const nextItems = alreadyOwned
      ? existing
      : [
          ...existing,
          {
            item_id: item.id,
            item_type: item.category,
            active: false,
            purchased_date: new Date().toISOString(),
          },
        ];

    const updatedUser = {
      treecoins: (user.treecoins || 0) - item.cost,
      island_items: nextItems,
    };

    await saveIslandData(updatedUser, layoutMap);
    setUser((prev: any) => ({ ...prev, ...updatedUser }));
    showMessage({ type: "success", text: `${item.name} purchased! 🎉` }, 2500);
  };

  const activateDecorationWithDefaultLayout = (itemId: string, currentMap: Record<string, IslandLayoutEntry>) => {
    const nextMap = { ...currentMap };
    if (!nextMap[itemId]) nextMap[itemId] = { ...getLayoutForItem(itemId) };
    return nextMap;
  };

  const handleActivate = async (item: IslandItem) => {
    if (!user) return;

    const currentItems: IslandOwnership[] = user.island_items || [];
    let nextItems = currentItems;
    let nextSkybox = activeSkybox;
    let nextIsland = activeIsland;
    let nextDecorations = [...activeDecorations];
    let nextLayout = { ...layoutMap };

    if (item.category === "skybox") {
      nextItems = currentItems.map((i) => {
        if (i.item_type !== "skybox") return i;
        return { ...i, active: i.item_id === item.id ? !i.active : false };
      });
      nextSkybox = nextSkybox === item.id ? null : item.id;
    }

    if (item.category === "island") {
      nextItems = currentItems.map((i) => {
        if (i.item_type !== "island") return i;
        return { ...i, active: i.item_id === item.id ? !i.active : false };
      });
      nextIsland = nextIsland === item.id ? null : item.id;
    }

    if (item.category === "decoration") {
      const currentlyActive = nextDecorations.includes(item.id);

      nextItems = currentItems.map((i) => {
        if (i.item_id !== item.id) return i;
        return { ...i, active: !currentlyActive };
      });

      if (currentlyActive) {
        nextDecorations = nextDecorations.filter((d) => d !== item.id);
      } else {
        nextDecorations = [...nextDecorations, item.id];
        nextLayout = activateDecorationWithDefaultLayout(item.id, nextLayout);
      }
    }

    const updatedUser = { island_items: nextItems };
    await saveIslandData(updatedUser, nextLayout);

    setUser((prev: any) => ({ ...prev, ...updatedUser, island_layout: Object.values(nextLayout) }));
    setActiveSkybox(nextSkybox);
    setActiveIsland(nextIsland);
    setActiveDecorations(nextDecorations);
    setLayoutMap(nextLayout);
    showMessage({ type: "success", text: "Island updated!" }, 2200);
  };

  const handleDragEndItem = async (itemId: string, offsetNorm: { dx: number; dy: number }) => {
    const layout = layoutMap[itemId] || getLayoutForItem(itemId);

    const nextX = clamp(layout.x + offsetNorm.dx, 0, 1);
    const nextY = clamp(layout.y + offsetNorm.dy, 0, 1);

    const nextLayout = {
      ...layoutMap,
      [itemId]: {
        ...layout,
        item_id: itemId,
        x: nextX,
        y: nextY,
      },
    };

    setLayoutMap(nextLayout);

    try {
      await saveIslandData({ island_layout: Object.values(nextLayout) }, nextLayout);
      showMessage({ type: "success", text: "Position saved." }, 1500);
    } catch {
      showMessage({ type: "error", text: "Could not save position." }, 2200);
    }
  };

  const filtered = category === "all" ? ISLAND_ITEMS : ISLAND_ITEMS.filter((i) => i.category === category);
  const nothingActive = !activeSkybox && !activeIsland && activeDecorations.length === 0;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--bg-page)" }}>
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-8" style={{ background: "var(--bg-page)" }}>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-3xl md:text-4xl font-black text-slate-900 flex items-center gap-3" style={{ letterSpacing: "-0.03em" }}>
                🏝️ Your Island
              </h1>
              <p className="text-slate-500 mt-1">Customize your Ecoisland with Treecoins</p>
            </div>
            <div
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl"
              style={{ background: "rgba(0,200,150,0.1)", border: "2px solid rgba(0,200,150,0.25)" }}
            >
              <TreePine className="w-5 h-5 text-emerald-500" />
              <span className="font-black text-emerald-700 text-lg">{user?.treecoins ?? 0}</span>
              <span className="text-emerald-500 text-sm font-medium">Treecoins</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Island preview */}
          <div className="lg:col-span-3">
            <div className="eco-card p-4 mb-4">
              <h3 className="font-bold text-slate-700 mb-3 flex items-center gap-2">
                <Star className="w-4 h-4 text-amber-500" /> Island Preview
              </h3>

              <div className="rounded-2xl overflow-hidden" style={{ border: "2px solid #e2e8f0", backgroundColor: "#000" }}>
                {nothingActive ? (
                  <div style={{ width: "100%", height: 340, position: "relative" }}>
                    <Galaxy mouseRepulsion mouseInteraction density={1.5} glowIntensity={0.5} saturation={0.8} hueShift={240} />
                  </div>
                ) : (
                  <IslandScene
                    skybox={activeSkyboxItem}
                    island={activeIslandItem}
                    decorations={activeDecorationItems}
                    layoutMap={layoutMap}
                    onDragEndItem={handleDragEndItem}
                    sceneRef={sceneRef}
                  />
                )}
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                {activeSkyboxItem && (
                  <span className="text-xs px-2 py-1 rounded-full bg-blue-50 border border-blue-100 text-blue-600">
                    {activeSkyboxItem.emoji} {activeSkyboxItem.name}
                  </span>
                )}
                {activeIslandItem && (
                  <span className="text-xs px-2 py-1 rounded-full bg-emerald-50 border border-emerald-100 text-emerald-600">
                    {activeIslandItem.emoji} {activeIslandItem.name}
                  </span>
                )}
                {activeDecorationItems.map((d) => (
                  <span key={d.id} className="text-xs px-2 py-1 rounded-full bg-purple-50 border border-purple-100 text-purple-600">
                    {d.emoji} {d.name}
                  </span>
                ))}
                {nothingActive && <span className="text-xs text-slate-400 italic">No items equipped — purchase and activate items from the shop</span>}
              </div>
            </div>
          </div>

          {/* Shop */}
          <div className="lg:col-span-2">
            <div className="eco-card p-4">
              <div className="flex items-center gap-2 mb-4">
                <ShoppingCart className="w-5 h-5 text-emerald-600" />
                <h3 className="font-bold text-slate-800">Island Shop</h3>
              </div>

              {/* Category filter */}
              <div className="flex flex-wrap gap-1.5 mb-4">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat.key}
                    onClick={() => setCategory(cat.key)}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
                    style={
                      category === cat.key
                        ? { background: "linear-gradient(135deg, #00c896, #06b6d4)", color: "white" }
                        : { background: "var(--bg-subtle)", color: "var(--text-muted)" }
                    }
                  >
                    {cat.label}
                  </button>
                ))}
              </div>

              {/* Message */}
              <AnimatePresence>
                {message && (
                  <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className={`flex items-center gap-2 p-3 rounded-xl mb-3 text-sm ${
                      message.type === "success"
                        ? "status-success rounded-xl text-emerald-700 dark:text-emerald-300"
                        : "status-error rounded-xl text-red-700 dark:text-red-400"
                    }`}
                  >
                    <CheckCircle className="w-4 h-4 flex-shrink-0" />
                    {message.text}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Items */}
              <div className="space-y-2 max-h-[520px] overflow-y-auto pr-1">
                {filtered.map((item) => {
                  const owned = ownedItemIds.includes(item.id);
                  const active =
                    item.category === "skybox"
                      ? activeSkybox === item.id
                      : item.category === "island"
                      ? activeIsland === item.id
                      : activeDecorations.includes(item.id);

                  return (
                    <motion.div
                      key={item.id}
                      layout
                      className="flex items-center gap-3 p-3 rounded-xl border-2 transition-all"
                      style={{
                        borderColor: active ? item.color : owned ? "#e2e8f0" : "#f1f5f9",
                        background: `${item.color}08`,
                      }}
                    >
                      <div className="text-2xl flex-shrink-0">{item.emoji}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="font-bold text-slate-800 text-sm truncate">{item.name}</p>
                          {active && (
                            <span className="text-xs font-bold px-1.5 py-0.5 rounded-md text-white" style={{ background: item.color }}>
                              ON
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-400">{item.description}</p>
                        <p className="text-xs font-bold mt-0.5" style={{ color: item.color }}>
                          🌱 {item.cost} TC
                        </p>
                      </div>
                      <div className="flex-shrink-0">
                        {owned ? (
                          <button
                            onClick={() => handleActivate(item)}
                            className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
                            style={
                              active
                                ? { background: `${item.color}20`, color: item.color, border: `1.5px solid ${item.color}` }
                                : { background: "#f8fafc", color: "#64748b", border: "1.5px solid #e2e8f0" }
                            }
                          >
                            {active ? "Remove" : "Equip"}
                          </button>
                        ) : (
                          <button
                            onClick={() => handleBuy(item)}
                            disabled={(user?.treecoins || 0) < item.cost}
                            className="px-3 py-1.5 rounded-lg text-xs font-bold text-white transition-all"
                            style={{
                              background: (user?.treecoins || 0) >= item.cost ? item.color : "#94a3b8",
                              cursor: (user?.treecoins || 0) >= item.cost ? "pointer" : "not-allowed",
                            }}
                          >
                            Buy
                          </button>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Small footer hint */}
        <div className="mt-6 text-xs text-slate-400 flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5" />
          Drag decorations anywhere on the island and their saved positions will return next time.
        </div>
      </div>
    </div>
  );
}
