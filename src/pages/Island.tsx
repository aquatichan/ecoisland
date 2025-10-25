// @ts-nocheck
import React, { useState, useEffect } from "react";
import { User } from "@/entities/User";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Coins,
  ShoppingCart,
  Mountain,
  Cloud,
  Sun,
  CloudRain,
  Sunset,
  Leaf,
  Settings,
  Trash2,
  Wind,
  Gem,
} from "lucide-react";
import Galaxy from "../components/Galaxy";

const islandItems = [
  { id: "skybox_basic", name: "Basic Skybox", cost: 5, category: "skybox", icon: Cloud, description: "Simple, sky blue (no gradient)", color: "bg-blue-100 text-blue-700" },
  { id: "skybox_rainy", name: "Rainy Sky", cost: 10, category: "skybox", icon: CloudRain, description: "Gloomy, gray skies with a foggy blur (no gradient)", color: "bg-gray-100 text-gray-700" },
  { id: "skybox_sunny", name: "Sunny Sky", cost: 15, category: "skybox", icon: Sun, description: "Sunny gradient with bright blue skies", color: "bg-yellow-100 text-yellow-700" },
  { id: "skybox_sunset", name: "Beautiful Sunset", cost: 30, category: "skybox", icon: Sunset, description: "Stunning sunset with golden, orange, and pink hues", color: "bg-orange-100 text-orange-700" },

  { id: "island_grass", name: "Grass Island", cost: 5, category: "island", icon: Leaf, description: "The starter island, lush and green for a tranquil experience", color: "bg-green-100 text-green-700" },
  { id: "island_volcanic", name: "Volcanic Island", cost: 50, category: "island", icon: Mountain, description: "A dramatic volcanic island, for the experienced", color: "bg-red-100 text-red-700" },

  { id: "forest_small", name: "Small Forest", cost: 10, category: "decoration", icon: Leaf, description: "An elaborate arrangement of small trees for a sonder vibe", color: "bg-emerald-100 text-emerald-700" },
  { id: "windmill", name: "Wind Turbine", cost: 10, category: "decoration", icon: Wind, description: "Animated wind turbine generating clean energy", color: "bg-blue-100 text-blue-700" },
  { id: "solar_panel", name: "Solar Array", cost: 15, category: "decoration", icon: Sun, description: "Harness the power of the sun (comes with a shine effect)", color: "bg-yellow-100 text-yellow-700" },
  { id: "waterfall", name: "Crystal Waterfall", cost: 20, category: "decoration", icon: Gem, description: "A waterfall flowing down your island for a serene vibe", color: "bg-cyan-100 text-cyan-700" },
];

