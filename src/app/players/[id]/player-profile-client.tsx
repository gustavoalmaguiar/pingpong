"use client";

import { useState, useTransition } from "react";
import { motion } from "framer-motion";
import {
  Trophy,
  Target,
  Flame,
  Zap,
  TrendingUp,
  Swords,
  User,
  Users,
  ChevronRight,
  Edit3,
  Loader2,
} from "lucide-react";
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { xpToNextLevel, getLevelTier } from "@/lib/xp";
import { formatDistanceToNow } from "@/lib/format";
import { EditProfileModal } from "@/components/profile/edit-profile-modal";
import { createChallenge } from "@/actions/challenges";
import { toast } from "sonner";

interface Player {
  id: string;
  displayName: string;
  elo: number;
  xp: number;
  level: number;
  matchesPlayed: number;
  matchesWon: number;
  currentStreak: number;
  bestStreak: number;
  avatarUrl: string | null;
  createdAt: Date;
}

interface Match {
  id: string;
  type: "singles" | "doubles";
  winnerId: string | null;
  loserId: string | null;
  winnerTeamP1: string | null;
  winnerTeamP2: string | null;
  loserTeamP1: string | null;
  loserTeamP2: string | null;
  winnerScore: number;
  loserScore: number;
  eloChange: number;
  playedAt: Date;
}

interface HeadToHeadRecord {
  wins: number;
  losses: number;
  player: {
    id: string;
    displayName: string;
    elo: number;
    avatarUrl: string | null;
  };
}

interface Achievement {
  id: string;
  key: string;
  name: string;
  description: string;
  icon: string;
  xpReward: number;
  tier: "bronze" | "silver" | "gold" | "platinum";
}

interface PlayerAchievement {
  id: string;
  playerId: string;
  achievementId: string;
  earnedAt: Date;
  achievement?: Achievement;
}

interface PlayerProfileClientProps {
  player: Player;
  rank: number;
  totalPlayers: number;
  matches: Match[];
  headToHeadRecords: HeadToHeadRecord[];
  isOwnProfile: boolean;
  currentPlayerId?: string;
  achievements: PlayerAchievement[];
  allAchievements: Achievement[];
}

