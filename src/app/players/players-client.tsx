"use client";

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import {
  Users,
  Search,
  Trophy,
  Flame,
  TrendingUp,
  ArrowUpDown,
  Zap,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getLevelTier } from "@/lib/xp";

interface Player {
  id: string;
  userId: string;
  slug: string;
  displayName: string;
  elo: number;
  xp: number;
  level: number;
  matchesPlayed: number;
  matchesWon: number;
  currentStreak: number;
  bestStreak: number;
  avatarUrl: string | null;
}

type SortOption = "elo" | "wins" | "level" | "name" | "winRate";

const sortOptions: { value: SortOption; label: string }[] = [
  { value: "elo", label: "ELO Rating" },
  { value: "wins", label: "Total Wins" },
  { value: "winRate", label: "Win Rate" },
  { value: "level", label: "Level" },
  { value: "name", label: "Name" },
];

export function PlayersClient({ players }: { players: Player[] }) {
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("elo");
  const [sortAsc, setSortAsc] = useState(false);

  const filteredAndSortedPlayers = useMemo(() => {
    let result = [...players];

    // Filter by search
    if (search.trim()) {
      const searchLower = search.toLowerCase();
      result = result.filter((p) =>
        p.displayName.toLowerCase().includes(searchLower)
      );
    }

    // Sort
    result.sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case "elo":
          comparison = b.elo - a.elo;
          break;
        case "wins":
          comparison = b.matchesWon - a.matchesWon;
          break;
        case "winRate":
          const aRate = a.matchesPlayed > 0 ? a.matchesWon / a.matchesPlayed : 0;
          const bRate = b.matchesPlayed > 0 ? b.matchesWon / b.matchesPlayed : 0;
          comparison = bRate - aRate;
          break;
        case "level":
          comparison = b.level - a.level;
          break;
        case "name":
          comparison = a.displayName.localeCompare(b.displayName);
          break;
      }
      return sortAsc ? -comparison : comparison;
    });

    return result;
  }, [players, search, sortBy, sortAsc]);

  const handleSort = (option: SortOption) => {
    if (sortBy === option) {
      setSortAsc(!sortAsc);
    } else {
      setSortBy(option);
      setSortAsc(false);
    }
  };

  return (
    <div className="min-h-screen bg-black p-6 md:p-8">
      <div className="mx-auto max-w-7xl space-y-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="flex items-center gap-3">
            <Users className="h-6 w-6 text-[#525252]" />
            <h1 className="text-2xl font-bold tracking-tight">Players</h1>
            <span className="rounded-full bg-[#1a1a1a] px-2.5 py-0.5 text-xs font-medium text-[#737373]">
              {players.length}
            </span>
          </div>
        </motion.div>

        {/* Search & Sort Controls */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
        >
          {/* Search */}
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#525252]" />
            <input
              type="text"
              placeholder="Search players..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-10 w-full rounded-lg border border-[#1a1a1a] bg-[#0a0a0a] pl-10 pr-4 text-sm text-white placeholder-[#525252] outline-none transition-all focus:border-[#333] focus:ring-1 focus:ring-[#333]"
            />
          </div>

          {/* Sort Options */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] font-medium uppercase tracking-[0.15em] text-[#525252]">
              Sort by
            </span>
            {sortOptions.map((option) => (
              <Button
                key={option.value}
                size="sm"
                variant="ghost"
                onClick={() => handleSort(option.value)}
                className={cn(
                  "h-8 px-3 text-xs transition-all",
                  sortBy === option.value
                    ? "bg-white text-black hover:bg-white/90"
                    : "text-[#737373] hover:bg-[#1a1a1a] hover:text-white"
                )}
              >
                {option.label}
                {sortBy === option.value && (
                  <ArrowUpDown
                    className={cn(
                      "ml-1.5 h-3 w-3 transition-transform",
                      sortAsc && "rotate-180"
                    )}
                  />
                )}
              </Button>
            ))}
          </div>
        </motion.div>

        {/* Players Grid */}
        {filteredAndSortedPlayers.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex h-64 items-center justify-center rounded-xl border border-[#1a1a1a] bg-[#0a0a0a]"
          >
            <p className="text-[#525252]">No players found</p>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
          >
            {filteredAndSortedPlayers.map((player, index) => (
              <PlayerCard
                key={player.id}
                player={player}
                rank={players.findIndex((p) => p.id === player.id) + 1}
                index={index}
              />
            ))}
          </motion.div>
        )}
      </div>
    </div>
  );
}

function PlayerCard({
  player,
  rank,
  index,
}: {
  player: Player;
  rank: number;
  index: number;
}) {
  const winRate =
    player.matchesPlayed > 0
      ? Math.round((player.matchesWon / player.matchesPlayed) * 100)
      : 0;
  const levelTier = getLevelTier(player.level);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03, duration: 0.3 }}
    >
      <Link href={`/players/${player.slug}`}>
        <div className="group relative overflow-hidden rounded-xl border border-[#1a1a1a] bg-[#0a0a0a] p-5 transition-all duration-300 hover:border-[#262626] hover:shadow-[0_0_30px_rgba(255,255,255,0.03)]">
          {/* Rank Badge */}
          {rank <= 3 && (
            <div
              className={cn(
                "absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold",
                rank === 1 && "bg-[#ffd700]/20 text-[#ffd700]",
                rank === 2 && "bg-[#c0c0c0]/20 text-[#c0c0c0]",
                rank === 3 && "bg-[#cd7f32]/20 text-[#cd7f32]"
              )}
            >
              {rank}
            </div>
          )}

          {/* Player Info */}
          <div className="flex items-center gap-4">
            <div className="relative">
              <Avatar className="h-14 w-14 border-2 border-[#1a1a1a] transition-all group-hover:border-[#262626]">
                <AvatarImage src={player.avatarUrl || undefined} />
                <AvatarFallback className="bg-[#1a1a1a] text-lg font-medium">
                  {player.displayName.charAt(0)}
                </AvatarFallback>
              </Avatar>
              {/* Level Badge - only show if level > 1 */}
              {player.level > 1 && (
                <div
                  className={cn(
                    "absolute -bottom-1 -right-1 flex h-6 items-center justify-center rounded-full px-1.5 text-[9px] font-bold",
                    player.level < 5 && "bg-[#333] text-white",
                    player.level >= 5 && player.level < 10 && "bg-[#cd7f32] text-black",
                    player.level >= 10 && player.level < 20 && "bg-[#c0c0c0] text-black",
                    player.level >= 20 && player.level < 30 && "bg-[#ffd700] text-black",
                    player.level >= 30 && player.level < 40 && "bg-gradient-to-br from-cyan-300 to-blue-400 text-black",
                    player.level >= 40 && "bg-gradient-to-br from-purple-400 to-pink-400 text-black"
                  )}
                >
                  Lv{player.level}
                </div>
              )}
            </div>

            <div className="min-w-0 flex-1">
              <h3 className="truncate text-sm font-semibold text-white transition-colors group-hover:text-white/90">
                {player.displayName}
              </h3>
              <div className="mt-1 flex items-center gap-2">
                <span className="font-mono text-lg font-bold text-white">
                  {player.elo}
                </span>
                <span className="text-[10px] font-medium uppercase tracking-wider text-[#525252]">
                  ELO
                </span>
              </div>
            </div>
          </div>

          {/* Stats Row */}
          <div className="mt-4 grid grid-cols-3 gap-2 border-t border-[#1a1a1a] pt-4">
            <div className="text-center">
              <div className="flex items-center justify-center gap-1">
                <Trophy className="h-3 w-3 text-emerald-500/70" />
                <span className="font-mono text-sm font-semibold text-white">
                  {player.matchesWon}
                </span>
              </div>
              <p className="mt-0.5 text-[9px] font-medium uppercase tracking-wider text-[#525252]">
                Wins
              </p>
            </div>

            <div className="text-center">
              <div className="flex items-center justify-center gap-1">
                <TrendingUp className="h-3 w-3 text-blue-500/70" />
                <span className="font-mono text-sm font-semibold text-white">
                  {winRate}%
                </span>
              </div>
              <p className="mt-0.5 text-[9px] font-medium uppercase tracking-wider text-[#525252]">
                Rate
              </p>
            </div>

            <div className="text-center">
              <div className="flex items-center justify-center gap-1">
                <Flame
                  className={cn(
                    "h-3 w-3",
                    player.currentStreak >= 3
                      ? "text-orange-500"
                      : "text-[#525252]"
                  )}
                />
                <span
                  className={cn(
                    "font-mono text-sm font-semibold",
                    player.currentStreak >= 3 ? "text-orange-500" : "text-white"
                  )}
                >
                  {player.currentStreak}
                </span>
              </div>
              <p className="mt-0.5 text-[9px] font-medium uppercase tracking-wider text-[#525252]">
                Streak
              </p>
            </div>
          </div>

          {/* Hover Indicator */}
          <div className="absolute bottom-0 left-0 h-0.5 w-full origin-left scale-x-0 bg-gradient-to-r from-white/20 to-transparent transition-transform duration-300 group-hover:scale-x-100" />
        </div>
      </Link>
    </motion.div>
  );
}