export default function Island() {
  const [user, setUser] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [message, setMessage] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeSkybox, setActiveSkybox] = useState("space");
  const [activeIsland, setActiveIsland] = useState("none");
  const [activeDecorations, setActiveDecorations] = useState([]);

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const userData = await User.me();
      setUser(userData);

      if (userData.island_items) {
        const skybox = userData.island_items.find((item) => item.item_type === "skybox" && item.active);
        const island = userData.island_items.find((item) => item.item_type === "island" && item.active);
        const decorations = userData.island_items.filter((item) => item.item_type === "decoration" && item.active);

        setActiveSkybox(skybox?.item_id || "space");
        setActiveIsland(island?.item_id || "none");
        setActiveDecorations(decorations.map((d) => d.item_id));
      }
    } catch (error) {
      console.error("Error loading user:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const purchaseItem = async (item) => {
    const currentBalance = user.treecoins || 0;

    if (currentBalance < item.cost) {
      setMessage({ type: "error", text: `Not enough Treecoins! You need ${item.cost} but only have ${currentBalance}.` });
      setTimeout(() => setMessage(null), 10000);
      return;
    }

    const alreadyOwned = user.island_items?.some((owned) => owned.item_id === item.id);
    if (alreadyOwned) {
      setMessage({ type: "error", text: "You already own this item!" });
      setTimeout(() => setMessage(null), 10000);
      return;
    }

    try {
      const newTreecoins = currentBalance - item.cost;
      const newIslandItems = [
        ...(user.island_items || []),
        {
          item_id: item.id,
          item_name: item.name,
          item_type: item.category,
          cost: item.cost,
          active: false,
          purchased_date: new Date().toISOString(),
        },
      ];

      await User.updateMyUserData({ treecoins: newTreecoins, island_items: newIslandItems });

      setUser((prev) => ({ ...prev, treecoins: newTreecoins, island_items: newIslandItems }));
      setMessage({ type: "success", text: `Successfully purchased ${item.name}!` });
      setTimeout(() => setMessage(null), 10000);
    } catch {
      setMessage({ type: "error", text: "Failed to purchase item. Please try again." });
      setTimeout(() => setMessage(null), 10000);
    }
  };

  const sellItem = async (itemIdToSell) => {
    const itemToSell = user.island_items.find((i) => i.item_id === itemIdToSell);
    if (!itemToSell) return;

    const refundAmount = Math.ceil(itemToSell.cost / 2);
    const newTreecoins = (user.treecoins || 0) + refundAmount;
    const newIslandItems = user.island_items.filter((i) => i.item_id !== itemIdToSell);

    try {
      await User.updateMyUserData({ treecoins: newTreecoins, island_items: newIslandItems });

      const updatedUser = { ...user, treecoins: newTreecoins, island_items: newIslandItems };
      setUser(updatedUser);

      const skybox = newIslandItems.find((item) => item.item_type === "skybox" && item.active);
      const island = newIslandItems.find((item) => item.item_type === "island" && item.active);
      const decorations = newIslandItems.filter((item) => item.item_type === "decoration" && item.active);

      setActiveSkybox(skybox?.item_id || "space");
      setActiveIsland(island?.item_id || "none");
      setActiveDecorations(decorations.map((d) => d.item_id));

      setMessage({ type: "success", text: `Sold ${itemToSell.item_name} for ${refundAmount} Treecoins!` });
      setTimeout(() => setMessage(null), 10000);
    } catch {
      setMessage({ type: "error", text: "Failed to sell item. Please try again." });
      setTimeout(() => setMessage(null), 10000);
    }
  };

  const toggleItemActive = async (itemId, itemType) => {
    const updatedItems = [...(user.island_items || [])];

    if (itemType === "skybox" || itemType === "island") {
      updatedItems.forEach((item) => {
        if (item.item_type === itemType) item.active = item.item_id === itemId;
      });
    } else if (itemType === "decoration") {
      const activeDecorations = updatedItems.filter((item) => item.item_type === "decoration" && item.active);
      const targetItem = updatedItems.find((item) => item.item_id === itemId);

      if (targetItem.active) {
        targetItem.active = false;
      } else if (activeDecorations.length < 3) {
        targetItem.active = true;
      } else {
        setMessage({ type: "error", text: "You can only have 3 decorations active at once!" });
        setTimeout(() => setMessage(null), 3000);
        return;
      }
    }

    try {
      await User.updateMyUserData({ island_items: updatedItems });
      const updatedUser = { ...user, island_items: updatedItems };
      setUser(updatedUser);

      const newActiveSkybox = updatedItems.find((item) => item.item_type === "skybox" && item.active)?.item_id || "space";
      const newActiveIsland = updatedItems.find((item) => item.item_type === "island" && item.active)?.item_id || "none";
      const newActiveDecorations = updatedItems.filter((item) => item.item_type === "decoration" && item.active).map((d) => d.item_id);

      setActiveSkybox(newActiveSkybox);
      setActiveIsland(newActiveIsland);
      setActiveDecorations(newActiveDecorations);
    } catch {
      setMessage({ type: "error", text: "Failed to update item. Please try again." });
    }
  };

  const categories = ["all", "skybox", "island", "decoration"];
  const filteredItems = selectedCategory === "all" ? islandItems : islandItems.filter((item) => item.category === selectedCategory);

  const isItemOwned = (itemId) => user?.island_items?.some((owned) => owned.item_id === itemId) || false;
  const isItemActive = (itemId) => user?.island_items?.some((owned) => owned.item_id === itemId && owned.active) || false;

  const getIslandBackground = () => {
    if (activeSkybox === "skybox_sunset") return "bg-gradient-to-b from-orange-400 via-pink-400 to-purple-500";
    if (activeSkybox === "skybox_rainy") return "bg-gradient-to-b from-gray-300 to-gray-300";
    if (activeSkybox === "skybox_sunny") return "bg-gradient-to-b from-blue-300 via-blue-300 to-blue-200";
    if (activeSkybox === "skybox_basic") return "bg-gradient-to-b from-blue-400 to-blue-400";
    return "bg-gradient-to-b from-black via-gray-900 to-black"; // Space
  };

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="max-w-4xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-8 rounded w-1/3 bg-gray-200" />
            <div className="h-24 rounded-xl bg-gray-200" />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-48 rounded-xl bg-gray-200" />)}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 bg-gray-50">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900">View Your Island</h1>
            <p className="text-gray-600 mt-2">Customize your virtual ecoisland with earned Treecoins</p>
          </div>

          <div className="flex items-center gap-4">
            <div className="rounded-xl p-4 bg-gradient-to-r from-teal-100 to-green-100">
              <div className="flex items-center gap-3">
                <Coins className="w-6 h-6 text-teal-600" />
                <div>
                  <p className="text-2xl font-bold text-teal-700">{user?.treecoins || 250}</p>
                  <p className="text-sm text-gray-600">Treecoins</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <Card className="mb-8 border-0 overflow-hidden bg-gradient-to-br from-blue-100 via-teal-50 to-green-100">
          <CardHeader>
            <CardTitle className="flex items-center justify-center gap-3 text-xl font-bold text-gray-900">View Your Island</CardTitle>
            <CardTitle className="flex items-center justify-center gap-3 text-sm font-bold text-gray-500">You can't have an island in space...</CardTitle>
          </CardHeader>

          <CardContent>
            <div className={`${getIslandBackground()} rounded-xl p-0 min-h-[500px] relative overflow-hidden transition-colors duration-500`}>
              {activeSkybox === "space" && (
                <div style={{ width: "100%", height: 500, position: "relative" }}>
                  <Galaxy mouseRepulsion mouseInteraction density={1.5} glowIntensity={0.5} saturation={0.8} hueShift={240} />
                </div>
              )}

              <div className="relative z-10 flex flex-col items-center justify-center h-full">
                {activeIsland !== "none" && (
                  <div className="absolute -bottom-150 flex flex-col items-center w-full">
                    {activeIsland === "island_grass" && (
                      <div className="w-200 h-50 bg-gradient-to-b from-green-400 to-green-800 rounded-full relative shadow-2xl" />
                    )}
                    {activeIsland === "island_volcanic" && (
                      <div className="w-200 h-50 bg-gradient-to-b from-red-500 via-gray-800 to-gray-800 rounded-full relative shadow-2xl" />
                    )}

                    <div className="absolute inset-0 flex items-center justify-center gap-4 mt-4">
                      {activeDecorations.slice(0, 3).map((decorationId, index) => {
                        const decoration = islandItems.find((item) => item.id === decorationId);
                        return decoration ? (
                          <div key={decorationId} className="bg-white/20 backdrop-blur-sm rounded-lg p-2 animate-bounce -translate-y-32" style={{ animationDelay: `${index * 0.2}s` }}>
                            <decoration.icon className="w-6 h-6 text-white" />
                          </div>
                        ) : null;
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {user?.island_items?.length > 0 && (
          <Card className="mb-8 bg-gradient-to-r from-green-50 to-teal-50 border-green-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-green-600">
                <Settings className="w-6 h-6 text-green-600" />
                My Items - Customize Your Island
              </CardTitle>
            </CardHeader>

            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {["skybox", "island", "decoration"].map((category) => (
                  <div key={category}>
                    <h4 className="font-semibold mb-2 capitalize text-gray-700">
                      {category === "decoration" ? "Decorations" : category === "skybox" ? "Skyboxes" : `${category}s`}
                    </h4>
                    <div className="space-y-2">
                      {user.island_items.filter((item) => item.item_type === category).map((item) => (
                        <Button
                          key={item.item_id}
                          variant={isItemActive(item.item_id) ? "default" : "outline"}
                          onClick={() => toggleItemActive(item.item_id, item.item_type)}
                          className={`w-full justify-start ${isItemActive(item.item_id) ? "bg-gradient-to-r from-teal-500 to-green-500 text-white" : "hover:bg-gray-100"}`}
                        >
                          {item.item_name}
                        </Button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Category Filters */}
        <div className="flex flex-wrap gap-2 mb-6">
          {categories.map((category) => (
            <Button
              key={category}
              variant={selectedCategory === category ? "default" : "outline"}
              onClick={() => setSelectedCategory(category)}
              className={selectedCategory === category ? "bg-gradient-to-r from-teal-500 to-green-500 text-white" : "hover:bg-teal-50"}
            >
              {category.charAt(0).toUpperCase() + category.slice(1)}
            </Button>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredItems.map((item) => {
            const owned = isItemOwned(item.id);
            const canAfford = user && (user.treecoins || 0) >= item.cost;

            return (
              <Card key={item.id} className={`transition-all duration-300 ${owned ? "bg-green-50 border-green-200" : "hover:shadow-lg"}`}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${item.color}`}>
                      <item.icon />
                    </div>

                    <Badge variant="secondary" className="bg-teal-100 text-teal-700">{item.category}</Badge>
                  </div>

                  <CardTitle className="text-lg text-gray-900">{item.name}</CardTitle>
                </CardHeader>

                <CardContent className="space-y-4">
                  <p className="text-sm text-gray-600">{item.description}</p>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Coins className="w-4 h-4 text-teal-600" />
                      <span className="font-bold text-teal-700">{item.cost}</span>
                    </div>

                    {owned ? (
                      <Button onClick={() => sellItem(item.id)} variant="destructive" size="sm">
                        <Trash2 className="w-4 h-4 mr-2" />
                        Sell ({Math.ceil(item.cost / 2)} 🌱)
                      </Button>
                    ) : (
                      <Button
                        onClick={() => purchaseItem(item)}
                        disabled={!canAfford}
                        size="sm"
                        className={canAfford ? "bg-gradient-to-r from-teal-500 to-green-500 hover:from-teal-600 hover:to-green-600" : "opacity-50 cursor-not-allowed"}
                      >
                        <ShoppingCart className="w-4 h-4 mr-2" />
                        {canAfford ? "Buy" : "Can't Afford"}
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {filteredItems.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">No items found in this category.</p>
          </div>
        )}
      </div>
    </div>
  );
}
