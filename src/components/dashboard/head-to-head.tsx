"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { Swords } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatDistanceToNow } from "@/lib/format";
import { cn } from "@/lib/utils";

interface HeadToHeadRecord {
  opponent: {
    id: string;
    displayName: string;
    elo: number;
    avatarUrl: string | null;
  };
  wins: number;
  losses: number;
  lastMatch: Date;
}

interface HeadToHeadProps {
  records: HeadToHeadRecord[];
}

type RivalryStatus = "dominating" | "advantage" | "even" | "nemesis";

function getRivalryStatus(wins: number, losses: number): RivalryStatus {
  const total = wins + losses;
  if (total === 0) return "even";
  const winRate = wins / total;

  if (winRate >= 0.7) return "dominating";
  if (winRate >= 0.55) return "advantage";
  if (winRate >= 0.45) return "even";
  return "nemesis";
}

const statusConfig: Record<RivalryStatus, { label: string; color: string; bg: string }> = {
  dominating: {
    label: "Dominating",
    color: "text-emerald-400",
    bg: "bg-emerald-500/10",
  },
  advantage: {
    label: "Advantage",
    color: "text-emerald-500/80",
    bg: "bg-emerald-500/5",
  },
  even: {
    label: "Even",
    color: "text-[#737373]",
    bg: "bg-[#262626]/50",
  },
  nemesis: {
    label: "Nemesis",
    color: "text-amber-500",
    bg: "bg-amber-500/10",
  },
};

export function HeadToHead({ records }: HeadToHeadProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
      className="relative overflow-hidden rounded-xl border border-[#1a1a1a] bg-[#0a0a0a]"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#1a1a1a] px-5 py-4">
        <div className="flex items-center gap-2.5">
          <Swords className="h-4 w-4 text-[#525252]" />
          <h2 className="text-sm font-medium tracking-wide">Your Rivalries</h2>
        </div>
        {records.length > 0 && (
          <span className="text-[10px] font-medium uppercase tracking-wider text-[#525252]">
            Singles
          </span>
        )}
      </div>

      {/* Records List */}
      <div className="divide-y divide-[#1a1a1a]/50">
        {records.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10">
            <Swords className="mb-3 h-8 w-8 text-[#262626]" />
            <p className="text-sm text-[#525252]">No rivalries yet</p>
            <p className="mt-1 text-[11px] text-[#404040]">Play more matches to build your history</p>
          </div>
        ) : (
          records.map((record, index) => (
            <RecordRow
              key={record.opponent.id}
              record={record}
              delay={index * 0.05}
            />
          ))
        )}
      </div>
    </motion.div>
  );
}

function RecordRow({
  record,
  delay,
}: {
  record: HeadToHeadRecord;
  delay: number;
}) {
  const { opponent, wins, losses, lastMatch } = record;
  const total = wins + losses;
  const winPercent = total > 0 ? (wins / total) * 100 : 50;
  const status = getRivalryStatus(wins, losses);
  const config = statusConfig[status];

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3, delay }}
      className="group relative px-5 py-3.5 transition-colors hover:bg-[#111]"
    >
      <div className="flex items-center gap-3">
        {/* Opponent Avatar */}
        <Link href={`/players/${opponent.id}`}>
          <Avatar className="h-9 w-9 border border-[#262626] transition-all hover:border-[#404040]">
            <AvatarImage src={opponent.avatarUrl || undefined} />
            <AvatarFallback className="bg-[#1a1a1a] text-xs">
              {opponent.displayName.charAt(0)}
            </AvatarFallback>
          </Avatar>
        </Link>

        {/* Opponent Info & Record */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <Link
              href={`/players/${opponent.id}`}
              className="truncate text-sm font-medium text-white hover:underline"
            >
              {opponent.displayName}
            </Link>
            <span className="font-mono text-[10px] text-[#525252]">
              {opponent.elo}
            </span>
          </div>

          {/* Win/Loss Bar */}
          <div className="mt-2 flex items-center gap-2">
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[#1a1a1a]">
              <motion.div
                className="h-full rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${winPercent}%` }}
                transition={{ duration: 0.6, delay: delay + 0.2, ease: "easeOut" }}
                style={{
                  background: winPercent > 50
                    ? `linear-gradient(90deg, #10b981 0%, #10b981 ${(50/winPercent)*100}%, #059669 100%)`
                    : "#10b981",
                }}
              />
            </div>
          </div>
        </div>

        {/* W-L Count */}
        <div className="flex items-center gap-1 font-mono text-sm">
          <span className="font-bold text-emerald-500">{wins}</span>
          <span className="text-[#333]">-</span>
          <span className="text-[#525252]">{losses}</span>
        </div>

        {/* Status Badge */}
        <div
          className={cn(
            "rounded px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
            config.bg,
            config.color
          )}
        >
          {config.label}
        </div>
      </div>

      {/* Last Match */}
      <div className="mt-2 text-[10px] text-[#404040]">
        Last played {formatDistanceToNow(lastMatch)}
      </div>
    </motion.div>
  );
}
