"use client";

import { motion } from "framer-motion";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { Crown, Clock, Zap } from "lucide-react";

interface Participant {
  id: string;
  player: {
    displayName: string;
    image?: string | null;
    elo: number;
  };
  partner?: {
    displayName: string;
    image?: string | null;
  } | null;
  seed?: number | null;
}

interface BracketMatchProps {
  match: {
    id: string;
    participant1: Participant | null;
    participant2: Participant | null;
    winnerId: string | null;
    scores?: string | null; // JSON string of scores
    status: "pending" | "ready" | "in_progress" | "completed" | "bye" | "walkover";
    isNextMatch?: boolean;
  };
  roundName?: string;
  isFinal?: boolean;
  isDoubles?: boolean;
  onClick?: () => void;
}

function ParticipantRow({
  participant,
  isWinner,
  isLoser,
  score,
  isBye,
  position,
  isDoubles,
}: {
  participant: Participant | null;
  isWinner: boolean;
  isLoser: boolean;
  score?: number | string;
  isBye?: boolean;
  position: "top" | "bottom";
  isDoubles?: boolean;
}) {
  if (!participant && !isBye) {
    return (
      <div className={cn(
        "flex items-center justify-between px-3 py-2.5 min-h-[44px]",
        position === "top" ? "rounded-t-lg" : "rounded-b-lg",
        "bg-[#0a0a0a]/50"
      )}>
        <span className="text-xs text-[#525252] italic">TBD</span>
        <span className="font-mono text-sm text-[#333]">-</span>
      </div>
    );
  }

  if (isBye && !participant) {
    return (
      <div className={cn(
        "flex items-center justify-between px-3 py-2.5 min-h-[44px]",
        position === "top" ? "rounded-t-lg" : "rounded-b-lg",
        "bg-[#0a0a0a]/30"
      )}>
        <span className="text-xs text-[#525252]">BYE</span>
        <span className="font-mono text-sm text-[#333]">-</span>
      </div>
    );
  }

  return (
    <motion.div
      className={cn(
        "flex items-center justify-between px-3 py-2.5 min-h-[44px] transition-colors",
        position === "top" ? "rounded-t-lg" : "rounded-b-lg",
        isWinner && "bg-emerald-500/10",
        isLoser && "bg-[#0a0a0a]/50 opacity-60",
        !isWinner && !isLoser && "bg-[#0a0a0a]/50 hover:bg-[#111]"
      )}
      initial={isWinner ? { backgroundColor: "transparent" } : undefined}
      animate={isWinner ? { backgroundColor: "rgba(16, 185, 129, 0.1)" } : undefined}
      transition={{ duration: 0.5 }}
    >
      <div className="flex items-center gap-2.5 min-w-0 flex-1">
        {/* Seed number */}
        {participant?.seed && (
          <span className="flex h-5 w-5 items-center justify-center rounded bg-[#1a1a1a] font-mono text-[10px] text-[#525252] shrink-0">
            {participant.seed}
          </span>
        )}

        {/* Avatar(s) */}
        <div className="flex -space-x-1.5 shrink-0">
          <Avatar className="h-7 w-7 border-2 border-[#0a0a0a]">
            <AvatarImage src={participant?.player.image || undefined} />
            <AvatarFallback className="bg-[#1a1a1a] text-[10px] text-[#737373]">
              {participant?.player.displayName?.[0]?.toUpperCase() || "?"}
            </AvatarFallback>
          </Avatar>
          {isDoubles && participant?.partner && (
            <Avatar className="h-7 w-7 border-2 border-[#0a0a0a]">
              <AvatarImage src={participant.partner.image || undefined} />
              <AvatarFallback className="bg-[#1a1a1a] text-[10px] text-[#737373]">
                {participant.partner.displayName?.[0]?.toUpperCase() || "?"}
              </AvatarFallback>
            </Avatar>
          )}
        </div>

        {/* Name */}
        <span className={cn(
          "text-sm truncate",
          isWinner ? "text-emerald-400 font-medium" : "text-[#a3a3a3]"
        )}>
          {isDoubles && participant?.partner
            ? `${participant.player.displayName} & ${participant.partner.displayName}`
            : participant?.player.displayName}
        </span>

        {/* Winner crown */}
        {isWinner && (
          <Crown className="h-3.5 w-3.5 text-amber-400 shrink-0" />
        )}
      </div>

      {/* Score */}
      <span className={cn(
        "font-mono text-sm font-bold shrink-0 ml-3 min-w-[20px] text-right",
        isWinner ? "text-white" : "text-[#525252]"
      )}>
        {score ?? "-"}
      </span>
    </motion.div>
  );
}

