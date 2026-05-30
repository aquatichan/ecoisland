// @ts-nocheck
import React, { useState, useEffect, useRef } from "react";
import { motion, useScroll, useTransform, AnimatePresence } from "framer-motion";
import {
  BarChart3, TrendingUp, Leaf, Zap, Droplets, Wind,
  TreePine, Globe, Award, Loader2, ArrowUp, ArrowDown
} from "lucide-react";
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { db, auth } from "@/firebase";
import { collection, query, where, getDocs, orderBy, limit } from "firebase/firestore";
import { User } from "@/entities/User";
import { format, subDays } from "date-fns";

const CHART_COLORS = {
  green:   "#00c896",
  cyan:    "#06b6d4",
  emerald: "#10b981",
  amber:   "#f59e0b",
  purple:  "#8b5cf6",
  rose:    "#f43f5e",
};

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="px-3 py-2 rounded-xl text-xs font-medium text-white"
      style={{ background: "rgba(4,15,10,0.95)", border: "1px solid rgba(0,200,150,0.3)", backdropFilter: "blur(12px)" }}>
      <p className="text-slate-400 mb-1">{label}</p>
      {payload.map((entry, i) => (
        <p key={i} style={{ color: entry.color }}>
          {entry.name}: <strong>{typeof entry.value === "number" ? entry.value.toFixed(2) : entry.value}</strong>
        </p>
      ))}
    </div>
  );
};

