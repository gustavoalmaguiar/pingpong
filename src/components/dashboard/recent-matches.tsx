"use client";

import { motion } from "framer-motion";
import { Clock, Users, User, ChevronRight } from "lucide-react";
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "@/lib/format";

interface Player {
  id: string;
  displayName: string;
  avatarUrl?: string | null;
}

interface SinglesMatch {
  id: string;
  type: "singles";
  winner: Player;
  loser: Player;
  winnerScore: number;
  loserScore: number;
  eloChange: number;
  playedAt: Date;
}

interface DoublesMatch {
  id: string;
  type: "doubles";
  winnerTeam: [Player, Player];
  loserTeam: [Player, Player];
  winnerScore: number;
  loserScore: number;
  eloChange: number;
  playedAt: Date;
}

type Match = SinglesMatch | DoublesMatch;

interface RecentMatchesProps {
  matches: Match[];
  currentPlayerId?: string;
}

export function RecentMatches({ matches, currentPlayerId }: RecentMatchesProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
      className="overflow-hidden rounded-xl border border-[#1a1a1a] bg-[#0a0a0a]"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#1a1a1a] px-5 py-4">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-[#525252]" />
          <h2 className="text-sm font-medium tracking-wide">Recent Matches</h2>
        </div>
        <Link
          href="/matches"
          className="flex items-center gap-1 text-xs text-[#525252] transition-colors hover:text-white"
        >
          View All
          <ChevronRight className="h-3 w-3" />
        </Link>
      </div>

      {/* Matches List */}
      <div className="divide-y divide-[#1a1a1a]/50">
        {matches.map((match, index) => (
          <motion.div
            key={match.id}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: 0.15 + index * 0.03 }}
            className="group px-5 py-3 transition-colors hover:bg-[#111]"
          >
            {match.type === "singles" ? (
              <SinglesMatchRow
                match={match}
                currentPlayerId={currentPlayerId}
              />
            ) : (
              <DoublesMatchRow
                match={match}
                currentPlayerId={currentPlayerId}
              />
            )}
          </motion.div>
        ))}

        {matches.length === 0 && (
          <div className="px-5 py-8 text-center text-sm text-[#525252]">
            No matches yet. Log your first match!
          </div>
        )}
      </div>
    </motion.div>
  );
}

function SinglesMatchRow({
  match,
  currentPlayerId,
}: {
  match: SinglesMatch;
  currentPlayerId?: string;
}) {
  const isWinner = match.winner.id === currentPlayerId;
  const isLoser = match.loser.id === currentPlayerId;
  const isInvolved = isWinner || isLoser;

  return (
    <div className="flex items-center gap-3">
      {/* Type indicator */}
      <div className="flex h-6 w-6 items-center justify-center rounded bg-[#1a1a1a]">
        <User className="h-3 w-3 text-[#525252]" />
      </div>

      {/* Match info */}
      <div className="flex flex-1 items-center gap-2 min-w-0">
        {/* Winner */}
        <div className="flex items-center gap-2 min-w-0">
          <Avatar className="h-6 w-6 border border-[#262626]">
            <AvatarImage src={match.winner.avatarUrl || undefined} />
            <AvatarFallback className="bg-[#1a1a1a] text-[10px]">
              {match.winner.displayName.charAt(0)}
            </AvatarFallback>
          </Avatar>
          <span className={cn(
            "truncate text-sm",
            isWinner ? "font-medium text-emerald-500" : "text-[#a3a3a3]"
          )}>
            {match.winner.displayName}
          </span>
        </div>

        {/* Score */}
        <div className="flex items-center gap-1 font-mono text-sm">
          <span className="font-bold text-white">{match.winnerScore}</span>
          <span className="text-[#525252]">-</span>
          <span className="text-[#525252]">{match.loserScore}</span>
        </div>

        {/* Loser */}
        <div className="flex items-center gap-2 min-w-0">
          <Avatar className="h-6 w-6 border border-[#262626]">
            <AvatarImage src={match.loser.avatarUrl || undefined} />
            <AvatarFallback className="bg-[#1a1a1a] text-[10px]">
              {match.loser.displayName.charAt(0)}
            </AvatarFallback>
          </Avatar>
          <span className={cn(
            "truncate text-sm",
            isLoser ? "font-medium text-red-500" : "text-[#525252]"
          )}>
            {match.loser.displayName}
          </span>
        </div>
      </div>

      {/* Meta */}
      <div className="flex items-center gap-3">
        {/* ELO change */}
        <span className={cn(
          "font-mono text-xs",
          isInvolved
            ? isWinner
              ? "text-emerald-500"
              : "text-red-500"
            : "text-[#525252]"
        )}>
          {isWinner ? "+" : isLoser ? "-" : "±"}{match.eloChange}
        </span>

        {/* Time */}
        <span className="text-[10px] text-[#525252]">
          {formatDistanceToNow(match.playedAt)}
        </span>
      </div>
    </div>
  );
}

function DoublesMatchRow({
  match,
  currentPlayerId,
}: {
  match: DoublesMatch;
  currentPlayerId?: string;
}) {
  const isWinner = match.winnerTeam.some((p) => p.id === currentPlayerId);
  const isLoser = match.loserTeam.some((p) => p.id === currentPlayerId);
  const isInvolved = isWinner || isLoser;

  return (
    <div className="flex items-center gap-3">
      {/* Type indicator */}
      <div className="flex h-6 w-6 items-center justify-center rounded bg-[#1a1a1a]">
        <Users className="h-3 w-3 text-[#525252]" />
      </div>

      {/* Match info */}
      <div className="flex flex-1 items-center gap-2 min-w-0">
        {/* Winner Team */}
        <div className="flex items-center">
          <div className="flex -space-x-2">
            {match.winnerTeam.map((player) => (
              <Avatar key={player.id} className="h-6 w-6 border-2 border-[#0a0a0a]">
                <AvatarImage src={player.avatarUrl || undefined} />
                <AvatarFallback className="bg-[#1a1a1a] text-[10px]">
                  {player.displayName.charAt(0)}
                </AvatarFallback>
              </Avatar>
            ))}
          </div>
        </div>

        {/* Score */}
        <div className="flex items-center gap-1 font-mono text-sm">
          <span className="font-bold text-white">{match.winnerScore}</span>
          <span className="text-[#525252]">-</span>
          <span className="text-[#525252]">{match.loserScore}</span>
        </div>

        {/* Loser Team */}
        <div className="flex items-center">
          <div className="flex -space-x-2">
            {match.loserTeam.map((player) => (
              <Avatar key={player.id} className="h-6 w-6 border-2 border-[#0a0a0a]">
                <AvatarImage src={player.avatarUrl || undefined} />
                <AvatarFallback className="bg-[#1a1a1a] text-[10px]">
                  {player.displayName.charAt(0)}
                </AvatarFallback>
              </Avatar>
            ))}
          </div>
        </div>
      </div>

      {/* Meta */}
      <div className="flex items-center gap-3">
        <span className={cn(
          "font-mono text-xs",
          isInvolved
            ? isWinner
              ? "text-emerald-500"
              : "text-red-500"
            : "text-[#525252]"
        )}>
          {isWinner ? "+" : isLoser ? "-" : "±"}{match.eloChange}
        </span>
        <span className="text-[10px] text-[#525252]">
          {formatDistanceToNow(match.playedAt)}
        </span>
      </div>
    </div>
  );
}
