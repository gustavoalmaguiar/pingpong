"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { Medal, Crown, Lock, ChevronRight, Trophy, Flame, Target, Sparkles } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

interface Achievement {
  key: string;
  name: string;
  description: string;
  icon: string;
  xpReward: number;
  tier: "bronze" | "silver" | "gold" | "platinum";
  id?: string;
  earned: boolean;
  earnedAt?: Date;
}

interface LeaderboardEntry {
  playerId: string;
  playerName: string;
  playerAvatarUrl: string | null;
  playerLevel: number;
  achievementCount: number;
}

interface PlayerStats {
  matchesWon: number;
  matchesPlayed: number;
  bestStreak: number;
  elo: number;
  level: number;
}

interface AchievementsClientProps {
  achievements: Achievement[];
  leaderboard: LeaderboardEntry[];
  currentPlayerId?: string;
  currentPlayerStats: PlayerStats | null;
  totalAchievements: number;
  earnedCount: number;
}

const TIER_CONFIG = {
  bronze: {
    color: "#cd7f32",
    bg: "bg-[#cd7f32]/10",
    border: "border-[#cd7f32]/30",
    glow: "shadow-[0_0_20px_rgba(205,127,50,0.15)]",
    text: "text-[#cd7f32]",
  },
  silver: {
    color: "#c0c0c0",
    bg: "bg-[#c0c0c0]/10",
    border: "border-[#c0c0c0]/30",
    glow: "shadow-[0_0_20px_rgba(192,192,192,0.15)]",
    text: "text-[#c0c0c0]",
  },
  gold: {
    color: "#ffd700",
    bg: "bg-[#ffd700]/10",
    border: "border-[#ffd700]/30",
    glow: "shadow-[0_0_20px_rgba(255,215,0,0.2)]",
    text: "text-[#ffd700]",
  },
  platinum: {
    color: "#e5e4e2",
    bg: "bg-[#e5e4e2]/10",
    border: "border-[#e5e4e2]/30",
    glow: "shadow-[0_0_25px_rgba(229,228,226,0.2)]",
    text: "text-[#e5e4e2]",
  },
};

const CATEGORIES = [
  {
    name: "Win Milestones",
    icon: Trophy,
    keys: ["first_win", "wins_10", "wins_25", "wins_50", "wins_100", "wins_250"],
    accent: "#10b981",
  },
  {
    name: "Streak Masters",
    icon: Flame,
    keys: ["streak_3", "streak_5", "streak_10", "streak_20"],
    accent: "#f59e0b",
  },
  {
    name: "ELO Rankings",
    icon: Target,
    keys: ["elo_1100", "elo_1200", "elo_1400", "elo_1600"],
    accent: "#6366f1",
  },
  {
    name: "Special",
    icon: Sparkles,
    keys: ["perfect_game", "level_10", "level_25", "matches_100"],
    accent: "#ec4899",
  },
];

function getProgress(key: string, stats: PlayerStats | null): { current: number; target: number } | null {
  if (!stats) return null;

  // Win milestones
  if (key === "first_win") return { current: stats.matchesWon, target: 1 };
  if (key.startsWith("wins_")) {
    const target = parseInt(key.replace("wins_", ""));
    return { current: stats.matchesWon, target };
  }

  // Streaks
  if (key.startsWith("streak_")) {
    const target = parseInt(key.replace("streak_", ""));
    return { current: stats.bestStreak, target };
  }

  // ELO
  if (key.startsWith("elo_")) {
    const target = parseInt(key.replace("elo_", ""));
    return { current: stats.elo, target };
  }

  // Levels
  if (key.startsWith("level_")) {
    const target = parseInt(key.replace("level_", ""));
    return { current: stats.level, target };
  }

  // Matches played
  if (key === "matches_100") {
    return { current: stats.matchesPlayed, target: 100 };
  }

  return null;
}

