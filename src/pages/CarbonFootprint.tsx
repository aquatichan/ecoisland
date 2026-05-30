// @ts-nocheck
// pending rework because i want to integrate AI with this as well
import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Leaf, Car, Zap, Utensils, Plus, X, CheckCircle, Calendar,
  TrendingDown, Award, Info, Loader2, ChevronDown
} from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine
} from "recharts";
import { format, subDays } from "date-fns";
import { collection, query, orderBy, getDocs, doc, addDoc, updateDoc } from "firebase/firestore";
import { db } from "@/firebase";
import { User } from "@/entities/User";

const EMISSION_FACTORS = {
  transport: {
    walking: 0.0, cycling: 0.0, electric_scooter: 0.05,
    bus: 0.06, train: 0.04, car_gasoline: 0.17, car_electric: 0.085,
    motorcycle: 0.11, flight_domestic: 0.246, flight_international: 0.10,
  },
  energy: 0.37,
  diet: {
    vegan: 1.38, vegetarian: 2.32, pescatarian: 3.32,
    omnivore: 4.46, carnivore: 4.46, keto: 5.82,
    paleo: 5.24, gluten_free: 4.70, intermittent: 3.57, raw: 1.25,
  },
};

const TRANSPORT_LABELS = {
  walking: "🚶 Walking", cycling: "🚲 Cycling", electric_scooter: "🛴 E-Scooter",
  bus: "🚌 Bus", train: "🚆 Train", car_gasoline: "🚗 Car (Gas)",
  car_electric: "⚡ Car (EV)", motorcycle: "🏍 Motorcycle",
  flight_domestic: "✈️ Flight (Domestic)", flight_international: "✈️ Flight (Intl)",
};

const DAILY_LIMIT = 5;
const COINS_PER_LOG = 10;

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="px-3 py-2 rounded-xl text-xs text-white" style={{ background: "rgba(2,12,8,0.95)", border: "1px solid rgba(0,200,150,0.3)", backdropFilter: "blur(10px)" }}>
      <p className="text-slate-400 mb-1">{label}</p>
      {payload.filter(p => p.value != null).map((entry, i) => (
        <p key={i} style={{ color: entry.color }}>{entry.name}: <strong>{Number(entry.value).toFixed(2)} kg</strong></p>
      ))}
    </div>
  );
};

