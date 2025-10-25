// @ts-nocheck
import React, { useState, useEffect } from "react";
import { User } from "@/entities/User";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Trophy, Medal, Award, Crown, Leaf, TrendingUp, Globe } from "lucide-react";

export default function Leaderboard() {
  const [users, setUsers] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [userData, allUsers] = await Promise.all([User.me(), User.list("-treecoins", 100)]);
      setCurrentUser(userData);
      setUsers(allUsers);
    } catch (e) {
      setError("Could not load leaderboard data. Please try again later.");
    } finally {
      setIsLoading(false);
    }
  };

  const getRankIcon = (rank) => {
    if (rank === 1) return <Crown className="w-6 h-6 text-yellow-500" />;
    if (rank === 2) return <Trophy className="w-6 h-6 text-gray-400" />;
    if (rank === 3) return <Medal className="w-6 h-6 text-orange-500" />;
    return <span className="text-lg font-bold text-gray-500">#{rank}</span>;
  };

  const getVerificationBadge = (status) => {
    if (status === "ambassador") return <Badge className="bg-purple-100 text-purple-700">Ambassador</Badge>;
    if (status === "verified") return <Badge className="bg-blue-100 text-blue-700">Verified</Badge>;
    return null;
  };

  const testUsers = [
    {
      id: "test-gold",
      username: "Lizzie Fletcher",
      avatar_url: "https://files.catbox.moe/3i5hsk.png",
      state: "Houston, Texas",
      country: "USA",
      treecoins: 1000,
      eco_level: 12,
      verification_status: "verified",
      placement: "gold",
    },
    {
      id: "test-silver",
      username: "Sal Khan",
      avatar_url: "https://files.catbox.moe/k57zvd.avif",
      state: "California",
      country: "USA",
      treecoins: 750,
      eco_level: 8,
      verification_status: null,
      placement: "silver",
    },
    {
      id: "test-bronze",
      username: "Cristiano Ronaldo",
      avatar_url: "https://files.catbox.moe/gsq33m.png",
      state: "Riyadh",
      country: "Saudi Arabia",
      treecoins: 500,
      eco_level: 5,
      verification_status: null,
      placement: "bronze",
    },
    {
      id: "test-none",
      username: "Aaron Qin",
      avatar_url: null,
      state: "Texas",
      country: "USA",
      treecoins: 250,
      eco_level: 3,
      verification_status: null,
      placement: "none",
    },
  ];

  if (isLoading) {
    return (
      <div className="p-8 bg-gray-50">
        <div className="max-w-4xl mx-auto space-y-4">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="animate-pulse bg-gray-200 h-20 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 text-center bg-gray-50 text-red-600">
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 bg-gray-50">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900">Global Leaderboard</h1>
          <p className="text-gray-600 mt-2">See how you rank among Ecoislanders worldwide</p>
        </div>

        <Tabs defaultValue="treecoins" className="w-full">
          <TabsList className="grid w-full grid-cols-4 bg-gray-100">
            <TabsTrigger value="treecoins">
              <Leaf className="w-4 h-4 mr-2" />
              All-Time Treecoins
            </TabsTrigger>
            <TabsTrigger value="level">
              <TrendingUp className="w-4 h-4 mr-2" />
              Level
            </TabsTrigger>
            <TabsTrigger value="regional">
              <Globe className="w-4 h-4 mr-2" />
              Regional
            </TabsTrigger>
            <TabsTrigger value="ambassadors">
              <Award className="w-4 h-4 mr-2" />
              Ambassadors
            </TabsTrigger>
          </TabsList>

          <TabsContent value="treecoins" className="space-y-4 mt-4">
            {users.map((user, index) => (
              <Card
                key={user.id}
                className={`transition-all duration-300 hover:shadow-lg ${
                  currentUser?.id === user.id ? "bg-gradient-to-r from-teal-50 to-green-50 border-teal-200" : "bg-white"
                }`}
              >
                <CardContent className="p-4 md:p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-br from-teal-100 to-green-100">
                        {getRankIcon(index + 1)}
                      </div>

                      <Avatar className="w-12 h-12">
                        <AvatarImage src={user.avatar_url} />
                        <AvatarFallback className="bg-gradient-to-br from-teal-500 to-green-500 text-white">
                          {user.username?.[0]?.toUpperCase() || "U"}
                        </AvatarFallback>
                      </Avatar>

                      <div>
                        <h3 className="font-bold text-gray-900">{user.username}</h3>
                        <p className="text-sm text-gray-500">
                          {user.state}, {user.country}
                        </p>
                        {getVerificationBadge(user.verification_status)}
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl font-bold text-teal-600">{user.treecoins || 0}</span>
                        <Leaf className="w-5 h-5 text-green-500" />
                      </div>
                      <p className="text-sm text-gray-500">Level {user.eco_level || 1}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="level" className="space-y-4 mt-4">
            {users
              .slice()
              .sort((a, b) => (b.eco_level || 1) - (a.eco_level || 1))
              .map((user, index) => (
                <Card
                  key={user.id}
                  className={`transition-all duration-300 hover:shadow-lg ${
                    currentUser?.id === user.id ? "bg-gradient-to-r from-purple-50 to-pink-50 border-purple-200" : "bg-white"
                  }`}
                >
                  <CardContent className="p-4 md:p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-br from-purple-100 to-pink-100">
                          {getRankIcon(index + 1)}
                        </div>

                        <Avatar className="w-12 h-12">
                          <AvatarImage src={user.avatar_url} />
                          <AvatarFallback className="bg-gradient-to-br from-purple-500 to-pink-500 text-white">
                            {user.username?.[0]?.toUpperCase() || "U"}
                          </AvatarFallback>
                        </Avatar>

                        <div>
                          <h3 className="font-bold text-gray-900">{user.username}</h3>
                          <p className="text-sm text-gray-500">
                            {user.state}, {user.country}
                          </p>
                          {getVerificationBadge(user.verification_status)}
                        </div>
                      </div>

                      <div className="text-right">
                        <p className="text-2xl font-bold text-purple-600">Level {user.eco_level || 1}</p>
                        <p className="text-sm text-gray-500">{user.treecoins || 0} Treecoins</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
          </TabsContent>

          <TabsContent value="regional" className="space-y-4 mt-4">
            <div className="text-center py-12 text-gray-400">
              <Globe className="w-16 h-16 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-600 mb-2">Regional Rankings</h3>
              <p>Coming soon! See how you and your area rank globally.</p>
            </div>
          </TabsContent>

          <TabsContent value="ambassadors" className="space-y-4 mt-4">
            {users.filter((u) => u.verification_status === "ambassador").map((user) => (
              <Card key={user.id} className="bg-gradient-to-r from-purple-50 to-indigo-50 border-purple-200">
                <CardContent className="p-4 md:p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <Award className="w-8 h-8 text-purple-500" />

                      <Avatar className="w-12 h-12">
                        <AvatarImage src={user.avatar_url} />
                        <AvatarFallback className="bg-gradient-to-br from-purple-500 to-indigo-500 text-white">
                          {user.username?.[0]?.toUpperCase() || "U"}
                        </AvatarFallback>
                      </Avatar>

                      <div>
                        <h3 className="font-bold text-gray-900">{user.username}</h3>
                        <p className="text-sm text-gray-500">{user.state}, {user.country}</p>
                        <Badge className="bg-purple-100 text-purple-700">Ecoisland Ambassador</Badge>
                      </div>
                    </div>

                    <div className="text-right">
                      <p className="text-xl font-bold text-purple-600">{user.treecoins || 0} Treecoins</p>
                      <p className="text-sm text-gray-500">Level {user.eco_level || 1}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}

            {users.filter((u) => u.verification_status === "ambassador").length === 0 && (
              <div className="text-center py-12 text-gray-400">
                <Award className="w-16 h-16 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-600 mb-2">No Ambassadors Yet</h3>
                <p>Ambassadors are trusted leaders in the Ecoisland community. <br /> Apply in Settings!</p>
              </div>
            )}
          </TabsContent>
        </Tabs>

        <div className="mt-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Admin Test Placements (Gold / Silver / Bronze / None)</h2>

          <div className="flex gap-4 mb-4">
            <button
              className="px-4 py-2 rounded bg-teal-600 text-white hover:opacity-90"
              onClick={() => {
                setUsers(testUsers);
                setCurrentUser(testUsers[0]);
              }}
              data-test="fill-test-users"
            >
              Fill Test Users
            </button>

            <button
              className="px-4 py-2 rounded bg-gray-200 text-gray-800 hover:opacity-90"
              onClick={() => {
                setUsers([]);
                setCurrentUser(null);
              }}
              data-test="clear-test-users"
            >
              Clear
            </button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-2 gap-4">
            {testUsers.map((u) => (
              <Card key={u.id} className="bg-white">
                <CardContent>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center justify-center w-14 h-14 rounded-full bg-gray-100">
                      <Avatar className="w-12 h-12">
                        <AvatarImage src={u.avatar_url} />
                        <AvatarFallback className="bg-gradient-to-br from-gray-400 to-gray-600 text-white">
                          {u.username?.[0]?.toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    </div>

                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-bold">{u.username}</h4>
                          <p className="text-sm text-gray-500">{u.state}, {u.country}</p>
                        </div>

                        <div className="text-right">
                          <p className="font-bold">{u.treecoins} Treecoins</p>
                          <p className="text-xs text-gray-500">Level {u.eco_level}</p>
                        </div>
                      </div>

                      <div className="mt-3">
                        {u.placement === "gold" && (
                          <Badge className="bg-yellow-100 text-yellow-800">Gold Placement</Badge>
                        )}
                        {u.placement === "silver" && (
                          <Badge className="bg-gray-100 text-gray-800">Silver Placement</Badge>
                        )}
                        {u.placement === "bronze" && (
                          <Badge className="bg-orange-100 text-orange-800">Bronze Placement</Badge>
                        )}
                        {u.placement === "none" && (
                          <Badge className="bg-red-50 text-red-700">No Placement</Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
