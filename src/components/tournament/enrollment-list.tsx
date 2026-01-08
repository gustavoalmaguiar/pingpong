"use client";

import { motion } from "framer-motion";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Crown, Medal, Trophy, Users } from "lucide-react";

interface Player {
  id: string;
  displayName: string;
  image?: string | null;
  elo: number;
}

interface Enrollment {
  id: string;
  player: Player;
  partner?: Player | null;
  teamName?: string | null;
  seed?: number | null;
  isActive: boolean;
  finalPlacement?: number | null;
}

interface EnrollmentListProps {
  enrollments: Enrollment[];
  isDoubles?: boolean;
  currentPlayerId?: string;
  showPlacements?: boolean;
}

function getSeedBadgeStyle(seed: number) {
  if (seed === 1) return "bg-amber-500/20 text-amber-400 border-amber-500/30";
  if (seed === 2) return "bg-gray-400/20 text-gray-300 border-gray-400/30";
  if (seed === 3) return "bg-orange-600/20 text-orange-400 border-orange-600/30";
  return "bg-[#1a1a1a] text-[#525252] border-[#262626]";
}

function getPlacementIcon(placement: number) {
  if (placement === 1) return <Trophy className="h-4 w-4 text-amber-400" />;
  if (placement === 2) return <Medal className="h-4 w-4 text-gray-300" />;
  if (placement === 3) return <Medal className="h-4 w-4 text-orange-400" />;
  return null;
}

export function EnrollmentList({
  enrollments,
  isDoubles = false,
  currentPlayerId,
  showPlacements = false,
}: EnrollmentListProps) {
  const sortedEnrollments = [...enrollments].sort((a, b) => {
    // Sort by placement if showing placements
    if (showPlacements && a.finalPlacement && b.finalPlacement) {
      return a.finalPlacement - b.finalPlacement;
    }
    // Otherwise sort by seed
    if (a.seed && b.seed) return a.seed - b.seed;
    if (a.seed) return -1;
    if (b.seed) return 1;
    // Then by ELO
    return b.player.elo - a.player.elo;
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-white flex items-center gap-2">
          <Users className="h-4 w-4 text-[#525252]" />
          Participants
        </h3>
        <span className="text-sm text-[#525252]">
          {enrollments.length} {isDoubles ? "teams" : "players"}
        </span>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {sortedEnrollments.map((enrollment, index) => {
          const isCurrentUser =
            enrollment.player.id === currentPlayerId ||
            enrollment.partner?.id === currentPlayerId;
          const isEliminated = !enrollment.isActive;
          const hasPlacement = showPlacements && enrollment.finalPlacement;

          return (
            <motion.div
              key={enrollment.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.03 }}
              className={cn(
                "flex items-center gap-3 rounded-lg border p-3 transition-all",
                isCurrentUser
                  ? "border-blue-500/30 bg-blue-500/5"
                  : "border-[#1a1a1a] bg-[#0a0a0a] hover:border-[#262626]",
                isEliminated && "opacity-50",
                hasPlacement && enrollment.finalPlacement === 1 && "border-amber-500/30 bg-amber-500/5"
              )}
            >
              {/* Seed or Placement */}
              <div className="flex h-8 w-8 shrink-0 items-center justify-center">
                {hasPlacement ? (
                  <div className="flex items-center justify-center">
                    {getPlacementIcon(enrollment.finalPlacement!) || (
                      <span className="font-mono text-sm text-[#525252]">
                        #{enrollment.finalPlacement}
                      </span>
                    )}
                  </div>
                ) : enrollment.seed ? (
                  <Badge
                    variant="outline"
                    className={cn(
                      "h-7 w-7 rounded-md p-0 flex items-center justify-center font-mono text-xs font-bold",
                      getSeedBadgeStyle(enrollment.seed)
                    )}
                  >
                    {enrollment.seed}
                  </Badge>
                ) : (
                  <span className="font-mono text-sm text-[#333]">-</span>
                )}
              </div>

              {/* Avatar(s) */}
              <div className="flex -space-x-2 shrink-0">
                <Avatar className={cn(
                  "h-9 w-9 border-2",
                  isCurrentUser ? "border-blue-500/30" : "border-[#0a0a0a]"
                )}>
                  <AvatarImage src={enrollment.player.image || undefined} />
                  <AvatarFallback className="bg-[#1a1a1a] text-xs text-[#737373]">
                    {enrollment.player.displayName[0]?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                {isDoubles && enrollment.partner && (
                  <Avatar className={cn(
                    "h-9 w-9 border-2",
                    isCurrentUser ? "border-blue-500/30" : "border-[#0a0a0a]"
                  )}>
                    <AvatarImage src={enrollment.partner.image || undefined} />
                    <AvatarFallback className="bg-[#1a1a1a] text-xs text-[#737373]">
                      {enrollment.partner.displayName[0]?.toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                )}
              </div>

              {/* Info */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className={cn(
                    "text-sm font-medium truncate",
                    isEliminated ? "text-[#525252]" : "text-white"
                  )}>
                    {isDoubles && enrollment.teamName
                      ? enrollment.teamName
                      : isDoubles && enrollment.partner
                        ? `${enrollment.player.displayName} & ${enrollment.partner.displayName}`
                        : enrollment.player.displayName}
                  </p>
                  {isCurrentUser && (
                    <Badge className="text-[9px] bg-blue-500/20 text-blue-400 border-0 px-1.5 py-0">
                      You
                    </Badge>
                  )}
                  {hasPlacement && enrollment.finalPlacement === 1 && (
                    <Crown className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                  )}
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[11px] text-[#525252] font-mono">
                    {isDoubles && enrollment.partner
                      ? `${Math.round((enrollment.player.elo + enrollment.partner.elo) / 2)} avg ELO`
                      : `${enrollment.player.elo} ELO`}
                  </span>
                  {isEliminated && (
                    <span className="text-[10px] text-red-400/70">Eliminated</span>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {enrollments.length === 0 && (
        <div className="rounded-lg border border-dashed border-[#262626] p-8 text-center">
          <Users className="h-8 w-8 text-[#333] mx-auto mb-3" />
          <p className="text-sm text-[#525252]">No participants yet</p>
          <p className="text-xs text-[#333] mt-1">Be the first to enroll!</p>
        </div>
      )}
    </div>
  );
}
