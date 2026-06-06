// @ts-nocheck
import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { createPageUrl } from "@/utils";
import { User } from "@/entities/User";
import {
  Palmtree, Leaf, Globe, Camera, BarChart3, Recycle,
  BookOpen, ArrowRight, TreePine, Zap, Trophy, TrendingUp,
  Sparkles, ChevronRight, Activity
} from "lucide-react";
import { db, auth } from "@/firebase";
import { collection, query, where, getDocs, orderBy, limit } from "firebase/firestore";
import ElectricBorder from "@/components/ElectricBorder";
import DotField from "@/components/DotField";

const FEATURE_CARDS = [
  {
    title: "Your Island",
    description: "Customize your Ecoisland with earned Treecoins!",
    url: createPageUrl("Island"),
    icon: Palmtree,
    color: "#00c896",
    gradient: "linear-gradient(135deg, #00c896, #059669)",
    emoji: "🌴",
  },
  {
    title: "Carbon Footprint",
    description: "Track and reduce your emissions footprint!",
    url: createPageUrl("CarbonFootprint"),
    icon: Leaf,
    color: "#10b981",
    gradient: "linear-gradient(135deg, #10b981, #047857)",
    emoji: "🌿",
  },
  {
    title: "Regional Data",
    description: "Explore local sustainability insights!",
    url: createPageUrl("RegionalData"),
    icon: Globe,
    color: "#06b6d4",
    gradient: "linear-gradient(135deg, #06b6d4, #0284c7)",
    emoji: "🌍",
  },
  {
    title: "Danger Scan",
    description: "Report environmental issues with AI image recognition!",
    url: createPageUrl("DangerScan"),
    icon: Camera,
    color: "#f97316",
    gradient: "linear-gradient(135deg, #f97316, #dc2626)",
    emoji: "📸",
  },
  {
    title: "Action Feed",
    description: "Join the community by taking initiative!",
    url: createPageUrl("ActionFeed"),
    icon: Recycle,
    color: "#8b5cf6",
    gradient: "linear-gradient(135deg, #8b5cf6, #6d28d9)",
    emoji: "♻️",
  },
  {
    title: "Impact Visualizer",
    description: "See your progress and contributions come to life!",
    url: createPageUrl("Impact"),
    icon: BarChart3,
    color: "#ec4899",
    gradient: "linear-gradient(135deg, #ec4899, #be185d)",
    emoji: "📊",
  },
];

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [recentLogs, setRecentLogs] = useState([]);
  const [recentPosts, setRecentPosts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [greeting, setGreeting] = useState("Welcome back");

  useEffect(() => {
    const h = new Date().getHours();
    if (h < 12) setGreeting("Good morning");
    else if (h < 18) setGreeting("Good afternoon");
    else setGreeting("Good evening");

    async function load() {
      try {
        const u = await User.me();
        setUser(u);
        const uid = auth.currentUser?.uid;
        if (uid) {
          const [logsSnap, postsSnap] = await Promise.all([
            getDocs(query(collection(db, "carbon_logs"), where("userId", "==", uid), orderBy("date", "desc"), limit(3))).catch(() => ({ docs: [] })),
            getDocs(query(collection(db, "posts"), where("userId", "==", uid), orderBy("createdAt", "desc"), limit(3))).catch(() => ({ docs: [] })),
          ]);
          setRecentLogs(logsSnap.docs.map(d => ({ id: d.id, ...d.data() })));
          setRecentPosts(postsSnap.docs.map(d => ({ id: d.id, ...d.data() })));
        }
      } catch (e) { console.error(e); }
      finally { setIsLoading(false); }
    }
    load();
  }, []);

  const xpPct = user ? Math.min(((user.xp || 0) / (user.xp_to_next_level || 25)) * 100, 100) : 0;

  return (
    <div className="min-h-screen p-4 md:p-8" style={{ background: "var(--bg-page)" }}>
      <div className="max-w-7xl mx-auto">

        {/* ===== WELCOME HERO ===== */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-3xl overflow-hidden mb-8 relative"
          style={{ background: "linear-gradient(135deg, #020c08 0%, #051a10 50%, #020c08 100%)", border: "1.5px solid rgba(0,200,150,0.2)", minHeight: 180 }}
        >
          {/* Background decoration */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <DotField
              dotRadius={1.6}
              dotSpacing={18}
              cursorRadius={420}
              bulgeStrength={52}
              gradientFrom="rgba(0, 200, 150, 0.42)"
              gradientTo="rgba(117, 205, 221, 0.26)"
              glowColor="#00c896"
              glowRadius={100}
              sparkle
            />
          </div>

          <div className="relative z-10 p-6 md:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div>
              <p className="text-emerald-400 text-sm font-medium mb-1">{greeting},</p>
              <h1 className="text-2xl md:text-3xl font-black text-white mb-2" style={{ letterSpacing: "-0.02em" }}>
                {user?.username || user?.full_name || "Explorer"}! 👋
              </h1>
              <p className="text-slate-400 text-sm">Our planet needs saving... we're glad you're here.</p>

              {/* XP bar */}
              {user && (
                <div className="mt-4 w-64">
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="text-slate-400">Level {user.eco_level || 1}</span>
                    <span className="text-slate-500">{user.xp || 0} / {user.xp_to_next_level || 25} XP</span>
                  </div>
                  <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${xpPct}%` }}
                      transition={{ duration: 1, ease: "easeOut" }}
                      className="h-full rounded-full"
                      style={{ background: "linear-gradient(90deg, #00c896, #06b6d4)" }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Stats row */}
            <div className="flex items-center gap-4">
              {[
                { icon: TreePine, value: user?.treecoins ?? 0, label: "Treecoins", color: "#00c896" },
                { icon: Zap, value: user?.eco_level || 1, label: "Level", color: "#f59e0b" },
                { icon: Trophy, value: recentPosts.length, label: "Posts", color: "#8b5cf6" },
              ].map(stat => (
                <div key={stat.label} className="text-center px-4 py-3 rounded-2xl" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}>
                  <stat.icon className="w-5 h-5 mx-auto mb-1" style={{ color: stat.color }} />
                  <div className="text-xl font-black text-white">{stat.value}</div>
                  <div className="text-xs text-slate-500">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* ===== FEATURE GRID ===== */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-5 h-5 text-emerald-500" />
            <h2 className="font-black text-slate-800 text-xl" style={{ letterSpacing: "-0.02em" }}>Explore</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {FEATURE_CARDS.map((card, i) => (
              <motion.div
                key={card.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06 }}
              >
                <Link to={card.url}>
                  <motion.div
                    whileHover={{ y: -3, scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                  >
                    <ElectricBorder
                      color={card.color}
                      thickness={2}
                      className="rounded-2xl h-full"
                    >
                      <div
                        className="p-5 flex flex-col h-full cursor-pointer group"
                        style={{
                          background: "var(--bg-card)",
                          borderRadius: "1rem",
                          color: "var(--text-primary)",
                        }}
                      >
                        <div className="flex items-start justify-between mb-4">
                          <div
                            className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl transition-transform duration-200 group-hover:scale-110"
                            style={{
                              background: `${card.color}12`,
                            }}
                          >
                            {card.emoji}
                          </div>

                          <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-slate-500 transition-colors mt-1" />
                        </div>

                        <h3 className="font-black text-slate-800 text-base mb-1">
                          {card.title}
                        </h3>

                        <p className="text-slate-500 text-sm leading-relaxed flex-1">
                          {card.description}
                        </p>

                        <div
                          className="mt-3 text-xs font-bold"
                          style={{ color: card.color }}
                        >
                          Start exploring →
                        </div>
                      </div>
                    </ElectricBorder>
                  </motion.div>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>

        {/* ===== RECENT ACTIVITY ===== */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Recent carbon logs */}
          <div className="eco-card p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <Activity className="w-4 h-4 text-emerald-600" /> Recent Carbon Logs
              </h3>
              <Link to={createPageUrl("CarbonFootprint")} className="text-xs text-emerald-600 font-semibold hover:underline">View all</Link>
            </div>
            {recentLogs.length === 0 ? (
              <div className="text-center py-6">
                <Leaf className="w-10 h-10 text-slate-200 mx-auto mb-2" />
                <p className="text-slate-400 text-sm">No logs yet</p>
                <Link to={createPageUrl("CarbonFootprint")} className="text-emerald-500 text-xs font-semibold mt-1 block hover:underline">Start logging →</Link>
              </div>
            ) : recentLogs.map((log, i) => (
              <div key={log.id} className="flex items-center justify-between py-3 border-b last:border-0" style={{ borderColor: "var(--border-card)" }}>
                <div>
                  <p className="text-sm font-semibold text-slate-700">{log.date || "Recent"}</p>
                  <p className="text-xs text-slate-400 capitalize">{log.diet || "Mixed"} diet</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-black text-slate-800">{(log.total_co2 || 0).toFixed(1)} kg</p>
                  <p className="text-xs text-slate-400">CO₂</p>
                </div>
              </div>
            ))}
          </div>

          {/* Recent posts */}
          <div className="eco-card p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <Recycle className="w-4 h-4 text-purple-500" /> Recent Posts
              </h3>
              <Link to={createPageUrl("ActionFeed")} className="text-xs text-purple-500 font-semibold hover:underline">View all</Link>
            </div>
            {recentPosts.length === 0 ? (
              <div className="text-center py-6">
                <Recycle className="w-10 h-10 text-slate-200 mx-auto mb-2" />
                <p className="text-slate-400 text-sm">Nothing shared yet</p>
                <Link to={createPageUrl("ActionFeed")} className="text-purple-500 text-xs font-semibold mt-1 block hover:underline">Share an action →</Link>
              </div>
            ) : recentPosts.map((post, i) => (
              <div key={post.id} className="flex items-center gap-3 py-3 border-b last:border-0" style={{ borderColor: "var(--border-card)" }}>
                <div className="w-8 h-8 rounded-lg overflow-hidden flex-shrink-0 flex items-center justify-center" style={{ background: "var(--bg-info)", border: "1px solid rgba(139,92,246,0.2)" }}>
                  {post.mediaUrl ? <img src={post.mediaUrl} alt="" className="w-full h-full object-cover" /> : <Recycle className="w-4 h-4 text-purple-300" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-700 truncate">{post.title}</p>
                  <p className="text-xs text-slate-400">❤️ {post.likesCount || 0} · 💬 {post.commentsCount || 0}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
