"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import { Calendar, Clock, MapPin, Trophy, Sparkles, Users, Zap, ChevronDown, Target, Crown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

interface TournamentInfoProps {
  tournament: {
    name: string;
    description?: string | null;
    format: "single_elimination" | "double_elimination" | "swiss" | "round_robin_knockout";
    matchType: "singles" | "doubles";
    status: "draft" | "enrollment" | "in_progress" | "completed" | "cancelled";
    scheduledDate: Date | null;
    scheduledTime: string | null;
    location: string | null;
    prizeDescription: string | null;
    bestOf: number;
    bestOfGroupStage?: number | null;
    bestOfEarlyRounds?: number | null;
    bestOfSemiFinals?: number | null;
    bestOfFinals?: number | null;
    enrollmentCount?: number;
    currentRound?: number | null;
    totalRounds?: number | null;
  };
}

const formatLabels = {
  single_elimination: "Single Elimination",
  double_elimination: "Double Elimination",
  swiss: "Swiss System",
  round_robin_knockout: "Round Robin + Knockout",
};

const statusLabels = {
  draft: "Draft",
  enrollment: "Registration Open",
  in_progress: "In Progress",
  completed: "Completed",
  cancelled: "Cancelled",
};

export function TournamentInfo({ tournament }: TournamentInfoProps) {
  const isLive = tournament.status === "in_progress";
  const isCompleted = tournament.status === "completed";
  const [showBestOfDetails, setShowBestOfDetails] = useState(false);

  // Check if tournament has custom stage bestOf settings
  const hasCustomBestOf =
    tournament.bestOfGroupStage != null ||
    tournament.bestOfEarlyRounds != null ||
    tournament.bestOfSemiFinals != null ||
    tournament.bestOfFinals != null;

  // Get stage breakdown for display
  const getBestOfStages = () => {
    const stages: { label: string; value: number; icon: typeof Zap }[] = [];

    if (tournament.format === "swiss") {
      stages.push({
        label: "All Rounds",
        value: tournament.bestOfGroupStage ?? tournament.bestOf,
        icon: Target,
      });
    } else if (tournament.format === "round_robin_knockout") {
      stages.push({
        label: "Groups",
        value: tournament.bestOfGroupStage ?? tournament.bestOf,
        icon: Target,
      });
      stages.push({
        label: "Early KO",
        value: tournament.bestOfEarlyRounds ?? tournament.bestOf,
        icon: Zap,
      });
      stages.push({
        label: "Semis",
        value: tournament.bestOfSemiFinals ?? tournament.bestOfEarlyRounds ?? tournament.bestOf,
        icon: Trophy,
      });
      stages.push({
        label: "Finals",
        value: tournament.bestOfFinals ?? tournament.bestOf,
        icon: Crown,
      });
    } else {
      stages.push({
        label: "Early",
        value: tournament.bestOfEarlyRounds ?? tournament.bestOf,
        icon: Zap,
      });
      stages.push({
        label: "Semis",
        value: tournament.bestOfSemiFinals ?? tournament.bestOfEarlyRounds ?? tournament.bestOf,
        icon: Trophy,
      });
      stages.push({
        label: "Finals",
        value: tournament.bestOfFinals ?? tournament.bestOf,
        icon: Crown,
      });
    }

    return stages;
  };

  const infoItems = [
    {
      icon: Calendar,
      label: "Date",
      value: tournament.scheduledDate
        ? format(new Date(tournament.scheduledDate), "EEEE, MMMM d, yyyy")
        : "TBD",
      accent: false,
    },
    {
      icon: Clock,
      label: "Time",
      value: tournament.scheduledTime || "TBD",
      accent: false,
    },
    {
      icon: MapPin,
      label: "Location",
      value: tournament.location || "TBD",
      accent: false,
    },
    {
      icon: Sparkles,
      label: "Prize",
      value: tournament.prizeDescription || "Eternal glory",
      accent: true,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header with status */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Badge
              className={cn(
                "text-[10px] font-bold uppercase tracking-wider",
                isLive && "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30",
                isCompleted && "bg-amber-500/20 text-amber-400 border border-amber-500/30",
                tournament.status === "enrollment" && "bg-blue-500/20 text-blue-400 border border-blue-500/30",
                tournament.status === "draft" && "bg-[#333]/50 text-[#737373]",
                tournament.status === "cancelled" && "bg-red-500/20 text-red-400"
              )}
            >
              {isLive && (
                <span className="relative flex h-2 w-2 mr-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
              )}
              {statusLabels[tournament.status]}
            </Badge>
            <span className="text-[11px] uppercase tracking-widest text-[#525252]">
              {formatLabels[tournament.format]}
            </span>
          </div>
          <h1 className="text-2xl font-bold text-white sm:text-3xl">
            {tournament.name}
          </h1>
          {tournament.description && (
            <p className="mt-2 text-sm text-[#737373] max-w-xl">
              {tournament.description}
            </p>
          )}
        </div>

        {/* Quick stats */}
        <div className="flex gap-4">
          <div className="flex flex-col items-center rounded-lg border border-[#1a1a1a] bg-[#0a0a0a] p-3 min-w-[80px]">
            {tournament.matchType === "doubles" ? (
              <Users className="h-5 w-5 text-[#525252] mb-1" />
            ) : (
              <Zap className="h-5 w-5 text-[#525252] mb-1" />
            )}
            <span className="text-xs text-[#525252] uppercase tracking-wider">Type</span>
            <span className="text-sm font-medium text-white capitalize">{tournament.matchType}</span>
          </div>

          <div className="relative">
            <button
              onClick={() => hasCustomBestOf && setShowBestOfDetails(!showBestOfDetails)}
              className={cn(
                "flex flex-col items-center rounded-lg border border-[#1a1a1a] bg-[#0a0a0a] p-3 min-w-[80px] transition-colors",
                hasCustomBestOf && "hover:border-[#333] cursor-pointer"
              )}
            >
              <Trophy className="h-5 w-5 text-[#525252] mb-1" />
              <span className="text-xs text-[#525252] uppercase tracking-wider">Best of</span>
              <span className="text-sm font-medium text-white flex items-center gap-1">
                {hasCustomBestOf ? (
                  <>
                    Varies
                    <ChevronDown
                      className={cn(
                        "h-3 w-3 text-[#525252] transition-transform",
                        showBestOfDetails && "rotate-180"
                      )}
                    />
                  </>
                ) : (
                  tournament.bestOf
                )}
              </span>
            </button>

            {/* Stage breakdown dropdown */}
            <AnimatePresence>
              {showBestOfDetails && hasCustomBestOf && (
                <motion.div
                  initial={{ opacity: 0, y: -5, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -5, scale: 0.95 }}
                  className="absolute top-full left-1/2 -translate-x-1/2 mt-2 z-10 rounded-lg border border-[#1a1a1a] bg-[#0a0a0a] p-3 shadow-xl min-w-[140px]"
                >
                  <div className="space-y-2">
                    {getBestOfStages().map((stage) => (
                      <div
                        key={stage.label}
                        className="flex items-center justify-between gap-4"
                      >
                        <div className="flex items-center gap-2">
                          <stage.icon className="h-3.5 w-3.5 text-[#525252]" />
                          <span className="text-xs text-[#737373]">{stage.label}</span>
                        </div>
                        <span className="text-xs font-bold font-mono text-white">
                          Bo{stage.value}
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-2 pt-2 border-t border-[#1a1a1a]">
                    <span className="text-[10px] text-[#525252]">
                      Default: Bo{tournament.bestOf}
                    </span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {tournament.enrollmentCount !== undefined && (
            <div className="flex flex-col items-center rounded-lg border border-[#1a1a1a] bg-[#0a0a0a] p-3 min-w-[80px]">
              <Users className="h-5 w-5 text-[#525252] mb-1" />
              <span className="text-xs text-[#525252] uppercase tracking-wider">Players</span>
              <span className="text-sm font-medium text-white">{tournament.enrollmentCount}</span>
            </div>
          )}
        </div>
      </div>

      {/* Progress indicator for live tournaments */}
      {isLive && tournament.currentRound && tournament.totalRounds && (
        <motion.div
          className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-4"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-emerald-400">Tournament Progress</span>
            <span className="text-sm text-emerald-400">
              Round {tournament.currentRound} of {tournament.totalRounds}
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-[#1a1a1a]">
            <motion.div
              className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400"
              initial={{ width: 0 }}
              animate={{ width: `${(tournament.currentRound / tournament.totalRounds) * 100}%` }}
              transition={{ duration: 0.8, ease: "easeOut" }}
            />
          </div>
        </motion.div>
      )}

      {/* Info grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {infoItems.map((item, index) => (
          <motion.div
            key={item.label}
            className={cn(
              "rounded-lg border p-4 transition-colors",
              item.accent
                ? "border-amber-500/20 bg-amber-500/5 hover:border-amber-500/30"
                : "border-[#1a1a1a] bg-[#0a0a0a] hover:border-[#262626]"
            )}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <div className="flex items-center gap-2 mb-2">
              <item.icon className={cn(
                "h-4 w-4",
                item.accent ? "text-amber-400" : "text-[#525252]"
              )} />
              <span className="text-[10px] uppercase tracking-widest text-[#525252]">
                {item.label}
              </span>
            </div>
            <p className={cn(
              "text-sm font-medium",
              item.accent ? "text-amber-400" : "text-white"
            )}>
              {item.value}
            </p>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
