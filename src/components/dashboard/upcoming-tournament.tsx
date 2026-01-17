"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { format } from "date-fns";
import { Trophy, Calendar, Users, ChevronRight, Zap, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface UpcomingTournamentProps {
  tournament: {
    id: string;
    name: string;
    format: "single_elimination" | "double_elimination" | "swiss" | "round_robin_knockout";
    matchType: "singles" | "doubles";
    status: "enrollment" | "in_progress";
    scheduledDate: Date | null;
    scheduledTime: string | null;
    location: string | null;
    enrollmentCount: number;
    currentRound?: number | null;
    totalRounds?: number | null;
  } | null;
  isEnrolled?: boolean;
  myNextMatch?: {
    opponentName: string;
    roundName: string;
  } | null;
}

export function UpcomingTournament({
  tournament,
  isEnrolled = false,
  myNextMatch,
}: UpcomingTournamentProps) {
  if (!tournament) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-xl border border-[#1a1a1a] bg-[#0a0a0a] p-5"
      >
        <div className="flex items-center gap-2 text-[10px] font-medium uppercase tracking-widest text-[#525252]">
          <Trophy className="h-3.5 w-3.5" />
          Tournaments
        </div>
        <div className="mt-6 text-center">
          <Trophy className="h-8 w-8 mx-auto text-[#333] mb-3" />
          <p className="text-sm text-[#525252]">No upcoming tournaments</p>
          <Button
            variant="outline"
            className="mt-4 border-[#262626] text-[#737373] hover:text-white"
            asChild
          >
            <Link href="/tournaments">
              View all tournaments
              <ChevronRight className="ml-1 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </motion.div>
    );
  }

  const isLive = tournament.status === "in_progress";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "rounded-xl border bg-[#0a0a0a] p-5 relative overflow-hidden",
        isLive
          ? "border-emerald-500/30"
          : "border-[#1a1a1a]"
      )}
    >
      {/* Top accent line */}
      {isLive && (
        <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-emerald-500 to-transparent" />
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-[10px] font-medium uppercase tracking-widest text-[#525252]">
          <Trophy className="h-3.5 w-3.5" />
          {isLive ? "Live Tournament" : "Upcoming Tournament"}
        </div>
        <Badge
          className={cn(
            "text-[9px] font-bold uppercase tracking-wider",
            isLive
              ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
              : "bg-blue-500/20 text-blue-400 border-blue-500/30"
          )}
        >
          {isLive && (
            <span className="relative flex h-1.5 w-1.5 mr-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
            </span>
          )}
          {isLive ? "Live" : "Open"}
        </Badge>
      </div>

      {/* Tournament name */}
      <h3 className="mt-3 text-lg font-semibold text-white">
        {tournament.name}
      </h3>

      {/* Details */}
      <div className="mt-3 space-y-2">
        {!isLive && tournament.scheduledDate && (
          <div className="flex items-center gap-2 text-sm text-[#737373]">
            <Calendar className="h-4 w-4 text-[#525252]" />
            <span>
              {format(new Date(tournament.scheduledDate), "MMM d")}
              {tournament.scheduledTime && ` @ ${tournament.scheduledTime}`}
            </span>
          </div>
        )}

        {isLive && tournament.currentRound && (
          <div className="flex items-center gap-2 text-sm">
            <Zap className="h-4 w-4 text-emerald-500" />
            <span className="text-emerald-400 font-medium">
              Round {tournament.currentRound} of {tournament.totalRounds}
            </span>
          </div>
        )}

        <div className="flex items-center gap-2 text-sm text-[#737373]">
          <Users className="h-4 w-4 text-[#525252]" />
          <span>{tournament.enrollmentCount} {tournament.matchType === "doubles" ? "teams" : "players"}</span>
        </div>
      </div>

      {/* Your next match (if live and enrolled) */}
      {isLive && isEnrolled && myNextMatch && (
        <div className="mt-4 rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3">
          <p className="text-[10px] uppercase tracking-widest text-[#525252]">Your Next Match</p>
          <p className="mt-1 text-sm text-white font-medium">
            vs {myNextMatch.opponentName}
          </p>
          <p className="text-xs text-[#525252]">{myNextMatch.roundName}</p>
        </div>
      )}

      {/* Action */}
      <Button
        className={cn(
          "w-full mt-4",
          isLive
            ? "bg-emerald-600 hover:bg-emerald-700 text-white"
            : isEnrolled
              ? "border-[#262626] text-[#737373] hover:text-white"
              : "bg-white text-black hover:bg-white/90"
        )}
        variant={isEnrolled ? "outline" : "default"}
        asChild
      >
        <Link href={`/tournaments/${tournament.id}`}>
          {isLive ? "View Bracket" : isEnrolled ? "View Details" : "Enroll Now"}
          <ChevronRight className="ml-1 h-4 w-4" />
        </Link>
      </Button>
    </motion.div>
  );
}
