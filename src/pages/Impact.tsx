import React, { useState } from "react";
import { motion } from "framer-motion";
import {
  BarChart, Bar, LineChart, Line, AreaChart, Area,
  XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie
} from 'recharts';
import {
  Activity, Zap, Droplet, Wind, TrendingUp, Sun, Palette
} from "lucide-react";

const themes = {
  cosmic: { primary: '#06b6d4', secondary: '#8b5cf6', accent: '#ec4899', bg: '#0f172a', card: '#1e293b' },
  nature: { primary: '#10b981', secondary: '#00cc00', accent: '#d48b06', bg: '#064e3b', card: '#065f46' },
  magma: { primary: '#f97316', secondary: '#ec4899', accent: '#facc15', bg: '#7c2d12', card: '#9a3412' },
  ocean: { primary: '#0ea5e9', secondary: '#d1abec', accent: '#d1aeac', bg: '#0c4a6e', card: '#075985' }
};

// preset data
const weeklyBars = [
  { day: 'Mon', value: 40 },
  { day: 'Tue', value: 60 },
  { day: 'Wed', value: 55 },
  { day: 'Thu', value: 75 },
  { day: 'Fri', value: 65 },
  { day: 'Sat', value: 90 },
  { day: 'Sun', value: 80 }
];

const trendLine = [
  { time: '00', value: 25 },
  { time: '04', value: 40 },
  { time: '08', value: 30 },
  { time: '12', value: 55 },
  { time: '16', value: 65 },
  { time: '20', value: 45 },
  { time: '24', value: 50 }
];

const areaData = [
  { month: 'Jan', value: 50 },
  { month: 'Feb', value: 35 },
  { month: 'Mar', value: 60 },
  { month: 'Apr', value: 55 },
  { month: 'May', value: 65 },
  { month: 'Jun', value: 85 },
  { month: 'Jul', value: 70 },
  { month: 'Aug', value: 75 },
  { month: 'Sep', value: 65 },
  { month: 'Oct', value: 80 },
  { month: 'Nov', value: 0 },
  { month: 'Dec', value: 0 },
];

const pieData = [
  { name: 'Transport', value: 40, color: '#3b82f6' },
  { name: 'Energy', value: 30, color: '#8b5cf6' },
  { name: 'Food', value: 10, color: '#ec4899' },
  { name: 'Waste', value: 20, color: '#f59e0b' }
];

const CustomTooltip = ({ active, payload, label, color }) => {
  if (active && payload && payload.length) {
    return (
      <div
        style={{
          background: '#1e293b',
          borderRadius: '10px',
          padding: '8px 14px',
          color: payload[0].payload.color || payload[0].color || color || "#fff",
          fontWeight: '600',
          fontFamily: 'monospace',
          boxShadow: `0 0 10px ${
            payload[0].payload.color || payload[0].color || color || "#fff"
          }60`,
        }}
      >
        {label && <div style={{ marginBottom: '4px', opacity: 0.8 }}>{label}</div>}

        {payload.map((item, i) => (
          <div key={i}>
            {`${item.name ?? item.payload.name ?? 'Value'} : ${item.value}`}
          </div>
        ))}
      </div>
    );
  }
  return null;
};


const CircularGauge = ({ value, max, label, color }) => {
  const percentage = (value / max) * 100;
  const radius = 50;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-32 h-32">
        <svg className="transform -rotate-90 w-full h-full">
          <circle
            cx="64"
            cy="64"
            r={radius}
            stroke="rgba(255,255,255,0.1)"
            strokeWidth="10"
            fill="none"
          />
          <circle
            cx="64"
            cy="64"
            r={radius}
            stroke={color}
            strokeWidth="10"
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 1s ease', filter: `drop-shadow(0 0 8px ${color})` }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-2xl font-bold text-white">{value}%</span>
        </div>
      </div>
      <p className="text-gray-400 text-sm mt-2">{label}</p>
    </div>
  );
};

