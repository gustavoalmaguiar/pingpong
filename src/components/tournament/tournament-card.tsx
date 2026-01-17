"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import {
  Calendar,
  MapPin,
  Trophy,
  Users,
  ChevronRight,
  Zap,
  Crown,
  Check,
  UserCheck,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type TournamentStatus = "draft" | "enrollment" | "in_progress" | "completed" | "cancelled";
type TournamentFormat = "single_elimination" | "double_elimination" | "swiss" | "round_robin_knockout";

interface TournamentCardProps {
  tournament: {
    id: string;
    name: string;
    format: TournamentFormat;
    matchType: "singles" | "doubles";
    status: TournamentStatus;
    scheduledDate: Date | null;
    scheduledTime: string | null;
    location: string | null;
    prizeDescription: string | null;
    enrollmentCount: number;
    currentRound?: number | null;
    totalRounds?: number | null;
  };
  isEnrolled?: boolean;
  onEnroll?: () => void;
  onWithdraw?: () => void;
}

const statusConfig: Record<TournamentStatus, { label: string; className: string; icon?: React.ReactNode }> = {
  draft: { label: "DRAFT", className: "bg-[#333]/50 text-[#737373]" },
  enrollment: { label: "OPEN", className: "bg-blue-500/20 text-blue-400 border border-blue-500/30" },
  in_progress: {
    label: "LIVE",
    className: "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30",
    icon: <span className="relative flex h-2 w-2 mr-1.5"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span><span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span></span>
  },
  completed: { label: "ENDED", className: "bg-[#262626]/50 text-[#525252]" },
  cancelled: { label: "CANCELLED", className: "bg-red-500/20 text-red-400" },
};

const formatLabels: Record<TournamentFormat, string> = {
  single_elimination: "Single Elim",
  double_elimination: "Double Elim",
  swiss: "Swiss",
  round_robin_knockout: "Groups + KO",
};

