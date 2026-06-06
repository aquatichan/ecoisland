// @ts-nocheck
import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { User } from "@/entities/User";
import { Trophy, Crown, Medal, Award, Leaf, TrendingUp, Globe, TreePine, Loader2, Star } from "lucide-react";
import UserProfileModal from "@/components/UserProfileModal";

const TABS = [
  { key: "treecoins", label: "Treecoins", icon: TreePine, color: "#00c896" },
  { key: "level", label: "Level", icon: TrendingUp, color: "#8b5cf6" },
  { key: "ambassadors", label: "Ambassadors", icon: Award, color: "#f59e0b" },
];

function RankIcon({ rank }) {
  if (rank === 1) return <Crown className="w-5 h-5 text-amber-400" />;
  if (rank === 2) return <Trophy className="w-5 h-5 text-slate-400" />;
  if (rank === 3) return <Medal className="w-5 h-5 text-amber-600" />;
  return <span className="text-sm font-black text-slate-400">#{rank}</span>;
}

function UserRow({ user, rank, currentUserId, valueKey, valueSuffix, valueColor, onViewProfile }) {
  const isMe = user.id === currentUserId;
  const initials = (user.username || user.full_name || "U")[0]?.toUpperCase();

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(rank * 0.04, 0.5) }}
      className="flex items-center gap-4 p-4 rounded-2xl transition-all cursor-pointer hover:shadow-md"
      style={{
        background: isMe ? "rgba(0,200,150,0.06)" : rank <= 3 ? "rgba(245,158,11,0.04)" : "var(--bg-page)",
        border: isMe ? "2px solid rgba(0,200,150,0.3)" : rank <= 3 ? "2px solid rgba(245,158,11,0.15)" : "0px solid transparent",
      }}
      onClick={() => !isMe && onViewProfile(user.id)}
      title={isMe ? "This is you" : `View ${user.username || user.full_name}'s profile`}
    >
      {/* Rank */}
      <div className="w-10 flex items-center justify-center flex-shrink-0">
        <RankIcon rank={rank} />
      </div>

      {/* Avatar */}
      <div className="w-11 h-11 rounded-xl overflow-hidden flex-shrink-0 flex items-center justify-center font-black text-white text-base"
        style={{ background: isMe ? "linear-gradient(135deg, #00c896, #06b6d4)" : `hsl(${(rank * 47) % 360}, 60%, 50%)` }}>
        {user.avatar_url ? <img src={user.avatar_url} alt="" className="w-full h-full object-cover" /> : initials}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-black text-slate-800 text-sm truncate">{user.username || user.full_name || "Unknown"}</p>
          {isMe && <span className="text-xs font-bold px-2 py-0.5 rounded-full text-emerald-700 bg-emerald-100">You</span>}
          {user.verification_status === "ambassador" && <span className="text-xs font-bold px-2 py-0.5 rounded-full text-amber-700 bg-amber-100">Ambassador</span>}
          {user.verification_status === "verified" && <span className="text-xs font-bold px-2 py-0.5 rounded-full text-blue-700 bg-blue-100">Verified</span>}
        </div>
        <p className="text-xs text-slate-400">{[user.city, user.country].filter(Boolean).join(", ") || "Global"}</p>
      </div>

      {/* Value */}
      <div className="text-right flex-shrink-0">
        <div className="text-xl font-black" style={{ color: valueColor }}>{user[valueKey] ?? 0}</div>
        <div className="text-xs text-slate-400">{valueSuffix}</div>
      </div>
    </motion.div>
  );
}