export function PlayerProfileClient({
  player,
  rank,
  totalPlayers,
  matches,
  headToHeadRecords,
  isOwnProfile,
  currentPlayerId,
  achievements,
  allAchievements,
}: PlayerProfileClientProps) {
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const { progress, xpInCurrentLevel, xpNeededForNext } = xpToNextLevel(player.xp);

  const handleChallenge = () => {
    if (!currentPlayerId) {
      toast.error("You need to be logged in to challenge");
      return;
    }

    startTransition(async () => {
      try {
        await createChallenge(player.id);
        toast.success(`Challenge sent to ${player.displayName}!`);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to send challenge");
      }
    });
  };
  const levelTier = getLevelTier(player.level);
  const winRate = player.matchesPlayed > 0
    ? Math.round((player.matchesWon / player.matchesPlayed) * 100)
    : 0;
  const losses = player.matchesPlayed - player.matchesWon;

  const stats = [
    {
      label: "Rank",
      value: `#${rank}`,
      icon: Trophy,
      highlight: rank <= 3,
      color: rank === 1 ? "text-[#ffd700]" : rank === 2 ? "text-[#c0c0c0]" : rank === 3 ? "text-[#cd7f32]" : "text-white",
    },
    { label: "ELO", value: player.elo, icon: Target, highlight: player.elo >= 1400 },
    { label: "Wins", value: player.matchesWon, icon: TrendingUp, color: "text-emerald-500" },
    { label: "Losses", value: losses, color: "text-red-500" },
    { label: "Win Rate", value: `${winRate}%`, highlight: winRate >= 60 },
    { label: "Streak", value: player.currentStreak, icon: Flame, highlight: player.currentStreak >= 3, color: player.currentStreak >= 3 ? "text-orange-500" : undefined },
    { label: "Best Streak", value: player.bestStreak, icon: Zap },
    { label: "Total XP", value: player.xp.toLocaleString() },
  ];

  return (
    <div className="min-h-screen bg-black p-6 md:p-8">
      <div className="mx-auto max-w-5xl space-y-8">
        {/* Hero Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-2xl border border-[#1a1a1a] bg-[#0a0a0a] p-8"
        >
          {/* Background glow */}
          {rank <= 3 && (
            <div
              className="pointer-events-none absolute inset-0 opacity-20"
              style={{
                background: `radial-gradient(ellipse at top left, ${
                  rank === 1 ? "rgba(255,215,0,0.2)" : rank === 2 ? "rgba(192,192,192,0.2)" : "rgba(205,127,50,0.2)"
                }, transparent 60%)`,
              }}
            />
          )}

          <div className="relative flex flex-col items-center gap-6 md:flex-row md:items-start">
            {/* Avatar */}
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="relative"
            >
              <Avatar className="h-32 w-32 border-2 border-[#262626]">
                <AvatarImage src={player.avatarUrl || undefined} />
                <AvatarFallback className="bg-[#1a1a1a] text-3xl">
                  {player.displayName.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              {/* Level badge */}
              <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-white px-3 py-1 text-xs font-bold text-black">
                Lv.{player.level}
              </div>
            </motion.div>

            {/* Info */}
            <div className="flex-1 text-center md:text-left">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
              >
                <h1 className="text-3xl font-bold tracking-tight text-white">
                  {player.displayName}
                </h1>
                <p className="mt-1 text-sm text-[#525252]">
                  {levelTier.name} • Joined {formatDistanceToNow(player.createdAt)}
                </p>
              </motion.div>

              {/* XP Progress */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="mt-4 max-w-xs md:max-w-sm"
              >
                <div className="flex items-center justify-between text-xs text-[#525252]">
                  <span>Level {player.level}</span>
                  <span>Level {player.level + 1}</span>
                </div>
                <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-[#1a1a1a]">
                  <motion.div
                    className="h-full rounded-full bg-white"
                    initial={{ width: 0 }}
                    animate={{ width: `${progress * 100}%` }}
                    transition={{ duration: 0.8, delay: 0.3 }}
                  />
                </div>
                <p className="mt-1 text-right text-[10px] text-[#525252]">
                  {xpInCurrentLevel} / {xpNeededForNext} XP
                </p>
              </motion.div>
            </div>

            {/* Action Button */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.25 }}
            >
              {isOwnProfile ? (
                <Button
                  variant="outline"
                  onClick={() => setIsEditModalOpen(true)}
                  className="border-[#262626] bg-transparent text-white hover:bg-[#1a1a1a]"
                >
                  <Edit3 className="mr-2 h-4 w-4" />
                  Edit Profile
                </Button>
              ) : (
                <Button
                  className="bg-white text-black hover:bg-[#e5e5e5]"
                  onClick={handleChallenge}
                  disabled={isPending}
                >
                  {isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Swords className="mr-2 h-4 w-4" />
                  )}
                  {isPending ? "Sending..." : "Challenge"}
                </Button>
              )}
            </motion.div>
          </div>
        </motion.div>

        {/* Stats Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-2 gap-4 md:grid-cols-4"
        >
          {stats.map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.15 + index * 0.03 }}
              className={cn(
                "rounded-xl border border-[#1a1a1a] bg-[#0a0a0a] p-4",
                stat.highlight && "glow-subtle"
              )}
            >
              <div className="flex items-center gap-2 text-[10px] font-medium uppercase tracking-[0.15em] text-[#525252]">
                {stat.icon && <stat.icon className="h-3 w-3" />}
                {stat.label}
              </div>
              <p
                className={cn(
                  "mt-1 font-mono text-2xl font-bold",
                  stat.color || "text-white"
                )}
              >
                {stat.value}
              </p>
            </motion.div>
          ))}
        </motion.div>

        <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
          {/* Match History */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="overflow-hidden rounded-xl border border-[#1a1a1a] bg-[#0a0a0a]"
          >
            <div className="border-b border-[#1a1a1a] px-5 py-4">
              <h2 className="text-sm font-medium tracking-wide">Match History</h2>
            </div>
            <div className="divide-y divide-[#1a1a1a]/50">
              {matches.slice(0, 10).map((match, index) => {
                const isWinner = match.type === "singles"
                  ? match.winnerId === player.id
                  : match.winnerTeamP1 === player.id || match.winnerTeamP2 === player.id;

                return (
                  <motion.div
                    key={match.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.25 + index * 0.03 }}
                    className="flex items-center gap-4 px-5 py-3"
                  >
                    {/* Result indicator */}
                    <div
                      className={cn(
                        "flex h-8 w-8 items-center justify-center rounded-lg font-mono text-sm font-bold",
                        isWinner
                          ? "bg-emerald-500/20 text-emerald-500"
                          : "bg-red-500/20 text-red-500"
                      )}
                    >
                      {isWinner ? "W" : "L"}
                    </div>

                    {/* Match type */}
                    <div className="flex h-6 w-6 items-center justify-center rounded bg-[#1a1a1a]">
                      {match.type === "singles" ? (
                        <User className="h-3 w-3 text-[#525252]" />
                      ) : (
                        <Users className="h-3 w-3 text-[#525252]" />
                      )}
                    </div>

                    {/* Score */}
                    <div className="flex-1">
                      <div className="font-mono text-sm">
                        <span className={isWinner ? "text-white font-bold" : "text-[#525252]"}>
                          {isWinner ? match.winnerScore : match.loserScore}
                        </span>
                        <span className="mx-1 text-[#333]">-</span>
                        <span className={!isWinner ? "text-white font-bold" : "text-[#525252]"}>
                          {isWinner ? match.loserScore : match.winnerScore}
                        </span>
                      </div>
                    </div>

                    {/* ELO change */}
                    <span
                      className={cn(
                        "font-mono text-sm",
                        isWinner ? "text-emerald-500" : "text-red-500"
                      )}
                    >
                      {isWinner ? "+" : "-"}{match.eloChange}
                    </span>

                    {/* Time */}
                    <span className="text-[10px] text-[#525252]">
                      {formatDistanceToNow(match.playedAt)}
                    </span>
                  </motion.div>
                );
              })}

              {matches.length === 0 && (
                <div className="px-5 py-12 text-center text-sm text-[#525252]">
                  No matches yet
                </div>
              )}
            </div>
          </motion.div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Head to Head */}
            {headToHeadRecords.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="overflow-hidden rounded-xl border border-[#1a1a1a] bg-[#0a0a0a]"
              >
                <div className="border-b border-[#1a1a1a] px-5 py-4">
                  <h2 className="text-sm font-medium tracking-wide">Head to Head</h2>
                </div>
                <div className="divide-y divide-[#1a1a1a]/50">
                  {headToHeadRecords.map((record, index) => (
                    <motion.div
                      key={record.player.id}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.35 + index * 0.05 }}
                    >
                      <Link
                        href={`/players/${record.player.id}`}
                        className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-[#111]"
                      >
                        <Avatar className="h-8 w-8 border border-[#262626]">
                          <AvatarImage src={record.player.avatarUrl || undefined} />
                          <AvatarFallback className="bg-[#1a1a1a] text-xs">
                            {record.player.displayName.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="truncate text-sm text-[#a3a3a3]">
                            {record.player.displayName}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 font-mono text-sm">
                          <span className="text-emerald-500">{record.wins}</span>
                          <span className="text-[#333]">-</span>
                          <span className="text-red-500">{record.losses}</span>
                        </div>
                        <ChevronRight className="h-4 w-4 text-[#333]" />
                      </Link>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Achievements */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="overflow-hidden rounded-xl border border-[#1a1a1a] bg-[#0a0a0a]"
            >
              <div className="flex items-center justify-between border-b border-[#1a1a1a] px-5 py-4">
                <h2 className="text-sm font-medium tracking-wide">Achievements</h2>
                <span className="text-xs text-[#525252]">
                  {achievements.length}/{allAchievements.length}
                </span>
              </div>
              <div className="p-4">
                {achievements.length > 0 ? (
                  <div className="grid grid-cols-4 gap-3">
                    {achievements.map((pa, index) => (
                      <motion.div
                        key={pa.id}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.45 + index * 0.05 }}
                        className="group relative"
                      >
                        <div
                          className={cn(
                            "flex h-12 w-12 items-center justify-center rounded-lg text-xl transition-all group-hover:scale-110",
                            pa.achievement?.tier === "bronze" && "bg-[#cd7f32]/20",
                            pa.achievement?.tier === "silver" && "bg-[#c0c0c0]/20",
                            pa.achievement?.tier === "gold" && "bg-[#ffd700]/20",
                            pa.achievement?.tier === "platinum" && "bg-gradient-to-br from-cyan-500/20 to-blue-500/20"
                          )}
                        >
                          {pa.achievement?.icon}
                        </div>
                        {/* Tooltip */}
                        <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 -translate-x-1/2 opacity-0 transition-opacity group-hover:opacity-100">
                          <div className="whitespace-nowrap rounded-lg bg-[#1a1a1a] px-3 py-2 text-center shadow-lg">
                            <p className="text-xs font-medium text-white">{pa.achievement?.name}</p>
                            <p className="mt-0.5 text-[10px] text-[#737373]">{pa.achievement?.description}</p>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <div className="py-6 text-center text-sm text-[#525252]">
                    No achievements yet
                  </div>
                )}

                {/* Show locked achievements preview */}
                {allAchievements.length > achievements.length && (
                  <div className="mt-4 border-t border-[#1a1a1a] pt-4">
                    <p className="mb-3 text-[10px] font-medium uppercase tracking-wider text-[#525252]">
                      Locked
                    </p>
                    <div className="grid grid-cols-4 gap-3">
                      {allAchievements
                        .filter((a) => !achievements.find((pa) => pa.achievementId === a.id))
                        .slice(0, 8)
                        .map((achievement) => (
                          <div
                            key={achievement.id}
                            className="group relative"
                          >
                            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-[#1a1a1a]/50 text-xl opacity-30 grayscale transition-all group-hover:opacity-50">
                              {achievement.icon}
                            </div>
                            {/* Tooltip */}
                            <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 -translate-x-1/2 opacity-0 transition-opacity group-hover:opacity-100">
                              <div className="whitespace-nowrap rounded-lg bg-[#1a1a1a] px-3 py-2 text-center shadow-lg">
                                <p className="text-xs font-medium text-white">{achievement.name}</p>
                                <p className="mt-0.5 text-[10px] text-[#737373]">{achievement.description}</p>
                              </div>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Edit Profile Modal */}
      {isOwnProfile && (
        <EditProfileModal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          player={{
            displayName: player.displayName,
            avatarUrl: player.avatarUrl,
          }}
        />
      )}
    </div>
  );
}
