"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { Flame } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

interface Player {
  id: string;
  slug: string;
  displayName: string;
  elo: number;
  currentStreak: number;
  matchesWon: number;
  avatarUrl: string | null;
}

interface HotStreaksProps {
  streaks: Player[];
}

export function HotStreaks({ streaks }: HotStreaksProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.1 }}
      className="relative overflow-hidden rounded-xl border border-[#1a1a1a] bg-[#0a0a0a]"
    >
      {/* Ambient fire glow at top */}
      {streaks.length > 0 && (
        <div
          className="pointer-events-none absolute -top-20 left-1/2 h-40 w-40 -translate-x-1/2"
          style={{
            background: "radial-gradient(circle, rgba(251,146,60,0.08) 0%, transparent 70%)",
          }}
        />
      )}

      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#1a1a1a] px-5 py-4">
        <div className="flex items-center gap-2.5">
          <motion.div
            animate={{
              scale: [1, 1.1, 1],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          >
            <Flame className="h-4 w-4 text-orange-500" />
          </motion.div>
          <h2 className="text-sm font-medium tracking-wide">Hot Streaks</h2>
        </div>
        {streaks.length > 0 && (
          <span className="text-[10px] font-medium uppercase tracking-wider text-[#525252]">
            {streaks.length} on fire
          </span>
        )}
      </div>

      {/* Streaks List */}
      <div className="divide-y divide-[#1a1a1a]/50">
        {streaks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10">
            <Flame className="mb-3 h-8 w-8 text-[#262626]" />
            <p className="text-sm text-[#525252]">No active streaks</p>
            <p className="mt-1 text-[11px] text-[#404040]">Win consecutive matches to get here</p>
          </div>
        ) : (
          streaks.map((player, index) => (
            <StreakRow
              key={player.id}
              player={player}
              rank={index + 1}
              isTop={index === 0}
              delay={index * 0.05}
            />
          ))
        )}
      </div>
    </motion.div>
  );
}

function StreakRow({
  player,
  rank,
  isTop,
  delay,
}: {
  player: Player;
  rank: number;
  isTop: boolean;
  delay: number;
}) {
  // Calculate intensity based on streak (3 = mild, 10+ = intense)
  const intensity = Math.min(player.currentStreak / 10, 1);
  const glowOpacity = 0.1 + intensity * 0.25;
  const fireColor = player.currentStreak >= 5
    ? "text-orange-400"
    : player.currentStreak >= 3
    ? "text-orange-500"
    : "text-orange-600";

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3, delay }}
    >
      <Link
        href={`/players/${player.slug}`}
        className="group relative flex items-center gap-3 px-5 py-3 transition-colors hover:bg-[#111]"
      >
        {/* Top streaker glow effect */}
        {isTop && (
          <motion.div
            className="pointer-events-none absolute inset-0"
            animate={{
              opacity: [glowOpacity * 0.5, glowOpacity, glowOpacity * 0.5],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            style={{
              background: `linear-gradient(90deg, rgba(251,146,60,${glowOpacity}) 0%, transparent 50%)`,
            }}
          />
        )}

        {/* Rank indicator */}
        <div className="relative flex h-6 w-6 items-center justify-center">
          <span className={cn(
            "font-mono text-sm font-bold",
            isTop ? "text-orange-400" : "text-[#525252]"
          )}>
            {rank}
          </span>
        </div>

        {/* Avatar */}
        <Avatar className={cn(
          "h-8 w-8 border transition-all",
          isTop ? "border-orange-500/50" : "border-[#262626]",
          "group-hover:border-[#404040]"
        )}>
          <AvatarImage src={player.avatarUrl || undefined} />
          <AvatarFallback className="bg-[#1a1a1a] text-xs">
            {player.displayName.charAt(0)}
          </AvatarFallback>
        </Avatar>

        {/* Player info */}
        <div className="flex-1 min-w-0">
          <p className="truncate text-sm font-medium text-white group-hover:text-white/90">
            {player.displayName}
          </p>
          <p className="text-[11px] text-[#525252]">
            {player.matchesWon} wins
          </p>
        </div>

        {/* Streak badge */}
        <div className="flex items-center gap-1.5">
          <motion.div
            animate={isTop ? {
              scale: [1, 1.15, 1],
              rotate: [0, 5, -5, 0],
            } : {}}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          >
            <Flame className={cn("h-4 w-4", fireColor)} />
          </motion.div>
          <span className={cn(
            "font-mono text-sm font-bold",
            isTop ? "text-orange-400" : "text-white"
          )}>
            {player.currentStreak}
          </span>
        </div>

        {/* ELO badge */}
        <div className="rounded bg-[#1a1a1a] px-2 py-0.5">
          <span className="font-mono text-[11px] text-[#737373]">
            {player.elo}
          </span>
        </div>
      </Link>
    </motion.div>
  );
}