export default function Leaderboard() {
  const [users, setUsers] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [tab, setTab] = useState("treecoins");
  const [profileUserId, setProfileUserId] = useState(null);

  useEffect(() => {
    async function load() {
      setIsLoading(true);
      try {
        const [me, all] = await Promise.all([User.me(), User.list("-treecoins", 100)]);
        setCurrentUser(me);
        setUsers(all);
      } catch { setUsers([]); }
      finally { setIsLoading(false); }
    }
    load();
  }, []);

  const sorted = {
    treecoins: [...users].sort((a, b) => (b.treecoins || 0) - (a.treecoins || 0)),
    level: [...users].sort((a, b) => (b.eco_level || 1) - (a.eco_level || 1)),
    ambassadors: users.filter(u => u.verification_status === "ambassador"),
  };

  const myRankTc = sorted.treecoins.findIndex(u => u.id === currentUser?.id) + 1;

  return (
    <div className="min-h-screen p-4 md:p-8" style={{ background: "var(--bg-page)" }}>
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4" style={{ background: "linear-gradient(135deg, #f59e0b, #f97316)", boxShadow: "0 8px 24px rgba(245,158,11,0.3)" }}>
            <Trophy className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl md:text-4xl font-black text-slate-900 mb-2" style={{ letterSpacing: "-0.03em" }}>Global Leaderboard</h1>
          <p className="text-slate-500">See how you rank among Ecoislanders worldwide · click any row to view their profile</p>
          {currentUser && myRankTc > 0 && (
            <div className="inline-flex items-center gap-2 mt-3 px-4 py-2 rounded-xl text-sm font-bold text-emerald-700" style={{ background: "rgba(0,200,150,0.1)", border: "2px solid rgba(0,200,150,0.2)" }}>
              <Star className="w-4 h-4" /> Your Rank: #{myRankTc} · {currentUser.treecoins || 0} Treecoins
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 mb-5 p-1 rounded-xl" style={{ background: "var(--bg-card)", border: "2px solid var(--border-card)" }}>
          {TABS.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-sm font-bold transition-all"
              style={tab === t.key ? { background: t.color, color: "white" } : { color: "#64748b" }}
            >
              <t.icon className="w-4 h-4" />
              <span className="hidden sm:inline">{t.label}</span>
            </button>
          ))}
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-emerald-400" /></div>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div key={tab} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-2">
              {tab === "treecoins" && sorted.treecoins.map((u, i) => (
                <UserRow key={u.id} user={u} rank={i + 1} currentUserId={currentUser?.id} valueKey="treecoins" valueSuffix="Treecoins" valueColor="#00c896" onViewProfile={setProfileUserId} />
              ))}
              {tab === "level" && sorted.level.map((u, i) => (
                <UserRow key={u.id} user={u} rank={i + 1} currentUserId={currentUser?.id} valueKey="eco_level" valueSuffix="Level" valueColor="#8b5cf6" onViewProfile={setProfileUserId} />
              ))}
              {tab === "ambassadors" && (
                sorted.ambassadors.length === 0 ? (
                  <div className="eco-card p-12 text-center">
                    <Award className="w-14 h-14 text-slate-200 mx-auto mb-4" />
                    <p className="font-bold text-slate-400 mb-1">No Ambassadors Yet</p>
                    <p className="text-slate-400 text-sm">Ambassadors are trusted community leaders. Apply in Settings!</p>
                  </div>
                ) : sorted.ambassadors.map((u, i) => (
                  <UserRow key={u.id} user={u} rank={i + 1} currentUserId={currentUser?.id} valueKey="treecoins" valueSuffix="Treecoins" valueColor="#f59e0b" onViewProfile={setProfileUserId} />
                ))
              )}
              {(tab === "treecoins" || tab === "level") && sorted[tab].length === 0 && (
                <div className="eco-card p-12 text-center">
                  <Trophy className="w-14 h-14 text-slate-200 mx-auto mb-4" />
                  <p className="text-slate-400 text-sm">No users to show yet. Be the first to log eco-actions!</p>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        )}
      </div>

      {/* User Profile Modal */}
      <UserProfileModal
        userId={profileUserId}
        onClose={() => setProfileUserId(null)}
      />
    </div>
  );
}
