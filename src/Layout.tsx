// @ts-nocheck
import React, { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { User } from "@/entities/User";
import {
  Search,
  Trophy,
  Settings,
  Menu,
  Palmtree,
  Leaf,
  Globe,
  Camera,
  BarChart3,
  BookOpen,
  Recycle
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
  {
    title: "Your Island",
    url: createPageUrl("Island"),
    icon: Palmtree,
    description: "Customize your Ecoisland"
  },
  {
    title: "Carbon Footprint",
    url: createPageUrl("CarbonFootprint"),
    icon: Leaf,
    description: "Track your carbon footprint"
  },
  {
    title: "Regional Data",
    url: createPageUrl("RegionalData"),
    icon: Globe,
    description: "Local sustainability insights"
  },
  {
    title: "Danger Scan",
    url: createPageUrl("DangerScan"),
    icon: Camera,
    description: "Report issues from an image"
  },
  {
    title: "Action Feed",
    url: createPageUrl("ActionFeed"),
    icon: Recycle,
    description: "See what others are up to"
  },
  {
    title: "Impact Visualizer",
    url: createPageUrl("Impact"),
    icon: BarChart3,
    description: "See your impact come to life"
  },
  {
    title: "AP Environmental Science",
    url: createPageUrl("APES"),
    icon: BookOpen,
    description: "Get a 5 on the AP Exam"
  }
];

export default function Layout({ children, currentPageName }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const userData = await User.me();
      setUser(userData);
    } catch {
      // console.log("User not logged in");
    }
    setIsLoading(false);
  };

  const handleBuyXp = async () => {
    const cost = 20;
    const xpGain = 10;
    const currentCoins = user.treecoins || 0;

    if (currentCoins < cost) {
      alert("Not enough Treecoins!");
      return;
    }

    let newXp = (user.xp || 0) + xpGain;
    let newLevel = user.eco_level || 1;
    let newXpToNextLevel = user.xp_to_next_level || 100;

    if (newXp >= newXpToNextLevel) {
      newLevel += 1;
      newXp -= newXpToNextLevel;
      newXpToNextLevel = Math.floor(newXpToNextLevel * 1.5);
      alert(`Congratulations! You've reached Eco Level ${newLevel}!`);
    }

    const newTreecoins = currentCoins - cost;

    try {
      await User.updateMyUserData({
        treecoins: newTreecoins,
        xp: newXp,
        eco_level: newLevel,
        xp_to_next_level: newXpToNextLevel
      });
      // Update local state immediately for instant feedback
      setUser(prev => ({
        ...prev,
        treecoins: newTreecoins,
        xp: newXp,
        eco_level: newLevel,
        xp_to_next_level: newXpToNextLevel
      }));
    } catch {
      alert("Failed to purchase XP. Please try again.");
    }
  };

  const handleLogin = async () => {
      await User.login();
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-teal-50 to-green-50 flex items-center justify-center">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-teal-600 font-medium">Loading Ecoisland...</span>
        </div>
      </div>
    );
  }

  if (user && !user.onboarding_complete && currentPageName !== 'Onboarding') {
    navigate(createPageUrl('Onboarding'));
    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-teal-50 to-green-50 flex items-center justify-center">
            <div className="flex items-center gap-3">
                <div className="w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full animate-spin"></div>
                <span className="text-teal-600 font-medium">Loading your profile...</span>
            </div>
        </div>
    );
  }

  if (currentPageName === 'Onboarding') {
    return children;
  }

  if (!user) {
    navigate(createPageUrl('Onboarding'));
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-teal-50 to-green-50 flex items-center justify-center">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-teal-600 font-medium">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${'bg-gradient-to-br from-blue-50 via-teal-50 to-green-50'}`}>
      <style>{`
      `}</style>

      <header className={`sticky top-0 z-50 ${'bg-white/80'} backdrop-blur-sm border-b ${'border-gray-200/50'}`}>
        <div className="max-w-8xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link to={createPageUrl("Dashboard")} className="flex items-center gap-3">
              <img
                src="/ecoisland.png"
                alt="Ecoisland"
                className="w-10 h-10"
              />
              <div className="hidden sm:block">
                <h1 className={`font-bold text-xl ${'text-gray-900'}`}>Ecoisland</h1>
                <p className={`text-xs ${'text-gray-500'}`}>All for a greener future</p>
              </div>
            </Link>

            <div className="hidden md:flex items-center gap-4 flex-1 max-w-md mx-8">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search for anything..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={`pl-10 ${'border-gray-200/50 bg-white/50'}`}
                />
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="hidden md:flex items-center gap-4">
                <div className="text-right">
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-bold text-teal-600">{user.treecoins || 0}</span>
                    <Leaf className="w-4 h-4 text-green-500" />
                  </div>
                  <p className={`text-xs ${'text-gray-500'}`}>Treecoins</p>
                </div>
                <Link to={createPageUrl("Leaderboard")}>
                  <Button variant="outline" size="icon" className={`${'border-teal-200 hover:bg-teal-50'}`}>
                    <Trophy className="w-4 h-4" />
                  </Button>
                </Link>
                <Link to={createPageUrl("Settings")}>
                  <Button variant="outline" size="icon" className={`${'border-teal-200 hover:bg-teal-50'}`}>
                    <Settings className="w-4 h-4" />
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className={`hidden md:block fixed left-0 top-0 pt-20 h-full w-80 ${'bg-white/80'} backdrop-blur-sm border-r ${'border-gray-200/50'} z-40`}>
        <nav className="p-6 space-y-2 h-full overflow-y-auto flex flex-col">
          {navigationItems.map((item) => (
            <Link
              key={item.title}
              to={item.url}
              className={`flex items-center gap-4 p-4 rounded-xl transition-all duration-200 ${
                location.pathname === item.url
                  ? 'bg-gradient-to-r from-teal-100 to-green-100 text-teal-700 shadow-sm'
                  : 'hover:bg-gray-50'
              }`}
            >
              <item.icon className="w-5 h-5" />
              <div>
                <p className={`font-medium ${''}`}>{item.title}</p>
                <p className={`text-xs ${'text-gray-500'}`}>{item.description}</p>
              </div>
            </Link>
          ))}

          <div className={`pt-6 mt-6 border-t ${'border-gray-200'} !mt-auto`}>
            <LevelUpBar
              currentXp={user.xp || 0}
              xpToNextLevel={user.xp_to_next_level || 100}
              onBuyXp={handleBuyXp}
              treecoins={user.treecoins}
            />
          </div>
        </nav>
      </div>

      {/* Main Content */}
      <main className="md:ml-80">
        <div className="min-h-screen">
         {children}
        </div>
      </main>
    </div>
  );
}
