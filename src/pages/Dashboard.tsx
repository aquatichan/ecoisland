// @ts-nocheck
import React, { useState, useEffect } from "react";
import { User } from "@/entities/User";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  Palmtree,
  Leaf,
  Globe,
  Camera,
  Recycle,
  BarChart3,
  ArrowRight,
  Sparkles,
  Trophy,
  Users,
  TrendingUp,
  Rocket,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const dashboardTiles = [
  {
    title: "Your Island",
    description: "Customize your Ecoisland with earned Treecoins!",
    icon: Palmtree,
    url: "Island",
    gradient: "from-teal-600 to-orange-400",
    bgGradient: "from-teal-100 to-orange-100",
  },
  {
    title: "Carbon Footprint",
    description: "Track and reduce your environmental footprint!",
    icon: Leaf,
    url: "CarbonFootprint",
    gradient: "from-emerald-500 to-purple-500",
    bgGradient: "from-emerald-100 to-purple-100",
  },
  {
    title: "Regional Data",
    description: "Explore local sustainability insights and take action!",
    icon: Globe,
    url: "RegionalData",
    gradient: "from-cyan-500 to-pink-500",
    bgGradient: "from-cyan-100 to-pink-100",
  },
  {
    title: "Danger Scan",
    description: "Report environmental issues with AI image recognition!",
    icon: Camera,
    url: "DangerScan",
    gradient: "from-gray-500 to-red-600",
    bgGradient: "from-gray-100 to-red-100",
  },
  {
    title: "Action Feed",
    description: "Join the community through environmental initiatives!",
    icon: Recycle,
    url: "ActionFeed",
    gradient: "from-green-600 to-blue-400",
    bgGradient: "from-green-100 to-blue-100",
  },
  {
    title: "Impact Visualizer",
    description: "See your progress and contributions come to life!",
    icon: BarChart3,
    url: "Impact",
    gradient: "from-yellow-500 to-pink-400",
    bgGradient: "from-yellow-50 to-pink-50",
  },
];

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      const userData = await User.me();
      setUser(userData);
      setIsLoading(false);
    };

    loadData();
    window.addEventListener("focus", loadData);

    return () => {
      window.removeEventListener("focus", loadData);
    };
  }, []);

  const weightUnit = user?.preferences?.weight_unit || "kg";

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="max-w-6xl mx-auto">
          <div className="animate-pulse space-y-8">
            <div className="h-8 bg-gray-200 rounded w-1/3" />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-48 bg-gray-200 rounded-xl" />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 bg-gray-50 text-gray-900">
      <div className="max-w-6xl mx-auto">
        {/* Welcome Section */}
        <div className="mb-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-gray-900">
                Welcome back, {user?.username || "unknown"}!
              </h1>
              <p className="text-gray-600 mt-2">
                Ready to make a positive impact on our planet today?
              </p>
            </div>

            <div className="flex items-center gap-4">
              <div className="text-right">
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-bold text-teal-600">
                    {user?.treecoins || 0}
                  </span>
                  <Leaf className="w-5 h-5 text-green-500" />
                </div>
                <p className="text-sm text-gray-500">Treecoins available</p>
              </div>

              <Badge variant="secondary" className="bg-green-100 text-green-700">
                Level {user?.eco_level || 1}
              </Badge>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {dashboardTiles.map((tile) => (
            <Link key={tile.title} to={createPageUrl(tile.url)}>
              <Card className="group hover:shadow-xl transition-all duration-300 cursor-pointer transform hover:-translate-y-1 border-0 overflow-hidden">
                <div className={`bg-gradient-to-br ${tile.bgGradient} p-1 rounded-xl`}>
                  <CardHeader className="bg-white/90 text-gray-900 backdrop-blur-sm rounded-t-lg p-6">
                    <div className="flex items-center justify-between">
                      <div className={`w-12 h-12 bg-gradient-to-br ${tile.gradient} rounded-xl flex items-center justify-center shadow-lg`}>
                        <tile.icon className="w-6 h-6 text-white" />
                      </div>
                      <ArrowRight className="text-gray-400 group-hover:text-gray-600 w-5 h-5 transition-colors" />
                    </div>
                    <CardTitle className="text-xl font-bold mt-4 text-gray-900">{tile.title}</CardTitle>
                  </CardHeader>
                  <CardContent className="bg-white/90 text-gray-600 backdrop-blur-sm rounded-b-lg p-6 pt-2">
                    <p className="text-sm leading-relaxed text-gray-600">{tile.description}</p>
                    <div className="mt-4 flex items-center gap-2 text-sm">
                      <Sparkles className="w-4 h-4 text-teal-500" />
                      <span className="text-teal-600 font-medium">Start exploring</span>
                    </div>
                  </CardContent>
                </div>
              </Card>
            </Link>
          ))}
        </div>

        <div className="mt-12">
          <Card className="bg-gradient-to-r from-teal-50 to-green-50 border-teal-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-teal-600">
                <Rocket className="w-6 h-6 text-teal-600" />
                "How can I get started?"
              </CardTitle>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white/60 rounded-lg p-4">
                  <h4 className="font-semibold mb-2 text-gray-900">⛰ Build Your Island</h4>
                  <p className="text-sm text-gray-600">
                    Purchase your first Ecoisland and begin customizing with effects, decorations, and more!
                  </p>
                </div>

                <div className="bg-white/60 rounded-lg p-4">
                  <h4 className="font-semibold mb-2 text-gray-900">💪 Track Your Impact</h4>
                  <p className="text-sm text-gray-600">
                    Log your daily activities to see your carbon footprint and earn more Treecoins through sustainable choices!
                  </p>
                </div>

                <div className="bg-white/60 rounded-lg p-4">
                  <h4 className="font-semibold mb-2 text-gray-900">👥 Join the Community</h4>
                  <p className="text-sm text-gray-600">
                    Share environmental news in the Action Feed and connect with fellow Ecoislanders!
                  </p>
                </div>

                <div className="bg-white/60 rounded-lg p-4">
                  <h4 className="font-semibold mb-2 text-gray-900">📍 Explore Locally</h4>
                  <p className="text-sm text-gray-600">
                    Check out your region's sustainability data and seek ways to make a difference!
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