const MetricCard = ({ icon: Icon, label, value, unit, delta, color, delay = 0 }) => (
  <motion.div
    initial={{ opacity: 0, y: 24 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay }}
    className="relative rounded-2xl overflow-hidden p-5"
    style={{ background: "rgba(255,255,255,0.03)", border: "1.5px solid rgba(255,255,255,0.08)" }}
  >
    <div className="flex items-start justify-between mb-4">
      <div className="w-10 h-10 rounded-xl flex items-center justify-center"
        style={{ background: `${color}18`, border: `1px solid ${color}30` }}>
        <Icon className="w-5 h-5" style={{ color }} />
      </div>
      {delta !== undefined && (
        <div className={`flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-lg ${delta >= 0 ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"}`}>
          {delta >= 0 ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
          {Math.abs(delta)}%
        </div>
      )}
    </div>
    <div className="text-3xl font-black text-white mb-1">
      {value}<span className="text-sm font-medium text-slate-400 ml-1">{unit}</span>
    </div>
    <div className="text-xs text-slate-500">{label}</div>
  </motion.div>
);

export default function Impact() {
  // ── useScroll must NOT use a ref that may not yet be mounted ──
  // Track window scroll instead to avoid "ref not hydrated" crash
  const { scrollYProgress } = useScroll();
  const heroScale   = useTransform(scrollYProgress, [0, 0.15], [1, 1.06]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.15], [1, 0]);

  const [user, setUser]           = useState(null);
  const [carbonLogs, setCarbonLogs] = useState([]);
  const [posts, setPosts]         = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const globalAvg   = 16.4;
  const parisTarget = 4.8;

  const totalCO2  = carbonLogs.reduce((acc, l) => acc + (l.total_co2 || l.total_emissions || 0), 0);
  const avgCO2    = carbonLogs.length ? totalCO2 / carbonLogs.length : 0;
  const pctBelowGlobal = globalAvg > 0 ? Math.round(((globalAvg - avgCO2) / globalAvg) * 100) : 0;
  const treecoins = user?.treecoins || 0;
  const level     = user?.eco_level || 1;
  const totalPosts  = posts.length;
  const totalLikes  = posts.reduce((a, p) => a + (p.likesCount || 0), 0);

  useEffect(() => {
    async function load() {
      setIsLoading(true);
      try {
        const u = await User.me();
        setUser(u);

        const uid = auth.currentUser?.uid;
        if (uid) {
          // ── Avoid composite-index queries: filter only by userId, sort client-side ──
          const [logsSnap, postsSnap] = await Promise.all([
            getDocs(query(collection(db, "carbon_logs"), where("userId", "==", uid), limit(60))),
            getDocs(query(collection(db, "posts"),       where("userId", "==", uid), limit(50))),
          ]);

          const logs = logsSnap.docs
            .map(d => ({ id: d.id, ...d.data() }))
            .sort((a, b) => (b.date || "").localeCompare(a.date || ""));
          setCarbonLogs(logs);

          const ps = postsSnap.docs
            .map(d => ({ id: d.id, ...d.data() }))
            .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
          setPosts(ps);
        }
      } catch (e) {
        console.error("Impact load error:", e);
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, []);

  // ── Chart data ──
  const weeklyData = (() => {
    const days = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
    const buckets: Record<string, { total: number; count: number }> = {};
    carbonLogs.slice(0, 14).forEach(log => {
      const d   = log.date ? new Date(log.date) : new Date();
      const day = days[d.getDay()];
      if (!buckets[day]) buckets[day] = { total: 0, count: 0 };
      buckets[day].total += log.total_co2 || log.total_emissions || 0;
      buckets[day].count++;
    });
    return days.map(day => ({
      day,
      you:    buckets[day] ? +(buckets[day].total / buckets[day].count).toFixed(2) : null,
      global: +(globalAvg   / 7).toFixed(2),
      paris:  +(parisTarget / 7).toFixed(2),
    }));
  })();

  const monthlyData = (() => {
    const months: Record<string, { co2: number; count: number }> = {};
    carbonLogs.forEach(log => {
      const d   = log.date ? new Date(log.date) : new Date();
      const key = d.toLocaleString("default", { month: "short" });
      if (!months[key]) months[key] = { co2: 0, count: 0 };
      months[key].co2   += log.total_co2 || log.total_emissions || 0;
      months[key].count++;
    });
    return Object.entries(months).slice(-6).map(([month, m]) => ({
      month,
      co2: +(m.co2 / (m.count || 1)).toFixed(2),
    }));
  })();

  const emissionsBreakdown = (() => {
    if (!carbonLogs.length) return [
      { name: "Transport", value: 40 },
      { name: "Energy",    value: 30 },
      { name: "Food",      value: 20 },
      { name: "Other",     value: 10 },
    ];
    const t = carbonLogs.reduce(
      (a, l) => ({
        transport: a.transport + (l.transportation_co2 || 0),
        energy:    a.energy    + (l.energy_co2         || 0),
        food:      a.food      + (l.diet_co2            || 0),
      }),
      { transport: 0, energy: 0, food: 0 }
    );
    const total = t.transport + t.energy + t.food || 1;
    return [
      { name: "Transport", value: Math.round((t.transport / total) * 100) },
      { name: "Energy",    value: Math.round((t.energy    / total) * 100) },
      { name: "Food",      value: Math.round((t.food      / total) * 100) },
    ];
  })();

  const pieColors = [CHART_COLORS.cyan, CHART_COLORS.amber, CHART_COLORS.purple];

  // ── Loading state rendered INSIDE the full component tree so refs are always mounted ──
  return (
    <div className="min-h-screen overflow-x-hidden"
      style={{ background: "linear-gradient(180deg, #020c08 0%, #040f09 100%)" }}>

      {/* ── CINEMATIC HERO ── */}
      <div className="relative h-72 md:h-96 overflow-hidden flex items-center justify-center">
        <div className="absolute inset-0 opacity-10" style={{
          backgroundImage: "linear-gradient(rgba(0,200,150,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(0,200,150,0.3) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full blur-3xl"
          style={{ background: "radial-gradient(ellipse, rgba(0,200,150,0.12) 0%, transparent 70%)" }} />

        <motion.div style={{ scale: heroScale, opacity: heroOpacity }}
          className="relative z-10 text-center px-6">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-5 text-sm font-medium text-emerald-300"
            style={{ background: "rgba(0,200,150,0.1)", border: "1px solid rgba(0,200,150,0.25)" }}
          >
            <BarChart3 className="w-4 h-4" /> Your Environmental Impact
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-4xl md:text-6xl font-black text-white mb-3"
            style={{ letterSpacing: "-0.03em" }}
          >
            Impact{" "}
            <span style={{ background: "linear-gradient(135deg, #00c896, #06b6d4)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              Visualizer
            </span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-slate-400 text-lg"
          >
            Your real-time sustainability footprint — powered by your data.
          </motion.p>
        </motion.div>

        <div className="absolute bottom-0 left-0 right-0 h-20"
          style={{ background: "linear-gradient(to bottom, transparent, #020c08)" }} />
      </div>

      {/* ── CONTENT ── */}
      <div className="max-w-7xl mx-auto px-4 md:px-8 pb-16">

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <div className="w-12 h-12 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-emerald-400 text-sm">Loading your impact data...</p>
          </div>
        ) : (
          <>
            {/* Metric cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <MetricCard icon={Leaf}     label="Avg Daily CO₂"    value={avgCO2.toFixed(1)} unit="kg"  delta={pctBelowGlobal}  color={CHART_COLORS.green}  delay={0}   />
              <MetricCard icon={TreePine} label="Treecoins Earned"  value={treecoins}          unit="TC"  color={CHART_COLORS.amber}  delay={0.1} />
              <MetricCard icon={Award}    label="Eco Level"         value={level}              unit=""    color={CHART_COLORS.purple} delay={0.2} />
              <MetricCard icon={Globe}    label="Posts Shared"      value={totalPosts}         unit=""    color={CHART_COLORS.cyan}   delay={0.3} />
            </div>

            {/* CO2 comparison banner */}
            {carbonLogs.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-2xl p-5 mb-8 flex flex-wrap items-center gap-6"
                style={{ background: "rgba(0,200,150,0.06)", border: "1.5px solid rgba(0,200,150,0.2)" }}
              >
                {[
                  { val: avgCO2.toFixed(2), label: "Your Daily Average", color: "#00c896" },
                  { val: globalAvg,         label: "Global Average",      color: "#94a3b8" },
                  { val: parisTarget,       label: "Paris Target",        color: "#64748b" },
                ].map(s => (
                  <div key={s.label} className="text-center">
                    <div className="text-3xl font-black text-white">{s.val}
                      <span className="text-sm text-slate-400 ml-1">kg CO₂</span>
                    </div>
                    <div className="text-xs mt-1" style={{ color: s.color }}>{s.label}</div>
                  </div>
                ))}
                <div className="ml-auto">
                  {avgCO2 < globalAvg
                    ? <div className="px-4 py-2 rounded-xl text-sm font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20">🌿 {pctBelowGlobal}% below global average</div>
                    : <div className="px-4 py-2 rounded-xl text-sm font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20">⚡ Room to improve</div>
                  }
                </div>
              </motion.div>
            )}

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">

              {/* Weekly area chart */}
              <motion.div
                initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
                className="rounded-2xl p-5"
                style={{ background: "rgba(255,255,255,0.03)", border: "1.5px solid rgba(255,255,255,0.08)" }}
              >
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-bold text-white text-sm">Weekly Emissions</h3>
                    <p className="text-xs text-slate-500 mt-0.5">kg CO₂ per day vs benchmarks</p>
                  </div>
                  <TrendingUp className="w-4 h-4 text-emerald-400" />
                </div>
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={weeklyData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="gradYou" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor={CHART_COLORS.green} stopOpacity={0.3} />
                        <stop offset="95%" stopColor={CHART_COLORS.green} stopOpacity={0}   />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                    <XAxis dataKey="day"  tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis               tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Area  type="monotone" dataKey="you"    stroke={CHART_COLORS.green} strokeWidth={2}   fill="url(#gradYou)" name="Your CO₂"    connectNulls={false} />
                    <Line  type="monotone" dataKey="global" stroke={CHART_COLORS.amber} strokeWidth={1.5} strokeDasharray="5 3" dot={false} name="Global Avg"  />
                    <Line  type="monotone" dataKey="paris"  stroke={CHART_COLORS.cyan}  strokeWidth={1.5} strokeDasharray="3 2" dot={false} name="Paris Target" />
                  </AreaChart>
                </ResponsiveContainer>
              </motion.div>

              {/* Emissions breakdown pie */}
              <motion.div
                initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
                className="rounded-2xl p-5"
                style={{ background: "rgba(255,255,255,0.03)", border: "1.5px solid rgba(255,255,255,0.08)" }}
              >
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-bold text-white text-sm">Emissions Breakdown</h3>
                    <p className="text-xs text-slate-500 mt-0.5">By category</p>
                  </div>
                  <Zap className="w-4 h-4 text-amber-400" />
                </div>
                <div className="flex items-center gap-4">
                  <ResponsiveContainer width="55%" height={200}>
                    <PieChart>
                      <Pie data={emissionsBreakdown} cx="50%" cy="50%"
                        innerRadius={52} outerRadius={78} paddingAngle={3} dataKey="value">
                        {emissionsBreakdown.map((_, i) => (
                          <Cell key={i} fill={pieColors[i % pieColors.length]} />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="space-y-3 flex-1">
                    {emissionsBreakdown.map((item, i) => (
                      <div key={item.name} className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                          style={{ background: pieColors[i % pieColors.length] }} />
                        <div className="flex-1">
                          <div className="flex justify-between text-xs">
                            <span className="text-slate-400">{item.name}</span>
                            <span className="text-white font-bold">{item.value}%</span>
                          </div>
                          <div className="h-1.5 rounded-full bg-white/10 mt-1 overflow-hidden">
                            <div className="h-full rounded-full"
                              style={{ width: `${item.value}%`, background: pieColors[i % pieColors.length] }} />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>

              {/* Monthly bar chart */}
              {monthlyData.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
                  className="rounded-2xl p-5"
                  style={{ background: "rgba(255,255,255,0.03)", border: "1.5px solid rgba(255,255,255,0.08)" }}
                >
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="font-bold text-white text-sm">Monthly CO₂ Trend</h3>
                      <p className="text-xs text-slate-500 mt-0.5">Average kg CO₂/day by month</p>
                    </div>
                    <BarChart3 className="w-4 h-4 text-cyan-400" />
                  </div>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={monthlyData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                      <XAxis dataKey="month" tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} />
                      <YAxis               tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="co2" name="CO₂ (kg)" fill={CHART_COLORS.cyan} radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </motion.div>
              )}

              {/* Community reach */}
              <motion.div
                initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
                className="rounded-2xl p-5"
                style={{ background: "rgba(255,255,255,0.03)", border: "1.5px solid rgba(255,255,255,0.08)" }}
              >
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-bold text-white text-sm">Community Reach</h3>
                    <p className="text-xs text-slate-500 mt-0.5">Your social environmental impact</p>
                  </div>
                  <Globe className="w-4 h-4 text-purple-400" />
                </div>
                <div className="space-y-4">
                  {[
                    { label: "Posts Published",    value: totalPosts,  max: 50,   color: CHART_COLORS.green,  icon: "📝" },
                    { label: "Total Likes",         value: totalLikes,  max: 200,  color: CHART_COLORS.rose,   icon: "❤️" },
                    { label: "Treecoins Earned",    value: treecoins,   max: 1000, color: CHART_COLORS.amber,  icon: "🌱" },
                    { label: "Current Level",       value: level,       max: 20,   color: CHART_COLORS.purple, icon: "⚡" },
                  ].map(item => (
                    <div key={item.label}>
                      <div className="flex justify-between text-sm mb-1.5">
                        <span className="text-slate-400 flex items-center gap-1.5"><span>{item.icon}</span>{item.label}</span>
                        <span className="font-bold text-white">{item.value}</span>
                      </div>
                      <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.min((item.value / item.max) * 100, 100)}%` }}
                          transition={{ duration: 1, delay: 0.5, ease: "easeOut" }}
                          className="h-full rounded-full"
                          style={{ background: `linear-gradient(90deg, ${item.color}88, ${item.color})` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            </div>

            {/* Empty state */}
            {carbonLogs.length === 0 && (
              <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="rounded-2xl p-10 text-center"
                style={{ background: "rgba(255,255,255,0.03)", border: "1.5px solid rgba(255,255,255,0.08)" }}
              >
                <Leaf className="w-14 h-14 text-emerald-500/30 mx-auto mb-4" />
                <h3 className="text-lg font-bold text-slate-300 mb-2">Start Logging Your Carbon Footprint</h3>
                <p className="text-slate-500 text-sm max-w-md mx-auto">
                  Visit <strong className="text-emerald-400">Carbon Footprint</strong> to log your daily emissions.
                  Your personal charts will populate here once you have data.
                </p>
              </motion.div>
            )}

            <div className="mt-6 text-center text-xs text-slate-600">
              Global average: 16.4 kg CO₂/day · Paris Agreement target: 4.8 kg CO₂/day · Sources: IEA, IPCC, Our World in Data
            </div>
          </>
        )}
      </div>
    </div>
  );
}
