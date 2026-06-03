// @ts-nocheck
import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, TreePine, Star, MapPin, Heart, FileText, Leaf,
  Lock, ShoppingBag, Loader2, Shield
} from "lucide-react";
import { db } from "@/firebase";
import { collection, query, orderBy, limit, getDocs, doc, getDoc } from "firebase/firestore";
import Galaxy from "@/components/Galaxy";

// ─────────────────────────────────────────────────────────────────────────────
// Item catalogue — exact mirror of Island.tsx ISLAND_ITEMS
// ─────────────────────────────────────────────────────────────────────────────
const ASSET_BASE = "/islandDecor";

const ISLAND_ITEMS_MAP: Record<string, { image: string; name: string; emoji: string }> = {
  // skyboxes
  aurora_dreams:        { image: `${ASSET_BASE}/Aurora Dreams.png`,        name: "Aurora Dreams",        emoji: "🌈" },
  environment_advocate: { image: `${ASSET_BASE}/Environment Advocate.png`, name: "Environment Advocate", emoji: "🍃" },
  faint_snowfall:       { image: `${ASSET_BASE}/Faint Snowfall.png`,       name: "Faint Snowfall",       emoji: "🌨" },
  futurismo:            { image: `${ASSET_BASE}/Futurismo.png`,            name: "Futurismo",            emoji: "🔮" },
  glitchy:              { image: `${ASSET_BASE}/GLITCHY.png`,              name: "GLITCHY",              emoji: "👾" },
  metropolis_sunset:    { image: `${ASSET_BASE}/Metropolis Sunset.png`,    name: "Metropolis Sunset",    emoji: "🌅" },
  moonshine:            { image: `${ASSET_BASE}/Moonshine.png`,            name: "Moonshine",            emoji: "🌕" },
  mystic_divinity:      { image: `${ASSET_BASE}/Mystic Divinity.png`,      name: "Mystic Divinity",      emoji: "👑" },
  partly_cloudy:        { image: `${ASSET_BASE}/Partly Cloudy.png`,        name: "Partly Cloudy",        emoji: "⛅️" },
  perfection:           { image: `${ASSET_BASE}/Perfection.png`,           name: "Perfection",           emoji: "🤩" },
  retrowave:            { image: `${ASSET_BASE}/Retrowave.png`,            name: "Retrowave",            emoji: "🦄" },
  the_cosmos:           { image: `${ASSET_BASE}/The Cosmos.png`,           name: "The Cosmos",           emoji: "🪐" },
  // islands
  desertified:          { image: `${ASSET_BASE}/Desertified.png`,          name: "Desertified",          emoji: "🌵" },
  lush_grass:           { image: `${ASSET_BASE}/Lush Grass.png`,           name: "Lush Grass",           emoji: "🌱" },
  magma_bed:            { image: `${ASSET_BASE}/Magma Bed.png`,            name: "Magma Bed",            emoji: "🔥" },
  purple_mountains:     { image: `${ASSET_BASE}/Purple Mountains.png`,     name: "Purple Mountains",     emoji: "🗻" },
  reflection:           { image: `${ASSET_BASE}/Reflection.png`,           name: "Reflection",           emoji: "🪞" },
  sand_dunes:           { image: `${ASSET_BASE}/Sand Dunes.png`,           name: "Sand Dunes",           emoji: "🏜️" },
  the_end:              { image: `${ASSET_BASE}/The End.png`,              name: "The End",              emoji: "🕳️" },
  uneven_elevation:     { image: `${ASSET_BASE}/Uneven Elevation.png`,     name: "Uneven Elevation",     emoji: "🛗" },
  // decorations
  ambassador_badge:     { image: `${ASSET_BASE}/Ambassador Badge.png`,     name: "Ambassador Badge",     emoji: "🎖️" },
  rock_shower:          { image: `${ASSET_BASE}/Rock Shower.png`,          name: "Rock Shower",          emoji: "☄️" },
  crops:                { image: `${ASSET_BASE}/Crops.png`,                name: "Crops",                emoji: "🧺" },
  crystal_waterfall:    { image: `${ASSET_BASE}/Crystal Waterfall.png`,    name: "Crystal Waterfall",    emoji: "💎" },
  emblem_of_care:       { image: `${ASSET_BASE}/Emblem of Care.png`,       name: "Emblem of Care",       emoji: "💚" },
  environmental_orbs:   { image: `${ASSET_BASE}/Environmental Orbs.png`,   name: "Environmental Orbs",   emoji: "🟢" },
  giant_cursor:         { image: `${ASSET_BASE}/Giant Cursor.png`,         name: "Giant Cursor",         emoji: "🖱️" },
  thunderstorm:         { image: `${ASSET_BASE}/Thunderstorm.png`,         name: "Thunderstorm",         emoji: "⛈" },
  suburban_beachhouse:  { image: `${ASSET_BASE}/Suburban Beachhouse.png`,  name: "Suburban Beachhouse",  emoji: "🏠" },
  forest:               { image: `${ASSET_BASE}/Forest.png`,               name: "Forest",               emoji: "🌲" },
  renewable_energy:     { image: `${ASSET_BASE}/Renewable Energy.png`,     name: "Renewable Energy",     emoji: "⚡️" },
  the_grand_oak:        { image: `${ASSET_BASE}/The Grand Oak.png`,        name: "The Grand Oak",        emoji: "🌳" },
  together:             { image: `${ASSET_BASE}/Together.png`,             name: "Together",             emoji: "🤝" },
  treecoins:            { image: `${ASSET_BASE}/Treecoins.png`,            name: "Treecoins",            emoji: "🪙" },
  trophy:               { image: `${ASSET_BASE}/Trophy.png`,               name: "Trophy",               emoji: "🏆" },
  volcano:              { image: `${ASSET_BASE}/Volcano.png`,              name: "Volcano",              emoji: "🌋" },
  eco_car:              { image: `${ASSET_BASE}/Eco Car.png`,              name: "Eco Car",              emoji: "🚗" },
  nuke:                 { image: `${ASSET_BASE}/Nuke.png`,                 name: "Nuke",                 emoji: "💥" },
};

