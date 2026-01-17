"use client";

import { useState, useTransition } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Trophy, Filter, Calendar, Zap, Clock, CheckCircle } from "lucide-react";
import { TournamentCard } from "@/components/tournament";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { enrollInTournament, withdrawFromTournament, getEnrollmentStatus } from "@/actions/tournament-enrollment";
import type { TournamentWithDetails } from "@/actions/tournaments";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

type StatusFilter = "all" | "enrollment" | "in_progress" | "completed";
type FormatFilter = "all" | "single_elimination" | "double_elimination" | "swiss" | "round_robin_knockout";

interface TournamentsClientProps {
  tournaments: TournamentWithDetails[];
  currentPlayerId?: string | null;
  initialEnrolledIds?: string[];
}

export function TournamentsClient({ tournaments, currentPlayerId, initialEnrolledIds = [] }: TournamentsClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [formatFilter, setFormatFilter] = useState<FormatFilter>("all");
  const [enrolledTournaments, setEnrolledTournaments] = useState<Set<string>>(() => new Set(initialEnrolledIds));

  // Filter tournaments
  const filteredTournaments = tournaments.filter((t) => {
    if (statusFilter !== "all" && t.status !== statusFilter) return false;
    if (formatFilter !== "all" && t.format !== formatFilter) return false;
    return true;
  });

  // Group by status for counts
  const statusCounts = {
    all: tournaments.length,
    enrollment: tournaments.filter((t) => t.status === "enrollment").length,
    in_progress: tournaments.filter((t) => t.status === "in_progress").length,
    completed: tournaments.filter((t) => t.status === "completed").length,
  };

  const handleEnroll = async (tournamentId: string) => {
    startTransition(async () => {
      try {
        await enrollInTournament(tournamentId);
        setEnrolledTournaments((prev) => new Set([...prev, tournamentId]));
        toast.success("Successfully enrolled in tournament!");
        router.refresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to enroll");
      }
    });
  };

  const handleWithdraw = async (tournamentId: string) => {
    startTransition(async () => {
      try {
        await withdrawFromTournament(tournamentId);
        setEnrolledTournaments((prev) => {
          const next = new Set(prev);
          next.delete(tournamentId);
          return next;
        });
        toast.success("Successfully withdrawn from tournament");
        router.refresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to withdraw");
      }
    });
  };

  return (
    <div className="min-h-screen bg-black pl-16">
      <div className="mx-auto max-w-6xl px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Trophy className="h-6 w-6 text-amber-400" />
            <h1 className="text-2xl font-bold text-white">Tournaments</h1>
          </div>
          <p className="text-sm text-[#737373]">
            Compete in tournaments for glory, bragging rights, and mystery prizes
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
          {/* Status tabs */}
          <Tabs
            value={statusFilter}
            onValueChange={(v) => setStatusFilter(v as StatusFilter)}
            className="w-full sm:w-auto"
          >
            <TabsList className="bg-[#0a0a0a] border border-[#1a1a1a] p-1">
              <TabsTrigger
                value="all"
                className="data-[state=active]:bg-white data-[state=active]:text-black text-[#737373] text-xs"
              >
                All ({statusCounts.all})
              </TabsTrigger>
              <TabsTrigger
                value="enrollment"
                className="data-[state=active]:bg-blue-500 data-[state=active]:text-white text-[#737373] text-xs"
              >
                <Calendar className="h-3 w-3 mr-1" />
                Open ({statusCounts.enrollment})
              </TabsTrigger>
              <TabsTrigger
                value="in_progress"
                className="data-[state=active]:bg-emerald-500 data-[state=active]:text-white text-[#737373] text-xs"
              >
                <Zap className="h-3 w-3 mr-1" />
                Live ({statusCounts.in_progress})
              </TabsTrigger>
              <TabsTrigger
                value="completed"
                className="data-[state=active]:bg-[#333] data-[state=active]:text-white text-[#737373] text-xs"
              >
                <CheckCircle className="h-3 w-3 mr-1" />
                Past ({statusCounts.completed})
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Format filter */}
          <Select
            value={formatFilter}
            onValueChange={(v) => setFormatFilter(v as FormatFilter)}
          >
            <SelectTrigger className="w-[180px] border-[#262626] bg-[#0a0a0a] text-sm">
              <Filter className="h-4 w-4 mr-2 text-[#525252]" />
              <SelectValue placeholder="Format" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Formats</SelectItem>
              <SelectItem value="single_elimination">Single Elimination</SelectItem>
              <SelectItem value="double_elimination">Double Elimination</SelectItem>
              <SelectItem value="swiss">Swiss System</SelectItem>
              <SelectItem value="round_robin_knockout">Round Robin + KO</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Tournament grid */}
        <AnimatePresence mode="wait">
          {filteredTournaments.length > 0 ? (
            <motion.div
              key={`${statusFilter}-${formatFilter}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3"
            >
              {filteredTournaments.map((tournament, index) => (
                <motion.div
                  key={tournament.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <TournamentCard
                    tournament={{
                      ...tournament,
                      scheduledDate: tournament.scheduledDate,
                    }}
                    isEnrolled={enrolledTournaments.has(tournament.id)}
                    onEnroll={() => handleEnroll(tournament.id)}
                    onWithdraw={() => handleWithdraw(tournament.id)}
                  />
                </motion.div>
              ))}
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center rounded-xl border border-dashed border-[#262626] py-16"
            >
              <Trophy className="h-12 w-12 text-[#333] mb-4" />
              <h3 className="text-lg font-medium text-white mb-2">No tournaments found</h3>
              <p className="text-sm text-[#525252] mb-4">
                {statusFilter === "enrollment"
                  ? "No tournaments are currently accepting registrations"
                  : statusFilter === "in_progress"
                    ? "No tournaments are currently live"
                    : "Check back later for upcoming tournaments"}
              </p>
              {statusFilter !== "all" && (
                <Button
                  variant="outline"
                  className="border-[#262626] text-[#737373]"
                  onClick={() => setStatusFilter("all")}
                >
                  View all tournaments
                </Button>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
