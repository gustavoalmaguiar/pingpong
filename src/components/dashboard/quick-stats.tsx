"use client";

import { motion } from "framer-motion";
import { Flame, TrendingUp, TrendingDown, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { xpToNextLevel } from "@/lib/xp";

interface QuickStatsProps {
  rank: number;
  totalPlayers: number;
  elo: number;
  eloChange: number;
  currentStreak: number;
  recentForm: ("W" | "L")[];
  xp: number;
  level: number;
}

export function QuickStats({
  rank,
  totalPlayers,
  elo,
  eloChange,
  currentStreak,
  recentForm,
  xp,
  level,
}: QuickStatsProps) {
  const { progress, xpInCurrentLevel, xpNeededForNext } = xpToNextLevel(xp);
  const isOnFire = currentStreak >= 3;
  const isTopRank = rank <= 3;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="relative overflow-hidden rounded-xl border border-[#1a1a1a] bg-[#0a0a0a] p-6"
    >
      {/* Background glow for top players */}
      {isTopRank && (
        <div
          className="pointer-events-none absolute inset-0 opacity-30"
          style={{
            background: `radial-gradient(ellipse at top, ${
              rank === 1 ? "rgba(255,215,0,0.1)" : rank === 2 ? "rgba(192,192,192,0.1)" : "rgba(205,127,50,0.1)"
            }, transparent 70%)`,
          }}
        />
      )}

      <div className="relative grid grid-cols-2 gap-6 md:grid-cols-5">
        {/* Rank */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className="flex flex-col"
        >
          <span className="text-[10px] font-medium uppercase tracking-[0.2em] text-[#525252]">
            Rank
          </span>
          <div className="mt-1 flex items-baseline gap-1">
            <span
              className={cn(
                "font-mono text-4xl font-bold",
                rank === 1 && "text-[#ffd700] text-glow",
                rank === 2 && "text-[#c0c0c0]",
                rank === 3 && "text-[#cd7f32]",
                rank > 3 && "text-white"
              )}
            >
              #{rank}
            </span>
            <span className="text-sm text-[#525252]">/ {totalPlayers}</span>
          </div>
        </motion.div>

        {/* ELO */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.15 }}
          className="flex flex-col"
        >
          <span className="text-[10px] font-medium uppercase tracking-[0.2em] text-[#525252]">
            ELO Rating
          </span>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="font-mono text-4xl font-bold text-white">{elo}</span>
            {eloChange !== 0 && (
              <span
                className={cn(
                  "flex items-center gap-0.5 font-mono text-sm",
                  eloChange > 0 ? "text-emerald-500" : "text-red-500"
                )}
              >
                {eloChange > 0 ? (
                  <TrendingUp className="h-3 w-3" />
                ) : (
                  <TrendingDown className="h-3 w-3" />
                )}
                {eloChange > 0 ? "+" : ""}
                {eloChange}
              </span>
            )}
          </div>
        </motion.div>

        {/* Streak */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="flex flex-col"
        >
          <span className="text-[10px] font-medium uppercase tracking-[0.2em] text-[#525252]">
            Streak
          </span>
          <div className="mt-1 flex items-center gap-2">
            {isOnFire ? (
              <motion.div
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 0.5, repeat: Infinity }}
              >
                <Flame className="h-6 w-6 text-orange-500" />
              </motion.div>
            ) : (
              <Zap className="h-6 w-6 text-[#525252]" />
            )}
            <span
              className={cn(
                "font-mono text-4xl font-bold",
                isOnFire ? "text-orange-500" : "text-white"
              )}
            >
              {currentStreak}
            </span>
            <span className="text-sm text-[#525252]">wins</span>
          </div>
        </motion.div>

        {/* Recent Form */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.25 }}
          className="flex flex-col"
        >
          <span className="text-[10px] font-medium uppercase tracking-[0.2em] text-[#525252]">
            Recent Form
          </span>
          <div className="mt-2 flex items-center gap-1.5">
            {recentForm.slice(0, 5).map((result, i) => (
              <motion.div
                key={i}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.3 + i * 0.05 }}
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-md font-mono text-sm font-bold",
                  result === "W"
                    ? "bg-emerald-500/20 text-emerald-500"
                    : "bg-red-500/20 text-red-500"
                )}
              >
                {result}
              </motion.div>
            ))}
            {recentForm.length === 0 && (
              <span className="text-sm text-[#525252]">No matches yet</span>
            )}
          </div>
        </motion.div>

        {/* Level & XP */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 }}
          className="flex flex-col"
        >
          <span className="text-[10px] font-medium uppercase tracking-[0.2em] text-[#525252]">
            Level
          </span>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="font-mono text-4xl font-bold text-white">{level}</span>
          </div>
          <div className="mt-2 space-y-1">
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#1a1a1a]">
              <motion.div
                className="h-full rounded-full bg-white"
                initial={{ width: 0 }}
                animate={{ width: `${progress * 100}%` }}
                transition={{ duration: 0.8, delay: 0.4 }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-[#525252]">
              <span>{xpInCurrentLevel} XP</span>
              <span>{xpNeededForNext} XP</span>
            </div>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}
