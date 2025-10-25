import React from "react";
import { Progress } from "@/components/ui/progress";
import { TrendingUp, Sparkles } from "lucide-react";

export default function LevelUpBar({ currentXp, xpToNextLevel, onBuyXp, isDark, treecoins }) {
  const progressPercentage = (currentXp / xpToNextLevel) * 100;

  return (
    <div className={"p-4 rounded-xl " + (isDark ? 'bg-slate-700/50' : 'bg-green-50')}>
      <div className="flex justify-between items-center mb-2">
        <h4 className={"font-semibold flex items-center gap-2 " + (isDark ? 'text-white' : 'text-gray-900')}>
            <TrendingUp className="w-4 h-5 text-teal-600"/>
            Level Up
        </h4>
        <span className={"text-sm font-medium " + (isDark ? 'text-gray-300' : 'text-gray-600')}>
          {currentXp} / {xpToNextLevel} XP
        </span>
      </div>
      <Progress value={progressPercentage} className="h-3" />
      <div className="mt-3 text-center">
        <button 
          onClick={onBuyXp} 
          disabled={(treecoins || 0) < 20}
          className="text-xs inline-flex items-center gap-1 text-teal-500 hover:text-teal-600 disabled:opacity-50 disabled:cursor-not-allowed transition"
        >
          <Sparkles className="w-3 h-3"/>
          Buy 10 XP for 20 Treecoins
        </button>
      </div>
    </div>
  );
}