function ProgressRing({ progress, size = 120, strokeWidth = 8 }: { progress: number; size?: number; strokeWidth?: number }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (progress / 100) * circumference;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      {/* Background ring */}
      <svg className="absolute inset-0 -rotate-90" width={size} height={size}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#1a1a1a"
          strokeWidth={strokeWidth}
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="url(#progressGradient)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.2, ease: "easeOut", delay: 0.3 }}
        />
        <defs>
          <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#ffd700" />
            <stop offset="50%" stopColor="#c0c0c0" />
            <stop offset="100%" stopColor="#cd7f32" />
          </linearGradient>
        </defs>
      </svg>
      {/* Center content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <motion.span
          className="text-2xl font-bold text-white"
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.5, duration: 0.3 }}
        >
          {Math.round(progress)}%
        </motion.span>
        <span className="text-[10px] uppercase tracking-wider text-[#525252]">Complete</span>
      </div>
    </div>
  );
}

function AchievementCard({
  achievement,
  stats,
  delay,
}: {
  achievement: Achievement;
  stats: PlayerStats | null;
  delay: number;
}) {
  const tier = TIER_CONFIG[achievement.tier];
  const progress = getProgress(achievement.key, stats);
  const progressPercent = progress ? Math.min((progress.current / progress.target) * 100, 100) : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      whileHover={{ scale: achievement.earned ? 1.02 : 1, y: achievement.earned ? -2 : 0 }}
      className={cn(
        "group relative overflow-hidden rounded-xl border p-4 transition-all duration-300",
        achievement.earned
          ? cn(tier.border, tier.glow, "bg-[#0a0a0a]")
          : "border-[#1a1a1a] bg-[#0a0a0a]/60"
      )}
    >
      {/* Locked overlay */}
      {!achievement.earned && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/40 backdrop-blur-[1px]">
          <Lock className="h-5 w-5 text-[#404040]" />
        </div>
      )}

      {/* Tier glow effect for earned */}
      {achievement.earned && (
        <div
          className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full opacity-20 blur-2xl"
          style={{ backgroundColor: tier.color }}
        />
      )}

      <div className={cn("relative", !achievement.earned && "opacity-40 grayscale")}>
        {/* Icon */}
        <div className="mb-3 text-3xl">{achievement.icon}</div>

        {/* Name & Description */}
        <h3 className="font-semibold text-white">{achievement.name}</h3>
        <p className="mt-1 text-xs leading-relaxed text-[#737373]">{achievement.description}</p>

        {/* Progress bar for incomplete */}
        {!achievement.earned && progress && (
          <div className="mt-3">
            <div className="h-1 w-full overflow-hidden rounded-full bg-[#1a1a1a]">
              <motion.div
                className="h-full rounded-full bg-white/30"
                initial={{ width: 0 }}
                animate={{ width: `${progressPercent}%` }}
                transition={{ duration: 0.6, delay: delay + 0.2 }}
              />
            </div>
            <p className="mt-1 text-right text-[9px] text-[#525252]">
              {progress.current.toLocaleString()} / {progress.target.toLocaleString()}
            </p>
          </div>
        )}

        {/* Footer: Tier badge + XP */}
        <div className="mt-3 flex items-center justify-between">
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider",
              tier.bg,
              tier.text
            )}
          >
            {achievement.tier}
          </span>
          <span className="text-[10px] text-[#525252]">+{achievement.xpReward} XP</span>
        </div>
      </div>
    </motion.div>
  );
}

function CategorySection({
  category,
  achievements,
  stats,
  baseDelay,
}: {
  category: typeof CATEGORIES[0];
  achievements: Achievement[];
  stats: PlayerStats | null;
  baseDelay: number;
}) {
  const CategoryIcon = category.icon;
  const earnedInCategory = achievements.filter((a) => a.earned).length;

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.4, delay: baseDelay }}
      className="relative"
    >
      {/* Category accent line */}
      <div
        className="absolute bottom-0 left-0 top-0 w-0.5 rounded-full"
        style={{ backgroundColor: category.accent, opacity: 0.5 }}
      />

      <div className="pl-5">
        {/* Category header */}
        <div className="mb-4 flex items-center gap-3">
          <div
            className="flex h-8 w-8 items-center justify-center rounded-lg"
            style={{ backgroundColor: `${category.accent}15` }}
          >
            <CategoryIcon className="h-4 w-4" style={{ color: category.accent }} />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-white">{category.name}</h2>
            <p className="text-[10px] text-[#525252]">
              {earnedInCategory}/{achievements.length} unlocked
            </p>
          </div>
        </div>

        {/* Achievement grid */}
        <div className="grid gap-3 sm:grid-cols-2">
          {achievements.map((achievement, index) => (
            <AchievementCard
              key={achievement.key}
              achievement={achievement}
              stats={stats}
              delay={baseDelay + 0.05 + index * 0.05}
            />
          ))}
        </div>
      </div>
    </motion.div>
  );
}

