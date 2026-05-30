// @ts-nocheck
import React, { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { User } from "@/entities/User";
import {
  Search, BotMessageSquare, MessageCircleMore, Trophy, Settings, Leaf, Globe, Camera,
  BarChart3, BookOpen, Recycle, Palmtree, Menu, X,
  ChevronRight, TreePine, Sun, Moon
} from "lucide-react";


import LevelUpBar from "@/components/LevelUpBar";

import { motion, AnimatePresence } from "framer-motion";
import { useTheme } from "@/context/ThemeContext";

const navigationItems = [
  { title: "Your Island", url: createPageUrl("Island"), icon: Palmtree, description: "Customize your Ecoisland", color: "#00c896" },
  { title: "Carbon Footprint", url: createPageUrl("CarbonFootprint"), icon: Leaf, description: "Track your carbon footprint", color: "#10b981" },
  { title: "Regional Data", url: createPageUrl("RegionalData"), icon: Globe, description: "Local sustainability insights", color: "#06b6d4" },
  { title: "Danger Scan", url: createPageUrl("DangerScan"), icon: Camera, description: "Report issues via image AI", color: "#f97316" },
  { title: "Action Feed", url: createPageUrl("ActionFeed"), icon: Recycle, description: "See what others are up to", color: "#8b5cf6" },
  { title: "Impact Visualizer", url: createPageUrl("Impact"), icon: BarChart3, description: "See your impact come to life", color: "#ec4899" },
  { title: "AP Environmental Science", url: createPageUrl("APES"), icon: BookOpen, description: "Get a 5 on the AP Exam", color: "#f59e0b" },
];

export default function Layout({ children, currentPageName }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();

  useEffect(() => {
    let mounted = true;
    User.me()
      .then(u => mounted && setUser(u))
      .catch(() => mounted && setUser(null))
      .finally(() => mounted && setIsLoading(false));
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if (isLoading) return;
    if (!user && currentPageName !== "Onboarding") {
      navigate(createPageUrl("Onboarding"), { replace: true });
      return;
    }
    if (user && !user.onboarding_complete && currentPageName !== "Onboarding") {
      navigate(createPageUrl("Onboarding"), { replace: true });
    }
  }, [user, isLoading, currentPageName, navigate]);

  const handleBuyXp = async () => {
    const cost = 20;
    const xpGain = 10;
    if ((user.treecoins || 0) < cost) { alert("Not enough Treecoins!"); return; }
    let xp = (user.xp || 0) + xpGain;
    let level = user.eco_level || 1;
    let xpNext = user.xp_to_next_level || 100;
    if (xp >= xpNext) { level++; xp -= xpNext; xpNext = Math.floor(xpNext * 1.5); alert(`Level ${level} reached!`); }
    const updated = { treecoins: user.treecoins - cost, xp, eco_level: level, xp_to_next_level: xpNext };
    await User.updateMyUserData(updated);
    setUser(prev => ({ ...prev, ...updated }));
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "radial-gradient(ellipse at 50% 0%, #062d1e 0%, #020c08 70%)" }}>
        <div className="text-center">
          <div className="relative w-20 h-20 mx-auto mb-6">
            <div className="absolute inset-0 rounded-full border-2 border-emerald-500/30 animate-ping" />
            <div className="absolute inset-2 rounded-full border-2 border-t-emerald-400 animate-spin" />
            <img src="/ecoisland_logo_new.png" alt="Ecoisland" className="absolute inset-4 w-12 h-12 object-contain" />
          </div>
          <p className="text-emerald-400 font-medium tracking-widest text-sm uppercase">Loading Ecoisland...</p>
        </div>
      </div>
    );
  }

  if (currentPageName === "Onboarding") return children;
  if (!user) return null;

  const SidebarContent = () => (
    <nav className="p-5 flex flex-col h-full">
      {/* Nav items */}
      <div className="space-y-1 flex-1">
        {navigationItems.map(item => {
          const isActive = location.pathname === item.url;
          return (
            <Link
              key={item.title}
              to={item.url}
              onClick={() => setMobileOpen(false)}
              className={`flex gap-3 p-3 rounded-xl relative overflow-hidden transition-all duration-200 group ${
                isActive
                  ? "bg-emerald-500/15 border border-emerald-500/30"
                  : "hover:bg-white/5 border border-transparent"
              }`}
            >
              {isActive && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-6 rounded-r-full" style={{ background: item.color }} />
              )}
              <div
                className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 transition-all"
                style={{ background: isActive ? `${item.color}22` : "rgba(255,255,255,0.05)" }}
              >
                <item.icon className="w-4.5 h-4.5" style={{ color: isActive ? item.color : "#94a3b8" }} />
              </div>
              <div className="min-w-0">
                <p className={`text-sm font-medium leading-tight ${isActive ? "text-white" : "text-slate-300 group-hover:text-white"}`}>
                  {item.title}
                </p>
                <p className="text-xs text-slate-500">{item.description}</p>
              </div>
              {isActive && <ChevronRight className="w-3.5 h-3.5 text-emerald-400 ml-auto self-center flex-shrink-0" />}
            </Link>
          );
        })}
      </div>

      {/* Level bar */}
      <div className="mt-4 pt-4 border-t border-white/10">
        <LevelUpBar
          currentXp={user.xp}
          xpToNextLevel={user.xp_to_next_level}
          treecoins={user.treecoins}
          onBuyXp={handleBuyXp}
        />
      </div>
    </nav>
  );

  return (
    <div className="min-h-screen" style={{ background: "#f0faf5" }}>
      {/* HEADER */}
      <header className="sticky top-0 z-50 eco-header">
        <div className="max-w-screen-2xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
          {/* Mobile menu trigger */}
          <button
            className="md:hidden p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          {/* Desktop logo */}
          <Link to={createPageUrl("Dashboard")} className="hidden md:flex items-center gap-3">
            <img src="/ecoisland_logo_new.png" alt="Ecoisland" className="w-10 h-10 object-contain" />
            <div>
              <h1 className="font-bold text-lg text-white leading-tight">Ecoisland</h1>
              <p className="text-xs text-emerald-400/70">All for a greener future</p>
            </div>
          </Link>

          {/* Mobile logo */}
          <Link to={createPageUrl("Dashboard")} className="md:hidden flex items-center gap-2">
            <img src="/ecoisland_logo_new.png" alt="Ecoisland" className="w-8 h-8 object-contain" />
            <span className="font-bold text-white">Ecoisland</span>
          </Link>

          {/* Header quick actions */}
          <div className="hidden md:flex flex-1 justify-center">
            <div className="flex items-center gap-4">
              <button
                type="button"
                className="uiverse"
                onClick={() => navigate(createPageUrl("Dashboard"))}
              >
                <Search className="w-6 h-6" />
                <span className="tooltip">Search</span>
              </button>
              <button
                type="button"
                className="uiverse"
                onClick={() => navigate(createPageUrl("DangerScan"))}
              >
                <BotMessageSquare className="w-6 h-6" />
                <span className="tooltip">Chatbot</span>
              </button>
            </div>
          </div>

          {/* Right actions */}
          <div className="flex items-center gap-3">
            {/* Theme toggle */}
            <button
              onClick={toggleTheme}
              title={theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
              className="p-2 rounded-lg transition-colors"
              style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}
            >
              {theme === "dark"
                ? <Sun  className="w-4 h-4 text-amber-300" />
                : <Moon className="w-4 h-4 text-slate-300" />}
            </button>

            {/* Treecoins */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg" style={{ background: "rgba(0,200,150,0.1)", border: "1px solid rgba(0,200,150,0.2)" }}>
              <TreePine className="w-4 h-4 text-emerald-400" />
              <span className="text-sm font-bold text-emerald-300">{user.treecoins ?? 0}</span>
              <span className="text-xs text-emerald-500/70 hidden sm:block">TC</span>
            </div>

            <Link to={createPageUrl("Leaderboard")} title="Leaderboard">
              <button className="p-2 rounded-lg text-slate-400 hover:text-amber-400 hover:bg-amber-400/10 transition-colors">
                <Trophy className="w-5 h-5" />
              </button>
            </Link>
            <Link to={createPageUrl("Settings")} title="Settings">
              <button className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors">
                <Settings className="w-5 h-5" />
              </button>
            </Link>

            {/* Avatar */}
            {user.avatar_url ? (
              <Link to={createPageUrl("Settings")}>
                <img src={user.avatar_url} alt="Avatar" className="w-8 h-8 rounded-full ring-2 ring-emerald-500/40 object-cover" />
              </Link>
            ) : (
              <Link to={createPageUrl("Settings")}>
                <div className="w-8 h-8 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 text-sm font-bold">
                  {(user.username || user.full_name || "U")[0].toUpperCase()}
                </div>
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Mobile overlay sidebar */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 z-40 md:hidden"
              onClick={() => setMobileOpen(false)}
            />
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="fixed left-0 top-0 h-full w-72 z-50 md:hidden overflow-y-auto eco-sidebar"
            >
              <SidebarContent />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Desktop sidebar */}
      <aside
        className="hidden md:block fixed left-0 top-16 h-[calc(100vh-4rem)] w-72 overflow-y-auto z-30 eco-sidebar"
      >
        <SidebarContent />
      </aside>

      {/* Main content */}
      <main className="md:ml-72 min-h-[calc(100vh-4rem)] main-content-area" style={{ background: "var(--bg-page)" }}>
        {children}
      </main>
    </div>
  );
}
