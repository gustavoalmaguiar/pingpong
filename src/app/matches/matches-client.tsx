"use client";

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { Gamepad2, User, Users, Filter } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "@/lib/format";

interface Player {
  id: string;
  displayName: string;
  elo: number;
  avatarUrl?: string | null;
}

interface Match {
  id: string;
  type: "singles" | "doubles";
  winnerScore: number;
  loserScore: number;
  eloChange: number;
  playedAt: Date;
  winner?: Player;
  loser?: Player;
  winnerTeam?: [Player, Player];
  loserTeam?: [Player, Player];
}

type FilterOption = "all" | "singles" | "doubles";

const filterOptions: { value: FilterOption; label: string; icon: typeof User }[] = [
  { value: "all", label: "All Matches", icon: Gamepad2 },
  { value: "singles", label: "Singles", icon: User },
  { value: "doubles", label: "Doubles", icon: Users },
];

export function MatchesClient({ matches }: { matches: Match[] }) {
  const [filter, setFilter] = useState<FilterOption>("all");

  const filteredMatches = useMemo(() => {
    if (filter === "all") return matches;
    return matches.filter((m) => m.type === filter);
  }, [matches, filter]);

  const stats = useMemo(() => {
    const total = matches.length;
    const singles = matches.filter((m) => m.type === "singles").length;
    const doubles = matches.filter((m) => m.type === "doubles").length;
    return { total, singles, doubles };
  }, [matches]);

  return (
    <div className="min-h-screen bg-black p-6 md:p-8">
      <div className="mx-auto max-w-5xl space-y-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="flex items-center gap-3">
            <Gamepad2 className="h-6 w-6 text-[#525252]" />
            <h1 className="text-2xl font-bold tracking-tight">Match History</h1>
          </div>

          {/* Stats Pills */}
          <div className="flex items-center gap-2">
            <div className="rounded-full bg-[#0a0a0a] border border-[#1a1a1a] px-3 py-1">
              <span className="font-mono text-sm font-semibold text-white">{stats.total}</span>
              <span className="ml-1.5 text-[10px] font-medium uppercase tracking-wider text-[#525252]">total</span>
            </div>
            <div className="rounded-full bg-[#0a0a0a] border border-[#1a1a1a] px-3 py-1">
              <span className="font-mono text-sm font-semibold text-white">{stats.singles}</span>
              <span className="ml-1.5 text-[10px] font-medium uppercase tracking-wider text-[#525252]">1v1</span>
            </div>
            <div className="rounded-full bg-[#0a0a0a] border border-[#1a1a1a] px-3 py-1">
              <span className="font-mono text-sm font-semibold text-white">{stats.doubles}</span>
              <span className="ml-1.5 text-[10px] font-medium uppercase tracking-wider text-[#525252]">2v2</span>
            </div>
          </div>
        </motion.div>

        {/* Filter Tabs */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex items-center gap-2"
        >
          {filterOptions.map((option) => (
            <Button
              key={option.value}
              size="sm"
              variant="ghost"
              onClick={() => setFilter(option.value)}
              className={cn(
                "h-9 gap-2 px-4 text-xs transition-all",
                filter === option.value
                  ? "bg-white text-black hover:bg-white/90"
                  : "text-[#737373] hover:bg-[#1a1a1a] hover:text-white"
              )}
            >
              <option.icon className="h-3.5 w-3.5" />
              {option.label}
            </Button>
          ))}
        </motion.div>

        {/* Matches List */}
        {filteredMatches.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex h-64 items-center justify-center rounded-xl border border-[#1a1a1a] bg-[#0a0a0a]"
          >
            <p className="text-[#525252]">No matches found</p>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="space-y-3"
          >
            {filteredMatches.map((match, index) => (
              <MatchRow key={match.id} match={match} index={index} />
            ))}
          </motion.div>
        )}
      </div>
    </div>
  );
}

function MatchRow({ match, index }: { match: Match; index: number }) {
  const isSingles = match.type === "singles";

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.02, duration: 0.3 }}
      className="group relative overflow-hidden rounded-xl border border-[#1a1a1a] bg-[#0a0a0a] transition-all duration-300 hover:border-[#262626]"
    >
      <div className="flex flex-col sm:flex-row sm:items-center">
        {/* Match Type Badge */}
        <div className="flex items-center gap-3 border-b border-[#1a1a1a] px-5 py-3 sm:w-20 sm:border-b-0 sm:border-r sm:py-5">
          <div
            className={cn(
              "flex h-8 items-center justify-center gap-1.5 rounded-md px-2.5 text-[10px] font-bold uppercase tracking-wider",
              isSingles
                ? "bg-[#1a1a1a] text-[#a3a3a3]"
                : "bg-[#1f1f1f] text-[#a3a3a3]"
            )}
          >
            {isSingles ? (
              <>
                <User className="h-3 w-3" />
                <span>1v1</span>
              </>
            ) : (
              <>
                <Users className="h-3 w-3" />
                <span>2v2</span>
              </>
            )}
          </div>
        </div>

        {/* Players & Score */}
        <div className="flex flex-1 flex-col gap-4 px-5 py-4 sm:flex-row sm:items-center sm:gap-6">
          {/* Winner Side */}
          <div className="flex flex-1 items-center justify-end gap-3 sm:justify-end">
            {isSingles ? (
              <PlayerBadge player={match.winner!} isWinner />
            ) : (
              <TeamBadge players={match.winnerTeam!} isWinner />
            )}
          </div>

          {/* Score */}
          <div className="flex items-center justify-center gap-2 sm:min-w-[100px]">
            <span className="font-mono text-2xl font-bold text-emerald-500">
              {match.winnerScore}
            </span>
            <span className="text-[#333] text-lg">-</span>
            <span className="font-mono text-2xl font-bold text-[#525252]">
              {match.loserScore}
            </span>
          </div>

          {/* Loser Side */}
          <div className="flex flex-1 items-center gap-3 sm:justify-start">
            {isSingles ? (
              <PlayerBadge player={match.loser!} isWinner={false} />
            ) : (
              <TeamBadge players={match.loserTeam!} isWinner={false} />
            )}
          </div>
        </div>

        {/* Meta Info */}
        <div className="flex items-center justify-between gap-4 border-t border-[#1a1a1a] px-5 py-3 sm:w-40 sm:flex-col sm:items-end sm:justify-center sm:border-l sm:border-t-0">
          <div className="flex items-center gap-1">
            <span className="text-[10px] font-medium uppercase tracking-wider text-[#525252]">
              ELO
            </span>
            <span className="font-mono text-sm font-semibold text-emerald-500">
              +{match.eloChange}
            </span>
            <span className="text-[#333]">/</span>
            <span className="font-mono text-sm font-semibold text-red-500/70">
              -{match.eloChange}
            </span>
          </div>
          <span className="text-[10px] text-[#525252]">
            {formatDistanceToNow(match.playedAt)}
          </span>
        </div>
      </div>

      {/* Hover accent line */}
      <div className="absolute bottom-0 left-0 h-0.5 w-full origin-left scale-x-0 bg-gradient-to-r from-emerald-500/50 to-transparent transition-transform duration-300 group-hover:scale-x-100" />
    </motion.div>
  );
}