export default function CarbonFootprint() {
  const [user, setUser] = useState(null);
  const [entries, setEntries] = useState([]);
  const [selectedDate, setSelectedDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [transportItems, setTransportItems] = useState([]);
  const [energyUsage, setEnergyUsage] = useState(20);
  const [dietType, setDietType] = useState("omnivore");
  const [message, setMessage] = useState(null);
  const [isLogging, setIsLogging] = useState(false);
  const [todaysLogs, setTodaysLogs] = useState(0);

  useEffect(() => {
    User.me().then(u => {
      setUser(u);
      loadEntries(u.id);
    }).catch(() => {});
  }, []);

  const loadEntries = async (userId) => {
    try {
      const snap = await getDocs(query(collection(db, "users", userId, "carbon_entries"), orderBy("date", "desc")));
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setEntries(data);
      const today = format(new Date(), "yyyy-MM-dd");
      setTodaysLogs(data.filter(e => e.date === today).length);
    } catch (e) { console.error(e); }
  };

  const calculateEmissions = () => {
    const transportCO2 = transportItems.reduce((sum, item) => {
      const factor = EMISSION_FACTORS.transport[item.type] || 0;
      return sum + factor * (item.distance || 0);
    }, 0);
    const energyCO2 = EMISSION_FACTORS.energy * energyUsage;
    const dietCO2 = EMISSION_FACTORS.diet[dietType] || 0;
    return {
      transportation_co2: +transportCO2.toFixed(3),
      energy_co2: +energyCO2.toFixed(3),
      diet_co2: +dietCO2.toFixed(3),
      total_co2: +(transportCO2 + energyCO2 + dietCO2).toFixed(3),
      // Keep backward compat field name
      total_emissions: +(transportCO2 + energyCO2 + dietCO2).toFixed(3),
      diet: dietType,
      date: selectedDate,
      userId: user?.id,
    };
  };

  const handleLogEmissions = async () => {
    if (!user) return;
    if (todaysLogs >= DAILY_LIMIT) { setMessage({ type: "error", text: `Max ${DAILY_LIMIT} logs per day.` }); return; }
    setIsLogging(true);
    try {
      const data = calculateEmissions();
      const existing = entries.find(e => e.date === selectedDate);
      if (existing) {
        await updateDoc(doc(db, "users", user.id, "carbon_entries", existing.id), data);
      } else {
        await addDoc(collection(db, "users", user.id, "carbon_entries"), data);
        // Also write to top-level carbon_logs for Impact Visualizer
        await addDoc(collection(db, "carbon_logs"), { ...data });
        await User.updateMyUserData({ treecoins: (user.treecoins || 0) + COINS_PER_LOG });
        setUser(prev => ({ ...prev, treecoins: (prev.treecoins || 0) + COINS_PER_LOG }));
      }
      await loadEntries(user.id);
      setMessage({ type: "success", text: existing ? "Entry updated!" : `Logged! +${COINS_PER_LOG} Treecoins 🌱` });
      setTimeout(() => setMessage(null), 3000);
      setTransportItems([]);
      setEnergyUsage(20);
    } catch (e) {
      console.error(e);
      setMessage({ type: "error", text: "Failed to save. Please try again." });
    } finally { setIsLogging(false); }
  };

  const current = calculateEmissions();
  const validEntries = entries.filter(e => e.total_emissions != null);
  const avgEmissions = validEntries.length > 0 ? validEntries.reduce((s, e) => s + e.total_emissions, 0) / validEntries.length : 0;

  const chartData = Array.from({ length: 30 }).map((_, i) => {
    const d = subDays(new Date(), 29 - i);
    const ds = format(d, "yyyy-MM-dd");
    const entry = entries.find(e => e.date === ds);
    return {
      date: format(d, "MMM d"),
      yourEmissions: entry ? +(entry.total_emissions || entry.total_co2 || 0) : null,
      globalAvg: 16.4,
      parisTarget: 4.8,
    };
  });

  const evalStatus = (() => {
    if (!validEntries.length) return { text: "Log your first entry below.", color: "#64748b", emoji: "📊" };
    if (avgEmissions < 4.8) return { text: "Excellent! You're meeting Paris Agreement targets.", color: "#10b981", emoji: "🌟" };
    if (avgEmissions < 7) return { text: "Good progress! You're below the sustainable threshold.", color: "#06b6d4", emoji: "✅" };
    if (avgEmissions < 12) return { text: "Room for improvement. Consider more sustainable choices.", color: "#f59e0b", emoji: "⚡" };
    return { text: "High impact. Focus on reducing transportation and energy use.", color: "#ef4444", emoji: "⚠️" };
  })();

  return (
    <div className="min-h-screen p-4 md:p-8" style={{ background: "var(--bg-page)" }}>
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Leaf className="w-7 h-7 text-emerald-600" />
            <h1 className="text-3xl md:text-4xl font-black text-slate-900" style={{ letterSpacing: "-0.03em" }}>Carbon Footprint</h1>
          </div>
          <p className="text-slate-500">Track your daily habits and see your real environmental impact.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* ===== LOG PANEL ===== */}
          <div className="lg:col-span-1 space-y-4">
            <div className="eco-card p-5">
              <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2"><Calendar className="w-5 h-5 text-emerald-600" /> Log Daily Impact</h3>

              {/* Date */}
              <div className="mb-4">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Date</label>
                <input
                  type="date"
                  className="eco-input"
                  value={selectedDate}
                  onChange={e => setSelectedDate(e.target.value)}
                  max={format(new Date(), "yyyy-MM-dd")}
                />
              </div>

              {/* Transport */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wide flex items-center gap-1.5"><Car className="w-3.5 h-3.5" /> Transportation</label>
                  <button
                    onClick={() => setTransportItems(p => [...p, { type: "bus", distance: 0 }])}
                    className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center hover:bg-emerald-200 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="space-y-2">
                  {transportItems.map((item, idx) => (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-3 rounded-xl space-y-2" style={{ background: "var(--bg-subtle)", border: "2px solid var(--border-card)" }}
                    >
                      <div className="flex items-center gap-2">
                        <select
                          className="eco-input text-xs py-1.5 px-2"
                          value={item.type}
                          onChange={e => setTransportItems(p => p.map((t, i) => i === idx ? { ...t, type: e.target.value } : t))}
                        >
                          {Object.entries(TRANSPORT_LABELS).map(([val, label]) => (
                            <option key={val} value={val}>{label}</option>
                          ))}
                        </select>
                        <button onClick={() => setTransportItems(p => p.filter((_, i) => i !== idx))} className="text-red-400 hover:text-red-600 p-1">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          className="eco-input text-xs py-1.5 px-2"
                          placeholder="Distance (km)"
                          min={0}
                          value={item.distance || ""}
                          onChange={e => setTransportItems(p => p.map((t, i) => i === idx ? { ...t, distance: parseFloat(e.target.value) || 0 } : t))}
                        />
                        <span className="text-xs text-slate-400 font-medium">km</span>
                      </div>
                    </motion.div>
                  ))}
                  {transportItems.length === 0 && (
                    <p className="text-xs text-slate-400 text-center py-2">No transport added. Click + to add.</p>
                  )}
                </div>
              </div>

              {/* Energy */}
              <div className="mb-4">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2 flex items-center gap-1.5"><Zap className="w-3.5 h-3.5" /> Energy Use: <span className="text-emerald-600 ml-1">{energyUsage} kWh</span></label>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-slate-400">0</span>
                  <input
                    type="range" min={0} max={100} step={0.5}
                    value={energyUsage}
                    onChange={e => setEnergyUsage(parseFloat(e.target.value))}
                    className="flex-1 accent-emerald-500 h-2 rounded-full"
                  />
                  <span className="text-xs text-slate-400">100</span>
                </div>
              </div>

              {/* Diet */}
              <div className="mb-5">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2 flex items-center gap-1.5"><Utensils className="w-3.5 h-3.5" /> Today's Diet</label>
                <select
                  className="eco-input"
                  value={dietType}
                  onChange={e => setDietType(e.target.value)}
                >
                  {Object.entries({ vegan: "🥦 Vegan", vegetarian: "🥗 Vegetarian", pescatarian: "🐟 Pescatarian", omnivore: "🍽️ Omnivore", carnivore: "🥩 Carnivore", keto: "🥑 Keto", paleo: "🍖 Paleo", gluten_free: "🌾 Gluten-Free", intermittent: "⏱ Intermittent", raw: "🥕 Raw" }).map(([val, label]) => (
                    <option key={val} value={val}>{label}</option>
                  ))}
                </select>
              </div>

              {/* Total */}
              <div className="p-4 rounded-2xl mb-4" style={{ background: "var(--bg-success)", border: "2px solid var(--border-success)" }}>
                <p className="text-xs font-bold text-emerald-600 uppercase tracking-wide mb-1">Today's Total</p>
                <p className="text-3xl font-black text-emerald-700">{current.total_co2.toFixed(2)}<span className="text-base font-medium ml-1 text-emerald-500">kg CO₂</span></p>
                <div className="flex gap-3 mt-2 text-xs text-emerald-600">
                  <span>🚗 {current.transportation_co2.toFixed(2)}</span>
                  <span>⚡ {current.energy_co2.toFixed(2)}</span>
                  <span>🍽️ {current.diet_co2.toFixed(2)}</span>
                </div>
              </div>

              {/* Message */}
              <AnimatePresence>
                {message && (
                  <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className={`flex items-center gap-2 p-3 rounded-xl mb-3 text-sm ${message.type === "success" ? "status-success rounded-xl text-emerald-700 dark:text-emerald-300" : "status-error rounded-xl text-red-700 dark:text-red-400"}`}
                  >
                    <CheckCircle className="w-4 h-4 flex-shrink-0" />
                    {message.text}
                  </motion.div>
                )}
              </AnimatePresence>

              <button
                onClick={handleLogEmissions}
                disabled={isLogging || todaysLogs >= DAILY_LIMIT}
                className="w-full py-3.5 rounded-2xl font-bold text-white flex items-center justify-center gap-2 transition-all"
                style={{
                  background: isLogging || todaysLogs >= DAILY_LIMIT ? "#94a3b8" : "linear-gradient(135deg, #00c896, #059669)",
                  boxShadow: isLogging || todaysLogs >= DAILY_LIMIT ? "none" : "0 4px 15px rgba(0,200,150,0.3)",
                  cursor: isLogging || todaysLogs >= DAILY_LIMIT ? "not-allowed" : "pointer",
                }}
              >
                {isLogging ? <Loader2 className="w-4 h-4 animate-spin" /> : entries.find(e => e.date === selectedDate) ? "Update Entry" : <><Award className="w-4 h-4" /> Log & Earn {COINS_PER_LOG} Treecoins</>}
              </button>
              <p className="text-xs text-slate-400 text-center mt-2">{todaysLogs}/{DAILY_LIMIT} logs today</p>
            </div>
          </div>

          {/* ===== CHARTS PANEL ===== */}
          <div className="lg:col-span-2 space-y-5">
            {/* Eval banner */}
            <div className="eco-card p-5">
              <div className="flex items-center gap-3 mb-4">
                <span className="text-2xl">{evalStatus.emoji}</span>
                <p className="font-semibold text-slate-700 text-sm">{evalStatus.text}</p>
              </div>
              <div className="grid grid-cols-3 gap-4 text-center">
                {[
                  { label: "Your Average", val: avgEmissions, color: "#00c896" },
                  { label: "Global Avg", val: 16.4, color: "#ef4444" },
                  { label: "Paris Target", val: 4.8, color: "#10b981" },
                ].map(s => (
                  <div key={s.label} className="p-3 rounded-xl" style={{ background: `${s.color}08`, border: `1.5px solid ${s.color}20` }}>
                    <div className="text-2xl font-black" style={{ color: s.color }}>{s.val.toFixed(2)}</div>
                    <div className="text-xs text-slate-500 mt-0.5">{s.label} (kg CO₂)</div>
                  </div>
                ))}
              </div>
              <p className="text-xs text-slate-400 mt-3 text-center">
                Sources: IEA, IPCC, EPA · Global avg 16.4 kg/day · Paris target 4.8 kg/day
              </p>
            </div>

            {/* Chart */}
            <div className="eco-card p-5">
              <h3 className="font-bold text-slate-800 mb-5">Your Emissions vs. Global Targets (30 days)</h3>
              {entries.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-56 text-center gap-3">
                  <TrendingDown className="w-12 h-12 text-slate-200" />
                  <p className="text-slate-400 text-sm">Log your first entry to see your progress chart.</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <LineChart data={chartData} margin={{ top: 5, right: 10, left: -15, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} interval={4} />
                    <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} unit=" kg" />
                    <Tooltip content={<CustomTooltip />} />
                    <ReferenceLine y={16.4} stroke="#ef444440" strokeDasharray="4 2" />
                    <ReferenceLine y={4.8} stroke="#10b98140" strokeDasharray="4 2" />
                    <Line type="monotone" dataKey="yourEmissions" name="Your Emissions" stroke="#00c896" strokeWidth={2.5} dot={{ r: 4, fill: "#00c896" }} connectNulls={false} />
                    <Line type="monotone" dataKey="globalAvg" name="Global Average" stroke="#ef4444" strokeWidth={1.5} strokeDasharray="5 3" dot={false} />
                    <Line type="monotone" dataKey="parisTarget" name="Paris Target" stroke="#10b981" strokeWidth={1.5} strokeDasharray="3 2" dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Recent entries table */}
            {entries.length > 0 && (
              <div className="eco-card p-5">
                <h3 className="font-bold text-slate-800 mb-4">Recent Entries</h3>
                <div className="space-y-2">
                  {entries.slice(0, 7).map(e => (
                    <div key={e.id} className="flex items-center justify-between py-2.5 border-b border-slate-100 last:border-0">
                      <div>
                        <p className="font-semibold text-slate-700 text-sm">{e.date}</p>
                        <p className="text-xs text-slate-400 capitalize">{e.diet || "Mixed"} diet</p>
                      </div>
                      <div className="text-right">
                        <p className="font-black text-slate-800">{((e.total_emissions || e.total_co2 || 0)).toFixed(2)} kg</p>
                        <p className="text-xs" style={{ color: (e.total_emissions || e.total_co2) < 4.8 ? "#10b981" : (e.total_emissions || e.total_co2) < 16.4 ? "#f59e0b" : "#ef4444" }}>
                          {(e.total_emissions || e.total_co2) < 4.8 ? "✅ On target" : (e.total_emissions || e.total_co2) < 16.4 ? "⚠️ Above target" : "🚨 Above avg"}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
