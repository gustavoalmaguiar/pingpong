"use client";

import { useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  ChevronUp,
  ChevronDown,
  Trophy,
  Flame,
  ArrowUpDown,
} from "lucide-react";
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useDebounce } from "@/hooks/use-debounce";
import { useLeaderboardUpdates } from "@/hooks/use-realtime";
import { getPlayers } from "@/actions/players";

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
}

type SortField = "rank" | "elo" | "matchesWon" | "winRate" | "currentStreak" | "level";
type SortDirection = "asc" | "desc";

interface LeaderboardClientProps {
  initialPlayers: Player[];
  currentPlayerId?: string;
}

const columns = [
  { key: "rank" as const, label: "#", width: "w-16" },
  { key: "name" as const, label: "Player", width: "flex-1 min-w-[200px]" },
  { key: "elo" as const, label: "ELO", width: "w-24", sortable: true },
  { key: "matchesWon" as const, label: "W", width: "w-16", sortable: true },
  { key: "losses" as const, label: "L", width: "w-16" },
  { key: "winRate" as const, label: "Win %", width: "w-20", sortable: true },
  { key: "currentStreak" as const, label: "Streak", width: "w-20", sortable: true },
  { key: "level" as const, label: "Level", width: "w-20", sortable: true },
];

export function LeaderboardClient({
  initialPlayers,
  currentPlayerId,
}: LeaderboardClientProps) {
  const [players, setPlayers] = useState(initialPlayers);
  const [search, setSearch] = useState("");
  const [sortField, setSortField] = useState<SortField>("elo");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const debouncedSearch = useDebounce(search, 300);

  // Real-time updates
  const refreshData = useCallback(async () => {
    const freshPlayers = await getPlayers();
    setPlayers(freshPlayers);
  }, []);

  useLeaderboardUpdates(refreshData);

  // Filter and sort players
  const sortedPlayers = useMemo(() => {
    let filtered = players;

    // Search filter
    if (debouncedSearch) {
      filtered = players.filter((p) =>
        p.displayName.toLowerCase().includes(debouncedSearch.toLowerCase())
      );
    }

    // Sort
    const sorted = [...filtered].sort((a, b) => {
      let aVal: number;
      let bVal: number;

      switch (sortField) {
        case "elo":
          aVal = a.elo;
          bVal = b.elo;
          break;
        case "matchesWon":
          aVal = a.matchesWon;
          bVal = b.matchesWon;
          break;
        case "winRate":
          aVal = a.matchesPlayed > 0 ? a.matchesWon / a.matchesPlayed : 0;
          bVal = b.matchesPlayed > 0 ? b.matchesWon / b.matchesPlayed : 0;
          break;
        case "currentStreak":
          aVal = a.currentStreak;
          bVal = b.currentStreak;
          break;
        case "level":
          aVal = a.level;
          bVal = b.level;
          break;
        default:
          aVal = a.elo;
          bVal = b.elo;
      }

      return sortDirection === "desc" ? bVal - aVal : aVal - bVal;
    });

    // Add rank based on ELO (original ranking)
    const eloSorted = [...players].sort((a, b) => b.elo - a.elo);
    const rankMap = new Map(eloSorted.map((p, i) => [p.id, i + 1]));

    return sorted.map((p) => ({
      ...p,
      rank: rankMap.get(p.id) || 0,
    }));
  }, [players, debouncedSearch, sortField, sortDirection]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((d) => (d === "desc" ? "asc" : "desc"));
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) {
      return <ArrowUpDown className="h-3 w-3 text-[#525252]" />;
    }
    return sortDirection === "desc" ? (
      <ChevronDown className="h-3 w-3 text-white" />
    ) : (
      <ChevronUp className="h-3 w-3 text-white" />
    );
  };

  return (
    <div className="min-h-screen bg-black p-6 md:p-8">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="flex items-center gap-3">
            <Trophy className="h-6 w-6 text-[#ffd700]" />
            <h1 className="text-2xl font-bold tracking-tight">Leaderboard</h1>
            <span className="rounded-full bg-[#1a1a1a] px-3 py-1 font-mono text-sm text-[#737373]">
              {players.length} players
            </span>
          </div>

          {/* Search */}
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#525252]" />
            <Input
              placeholder="Search players..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-10 border-[#262626] bg-[#0a0a0a] pl-10 text-sm placeholder:text-[#525252] focus-visible:ring-[#333]"
            />
          </div>
        </motion.div>

        {/* Table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="overflow-hidden rounded-xl border border-[#1a1a1a] bg-[#0a0a0a]"
        >
          {/* Table Header */}
          <div className="sticky top-0 z-10 border-b border-[#1a1a1a] bg-[#0a0a0a]/95 backdrop-blur-sm">
            <div className="flex items-center gap-4 px-6 py-3">
              {columns.map((col) => (
                <div
                  key={col.key}
                  className={cn(
                    "flex items-center gap-1 text-[10px] font-medium uppercase tracking-[0.15em] text-[#525252]",
                    col.width,
                    col.sortable && "cursor-pointer hover:text-white transition-colors"
                  )}
                  onClick={() => col.sortable && handleSort(col.key as SortField)}
                >
                  {col.label}
                  {col.sortable && <SortIcon field={col.key as SortField} />}
                </div>
              ))}
            </div>
          </div>

          {/* Table Body */}
          <div className="divide-y divide-[#1a1a1a]/50">
            <AnimatePresence mode="popLayout">
              {sortedPlayers.map((player, index) => {
                const isCurrentUser = player.id === currentPlayerId;
                const winRate =
                  player.matchesPlayed > 0
                    ? Math.round((player.matchesWon / player.matchesPlayed) * 100)
                    : 0;
                const losses = player.matchesPlayed - player.matchesWon;

                return (
                  <motion.div
                    key={player.id}
                    layout
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ duration: 0.2, delay: index * 0.02 }}
                  >
                    <Link
                      href={`/players/${player.id}`}
                      className={cn(
                        "group flex items-center gap-4 px-6 py-4 transition-all hover:bg-[#111]",
                        isCurrentUser && "bg-white/[0.02]"
                      )}
                    >
                      {/* Rank */}
                      <div
                        className={cn(
                          "w-16 font-mono text-xl font-bold",
                          player.rank === 1 && "text-[#ffd700]",
                          player.rank === 2 && "text-[#c0c0c0]",
                          player.rank === 3 && "text-[#cd7f32]",
                          player.rank > 3 && "text-[#525252]"
                        )}
                      >
                        {player.rank}
                      </div>

                      {/* Player */}
                      <div className="flex flex-1 min-w-[200px] items-center gap-3">
                        <div className="relative">
                          <Avatar className="h-10 w-10 border border-[#262626] transition-transform group-hover:scale-105">
                            <AvatarImage src={player.avatarUrl || undefined} />
                            <AvatarFallback className="bg-[#1a1a1a] text-sm">
                              {player.displayName.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          {player.rank <= 3 && (
                            <div
                              className={cn(
                                "absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold",
                                player.rank === 1 && "bg-[#ffd700] text-black",
                                player.rank === 2 && "bg-[#c0c0c0] text-black",
                                player.rank === 3 && "bg-[#cd7f32] text-black"
                              )}
                            >
                              {player.rank}
                            </div>
                          )}
                        </div>
                        <div>
                          <p
                            className={cn(
                              "font-medium transition-colors group-hover:text-white",
                              isCurrentUser ? "text-white" : "text-[#a3a3a3]"
                            )}
                          >
                            {player.displayName}
                            {isCurrentUser && (
                              <span className="ml-2 text-[10px] text-[#525252]">
                                (you)
                              </span>
                            )}
                          </p>
                        </div>
                      </div>

                      {/* ELO */}
                      <div className="w-24 font-mono text-lg font-bold text-white">
                        {player.elo}
                      </div>

                      {/* Wins */}
                      <div className="w-16 font-mono text-sm text-emerald-500">
                        {player.matchesWon}
                      </div>

                      {/* Losses */}
                      <div className="w-16 font-mono text-sm text-red-500">
                        {losses}
                      </div>

                      {/* Win Rate */}
                      <div className="w-20">
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-12 overflow-hidden rounded-full bg-[#1a1a1a]">
                            <div
                              className="h-full rounded-full bg-white"
                              style={{ width: `${winRate}%` }}
                            />
                          </div>
                          <span className="font-mono text-sm text-[#737373]">
                            {winRate}%
                          </span>
                        </div>
                      </div>

                      {/* Streak */}
                      <div className="flex w-20 items-center gap-1">
                        {player.currentStreak >= 3 ? (
                          <>
                            <Flame className="h-4 w-4 text-orange-500" />
                            <span className="font-mono text-sm font-bold text-orange-500">
                              {player.currentStreak}
                            </span>
                          </>
                        ) : (
                          <span className="font-mono text-sm text-[#525252]">
                            {player.currentStreak}
                          </span>
                        )}
                      </div>

                      {/* Level */}
                      <div className="w-20 font-mono text-sm text-white">
                        Lv.{player.level}
                      </div>
                    </Link>
                  </motion.div>
                );
              })}
            </AnimatePresence>

            {/* Empty State */}
            {sortedPlayers.length === 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="px-6 py-16 text-center"
              >
                {debouncedSearch ? (
                  <>
                    <p className="text-lg text-white">No players found</p>
                    <p className="mt-1 text-sm text-[#525252]">
                      Try a different search term
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-lg text-white">No players yet</p>
                    <p className="mt-1 text-sm text-[#525252]">
                      Be the first to log a match!
                    </p>
                  </>
                )}
              </motion.div>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