export function BracketMatch({
  match,
  roundName,
  isFinal = false,
  isDoubles = false,
  onClick,
}: BracketMatchProps) {
  const isCompleted = match.status === "completed" || match.status === "walkover";
  const isLive = match.status === "in_progress";
  const isReady = match.status === "ready";
  const isBye = match.status === "bye";
  const isNextMatch = match.isNextMatch && isReady;

  // Parse scores
  let p1Score: number | string | undefined;
  let p2Score: number | string | undefined;

  if (match.scores) {
    try {
      const scores = JSON.parse(match.scores) as { p1: number; p2: number }[];
      p1Score = scores.filter(s => s.p1 > s.p2).length;
      p2Score = scores.filter(s => s.p2 > s.p1).length;
    } catch {
      // Invalid JSON, leave undefined
    }
  }

  const isP1Winner = match.winnerId === match.participant1?.id;
  const isP2Winner = match.winnerId === match.participant2?.id;

  return (
    <motion.div
      className={cn(
        "relative w-52 rounded-lg border overflow-hidden cursor-pointer",
        "transition-all duration-200",
        isFinal && "w-56",
        isLive && "border-emerald-500/50 shadow-[0_0_20px_-5px_rgba(16,185,129,0.4)]",
        isNextMatch && "border-emerald-500/60 shadow-[0_0_30px_-5px_rgba(16,185,129,0.5)]",
        isReady && !isNextMatch && "border-blue-500/30 hover:border-blue-500/50",
        isCompleted && "border-[#1a1a1a] hover:border-[#262626]",
        !isCompleted && !isLive && !isReady && "border-[#1a1a1a]/50 opacity-70"
      )}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      animate={isNextMatch ? {
        boxShadow: [
          "0 0 20px -5px rgba(16, 185, 129, 0.3)",
          "0 0 35px -5px rgba(16, 185, 129, 0.6)",
          "0 0 20px -5px rgba(16, 185, 129, 0.3)",
        ],
      } : undefined}
      transition={isNextMatch ? { repeat: Infinity, duration: 2, ease: "easeInOut" } : undefined}
    >
      {/* Next match indicator - animated top bar */}
      {isNextMatch && (
        <motion.div
          className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-emerald-400 to-transparent"
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
        />
      )}

      {/* Live indicator */}
      {isLive && (
        <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-emerald-500 to-transparent" />
      )}

      {/* Final indicator */}
      {isFinal && isCompleted && (
        <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-amber-500 to-transparent" />
      )}

      {/* Match status header */}
      <div className={cn(
        "flex items-center justify-between px-3 py-1.5 border-b",
        isLive ? "bg-emerald-500/10 border-emerald-500/20" :
        isNextMatch ? "bg-emerald-500/10 border-emerald-500/20" :
        "bg-[#111] border-[#1a1a1a]"
      )}>
        <div className="flex items-center gap-1.5">
          {isLive && (
            <>
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
              </span>
              <span className="text-[9px] font-bold uppercase tracking-wider text-emerald-400">Live</span>
            </>
          )}
          {isNextMatch && (
            <>
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="text-[9px] font-bold uppercase tracking-wider text-emerald-400">Next</span>
            </>
          )}
          {isReady && !isNextMatch && (
            <>
              <Clock className="h-3 w-3 text-blue-400" />
              <span className="text-[9px] font-medium uppercase tracking-wider text-blue-400">Ready</span>
            </>
          )}
          {isCompleted && (
            <span className="text-[9px] font-medium uppercase tracking-wider text-[#525252]">Final</span>
          )}
          {!isCompleted && !isLive && !isReady && (
            <span className="text-[9px] uppercase tracking-wider text-[#333]">Pending</span>
          )}
        </div>
        {roundName && (
          <span className="text-[9px] uppercase tracking-wider text-[#525252]">{roundName}</span>
        )}
      </div>

      {/* Participants */}
      <div className="bg-[#0a0a0a]">
        <ParticipantRow
          participant={match.participant1}
          isWinner={isP1Winner}
          isLoser={isCompleted && !isP1Winner && !!match.participant1}
          score={p1Score}
          isBye={isBye && !match.participant2}
          position="top"
          isDoubles={isDoubles}
        />
        <div className="h-px bg-[#1a1a1a]" />
        <ParticipantRow
          participant={match.participant2}
          isWinner={isP2Winner}
          isLoser={isCompleted && !isP2Winner && !!match.participant2}
          score={p2Score}
          isBye={isBye && !match.participant1}
          position="bottom"
          isDoubles={isDoubles}
        />
      </div>
    </motion.div>
  );
}
