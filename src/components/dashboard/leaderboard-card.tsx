"use client";

import { motion } from "framer-motion";
import { Trophy, ChevronRight, Flame } from "lucide-react";
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

interface LeaderboardPlayer {
  id: string;
  rank: number;
  displayName: string;
  elo: number;
  matchesWon: number;
  matchesPlayed: number;
  currentStreak: number;
  avatarUrl: string | null;
}

interface LeaderboardCardProps {
  players: LeaderboardPlayer[];
  currentPlayerId?: string;
}

export function LeaderboardCard({ players, currentPlayerId }: LeaderboardCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.1 }}
      className="overflow-hidden rounded-xl border border-[#1a1a1a] bg-[#0a0a0a]"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#1a1a1a] px-5 py-4">
        <div className="flex items-center gap-2">
          <Trophy className="h-4 w-4 text-[#525252]" />
          <h2 className="text-sm font-medium tracking-wide">Leaderboard</h2>
        </div>
        <Link
          href="/leaderboard"
          className="flex items-center gap-1 text-xs text-[#525252] transition-colors hover:text-white"
        >
          View All
          <ChevronRight className="h-3 w-3" />
        </Link>
      </div>

      {/* Table Header */}
      <div className="grid grid-cols-[3rem_1fr_5rem_4rem_3rem] gap-2 border-b border-[#1a1a1a] px-5 py-2 text-[10px] font-medium uppercase tracking-[0.15em] text-[#525252]">
        <div>#</div>
        <div>Player</div>
        <div className="text-right">ELO</div>
        <div className="text-right">W/L</div>
        <div className="text-right">🔥</div>
      </div>

      {/* Player Rows */}
      <div className="divide-y divide-[#1a1a1a]/50">
        {players.map((player, index) => {
          const isCurrentUser = player.id === currentPlayerId;
          const winRate = player.matchesPlayed > 0
            ? Math.round((player.matchesWon / player.matchesPlayed) * 100)
            : 0;

          return (
            <motion.div
              key={player.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: 0.1 + index * 0.03 }}
            >
              <Link
                href={`/players/${player.id}`}
                className={cn(
                  "group grid grid-cols-[3rem_1fr_5rem_4rem_3rem] items-center gap-2 px-5 py-3 transition-all hover:bg-[#111]",
                  isCurrentUser && "bg-white/[0.02]"
                )}
              >
                {/* Rank */}
                <div
                  className={cn(
                    "font-mono text-lg font-bold",
                    player.rank === 1 && "text-[#ffd700]",
                    player.rank === 2 && "text-[#c0c0c0]",
                    player.rank === 3 && "text-[#cd7f32]",
                    player.rank > 3 && "text-[#525252]"
                  )}
                >
                  {player.rank}
                </div>

                {/* Player Info */}
                <div className="flex items-center gap-3 min-w-0">
                  <div className="relative">
                    <Avatar className="h-8 w-8 border border-[#262626]">
                      <AvatarImage src={player.avatarUrl || undefined} />
                      <AvatarFallback className="bg-[#1a1a1a] text-xs">
                        {player.displayName.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    {player.rank <= 3 && (
                      <div
                        className={cn(
                          "absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full text-[8px]",
                          player.rank === 1 && "bg-[#ffd700] text-black",
                          player.rank === 2 && "bg-[#c0c0c0] text-black",
                          player.rank === 3 && "bg-[#cd7f32] text-black"
                        )}
                      >
                        {player.rank}
                      </div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className={cn(
                      "truncate text-sm font-medium transition-colors group-hover:text-white",
                      isCurrentUser ? "text-white" : "text-[#a3a3a3]"
                    )}>
                      {player.displayName}
                      {isCurrentUser && (
                        <span className="ml-2 text-[10px] text-[#525252]">(you)</span>
                      )}
                    </p>
                  </div>
                </div>

                {/* ELO */}
                <div className="text-right font-mono text-sm font-bold text-white">
                  {player.elo}
                </div>

                {/* W/L */}
                <div className="text-right">
                  <span className="font-mono text-sm text-[#737373]">
                    {player.matchesWon}/{player.matchesPlayed - player.matchesWon}
                  </span>
                </div>

                {/* Streak */}
                <div className="flex items-center justify-end gap-1">
                  {player.currentStreak >= 3 ? (
                    <>
                      <Flame className="h-3 w-3 text-orange-500" />
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
              </Link>
            </motion.div>
          );
        })}

        {players.length === 0 && (
          <div className="px-5 py-8 text-center text-sm text-[#525252]">
            No players yet. Be the first to log a match!
          </div>
        )}
      </div>
    </motion.div>
  );
}
