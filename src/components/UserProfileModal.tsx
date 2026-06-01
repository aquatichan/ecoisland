// @ts-nocheck
import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, TreePine, Star, MapPin, Heart, FileText, Leaf,
  Lock, ShoppingBag, BarChart2, Loader2, Shield
} from "lucide-react";
import { db } from "@/firebase";
import {
  collection, query, where, orderBy, limit, getDocs, doc, getDoc
} from "firebase/firestore";

// ──────────────────────────────────────────────────────────────
// Mini island preview: renders just the active skybox + decors
// ──────────────────────────────────────────────────────────────
function MiniIslandPreview({ islandItems }: { islandItems: any[] }) {
  if (!islandItems || islandItems.length === 0) {
    return (
      <div
        className="w-full h-40 rounded-xl flex items-center justify-center text-slate-400 text-sm"
        style={{ background: "linear-gradient(135deg, #0a2e1e, #062d1e)" }}
      >
        <span>No island customization yet</span>
      </div>
    );
  }

  const active = islandItems.filter((i: any) => i.active);
  const skybox = active.find((i: any) => i.item_type === "skybox");
  const island = active.find((i: any) => i.item_type === "island");
  const decors = active.filter((i: any) => i.item_type === "decoration");

  // We can only show names since we don't have the full ISLAND_ITEMS list here
  return (
    <div
      className="w-full h-40 rounded-xl overflow-hidden relative flex items-center justify-center"
      style={{ background: "linear-gradient(135deg, #0a2e1e 0%, #062d1e 60%, #010c06 100%)" }}
    >
      <div className="text-center space-y-1 px-4">
        {skybox && (
          <div className="text-xs text-emerald-300 font-semibold">🌅 {skybox.item_id?.replace(/_/g, " ")}</div>
        )}
        {island && (
          <div className="text-xs text-cyan-300 font-semibold">🏝 {island.item_id?.replace(/_/g, " ")}</div>
        )}
        {decors.length > 0 && (
          <div className="text-xs text-slate-400">{decors.length} decoration{decors.length !== 1 ? "s" : ""}</div>
        )}
        {!skybox && !island && decors.length === 0 && (
          <span className="text-slate-500 text-xs">Default island</span>
        )}
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// Main modal
// ──────────────────────────────────────────────────────────────
interface UserProfileModalProps {
  userId: string | null;
  onClose: () => void;
}

export default function UserProfileModal({ userId, onClose }: UserProfileModalProps) {
  const [profile, setProfile] = useState<any>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [carbonLogs, setCarbonLogs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"overview" | "posts" | "carbon">("overview");

  useEffect(() => {
    if (!userId) return;
    setIsLoading(true);
    setProfile(null);
    setPosts([]);
    setCarbonLogs([]);
    setActiveTab("overview");

    async function load() {
      try {
        // Fetch user profile
        const userSnap = await getDoc(doc(db, "users", userId));
        if (!userSnap.exists()) { setIsLoading(false); return; }
        const userData = { id: userSnap.id, ...userSnap.data() };
        setProfile(userData);

        // Only load extra data if profile is public (or privacy not set, default public)
        const isPrivate = userData.privacy_public === false;
        if (!isPrivate) {
          // Fetch posts
          try {
            const postsSnap = await getDocs(
              query(collection(db, "posts"), where("userId", "==", userId), orderBy("createdAt", "desc"), limit(10))
            );
            setPosts(postsSnap.docs.map(d => ({ id: d.id, ...d.data() })));
          } catch { /* posts index may not exist */ }

          // Fetch carbon logs
          try {
            const logsSnap = await getDocs(
              query(collection(db, "carbon_logs"), where("userId", "==", userId), orderBy("date", "desc"), limit(10))
            );
            setCarbonLogs(logsSnap.docs.map(d => ({ id: d.id, ...d.data() })));
          } catch { /* carbon_logs may not have index */ }
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
  const initials = (profile?.username || profile?.full_name || "U")[0]?.toUpperCase();
  const xpPct = profile ? Math.min(((profile.xp || 0) / (profile.xp_to_next_level || 100)) * 100, 100) : 0;

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
            className="fixed inset-x-4 top-[5vh] bottom-[5vh] md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 z-[201] w-full md:w-[520px] md:max-h-[85vh] rounded-2xl overflow-hidden flex flex-col"
            style={{
              background: "var(--bg-modal)",
              border: "2px solid var(--border-card)",
              boxShadow: "0 24px 80px rgba(0,0,0,0.25)",
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 z-10 p-1.5 rounded-lg transition-colors"
              style={{ color: "var(--text-faint)", background: "var(--bg-subtle)" }}
            >
              <X className="w-4 h-4" />
            </button>

            {isLoading ? (
              <div className="flex-1 flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-emerald-400" />
              </div>
            ) : !profile ? (
              <div className="flex-1 flex flex-col items-center justify-center gap-3 p-8 text-center">
                <Shield className="w-12 h-12 text-slate-300" />
                <p className="font-bold" style={{ color: "var(--text-secondary)" }}>User not found</p>
                <p className="text-sm" style={{ color: "var(--text-muted)" }}>This profile doesn't exist or was removed.</p>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto">
                {/* Header band */}
                <div
                  className="px-6 pt-8 pb-5"
                  style={{ background: "linear-gradient(135deg, rgba(0,200,150,0.12), rgba(6,182,212,0.08))", borderBottom: "1px solid var(--border-card)" }}
                >
                  <div className="flex items-start gap-4">
                    {/* Avatar */}
                    <div className="w-16 h-16 rounded-2xl overflow-hidden flex-shrink-0 flex items-center justify-center text-2xl font-black text-white"
                      style={{ background: "linear-gradient(135deg, #00c896, #06b6d4)" }}>
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
                      {[profile.city, profile.country].filter(Boolean).length > 0 && !isPrivate && (
                        <div className="flex items-center gap-1 mt-1.5">
                          <MapPin className="w-3 h-3 text-slate-400" />
                          <span className="text-xs" style={{ color: "var(--text-faint)" }}>
                            {[profile.city, profile.country].filter(Boolean).join(", ")}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Stats row */}
                  {!isPrivate && (
                    <div className="grid grid-cols-3 gap-3 mt-4">
                      <div className="rounded-xl p-3 text-center" style={{ background: "rgba(0,200,150,0.1)", border: "1px solid rgba(0,200,150,0.2)" }}>
                        <div className="flex items-center justify-center gap-1 mb-0.5">
                          <TreePine className="w-3.5 h-3.5 text-emerald-400" />
                        </div>
                        <div className="text-lg font-black text-emerald-400">{profile.treecoins ?? 0}</div>
                        <div className="text-xs" style={{ color: "var(--text-faint)" }}>Treecoins</div>
                      </div>
                      <div className="rounded-xl p-3 text-center" style={{ background: "rgba(139,92,246,0.1)", border: "1px solid rgba(139,92,246,0.2)" }}>
                        <div className="flex items-center justify-center gap-1 mb-0.5">
                          <Star className="w-3.5 h-3.5 text-purple-400" />
                        </div>
                        <div className="text-lg font-black text-purple-400">Lv.{profile.eco_level ?? 1}</div>
                        <div className="text-xs" style={{ color: "var(--text-faint)" }}>Eco Level</div>
                      </div>
                      <div className="rounded-xl p-3 text-center" style={{ background: "rgba(6,182,212,0.1)", border: "1px solid rgba(6,182,212,0.2)" }}>
                        <div className="flex items-center justify-center gap-1 mb-0.5">
                          <Heart className="w-3.5 h-3.5 text-cyan-400" />
                        </div>
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

                {/* Private message */}
                {isPrivate ? (
                  <div className="flex flex-col items-center gap-3 p-10 text-center">
                    <Lock className="w-10 h-10 text-slate-300" />
                    <p className="font-bold" style={{ color: "var(--text-secondary)" }}>This profile is private</p>
                    <p className="text-sm" style={{ color: "var(--text-muted)" }}>This user has chosen not to share their details publicly.</p>
                  </div>
                ) : (
                  <>
                    {/* Tabs */}
                    <div className="flex gap-1 px-4 pt-4 pb-2">
                      {(["overview", "posts", "carbon"] as const).map(t => (
                        <button
                          key={t}
                          onClick={() => setActiveTab(t)}
                          className="flex-1 py-2 rounded-lg text-xs font-bold transition-all capitalize"
                          style={activeTab === t
                            ? { background: "linear-gradient(135deg, #00c896, #06b6d4)", color: "white" }
                            : { color: "var(--text-muted)", background: "var(--bg-subtle)" }}
                        >
                          {t === "overview" ? "🏝 Island" : t === "posts" ? "📝 Posts" : "🌿 Carbon"}
                        </button>
                      ))}
                    </div>

                    <div className="px-4 pb-6">
                      {/* Overview / Island tab */}
                      {activeTab === "overview" && (
                        <div className="space-y-4 mt-2">
                          <MiniIslandPreview islandItems={profile.island_items || []} />

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
                                      color: item.active ? "#00c896" : "var(--text-muted)",
                                      border: item.active ? "1px solid rgba(0,200,150,0.3)" : "1px solid var(--border-card)"
                                    }}
                                  >
                                    {item.item_id?.replace(/_/g, " ")}
                                    {item.active && " ✓"}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Posts tab */}
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
                              <div className="flex items-center gap-3 mt-2">
                                <span className="flex items-center gap-1 text-xs" style={{ color: "var(--text-faint)" }}>
                                  <Heart className="w-3 h-3" /> {post.likesCount || 0}
                                </span>
                                {post.tags?.slice(0, 2).map((tag: string) => (
                                  <span key={tag} className="text-xs text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full">#{tag}</span>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Carbon logs tab */}
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
                              className="p-4 rounded-xl flex items-center justify-between"
                              style={{ background: "var(--bg-subtle)", border: "1px solid var(--border-card)" }}
                            >
                              <div>
                                <p className="font-semibold text-sm" style={{ color: "var(--text-secondary)" }}>
                                  {log.category || log.type || "Activity"}
                                </p>
                                <p className="text-xs mt-0.5" style={{ color: "var(--text-faint)" }}>
                                  {log.date ? new Date(log.date).toLocaleDateString() : ""}
                                </p>
                              </div>
                              <div className="text-right">
                                <span className="text-sm font-bold text-emerald-500">
                                  {log.amount ?? log.kg ?? log.value ?? "—"} kg
                                </span>
                                <p className="text-xs" style={{ color: "var(--text-faint)" }}>CO₂</p>
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