function TopCollectors({
  leaderboard,
  currentPlayerId,
}: {
  leaderboard: LeaderboardEntry[];
  currentPlayerId?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
      className="sticky top-6 rounded-xl border border-[#1a1a1a] bg-[#0a0a0a]"
    >
      {/* Header */}
      <div className="flex items-center gap-2.5 border-b border-[#1a1a1a] px-5 py-4">
        <Crown className="h-4 w-4 text-[#ffd700]" />
        <h2 className="text-sm font-medium tracking-wide text-white">Top Collectors</h2>
      </div>

      {/* List */}
      <div className="divide-y divide-[#1a1a1a]/50">
        {leaderboard.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10">
            <Medal className="mb-3 h-8 w-8 text-[#262626]" />
            <p className="text-sm text-[#525252]">No achievements yet</p>
            <p className="mt-1 text-[11px] text-[#404040]">Be the first to earn one!</p>
          </div>
        ) : (
          leaderboard.map((entry, index) => (
            <motion.div
              key={entry.playerId}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: 0.3 + index * 0.05 }}
            >
              <Link
                href={`/players/${entry.playerId}`}
                className={cn(
                  "flex items-center gap-3 px-5 py-3 transition-colors hover:bg-[#111]",
                  entry.playerId === currentPlayerId && "bg-white/[0.02]"
                )}
              >
                {/* Rank */}
                <span
                  className={cn(
                    "w-5 font-mono text-sm font-bold",
                    index === 0 && "text-[#ffd700]",
                    index === 1 && "text-[#c0c0c0]",
                    index === 2 && "text-[#cd7f32]",
                    index > 2 && "text-[#525252]"
                  )}
                >
                  {index + 1}
                </span>

                {/* Avatar */}
                <Avatar className="h-8 w-8 border border-[#262626]">
                  <AvatarImage src={entry.playerAvatarUrl || undefined} />
                  <AvatarFallback className="bg-[#1a1a1a] text-xs">
                    {entry.playerName.charAt(0)}
                  </AvatarFallback>
                </Avatar>

                {/* Name & Level */}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-white">{entry.playerName}</p>
                  <p className="text-[10px] text-[#525252]">Level {entry.playerLevel}</p>
                </div>

                {/* Achievement count */}
                <div className="flex items-center gap-1.5">
                  <Medal className="h-3.5 w-3.5 text-[#ffd700]" />
                  <span className="font-mono text-sm font-bold text-white">
                    {entry.achievementCount}
                  </span>
                </div>

                <ChevronRight className="h-4 w-4 text-[#333] transition-colors group-hover:text-[#525252]" />
              </Link>
            </motion.div>
          ))
        )}
      </div>
    </motion.div>
  );
}

export function AchievementsClient({
  achievements,
  leaderboard,
  currentPlayerId,
  currentPlayerStats,
  totalAchievements,
  earnedCount,
}: AchievementsClientProps) {
  const progressPercent = (earnedCount / totalAchievements) * 100;

  return (
    <div className="min-h-screen bg-black p-6 md:p-8">
      <div className="mx-auto max-w-6xl space-y-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex flex-col items-center gap-6 rounded-2xl border border-[#1a1a1a] bg-[#0a0a0a] p-8 md:flex-row md:justify-between"
        >
          {/* Title section */}
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-[#ffd700]/20 to-[#cd7f32]/20">
              <Medal className="h-6 w-6 text-[#ffd700]" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-white">Achievements</h1>
              <p className="text-sm text-[#737373]">
                {earnedCount} of {totalAchievements} unlocked
              </p>
            </div>
          </div>

          {/* Progress ring */}
          <ProgressRing progress={progressPercent} />
        </motion.div>

        {/* Main content */}
        <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
          {/* Categories */}
          <div className="space-y-10">
            {CATEGORIES.map((category, categoryIndex) => {
              const categoryAchievements = achievements.filter((a) =>
                category.keys.includes(a.key)
              );
              return (
                <CategorySection
                  key={category.name}
                  category={category}
                  achievements={categoryAchievements}
                  stats={currentPlayerStats}
                  baseDelay={0.1 + categoryIndex * 0.15}
                />
              );
            })}
          </div>

          {/* Sidebar */}
          <div className="lg:block">
            <TopCollectors leaderboard={leaderboard} currentPlayerId={currentPlayerId} />
          </div>
        </div>
      </div>
    </div>
  );
}