// ─────────────────────────────────────────────────────────────────────────────
// Read-only IslandPreview — mirrors IslandScene from Island.tsx exactly,
// minus the drag handlers. Same 340px height, same Galaxy fallback.
// ─────────────────────────────────────────────────────────────────────────────
function getLayoutDefault(itemId: string) {
  return { item_id: itemId, x: 0.5, y: 0.55, width: 120, height: 120, zIndex: 25, rotation: 0 };
}

function IslandPreview({ islandItems, islandLayout }: { islandItems: any[]; islandLayout: any[] }) {
  const active = (islandItems || []).filter((i: any) => i.active);
  const skyboxId  = active.find((i: any) => i.item_type === "skybox")?.item_id ?? null;
  const islandId  = active.find((i: any) => i.item_type === "island")?.item_id ?? null;
  const decorIds: string[] = active
    .filter((i: any) => i.item_type === "decoration")
    .map((i: any) => i.item_id);

  const skyboxMeta = skyboxId ? ISLAND_ITEMS_MAP[skyboxId] ?? null : null;
  const islandMeta = islandId ? ISLAND_ITEMS_MAP[islandId] ?? null : null;

  // Build layout map from saved positions — same logic as toLayoutMap() in Island.tsx
  const layoutMap: Record<string, any> = {};
  if (Array.isArray(islandLayout)) {
    for (const entry of islandLayout) {
      if (entry?.item_id) {
        layoutMap[entry.item_id] = {
          item_id: entry.item_id,
          x:        typeof entry.x        === "number" ? entry.x        : 0.5,
          y:        typeof entry.y        === "number" ? entry.y        : 0.55,
          width:    typeof entry.width    === "number" ? entry.width    : 120,
          height:   typeof entry.height   === "number" ? entry.height   : 120,
          zIndex:   typeof entry.zIndex   === "number" ? entry.zIndex   : 25,
          rotation: typeof entry.rotation === "number" ? entry.rotation : 0,
        };
      }
    }
  }

  const nothingActive = !skyboxId && !islandId && decorIds.length === 0;

  return (
    // Outer wrapper preserves the 340 px height and rounded corners, matching Island.tsx
    <div
      className="relative w-full overflow-hidden rounded-2xl"
      style={{ height: 340, background: "#0f172a" }}
    >
      {/* Sky — Galaxy when no skybox is active (identical to Island.tsx) */}
      {skyboxMeta ? (
        <img
          src={skyboxMeta.image}
          alt={skyboxMeta.name}
          className="absolute inset-0 h-full w-full object-cover select-none pointer-events-none"
          draggable={false}
        />
      ) : (
        <div className="absolute inset-0">
          <Galaxy
            mouseRepulsion={false}
            mouseInteraction={false}
            density={1.5}
            glowIntensity={0.8}
            saturation={0.8}
            hueShift={240}
          />
        </div>
      )}

      {/* Horizon haze */}
      <div
        className="absolute inset-x-0 bottom-0 h-[36%] pointer-events-none"
        style={{ background: "linear-gradient(to top, rgba(15,23,42,0.45), rgba(15,23,42,0.02))" }}
      />

      {/* Island base */}
      {islandMeta && (
        <img
          src={islandMeta.image}
          alt={islandMeta.name}
          className="absolute inset-x-0 bottom-0 w-full select-none pointer-events-none"
          draggable={false}
          style={{
            objectFit: "cover",
            objectPosition: "top center",
            height: "115%",
            zIndex: 20,
            // Reflection island is upside-down by design — same special-case as Island.tsx
            ...(islandId === "reflection" && {
              top: 0,
              bottom: "auto",
              objectPosition: "bottom center",
            }),
          }}
        />
      )}

      {/* Decorations — static, positioned from saved island_layout */}
      {decorIds.map((id) => {
        const meta   = ISLAND_ITEMS_MAP[id];
        if (!meta) return null;
        const layout = layoutMap[id] ?? getLayoutDefault(id);
        return (
          <img
            key={id}
            src={meta.image}
            alt={meta.name}
            draggable={false}
            className="absolute pointer-events-none select-none"
            style={{
              left:      `${layout.x * 100}%`,
              top:       `${layout.y * 100}%`,
              width:     layout.width,
              height:    layout.height,
              zIndex:    layout.zIndex,
              transform: `translate(-50%, -50%) rotate(${layout.rotation}deg)`,
              filter:    "drop-shadow(0 10px 20px rgba(0,0,0,0.28))",
            }}
          />
        );
      })}

      {/* Foreground grass line */}
      <div
        className="absolute inset-x-0 bottom-0 h-[26px] pointer-events-none"
        style={{
          background: "linear-gradient(to top, rgba(34,197,94,0.28), rgba(34,197,94,0))",
          zIndex: 50,
        }}
      />

      {/* Empty-state label */}
      {nothingActive && (
        <div className="absolute inset-0 flex items-center justify-center z-[60]">
          <p className="text-slate-400 text-sm">No island setup yet</p>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main modal
// ─────────────────────────────────────────────────────────────────────────────
interface UserProfileModalProps {
  userId: string | null;
  onClose: () => void;
}

export default function UserProfileModal({ userId, onClose }: UserProfileModalProps) {
  const [profile,    setProfile]    = useState<any>(null);
  const [posts,      setPosts]      = useState<any[]>([]);
  const [carbonLogs, setCarbonLogs] = useState<any[]>([]);
  const [isLoading,  setIsLoading]  = useState(true);
  const [activeTab,  setActiveTab]  = useState<"overview" | "posts" | "carbon">("overview");

  useEffect(() => {
    if (!userId) return;
    setIsLoading(true);
    setProfile(null);
    setPosts([]);
    setCarbonLogs([]);
    setActiveTab("overview");

    async function load() {
      try {
        // ── 1. User profile ───────────────────────────────────────────────
        const userSnap = await getDoc(doc(db, "users", userId));
        if (!userSnap.exists()) { setIsLoading(false); return; }
        const userData = { id: userSnap.id, ...userSnap.data() };
        setProfile(userData);

        if (userData.privacy_public === false) { setIsLoading(false); return; }

        // ── 2. Posts ──────────────────────────────────────────────────────
        // No compound index needed: fetch with a single orderBy, sort client-side.
        try {
          const postsSnap = await getDocs(
            query(collection(db, "posts"), orderBy("createdAt", "desc"), limit(100))
          );
          const allPosts = postsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
          // Filter client-side so we never need a composite index
          const userPosts = allPosts
            .filter((p: any) => p.userId === userId)
            .slice(0, 10);
          setPosts(userPosts);
        } catch (e) {
          console.warn("Posts fetch error:", e);
        }

        // ── 3. Carbon entries ─────────────────────────────────────────────
        // CarbonFootprint writes to the SUBCOLLECTION users/{uid}/carbon_entries.
        // Querying by uid directly means no WHERE clause → no composite index needed.
        try {
          const logsSnap = await getDocs(
            query(
              collection(db, "users", userId, "carbon_entries"),
              orderBy("date", "desc"),
              limit(10)
            )
          );
          setCarbonLogs(logsSnap.docs.map(d => ({ id: d.id, ...d.data() })));
        } catch (e) {
          console.warn("Carbon entries fetch error:", e);
        }
      } catch (e) {
        console.error("UserProfileModal load error:", e);
      } finally {
        setIsLoading(false);
      }
    }

    load();
  }, [userId]);

  if (!userId) return null;

  const isPrivate = profile?.privacy_public === false;
  const initials  = (profile?.username || profile?.full_name || "U")[0]?.toUpperCase();
  const xpPct     = profile
    ? Math.min(((profile.xp || 0) / (profile.xp_to_next_level || 100)) * 100, 100)
    : 0;

  return (
    <AnimatePresence>
      {userId && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-[200] backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.93, y: 24 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.93, y: 24 }}
            transition={{ type: "spring", damping: 26, stiffness: 320 }}
            className="fixed inset-x-4 top-[5vh] bottom-[5vh] md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 z-[201] w-full md:w-[560px] md:max-h-[90vh] rounded-2xl overflow-hidden flex flex-col"
            style={{
              background:  "var(--bg-modal)",
              border:      "2px solid var(--border-card)",
              boxShadow:   "0 24px 80px rgba(0,0,0,0.25)",
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Close */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 z-10 p-1.5 rounded-lg transition-colors"
              style={{ color: "var(--text-faint)", background: "var(--bg-subtle)" }}
            >
              <X className="w-4 h-4" />
            </button>

            {/* ── Loading ── */}
            {isLoading ? (
              <div className="flex-1 flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-emerald-400" />
              </div>

            /* ── Not found ── */
            ) : !profile ? (
              <div className="flex-1 flex flex-col items-center justify-center gap-3 p-8 text-center">
                <Shield className="w-12 h-12 text-slate-300" />
                <p className="font-bold" style={{ color: "var(--text-secondary)" }}>User not found</p>
                <p className="text-sm"  style={{ color: "var(--text-muted)" }}>This profile doesn't exist or was removed.</p>
              </div>

            /* ── Profile ── */
            ) : (
              <div className="flex-1 overflow-y-auto">

                {/* Header */}
                <div
                  className="px-6 pt-8 pb-5"
                  style={{
                    background:   "linear-gradient(135deg, rgba(0,200,150,0.12), rgba(6,182,212,0.08))",
                    borderBottom: "1px solid var(--border-card)",
                  }}
                >
                  <div className="flex items-start gap-4">
                    {/* Avatar */}
                    <div
                      className="w-16 h-16 rounded-2xl overflow-hidden flex-shrink-0 flex items-center justify-center text-2xl font-black text-white"
                      style={{ background: "linear-gradient(135deg, #00c896, #06b6d4)" }}
                    >
                      {profile.avatar_url
                        ? <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
                        : initials}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h2 className="font-black text-xl" style={{ color: "var(--text-primary)" }}>
                          {profile.username || profile.full_name || "Anonymous"}
                        </h2>
                        {profile.verification_status === "ambassador" && (
                          <span className="text-xs font-bold px-2 py-0.5 rounded-full text-amber-700 bg-amber-100">Ambassador</span>
                        )}
                        {profile.verification_status === "verified" && (
                          <span className="text-xs font-bold px-2 py-0.5 rounded-full text-blue-700 bg-blue-100">Verified</span>
                        )}
                        {isPrivate && (
                          <span className="flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full text-slate-600 bg-slate-100">
                            <Lock className="w-3 h-3" /> Private
                          </span>
                        )}
                      </div>
                      {profile.bio && !isPrivate && (
                        <p className="text-sm mt-1 line-clamp-2" style={{ color: "var(--text-muted)" }}>{profile.bio}</p>
                      )}
                      {!isPrivate && [profile.city, profile.country].filter(Boolean).length > 0 && (
                        <div className="flex items-center gap-1 mt-1.5">
                          <MapPin className="w-3 h-3 text-slate-400" />
                          <span className="text-xs" style={{ color: "var(--text-faint)" }}>
                            {[profile.city, profile.country].filter(Boolean).join(", ")}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Stats */}
                  {!isPrivate && (
                    <div className="grid grid-cols-3 gap-3 mt-4">
                      <div className="rounded-xl p-3 text-center" style={{ background: "rgba(0,200,150,0.1)", border: "1px solid rgba(0,200,150,0.2)" }}>
                        <TreePine className="w-3.5 h-3.5 text-emerald-400 mx-auto mb-0.5" />
                        <div className="text-lg font-black text-emerald-400">{profile.treecoins ?? 0}</div>
                        <div className="text-xs" style={{ color: "var(--text-faint)" }}>Treecoins</div>
                      </div>
                      <div className="rounded-xl p-3 text-center" style={{ background: "rgba(139,92,246,0.1)", border: "1px solid rgba(139,92,246,0.2)" }}>
                        <Star className="w-3.5 h-3.5 text-purple-400 mx-auto mb-0.5" />
                        <div className="text-lg font-black text-purple-400">Lv.{profile.eco_level ?? 1}</div>
                        <div className="text-xs" style={{ color: "var(--text-faint)" }}>Eco Level</div>
                      </div>
                      <div className="rounded-xl p-3 text-center" style={{ background: "rgba(6,182,212,0.1)", border: "1px solid rgba(6,182,212,0.2)" }}>
                        <Heart className="w-3.5 h-3.5 text-cyan-400 mx-auto mb-0.5" />
                        <div className="text-lg font-black text-cyan-400">{posts.length}</div>
                        <div className="text-xs" style={{ color: "var(--text-faint)" }}>Posts</div>
                      </div>
                    </div>
                  )}

                  {/* XP bar */}
                  {!isPrivate && (
                    <div className="mt-3">
                      <div className="flex justify-between text-xs mb-1" style={{ color: "var(--text-faint)" }}>
                        <span>XP Progress</span>
                        <span>{profile.xp ?? 0} / {profile.xp_to_next_level ?? 100}</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{ width: `${xpPct}%`, background: "linear-gradient(90deg, #00c896, #06b6d4)" }}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Private state */}
                {isPrivate ? (
                  <div className="flex flex-col items-center gap-3 p-10 text-center">
                    <Lock className="w-10 h-10 text-slate-300" />
                    <p className="font-bold" style={{ color: "var(--text-secondary)" }}>This profile is private</p>
                    <p className="text-sm"  style={{ color: "var(--text-muted)" }}>This user has chosen not to share their details publicly.</p>
                  </div>
                ) : (
                  <>
                    {/* Tabs */}
                    <div className="flex gap-1 px-4 pt-4 pb-2">
                      {(["overview", "posts", "carbon"] as const).map(t => (
                        <button
                          key={t}
                          onClick={() => setActiveTab(t)}
                          className="flex-1 py-2 rounded-lg text-xs font-bold transition-all"
                          style={activeTab === t
                            ? { background: "linear-gradient(135deg, #00c896, #06b6d4)", color: "white" }
                            : { color: "var(--text-muted)", background: "var(--bg-subtle)" }}
                        >
                          {t === "overview" ? "🏝 Island" : t === "posts" ? "📝 Posts" : "🌿 Carbon"}
                        </button>
                      ))}
                    </div>

                    <div className="px-4 pb-6">

                      {/* ── Island tab ── */}
                      {activeTab === "overview" && (
                        <div className="space-y-4 mt-2">
                          <IslandPreview
                            islandItems={profile.island_items   || []}
                            islandLayout={profile.island_layout || []}
                          />

                          {/* Inventory */}
                          <div>
                            <h4 className="text-xs font-bold uppercase tracking-wide mb-2" style={{ color: "var(--text-faint)" }}>
                              <ShoppingBag className="w-3.5 h-3.5 inline mr-1" />Inventory
                            </h4>
                            {(profile.island_items || []).length === 0 ? (
                              <p className="text-sm text-center py-4" style={{ color: "var(--text-faint)" }}>No items purchased yet</p>
                            ) : (
                              <div className="flex flex-wrap gap-2">
                                {(profile.island_items || []).map((item: any, i: number) => (
                                  <span
                                    key={i}
                                    className="px-2.5 py-1 rounded-lg text-xs font-medium"
                                    style={{
                                      background: item.active ? "rgba(0,200,150,0.15)" : "var(--bg-subtle)",
                                      color:      item.active ? "#00c896"              : "var(--text-muted)",
                                      border:     item.active ? "1px solid rgba(0,200,150,0.3)" : "1px solid var(--border-card)",
                                    }}
                                  >
                                    {ISLAND_ITEMS_MAP[item.item_id]?.emoji ?? ""} {item.item_id?.replace(/_/g, " ")}
                                    {item.active && " ✓"}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* ── Posts tab ── */}
                      {activeTab === "posts" && (
                        <div className="space-y-3 mt-2">
                          {posts.length === 0 ? (
                            <div className="text-center py-8">
                              <FileText className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                              <p className="text-sm" style={{ color: "var(--text-faint)" }}>No posts yet</p>
                            </div>
                          ) : posts.map(post => (
                            <div
                              key={post.id}
                              className="p-4 rounded-xl"
                              style={{ background: "var(--bg-subtle)", border: "1px solid var(--border-card)" }}
                            >
                              <p className="font-bold text-sm" style={{ color: "var(--text-secondary)" }}>{post.title}</p>
                              {post.description && (
                                <p className="text-xs mt-1 line-clamp-2" style={{ color: "var(--text-muted)" }}>{post.description}</p>
                              )}
                              <div className="flex items-center gap-3 mt-2 flex-wrap">
                                <span className="flex items-center gap-1 text-xs" style={{ color: "var(--text-faint)" }}>
                                  <Heart className="w-3 h-3" /> {post.likesCount || 0}
                                </span>
                                {post.createdAt?.toDate && (
                                  <span className="text-xs" style={{ color: "var(--text-faint)" }}>
                                    {post.createdAt.toDate().toLocaleDateString()}
                                  </span>
                                )}
                                {post.tags?.slice(0, 2).map((tag: string) => (
                                  <span key={tag} className="text-xs text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full">#{tag}</span>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* ── Carbon tab ── */}
                      {activeTab === "carbon" && (
                        <div className="space-y-3 mt-2">
                          {carbonLogs.length === 0 ? (
                            <div className="text-center py-8">
                              <Leaf className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                              <p className="text-sm" style={{ color: "var(--text-faint)" }}>No carbon logs yet</p>
                            </div>
                          ) : carbonLogs.map(log => (
                            <div
                              key={log.id}
                              className="p-4 rounded-xl"
                              style={{ background: "var(--bg-subtle)", border: "1px solid var(--border-card)" }}
                            >
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-xs font-bold" style={{ color: "var(--text-faint)" }}>
                                  {log.date || ""}
                                </span>
                                <span className="text-sm font-black text-emerald-500">
                                  {(log.total_emissions ?? log.total_co2 ?? 0).toFixed(2)} kg CO₂
                                </span>
                              </div>
                              <div className="flex flex-wrap gap-2">
                                {log.transportation_co2 != null && (
                                  <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-600">
                                    🚗 {(+log.transportation_co2).toFixed(2)} kg transport
                                  </span>
                                )}
                                {log.energy_co2 != null && (
                                  <span className="text-xs px-2 py-0.5 rounded-full bg-amber-50 text-amber-600">
                                    ⚡ {(+log.energy_co2).toFixed(2)} kg energy
                                  </span>
                                )}
                                {log.diet_co2 != null && (
                                  <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600">
                                    🥦 {(+log.diet_co2).toFixed(2)} kg diet
                                  </span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                    </div>
                  </>
                )}
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
