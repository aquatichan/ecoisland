// @ts-nocheck
import React from "react";
import { TrendingUp, Sparkles, TreePine } from "lucide-react";

interface LevelUpBarProps {
  currentXp?: number;
  xpToNextLevel?: number;
  treecoins?: number;
  onBuyXp?: () => void;
}

export default function LevelUpBar({ currentXp = 0, xpToNextLevel = 100, treecoins = 0, onBuyXp }: LevelUpBarProps) {
  const pct = Math.min((currentXp / (xpToNextLevel || 100)) * 100, 100);

  return (
    <div className="space-y-3">
      {/* XP bar */}
      <div>
        <div className="flex justify-between items-center mb-1.5">
          <span className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
            <TrendingUp className="w-3.5 h-3.5 text-emerald-400" /> Progress
          </span>
          <span className="text-xs text-slate-500">{currentXp} / {xpToNextLevel} XP</span>
        </div>
        <div className="h-2 rounded-full bg-white/10 overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{ width: `${pct}%`, background: "linear-gradient(90deg, #00c896, #06b6d4)" }}
          />
        </div>
      </div>

      {/* Treecoins + buy XP */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <TreePine className="w-3.5 h-3.5 text-emerald-400" />
          <span className="text-xs font-bold text-emerald-300">{treecoins} TC</span>
        </div>
        <button
          onClick={onBuyXp}
          disabled={treecoins < 20}
          className="flex items-center gap-1 text-xs font-medium transition-all disabled:opacity-30 disabled:cursor-not-allowed"
          style={{ color: treecoins >= 20 ? "#00c896" : "#64748b" }}
        >
          <Sparkles className="w-3 h-3" /> Buy 10 XP (20 TC)
        </button>
      </div>
    </div>
  );
}