export default function ImpactVisualizer() {
  const [selectedTheme, setSelectedTheme] = useState('cosmic');
  const [showThemeSelector, setShowThemeSelector] = useState(false);
  const theme = themes[selectedTheme];

  return (
    <div 
      className="min-h-screen p-6 transition-colors duration-500"
      style={{ background: theme.bg }}
    >
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-4xl font-bold text-white mb-2">Impact Visualizer Dashboard</h1>
          <p className="text-gray-400">Real-time environmental analytics</p>
        </div>
        <div className="relative">
          <button
            onClick={() => setShowThemeSelector(!showThemeSelector)}
            className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-xl text-white flex items-center gap-2 backdrop-blur-sm"
          >
            <Palette className="w-4 h-4" />
            Theme
          </button>
          {showThemeSelector && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="absolute right-0 mt-2 p-4 bg-gray-900 rounded-xl shadow-2xl border border-white/10 z-50"
            >
              <div className="grid grid-cols-1 gap-2">
                {Object.keys(themes).map((t) => (
                  <button
                    key={t}
                    onClick={() => {
                      setSelectedTheme(t);
                      setShowThemeSelector(false);
                    }}
                    className={`px-center py-2 rounded-lg capitalize text-sm ${
                      selectedTheme === t ? 'bg-white/20 text-white' : 'bg-white/5 text-gray-400 hover:bg-white/10'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        {[
          { icon: Activity, label: 'CO₂ Saved', value: '307 kg', change: '+12%', color: '#06b6d4' },
          { icon: Zap, label: 'Energy Score', value: '68/100', change: '+3', color: '#8b5cf6' },
          { icon: Droplet, label: 'Water Saved', value: '1,250 L', change: '+8%', color: '#ec4899' },
          { icon: Wind, label: 'Air Quality', value: 'Good', change: 'Stable', color: '#10b981' }
        ].map((stat, i) => (
          <motion.div
            key={i}
            whileHover={{ y: -5 }}
            className="p-6 rounded-2xl backdrop-blur-xl border border-white/10"
            style={{
              background: `linear-gradient(135deg, ${theme.card}ee, ${theme.card}cc)`,
              boxShadow: '0 8px 32px rgba(0,0,0,0.3)'
            }}
          >
            <div className="flex items-center justify-between mb-4">
              <div
                className="p-3 rounded-xl"
                style={{ background: `${stat.color}20`, boxShadow: `0 0 20px ${stat.color}30` }}
              >
                <stat.icon className="w-6 h-6" style={{ color: stat.color }} />
              </div>
              <span className="text-green-400 text-sm font-semibold">{stat.change}</span>
            </div>
            <p className="text-gray-400 text-sm mb-1">{stat.label}</p>
            <p className="text-white text-2xl font-bold">{stat.value}</p>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div
          className="p-6 rounded-2xl backdrop-blur-xl border border-white/10 lg:col-span-1"
          style={{
            background: `linear-gradient(135deg, ${theme.card}ee, ${theme.card}cc)`,
            boxShadow: '0 8px 32px rgba(0,0,0,0.3)'
          }}
        >
          <h3 className="text-white font-semibold mb-4">Weekly Activity</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={weeklyBars}>
              <XAxis dataKey="day" stroke="#fff" style={{ fontSize: "12px" }} />
              <YAxis stroke="#fff" style={{ fontSize: "12px" }} />
              <Tooltip content={<CustomTooltip color={theme.primary} />} />

              <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                {weeklyBars.map((entry, index) => (
                  <Cell key={index} fill={theme.primary} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div
          className="p-6 rounded-2xl backdrop-blur-xl border border-white/10 lg:col-span-1"
          style={{
            background: `linear-gradient(135deg, ${theme.card}ee, ${theme.card}cc)`,
            boxShadow: '0 8px 32px rgba(0,0,0,0.3)'
          }}
        >
          <h3 className="text-white font-semibold mb-6">Performance</h3>
          <div className="flex justify-around">
            <CircularGauge value={73} max={100} label="Efficiency" color={theme.primary} />
            <CircularGauge value={68} max={100} label="Impact" color={theme.secondary} />
          </div>
        </div>

        <div
          className="p-6 rounded-2xl backdrop-blur-xl border border-white/10 lg:col-span-1"
          style={{
            background: `linear-gradient(135deg, ${theme.card}ee, ${theme.card}cc)`,
            boxShadow: '0 8px 32px rgba(0,0,0,0.3)'
          }}
        >
          <h3 className="text-white font-semibold mb-4">24-Hour Trends</h3>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={trendLine}>
              <XAxis dataKey="time" stroke="#fff" style={{ fontSize: '12px' }} />
              <YAxis stroke="#fff" style={{ fontSize: '12px' }} />
              <Tooltip content={<CustomTooltip color={theme.accent} />} />
              <Line
                type="monotone"
                dataKey="value"
                stroke={theme.accent}
                strokeWidth={3}
                dot={{ fill: theme.accent, r: 4 }}
                activeDot={{ r: 6 }}
                style={{ filter: `drop-shadow(0 0 8px ${theme.accent})` }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div
          className="p-6 rounded-2xl backdrop-blur-xl border border-white/10"
          style={{
            background: `linear-gradient(135deg, ${theme.card}ee, ${theme.card}cc)`,
            boxShadow: '0 8px 32px rgba(0,0,0,0.3)'
          }}
        >
          <h3 className="text-white font-semibold mb-4">Year So Far: Monthly Progress</h3>
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={areaData}>
              <defs>
                <linearGradient id="colorArea" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={theme.primary} stopOpacity={0.8} />
                  <stop offset="95%" stopColor={theme.primary} stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="month" stroke="#fff" style={{ fontSize: '12px' }} />
              <YAxis stroke="#fff" style={{ fontSize: '12px' }} />
              <Tooltip content={<CustomTooltip color={theme.primary} />} />
              <Area
                type="monotone"
                dataKey="value"
                stroke={theme.primary}
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorArea)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div
          className="p-6 rounded-2xl backdrop-blur-xl border border-white/10"
          style={{
            background: `linear-gradient(135deg, ${theme.card}ee, ${theme.card}cc)`,
            boxShadow: '0 8px 32px rgba(0,0,0,0.3)'
          }}
        >
          <h3 className="text-white font-semibold mb-4">Emissions Breakdown</h3>
          <div className="flex items-center justify-between">
            <ResponsiveContainer width="60%" height={250}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={index} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-3">
              {pieData.map((item, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full" style={{ background: item.color }} />
                  <div>
                    <p className="text-white text-sm font-medium">{item.name}</p>
                    <p style={{ color: item.color }} className="text-xs">
                      {item.value}%
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}