function PlayerBadge({
  player,
  isWinner,
}: {
  player: Player;
  isWinner: boolean;
}) {
  return (
    <Link
      href={`/players/${player.id}`}
      className={cn(
        "flex items-center gap-2.5 rounded-lg px-2 py-1.5 transition-colors hover:bg-[#1a1a1a]",
        isWinner ? "flex-row-reverse sm:flex-row" : ""
      )}
    >
      <Avatar className="h-8 w-8 border border-[#262626]">
        <AvatarImage src={player.avatarUrl || undefined} />
        <AvatarFallback className="bg-[#1a1a1a] text-xs">
          {player.displayName.charAt(0)}
        </AvatarFallback>
      </Avatar>
      <span
        className={cn(
          "text-sm font-medium transition-colors",
          isWinner ? "text-emerald-500" : "text-[#737373]"
        )}
      >
        {player.displayName}
      </span>
    </Link>
  );
}

function TeamBadge({
  players,
  isWinner,
}: {
  players: [Player, Player];
  isWinner: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-1",
        isWinner ? "flex-row-reverse sm:flex-row" : ""
      )}
    >
      <div className="flex -space-x-2">
        {players.map((player) => (
          <Link key={player.id} href={`/players/${player.id}`}>
            <Avatar className="h-8 w-8 border-2 border-[#0a0a0a] transition-transform hover:z-10 hover:scale-110">
              <AvatarImage src={player.avatarUrl || undefined} />
              <AvatarFallback className="bg-[#1a1a1a] text-xs">
                {player.displayName.charAt(0)}
              </AvatarFallback>
            </Avatar>
          </Link>
        ))}
      </div>
      <div
        className={cn(
          "flex flex-col text-xs",
          isWinner ? "items-end sm:items-start" : "items-start"
        )}
      >
        {players.map((player, i) => (
          <Link
            key={player.id}
            href={`/players/${player.id}`}
            className={cn(
              "transition-colors hover:underline",
              isWinner ? "text-emerald-500" : "text-[#737373]"
            )}
          >
            {player.displayName}
            {i === 0 && <span className="text-[#333]"> &</span>}
          </Link>
        ))}
      </div>
    </div>
  );
}
