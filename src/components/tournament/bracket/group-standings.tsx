"use client";

import { motion } from "framer-motion";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface Player {
  id: string;
  displayName: string;
  image?: string | null;
  elo: number;
}

interface GroupEnrollment {
  id: string;
  player: Player;
  partner?: Player | null;
  groupPoints: number;
  groupWins: number;
  groupLosses: number;
  groupPointDiff: number;
}

interface Group {
  id: string;
  name: string;
  enrollments: GroupEnrollment[];
}

interface GroupStandingsProps {
  groups: Group[];
  advancePerGroup?: number;
  isDoubles?: boolean;
  currentPlayerId?: string;
}

export function GroupStandings({
  groups,
  advancePerGroup = 2,
  isDoubles = false,
  currentPlayerId,
}: GroupStandingsProps) {
  return (
    <div className="grid gap-6 md:grid-cols-2">
      {groups.map((group, groupIndex) => {
        // Sort enrollments by points, wins, point differential
        const sortedEnrollments = [...group.enrollments].sort((a, b) => {
          if (b.groupPoints !== a.groupPoints) return b.groupPoints - a.groupPoints;
          if (b.groupWins !== a.groupWins) return b.groupWins - a.groupWins;
          return b.groupPointDiff - a.groupPointDiff;
        });

        return (
          <motion.div
            key={group.id}
            className="rounded-xl border border-[#1a1a1a] bg-[#0a0a0a] overflow-hidden"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: groupIndex * 0.1 }}
          >
            {/* Group header */}
            <div className="border-b border-[#1a1a1a] bg-[#111] px-4 py-3">
              <h3 className="text-sm font-bold text-white">Group {group.name}</h3>
            </div>

            {/* Table header */}
            <div className="grid grid-cols-[1fr_40px_40px_50px_50px] gap-2 px-4 py-2 border-b border-[#1a1a1a]/50 text-[10px] uppercase tracking-widest text-[#525252]">
              <span>Player</span>
              <span className="text-center">W</span>
              <span className="text-center">L</span>
              <span className="text-center">+/-</span>
              <span className="text-right">Pts</span>
            </div>

            {/* Standings rows */}
            <div className="divide-y divide-[#1a1a1a]/30">
              {sortedEnrollments.map((enrollment, index) => {
                const advances = index < advancePerGroup;
                const isCurrentUser =
                  enrollment.player.id === currentPlayerId ||
                  enrollment.partner?.id === currentPlayerId;

                return (
                  <motion.div
                    key={enrollment.id}
                    className={cn(
                      "grid grid-cols-[1fr_40px_40px_50px_50px] gap-2 px-4 py-3 items-center",
                      advances && "bg-emerald-500/5",
                      isCurrentUser && "bg-blue-500/5"
                    )}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: groupIndex * 0.1 + index * 0.05 }}
                  >
                    {/* Player info */}
                    <div className="flex items-center gap-3 min-w-0">
                      <span className={cn(
                        "flex h-6 w-6 shrink-0 items-center justify-center rounded font-mono text-xs font-bold",
                        advances
                          ? "bg-emerald-500/20 text-emerald-400"
                          : "bg-[#1a1a1a] text-[#525252]"
                      )}>
                        {index + 1}
                      </span>

                      <div className="flex -space-x-1.5 shrink-0">
                        <Avatar className="h-7 w-7 border-2 border-[#0a0a0a]">
                          <AvatarImage src={enrollment.player.image || undefined} />
                          <AvatarFallback className="bg-[#1a1a1a] text-[10px] text-[#737373]">
                            {enrollment.player.displayName[0]?.toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        {isDoubles && enrollment.partner && (
                          <Avatar className="h-7 w-7 border-2 border-[#0a0a0a]">
                            <AvatarImage src={enrollment.partner.image || undefined} />
                            <AvatarFallback className="bg-[#1a1a1a] text-[10px] text-[#737373]">
                              {enrollment.partner.displayName[0]?.toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                        )}
                      </div>

                      <span className="text-sm text-white truncate">
                        {isDoubles && enrollment.partner
                          ? `${enrollment.player.displayName} & ${enrollment.partner.displayName}`
                          : enrollment.player.displayName}
                      </span>
                    </div>

                    {/* Wins */}
                    <span className="text-center font-mono text-sm text-emerald-500 font-medium">
                      {enrollment.groupWins}
                    </span>

                    {/* Losses */}
                    <span className="text-center font-mono text-sm text-red-400">
                      {enrollment.groupLosses}
                    </span>

                    {/* Point diff */}
                    <div className="flex items-center justify-center gap-1">
                      {enrollment.groupPointDiff > 0 ? (
                        <TrendingUp className="h-3 w-3 text-emerald-500" />
                      ) : enrollment.groupPointDiff < 0 ? (
                        <TrendingDown className="h-3 w-3 text-red-400" />
                      ) : (
                        <Minus className="h-3 w-3 text-[#525252]" />
                      )}
                      <span className={cn(
                        "font-mono text-sm",
                        enrollment.groupPointDiff > 0 && "text-emerald-500",
                        enrollment.groupPointDiff < 0 && "text-red-400",
                        enrollment.groupPointDiff === 0 && "text-[#525252]"
                      )}>
                        {enrollment.groupPointDiff > 0 && "+"}
                        {enrollment.groupPointDiff}
                      </span>
                    </div>

                    {/* Points */}
                    <span className="text-right font-mono text-sm font-bold text-white">
                      {enrollment.groupPoints}
                    </span>
                  </motion.div>
                );
              })}
            </div>

            {/* Advance indicator */}
            <div className="border-t border-[#1a1a1a] bg-[#111] px-4 py-2">
              <p className="text-[10px] text-[#525252]">
                <span className="text-emerald-400">Top {advancePerGroup}</span> advance to knockout stage
              </p>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
