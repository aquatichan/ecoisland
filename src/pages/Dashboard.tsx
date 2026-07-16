// @ts-nocheck
import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { createPageUrl } from "@/utils";
import { User } from "@/entities/User";
import {
  Palmtree, Leaf, Globe, Camera, BarChart3, Recycle,
  BookOpen, ArrowRight, TreePine, Zap, Trophy, TrendingUp,
  Sparkles, ChevronRight, Activity, Rocket, Dumbbell, Users, MapPin,
  Flame, Target, CheckCircle2, Circle
} from "lucide-react";
import { db, auth } from "@/firebase";
import { collection, query, where, getDocs, orderBy, limit, getCountFromServer } from "firebase/firestore";
import { computeDailyStreak } from "@/utils/progression";
import { format } from "date-fns";
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
    color: "#0d845d",
    gradient: "linear-gradient(135deg, #0d845d, #066b49)",
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

// Lightweight pulsing placeholder block for loading states
const Skel = ({ className = "", style = {} }) => (
  <div
    className={`animate-pulse rounded-xl ${className}`}
    style={{ background: "rgba(148,163,184,0.18)", ...style }}
  />
);

const QUEST_DEFS = [
  { key: "carbon", label: "Log today's carbon footprint", reward: "+10 TC", url: createPageUrl("CarbonFootprint"), color: "#10b981", emoji: "🌿" },
  { key: "post",   label: "Share an eco-action",          reward: "+5 TC",  url: createPageUrl("ActionFeed"),      color: "#8b5cf6", emoji: "♻️" },
  { key: "quiz",   label: "Complete an APES quiz",        reward: "+0-20 TC", url: createPageUrl("APES"),          color: "#06b6d4", emoji: "📚" },
];

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [recentLogs, setRecentLogs] = useState([]);
  const [recentPosts, setRecentPosts] = useState([]);
  const [postsCount, setPostsCount] = useState(0);
  const [streak, setStreak] = useState(0);
  const [quests, setQuests] = useState({ carbon: false, post: false, quiz: false });
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
          const today = format(new Date(), "yyyy-MM-dd");
          const myPostsQuery = query(collection(db, "posts"), where("userId", "==", uid));
          const [entriesSnap, postsSnap, postCountSnap, quizSnap] = await Promise.all([
            // Recent carbon entries — also powers the streak + today's-log quest
            getDocs(query(collection(db, "users", uid, "carbon_entries"), orderBy("date", "desc"), limit(60))).catch(() => ({ docs: [] })),
            getDocs(query(myPostsQuery, limit(20))).catch(() => ({ docs: [] })),
            // True total post count via server-side aggregation (no doc reads)
            getCountFromServer(myPostsQuery).catch(() => null),
            getDocs(query(collection(db, "users", uid, "apes_sessions"), where("date", "==", today), limit(1))).catch(() => ({ docs: [] })),
          ]);

          const entries = entriesSnap.docs.map(d => ({ id: d.id, ...d.data() }));
          setRecentLogs(entries.slice(0, 3));
          const entryDates = entries.map(e => e.date).filter(Boolean);
          setStreak(computeDailyStreak(entryDates));

          const myPosts = postsSnap.docs
            .map(d => ({ id: d.id, ...d.data() }))
            .sort((a: any, b: any) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0));
          setRecentPosts(myPosts.slice(0, 3));
          setPostsCount(postCountSnap ? postCountSnap.data().count : myPosts.length);

          const postedToday = myPosts.some(p => {
            const d = p.createdAt?.toDate ? p.createdAt.toDate() : null;
            return d && format(d, "yyyy-MM-dd") === today;
          });
          setQuests({
            carbon: entryDates.includes(today),
            post: postedToday,
            quiz: quizSnap.docs.length > 0,
          });
        }
      } catch (e) { console.error(e); }
      finally { setIsLoading(false); }
    }
    load();
  }, []);

  const questsDone = QUEST_DEFS.filter(q => quests[q.key]).length;

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
            <div className="flex items-center gap-4 flex-wrap">
              {isLoading
                ? [0, 1, 2, 3].map(i => (
                    <div key={i} className="px-4 py-3 rounded-2xl" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}>
                      <Skel className="w-5 h-5 mx-auto mb-2 rounded-full" />
                      <Skel className="w-12 h-6 mb-1.5" />
                      <Skel className="w-14 h-3" />
                    </div>
                  ))
                : [
                    { icon: TreePine, value: user?.treecoins ?? 0, label: "Treecoins", color: "#00c896" },
                    { icon: Zap, value: user?.eco_level || 1, label: "Level", color: "#f59e0b" },
                    { icon: Trophy, value: postsCount, label: "Posts", color: "#8b5cf6" },
                    { icon: Flame, value: streak, label: streak > 0 ? "Day Streak 🔥" : "Log to ignite!", color: "#f97316" },
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

        {/* ===== DAILY QUESTS ===== */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="eco-card p-5 mb-8"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-slate-800 flex items-center gap-2">
              <Target className="w-4 h-4 text-emerald-600" /> Daily Quests
            </h3>
            {isLoading ? (
              <Skel className="w-28 h-6 rounded-full" />
            ) : (
              <span
                className="text-xs font-bold px-3 py-1 rounded-full"
                style={questsDone === QUEST_DEFS.length
                  ? { background: "linear-gradient(135deg, #00c896, #06b6d4)", color: "#000" }
                  : { background: "rgba(0,200,150,0.1)", color: "#00a67e", border: "1px solid rgba(0,200,150,0.25)" }}
              >
                {questsDone === QUEST_DEFS.length ? "All done! 🎉" : `${questsDone}/${QUEST_DEFS.length} complete today`}
              </span>
            )}
          </div>
          {isLoading ? (
            <div className="space-y-2">
              {[0, 1, 2].map(i => <Skel key={i} className="h-12 w-full rounded-xl" />)}
            </div>
          ) : (
            <div className="space-y-2">
              {QUEST_DEFS.map(quest => {
                const done = quests[quest.key];
                return (
                  <Link key={quest.key} to={quest.url}>
                    <motion.div
                      whileHover={{ x: done ? 0 : 3 }}
                      className="flex items-center gap-3 p-3 rounded-xl group"
                      style={{
                        background: done ? "rgba(0,200,150,0.07)" : "var(--bg-subtle)",
                        border: done ? "1px solid rgba(0,200,150,0.25)" : "1px solid var(--border-card)",
                        transition: "border-color 0.2s, background 0.2s",
                      }}
                    >
                      {done
                        ? <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-emerald-500" />
                        : <Circle className="w-5 h-5 flex-shrink-0 text-slate-300" />}
                      <span className="text-base">{quest.emoji}</span>
                      <span
                        className={`flex-1 text-sm font-semibold ${done ? "line-through text-slate-400" : "text-slate-700"}`}
                      >
                        {quest.label}
                      </span>
                      <span className="text-xs font-bold flex-shrink-0" style={{ color: quest.color }}>{quest.reward}</span>
                      {!done && <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-500 transition-colors flex-shrink-0" />}
                    </motion.div>
                  </Link>
                );
              })}
            </div>
          )}
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
            {isLoading ? (
              <div className="space-y-3 py-1">
                {[0, 1, 2].map(i => <Skel key={i} className="h-10 w-full" />)}
              </div>
            ) : recentLogs.length === 0 ? (
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
            {isLoading ? (
              <div className="space-y-3 py-1">
                {[0, 1, 2].map(i => <Skel key={i} className="h-10 w-full" />)}
              </div>
            ) : recentPosts.length === 0 ? (
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

        {/* ===== GET STARTED ===== */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-6 eco-card p-6"
        >
          <div className="flex items-center gap-2 mb-5">
            <Rocket className="w-5 h-5 text-emerald-500" />
            <h2 className="font-black text-emerald-600 text-lg" style={{ letterSpacing: "-0.01em" }}>
              "How can I get started?"
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              {
                icon: "🏔️",
                title: "Build Your Island",
                desc: "Purchase your first island and begin making it your own, with effects, decorations, and more!",
                url: createPageUrl("Island"),
              },
              {
                icon: "💪",
                title: "Track Your Impact",
                desc: "Log your daily activities and earn Treecoins through a more sustainable carbon footprint!",
                url: createPageUrl("CarbonFootprint"),
              },
              {
                icon: "👥",
                title: "Join the Community",
                desc: "Share environmental news in the Action Feed and connect with eco-conscious individuals!",
                url: createPageUrl("ActionFeed"),
              },
              {
                icon: "📍",
                title: "Explore Locally",
                desc: "Check out your region's local sustainability data and seek ways to make a difference!",
                url: createPageUrl("RegionalData"),
              },
            ].map((item) => (
              <Link key={item.title} to={item.url}>
                <motion.div
                  whileHover={{ borderColor: "#00c896", boxShadow: "0 4px 16px rgba(0,200,150,0.1)" }}
                  className="p-4 rounded-xl h-full"
                  style={{
                    border: "2px solid var(--border-card)",
                    background: "var(--bg-subtle)",
                    transition: "border-color 0.2s, box-shadow 0.2s",
                  }}
                >
                  <h3 className="font-black text-slate-800 text-sm mb-1.5 flex items-center gap-2">
                    <span className="text-base">{item.icon}</span> {item.title}
                  </h3>
                  <p className="text-slate-500 text-sm leading-relaxed">{item.desc}</p>
                </motion.div>
              </Link>
            ))}
          </div>
        </motion.div>

      </div>
    </div>
  );
}
