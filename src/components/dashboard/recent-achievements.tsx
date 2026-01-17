"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { Award } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { formatDistanceToNow } from "@/lib/format";
import { cn } from "@/lib/utils";

interface RecentAchievement {
  id: string;
  earnedAt: Date;
  playerId: string;
  playerName: string;
  playerAvatarUrl: string | null;
  achievementName: string;
  achievementIcon: string;
  achievementTier: "bronze" | "silver" | "gold" | "platinum";
  achievementDescription: string;
}

interface RecentAchievementsProps {
  achievements: RecentAchievement[];
}

const tierStyles = {
  bronze: {
    color: "#cd7f32",
    bg: "bg-[#cd7f32]/10",
    border: "border-[#cd7f32]/30",
    glow: "0 0 12px rgba(205, 127, 50, 0.3)",
  },
  silver: {
    color: "#c0c0c0",
    bg: "bg-[#c0c0c0]/10",
    border: "border-[#c0c0c0]/30",
    glow: "0 0 12px rgba(192, 192, 192, 0.3)",
  },
  gold: {
    color: "#ffd700",
    bg: "bg-[#ffd700]/10",
    border: "border-[#ffd700]/30",
    glow: "0 0 15px rgba(255, 215, 0, 0.4)",
  },
  platinum: {
    color: "#e5e4e2",
    bg: "bg-[#e5e4e2]/10",
    border: "border-[#e5e4e2]/40",
    glow: "0 0 20px rgba(229, 228, 226, 0.5)",
  },
};

export function RecentAchievements({ achievements }: RecentAchievementsProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.15 }}
      className="relative overflow-hidden rounded-xl border border-[#1a1a1a] bg-[#0a0a0a]"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#1a1a1a] px-5 py-4">
        <div className="flex items-center gap-2.5">
          <Award className="h-4 w-4 text-[#ffd700]" />
          <h2 className="text-sm font-medium tracking-wide">Recent Achievements</h2>
        </div>
        {achievements.length > 0 && (
          <span className="text-[10px] font-medium uppercase tracking-wider text-[#525252]">
            Community
          </span>
        )}
      </div>

      {/* Achievements List */}
      <div className="divide-y divide-[#1a1a1a]/50">
        {achievements.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10">
            <Award className="mb-3 h-8 w-8 text-[#262626]" />
            <p className="text-sm text-[#525252]">No achievements yet</p>
            <p className="mt-1 text-[11px] text-[#404040]">Play matches to unlock achievements</p>
          </div>
        ) : (
          <TooltipProvider delayDuration={300}>
            {achievements.map((achievement, index) => (
              <AchievementRow
                key={achievement.id}
                achievement={achievement}
                delay={index * 0.05}
              />
            ))}
          </TooltipProvider>
        )}
      </div>
    </motion.div>
  );
}

function AchievementRow({
  achievement,
  delay,
}: {
  achievement: RecentAchievement;
  delay: number;
}) {
  const tier = tierStyles[achievement.achievementTier];

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3, delay }}
      className="group relative px-5 py-3 transition-colors hover:bg-[#111]"
    >
      <div className="flex items-center gap-3">
        {/* Player Avatar */}
        <Link href={`/players/${achievement.playerId}`}>
          <Avatar className="h-7 w-7 border border-[#262626] transition-all hover:border-[#404040]">
            <AvatarImage src={achievement.playerAvatarUrl || undefined} />
            <AvatarFallback className="bg-[#1a1a1a] text-[10px]">
              {achievement.playerName.charAt(0)}
            </AvatarFallback>
          </Avatar>
        </Link>

        {/* Achievement Info */}
        <div className="flex-1 min-w-0">
          <p className="truncate text-[13px] text-[#a3a3a3]">
            <Link
              href={`/players/${achievement.playerId}`}
              className="font-medium text-white hover:underline"
            >
              {achievement.playerName}
            </Link>
            <span className="mx-1.5 text-[#525252]">earned</span>
            <span style={{ color: tier.color }} className="font-medium">
              {achievement.achievementName}
            </span>
          </p>
          <p className="mt-0.5 text-[10px] text-[#525252]">
            {formatDistanceToNow(achievement.earnedAt)}
          </p>
        </div>

        {/* Achievement Icon with Tier Glow */}
        <Tooltip>
          <TooltipTrigger asChild>
            <motion.div
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded-full border",
                tier.bg,
                tier.border
              )}
              style={{ boxShadow: tier.glow }}
              whileHover={{ scale: 1.1 }}
              transition={{ duration: 0.2 }}
            >
              <span className="text-base">{achievement.achievementIcon}</span>
            </motion.div>
          </TooltipTrigger>
          <TooltipContent
            side="left"
            className="max-w-[200px] border-[#262626] bg-[#1a1a1a] text-xs"
          >
            <p className="font-medium" style={{ color: tier.color }}>
              {achievement.achievementName}
            </p>
            <p className="mt-1 text-[#737373]">{achievement.achievementDescription}</p>
            <p className="mt-1.5 text-[10px] uppercase tracking-wider text-[#525252]">
              {achievement.achievementTier} tier
            </p>
          </TooltipContent>
        </Tooltip>
      </div>
    </motion.div>
  );
}
