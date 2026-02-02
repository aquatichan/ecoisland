// @ts-nocheck
import React, { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { User } from "@/entities/User";
import {
  Search,
  Trophy,
  Settings,
  Leaf,
  Globe,
  Camera,
  BarChart3,
  BookOpen,
  Recycle,
  Palmtree
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import LevelUpBar from "@/components/LevelUpBar";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";

const navigationItems = [
  { title: "Your Island", url: createPageUrl("Island"), icon: Palmtree, description: "Customize your Ecoisland" },
  { title: "Carbon Footprint", url: createPageUrl("CarbonFootprint"), icon: Leaf, description: "Track your carbon footprint" },
  { title: "Regional Data", url: createPageUrl("RegionalData"), icon: Globe, description: "Local sustainability insights" },
  { title: "Danger Scan", url: createPageUrl("DangerScan"), icon: Camera, description: "Report issues from an image" },
  { title: "Action Feed", url: createPageUrl("ActionFeed"), icon: Recycle, description: "See what others are up to" },
  { title: "Impact Visualizer", url: createPageUrl("Impact"), icon: BarChart3, description: "See your impact come to life" },
  { title: "AP Environmental Science", url: createPageUrl("APES"), icon: BookOpen, description: "Get a 5 on the AP Exam" }
];

export default function Layout({ children, currentPageName }) {
  const location = useLocation();
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // Load authenticated user
  useEffect(() => {
    let mounted = true;

    User.me()
      .then(u => mounted && setUser(u))
      .catch(() => mounted && setUser(null))
      .finally(() => mounted && setIsLoading(false));

    return () => { mounted = false; };
  }, []);

  // Handle redirects (AUTH + ONBOARDING)
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

    if ((user.treecoins || 0) < cost) {
      alert("Not enough Treecoins!");
      return;
    }

    let xp = (user.xp || 0) + xpGain;
    let level = user.eco_level || 1;
    let xpNext = user.xp_to_next_level || 100;

    if (xp >= xpNext) {
      level++;
      xp -= xpNext;
      xpNext = Math.floor(xpNext * 1.5);
      alert(`Congratulations! You've reached Eco Level ${level}!`);
    }

    const updated = {
      treecoins: user.treecoins - cost,
      xp,
      eco_level: level,
      xp_to_next_level: xpNext
    };

    await User.updateMyUserData(updated);
    setUser(prev => ({ ...prev, ...updated }));
  };

  // ---------- UI STATES ----------
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-teal-50 to-green-50">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-teal-600 font-medium">Loading Ecoisland...</span>
        </div>
      </div>
    );
  }

  if (currentPageName === "Onboarding") {
    return children;
  }

  if (!user) {
    return null; // navigation effect will handle redirect
  }

  // ---------- MAIN LAYOUT ----------
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-teal-50 to-green-50">
      {/* HEADER */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-sm border-b border-gray-200/50">
        <div className="max-w-8xl mx-auto px-4 py-4 flex justify-between items-center">
          <Link to={createPageUrl("Dashboard")} className="flex items-center gap-3">
            <img src="/ecoisland.png" alt="Ecoisland" className="w-10 h-10" />
            <div className="hidden sm:block">
              <h1 className="font-bold text-xl text-gray-900">Ecoisland</h1>
              <p className="text-xs text-gray-500">All for a greener future</p>
            </div>
          </Link>

          <div className="hidden md:flex flex-1 max-w-md mx-8">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                className="pl-10 bg-white/50"
                placeholder="Search for anything..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold text-teal-600">{user.treecoins}</span>
                <Leaf className="w-4 h-4 text-green-500" />
              </div>
              <p className="text-xs text-gray-500">Treecoins</p>
            </div>
            <Link to={createPageUrl("Leaderboard")}>
              <Button variant="outline" size="icon"><Trophy className="w-4 h-4" /></Button>
            </Link>
            <Link to={createPageUrl("Settings")}>
              <Button variant="outline" size="icon"><Settings className="w-4 h-4" /></Button>
            </Link>
          </div>
        </div>
      </header>

      {/* SIDEBAR */}
      <aside className="hidden md:block fixed left-0 top-0 pt-20 h-full w-80 bg-white/80 backdrop-blur-sm border-r border-gray-200/50">
        <nav className="p-6 flex flex-col h-full">
          {navigationItems.map(item => (
            <Link
              key={item.title}
              to={item.url}
              className={`flex gap-4 p-4 rounded-xl ${
                location.pathname === item.url
                  ? "bg-gradient-to-r from-teal-100 to-green-100 text-teal-700"
                  : "hover:bg-gray-50"
              }`}
            >
              <item.icon className="w-5 h-5" />
              <div>
                <p className="font-medium">{item.title}</p>
                <p className="text-xs text-gray-500">{item.description}</p>
              </div>
            </Link>
          ))}

          <div className="mt-auto pt-6 border-t border-gray-200">
            <LevelUpBar
              currentXp={user.xp}
              xpToNextLevel={user.xp_to_next_level}
              treecoins={user.treecoins}
              onBuyXp={handleBuyXp}
            />
          </div>
        </nav>
      </aside>

      {/* MAIN */}
      <main className="md:ml-80 min-h-screen">
        {children}
      </main>
    </div>
  );
}