export function TournamentCard({
  tournament,
  isEnrolled = false,
  onEnroll,
  onWithdraw,
}: TournamentCardProps) {
  const router = useRouter();
  const status = statusConfig[tournament.status];
  const isLive = tournament.status === "in_progress";
  const isOpen = tournament.status === "enrollment";

  const handleCardClick = (e: React.MouseEvent) => {
    // Don't navigate if clicking on a button
    if ((e.target as HTMLElement).closest("button")) {
      return;
    }
    router.push(`/tournaments/${tournament.id}`);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.01, y: -2 }}
      transition={{ duration: 0.2 }}
      onClick={handleCardClick}
      className={cn(
        "group relative overflow-hidden rounded-xl border bg-[#0a0a0a] p-5 cursor-pointer",
        isLive
          ? "border-emerald-500/30 shadow-[0_0_30px_-10px_rgba(16,185,129,0.3)]"
          : isOpen && isEnrolled
            ? "border-cyan-500/40 shadow-[0_0_40px_-10px_rgba(6,182,212,0.25)]"
            : "border-[#1a1a1a] hover:border-[#262626]"
      )}
    >
      {/* Enrolled corner badge */}
      {isOpen && isEnrolled && (
        <div className="absolute -right-8 -top-8 h-16 w-16">
          <div className="absolute inset-0 bg-gradient-to-br from-cyan-500 to-teal-500 rotate-45 translate-y-6" />
          <Check className="absolute bottom-1.5 left-1.5 h-4 w-4 text-white" strokeWidth={3} />
        </div>
      )}

      {/* Gradient accent line at top */}
      <div className={cn(
        "absolute inset-x-0 top-0 h-[2px]",
        isLive && "bg-gradient-to-r from-transparent via-emerald-500 to-transparent",
        isOpen && isEnrolled && "bg-gradient-to-r from-cyan-500 via-teal-400 to-cyan-500",
        isOpen && !isEnrolled && "bg-gradient-to-r from-transparent via-blue-500 to-transparent",
        tournament.status === "completed" && "bg-gradient-to-r from-transparent via-amber-500 to-transparent"
      )} />

      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <Badge className={cn("text-[10px] font-bold tracking-wider flex items-center", status.className)}>
            {status.icon}
            {status.label}
          </Badge>
          <span className="text-[10px] uppercase tracking-widest text-[#525252]">
            {formatLabels[tournament.format]}
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-[#525252]">
          {tournament.matchType === "doubles" ? (
            <Users className="h-3 w-3" />
          ) : (
            <Zap className="h-3 w-3" />
          )}
          {tournament.matchType}
        </div>
      </div>

      {/* Tournament Name */}
      <h3 className="mt-4 text-lg font-semibold text-white group-hover:text-white/90 transition-colors">
        {tournament.name}
      </h3>

      {/* Details Section */}
      <div className="mt-4 space-y-2.5">
        {tournament.status !== "in_progress" && tournament.scheduledDate && (
          <div className="flex items-center gap-2.5 text-sm text-[#737373]">
            <Calendar className="h-4 w-4 text-[#525252]" />
            <span>
              {format(new Date(tournament.scheduledDate), "MMM d, yyyy")}
              {tournament.scheduledTime && ` @ ${tournament.scheduledTime}`}
            </span>
          </div>
        )}

        {tournament.status === "in_progress" && tournament.currentRound && (
          <div className="flex items-center gap-2.5 text-sm">
            <Trophy className="h-4 w-4 text-emerald-500" />
            <span className="text-emerald-400 font-medium">
              Round {tournament.currentRound} of {tournament.totalRounds}
            </span>
          </div>
        )}

        {tournament.location && (
          <div className="flex items-center gap-2.5 text-sm text-[#737373]">
            <MapPin className="h-4 w-4 text-[#525252]" />
            <span>{tournament.location}</span>
          </div>
        )}

        {tournament.prizeDescription && (
          <div className="flex items-center gap-2.5 text-sm">
            <Crown className="h-4 w-4 text-amber-500" />
            <span className="text-amber-400/90 italic">
              {tournament.prizeDescription}
            </span>
          </div>
        )}
      </div>

      {/* Enrollment Progress / Match Progress */}
      <div className="mt-5">
        {tournament.status === "enrollment" && !isEnrolled && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-[#525252] uppercase tracking-wider">Enrolled</span>
              <span className="text-white font-mono font-medium">
                {tournament.enrollmentCount} players
              </span>
            </div>
            <div className="h-1 overflow-hidden rounded-full bg-[#1a1a1a]">
              <motion.div
                className="h-full bg-gradient-to-r from-blue-600 to-blue-400"
                initial={{ width: 0 }}
                animate={{ width: `${Math.min((tournament.enrollmentCount / 16) * 100, 100)}%` }}
                transition={{ duration: 0.8, ease: "easeOut" }}
              />
            </div>
          </div>
        )}

        {tournament.status === "enrollment" && isEnrolled && (
          <div className="flex items-center gap-3 rounded-lg bg-cyan-500/10 p-3 border border-cyan-500/20">
            <motion.div
              className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-500 to-teal-500 text-white"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 400, damping: 15 }}
            >
              <UserCheck className="h-5 w-5" />
            </motion.div>
            <div className="flex-1">
              <p className="text-[10px] uppercase tracking-widest text-cyan-400/70">You're In!</p>
              <p className="text-sm font-medium text-cyan-300">{tournament.enrollmentCount} players enrolled</p>
            </div>
          </div>
        )}

        {tournament.status === "in_progress" && (
          <div className="flex items-center gap-3 rounded-lg bg-[#111] p-3 border border-[#1a1a1a]">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400">
              <Zap className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-widest text-[#525252]">Tournament Active</p>
              <p className="text-sm font-medium text-white">{tournament.enrollmentCount} competing</p>
            </div>
          </div>
        )}

        {tournament.status === "completed" && (
          <div className="flex items-center gap-3 rounded-lg bg-amber-500/5 p-3 border border-amber-500/10">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10 text-amber-400">
              <Trophy className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-widest text-[#525252]">Completed</p>
              <p className="text-sm font-medium text-amber-400">{tournament.enrollmentCount} participated</p>
            </div>
          </div>
        )}
      </div>

      {/* Action Button */}
      <div className="mt-5">
        {tournament.status === "enrollment" && !isEnrolled && (
          <Button
            className="w-full bg-white text-black hover:bg-white/90 font-medium"
            onClick={onEnroll}
          >
            Enroll Now
            <ChevronRight className="ml-1 h-4 w-4" />
          </Button>
        )}

        {tournament.status === "enrollment" && isEnrolled && (
          <div className="group/btn relative">
            <Button
              variant="outline"
              className="w-full border-cyan-500/30 bg-cyan-500/5 text-cyan-400 hover:bg-red-500/10 hover:border-red-500/30 hover:text-red-400 transition-all duration-200"
              onClick={onWithdraw}
            >
              <span className="flex items-center gap-2 group-hover/btn:hidden">
                <Check className="h-4 w-4" />
                Enrolled
              </span>
              <span className="hidden items-center gap-2 group-hover/btn:flex">
                Withdraw
              </span>
            </Button>
          </div>
        )}

        {(tournament.status === "in_progress" || tournament.status === "completed") && (
          <Button
            variant="outline"
            className={cn(
              "w-full border-[#262626] hover:bg-[#1a1a1a]",
              isLive && "border-emerald-500/30 hover:border-emerald-500/50 text-emerald-400"
            )}
            asChild
          >
            <Link href={`/tournaments/${tournament.id}`}>
              View Bracket
              <ChevronRight className="ml-1 h-4 w-4" />
            </Link>
          </Button>
        )}
      </div>
    </motion.div>
  );
}
