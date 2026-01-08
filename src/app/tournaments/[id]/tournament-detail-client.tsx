"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft, UserPlus, UserMinus, Play, Trophy, Loader2, Zap, Sparkles, Rocket, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MatchRecordDialog } from "@/components/tournament/match-recorder";
import {
  TournamentInfo,
  EnrollmentList,
  SingleEliminationBracket,
  GroupStandings,
} from "@/components/tournament";
import { cn } from "@/lib/utils";
import { enrollInTournament, withdrawFromTournament } from "@/actions/tournament-enrollment";
import { startTournament } from "@/actions/tournament-bracket";
import { recordTournamentMatchResult, setNextMatch, recordQuickResult, setMatchBestOf, type GameScore } from "@/actions/tournament-matches";
import { resolveBestOf } from "@/lib/bestof";
import { toast } from "sonner";
import type { TournamentEnrollment, Tournament, TournamentRound, TournamentMatch } from "@/lib/db/schema";

interface Player {
  id: string;
  displayName: string;
  avatarUrl?: string | null;
  elo: number;
}

interface EnrollmentWithPlayer extends TournamentEnrollment {
  player: Player;
  partner: Player | null;
}

interface MatchWithParticipants extends TournamentMatch {
  participant1: EnrollmentWithPlayer | null;
  participant2: EnrollmentWithPlayer | null;
  winner: EnrollmentWithPlayer | null;
  round: TournamentRound;
}

interface GroupWithEnrollments {
  id: string;
  name: string;
  displayOrder: number;
  enrollments: EnrollmentWithPlayer[];
}

interface TournamentWithDetails extends Tournament {
  enrollments: EnrollmentWithPlayer[];
  rounds: TournamentRound[];
  matches: MatchWithParticipants[];
  groups: GroupWithEnrollments[];
  creator: { name: string | null; image: string | null } | null;
}

interface TournamentDetailClientProps {
  tournament: TournamentWithDetails;
  isEnrolled: boolean;
  myEnrollment: TournamentEnrollment | null;
  currentPlayerId?: string | null;
  isAdmin?: boolean;
}

export function TournamentDetailClient({
  tournament,
  isEnrolled,
  myEnrollment,
  currentPlayerId,
  isAdmin = false,
}: TournamentDetailClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [activeTab, setActiveTab] = useState(
    tournament.status === "enrollment" ? "participants" : "bracket"
  );

  // Score recording state
  const [selectedMatch, setSelectedMatch] = useState<MatchWithParticipants | null>(null);
  const [scoreDialogOpen, setScoreDialogOpen] = useState(false);

  // Set next match state
  const [settingNextMatchId, setSettingNextMatchId] = useState<string | null>(null);

  const handleEnroll = () => {
    startTransition(async () => {
      try {
        await enrollInTournament(tournament.id);
        toast.success("Successfully enrolled!");
        router.refresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to enroll");
      }
    });
  };

  const handleWithdraw = () => {
    startTransition(async () => {
      try {
        await withdrawFromTournament(tournament.id);
        toast.success("Successfully withdrawn");
        router.refresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to withdraw");
      }
    });
  };

  const handleStartTournament = () => {
    startTransition(async () => {
      try {
        await startTournament(tournament.id);
        toast.success("Tournament started!");
        router.refresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to start tournament");
      }
    });
  };

  const handleMatchClick = (match: MatchWithParticipants) => {
    if (!isAdmin) return;
    if (match.status === "completed" || match.status === "bye" || match.status === "walkover") return;
    if (!match.participant1 || !match.participant2) {
      toast.error("Both participants must be set before recording results");
      return;
    }

    setSelectedMatch(match);
    setScoreDialogOpen(true);
  };

  const handleSetNextMatch = async (matchId: string) => {
    setSettingNextMatchId(matchId);
    try {
      await setNextMatch(tournament.id, matchId);
      toast.success("Match set as next!");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to set next match");
    } finally {
      setSettingNextMatchId(null);
    }
  };

  const handleRecordResult = async (matchId: string, winnerId: string, scores: GameScore[]) => {
    await recordTournamentMatchResult(matchId, winnerId, scores);
    toast.success("Match result recorded!");
    setScoreDialogOpen(false);
    setSelectedMatch(null);
    router.refresh();
  };

  const handleQuickResult = async (matchId: string, winnerId: string, seriesScore: string) => {
    await recordQuickResult(matchId, winnerId, seriesScore);
    toast.success("Match result recorded!");
    setScoreDialogOpen(false);
    setSelectedMatch(null);
    router.refresh();
  };

  const handleBestOfChange = async (matchId: string, newBestOf: number) => {
    await setMatchBestOf(matchId, newBestOf);
    toast.success(`Match changed to Best of ${newBestOf}`);
    // Don't close dialog - let admin continue
  };

  // Compute resolved bestOf for selected match
  const getResolvedBestOf = (match: MatchWithParticipants | null): number => {
    if (!match) return tournament.bestOf;

    return resolveBestOf({
      matchBestOf: match.bestOf,
      roundBestOf: match.round.bestOf,
      tournamentBestOf: tournament.bestOf,
    });
  };

  // Organize bracket data
  const bracketRounds = tournament.rounds
    .filter((r) => r.bracketType === "winners" || r.bracketType === "finals")
    .map((round) => ({
      ...round,
      matches: tournament.matches
        .filter((m) => m.roundId === round.id)
        .map((match) => ({
          id: match.id,
          position: match.position,
          participant1: match.participant1,
          participant2: match.participant2,
          winnerId: match.winnerId,
          scores: match.scores,
          status: match.status,
          isNextMatch: match.isNextMatch,
          // Include full match for click handler
          fullMatch: match,
        })),
    }));

  // Create a map for quick match lookup
  const matchMap = new Map<string, MatchWithParticipants>();
  tournament.matches.forEach((match) => matchMap.set(match.id, match));

  // Find champion
  const finalMatch = tournament.matches.find(
    (m) => m.round.bracketType === "finals" && m.status === "completed"
  );
  const champion = finalMatch?.winner;

  return (
    <div className="min-h-screen bg-black pl-16">
      <div className="mx-auto max-w-6xl px-6 py-8">
        {/* Back link */}
        <Link
          href="/tournaments"
          className="inline-flex items-center gap-2 text-sm text-[#525252] hover:text-white transition-colors mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to tournaments
        </Link>

        {/* Tournament info */}
        <TournamentInfo
          tournament={{
            ...tournament,
            enrollmentCount: tournament.enrollments.length,
          }}
        />

        {/* Hero "Launch Control" Section for Admin - Start Tournament */}
        {isAdmin && tournament.status === "enrollment" && tournament.enrollments.length >= 2 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-8 mb-8 relative overflow-hidden rounded-2xl border border-emerald-500/30"
          >
            {/* Animated gradient background */}
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-950/50 via-[#0a0a0a] to-cyan-950/30" />

            {/* Radial glow at top */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(16,185,129,0.15),transparent_50%)]" />

            {/* Animated corner sparkles */}
            <div className="absolute top-4 left-4 flex gap-1">
              {[...Array(3)].map((_, i) => (
                <motion.span
                  key={i}
                  className="h-1 w-1 rounded-full bg-emerald-400/50"
                  animate={{ opacity: [0.3, 1, 0.3] }}
                  transition={{ repeat: Infinity, duration: 2, delay: i * 0.3 }}
                />
              ))}
            </div>
            <div className="absolute top-4 right-4 flex gap-1">
              {[...Array(3)].map((_, i) => (
                <motion.span
                  key={i}
                  className="h-1 w-1 rounded-full bg-cyan-400/50"
                  animate={{ opacity: [0.3, 1, 0.3] }}
                  transition={{ repeat: Infinity, duration: 2, delay: i * 0.3 + 0.5 }}
                />
              ))}
            </div>

            {/* Content */}
            <div className="relative px-8 py-10 text-center">
              {/* Animated rocket icon */}
              <motion.div
                animate={{
                  y: [0, -4, 0],
                  rotate: [0, 2, -2, 0],
                }}
                transition={{
                  repeat: Infinity,
                  duration: 3,
                  ease: "easeInOut"
                }}
                className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 border border-emerald-500/30 mb-4"
              >
                <Rocket className="h-8 w-8 text-emerald-400" />
              </motion.div>

              <h3 className="text-xl font-bold text-white mb-2">Ready to Launch</h3>
              <div className="flex items-center justify-center gap-2 text-sm text-emerald-400/80 mb-6">
                <Users className="h-4 w-4" />
                <span className="font-medium">{tournament.enrollments.length} players enrolled and waiting</span>
              </div>

              <Button
                onClick={handleStartTournament}
                disabled={isPending}
                className={cn(
                  "relative px-8 py-6 text-lg font-bold transition-all",
                  "bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400",
                  "text-black shadow-[0_0_30px_rgba(16,185,129,0.4)] hover:shadow-[0_0_50px_rgba(16,185,129,0.6)]",
                )}
              >
                {isPending ? (
                  <>
                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                    Starting...
                  </>
                ) : (
                  <>
                    <Play className="h-5 w-5 mr-2" />
                    Start Tournament
                  </>
                )}
              </Button>

              <p className="mt-4 text-xs text-[#525252]">
                This will generate the bracket and notify all participants
              </p>
            </div>

            {/* Bottom sparkles */}
            <div className="absolute bottom-4 left-4 flex gap-1">
              {[...Array(3)].map((_, i) => (
                <motion.span
                  key={i}
                  className="h-1 w-1 rounded-full bg-emerald-400/50"
                  animate={{ opacity: [0.3, 1, 0.3] }}
                  transition={{ repeat: Infinity, duration: 2, delay: i * 0.3 + 1 }}
                />
              ))}
            </div>
            <div className="absolute bottom-4 right-4 flex gap-1">
              {[...Array(3)].map((_, i) => (
                <motion.span
                  key={i}
                  className="h-1 w-1 rounded-full bg-cyan-400/50"
                  animate={{ opacity: [0.3, 1, 0.3] }}
                  transition={{ repeat: Infinity, duration: 2, delay: i * 0.3 + 1.5 }}
                />
              ))}
            </div>
          </motion.div>
        )}

        {/* Action buttons for non-admin or non-startable states */}
        <div className="flex flex-wrap gap-3 mt-6 mb-8">
          {tournament.status === "enrollment" && !isEnrolled && (
            <Button
              className="bg-white text-black hover:bg-white/90"
              onClick={handleEnroll}
              disabled={isPending}
            >
              <UserPlus className="h-4 w-4 mr-2" />
              Enroll Now
            </Button>
          )}

          {tournament.status === "enrollment" && isEnrolled && (
            <Button
              variant="outline"
              className="border-[#262626] text-[#737373] hover:text-white"
              onClick={handleWithdraw}
              disabled={isPending}
            >
              <UserMinus className="h-4 w-4 mr-2" />
              Withdraw
            </Button>
          )}
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-[#0a0a0a] border border-[#1a1a1a] p-1 mb-6">
            <TabsTrigger
              value="bracket"
              className="data-[state=active]:bg-white data-[state=active]:text-black text-[#737373]"
              disabled={tournament.status === "enrollment"}
            >
              Bracket
            </TabsTrigger>
            <TabsTrigger
              value="participants"
              className="data-[state=active]:bg-white data-[state=active]:text-black text-[#737373]"
            >
              Participants ({tournament.enrollments.length})
            </TabsTrigger>
            {tournament.groups.length > 0 && (
              <TabsTrigger
                value="groups"
                className="data-[state=active]:bg-white data-[state=active]:text-black text-[#737373]"
              >
                Groups
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="bracket" className="mt-0">
            {tournament.status === "enrollment" ? (
              <div className="rounded-xl border border-dashed border-[#262626] py-16 text-center">
                <p className="text-[#525252]">
                  Bracket will be generated when the tournament starts
                </p>
              </div>
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="rounded-xl border border-[#1a1a1a] bg-[#0a0a0a] p-6"
              >
                {(tournament.format === "single_elimination" ||
                  tournament.format === "double_elimination") && (
                  <SingleEliminationBracket
                    rounds={bracketRounds}
                    isDoubles={tournament.matchType === "doubles"}
                    champion={champion}
                  />
                )}

                {tournament.format === "round_robin_knockout" && tournament.groups.length > 0 && (
                  <div className="space-y-8">
                    <div>
                      <h3 className="text-sm font-medium text-[#525252] uppercase tracking-wider mb-4">
                        Group Stage
                      </h3>
                      <GroupStandings
                        groups={tournament.groups}
                        advancePerGroup={tournament.advancePerGroup || 2}
                        isDoubles={tournament.matchType === "doubles"}
                        currentPlayerId={currentPlayerId || undefined}
                      />
                    </div>

                    {bracketRounds.length > 0 && (
                      <div>
                        <h3 className="text-sm font-medium text-[#525252] uppercase tracking-wider mb-4">
                          Knockout Stage
                        </h3>
                        <SingleEliminationBracket
                          rounds={bracketRounds}
                          isDoubles={tournament.matchType === "doubles"}
                          champion={champion}
                        />
                      </div>
                    )}
                  </div>
                )}

                {tournament.format === "swiss" && (
                  <div className="text-center py-8">
                    <p className="text-[#525252]">Swiss bracket visualization coming soon</p>
                  </div>
                )}
              </motion.div>
            )}
          </TabsContent>

          <TabsContent value="participants" className="mt-0">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="rounded-xl border border-[#1a1a1a] bg-[#0a0a0a] p-6"
            >
              <EnrollmentList
                enrollments={tournament.enrollments}
                isDoubles={tournament.matchType === "doubles"}
                currentPlayerId={currentPlayerId || undefined}
                showPlacements={tournament.status === "completed"}
              />
            </motion.div>
          </TabsContent>

          {tournament.groups.length > 0 && (
            <TabsContent value="groups" className="mt-0">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                <GroupStandings
                  groups={tournament.groups}
                  advancePerGroup={tournament.advancePerGroup || 2}
                  isDoubles={tournament.matchType === "doubles"}
                  currentPlayerId={currentPlayerId || undefined}
                />
              </motion.div>
            </TabsContent>
          )}
        </Tabs>

        {/* Admin: Pending Matches Quick Actions */}
        {isAdmin && tournament.status === "in_progress" && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mt-8"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/20">
                <Trophy className="h-4 w-4 text-emerald-400" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white">Pending Matches</h3>
                <p className="text-xs text-[#525252]">Click to record result • Set match priority</p>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {tournament.matches
                .filter((m) => m.status === "ready" && m.participant1 && m.participant2)
                .sort((a, b) => (b.isNextMatch ? 1 : 0) - (a.isNextMatch ? 1 : 0))
                .map((match, index) => (
                  <motion.div
                    key={match.id}
                    initial={{ opacity: 0, y: 20, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ delay: index * 0.05 }}
                    className={cn(
                      "relative overflow-hidden rounded-xl border transition-all",
                      match.isNextMatch
                        ? "border-emerald-500/50 bg-gradient-to-br from-emerald-950/50 via-[#0a0a0a] to-[#0a0a0a] shadow-[0_0_30px_-5px_rgba(16,185,129,0.4)]"
                        : "border-[#1a1a1a] bg-[#0a0a0a] hover:border-[#333]"
                    )}
                  >
                    {/* Next match animated glow bar */}
                    {match.isNextMatch && (
                      <motion.div
                        className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-emerald-400 to-transparent"
                        animate={{ opacity: [0.5, 1, 0.5] }}
                        transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
                      />
                    )}

                    {/* Match content - clickable area */}
                    <button
                      onClick={() => handleMatchClick(match)}
                      className="w-full text-left p-4 focus:outline-none"
                    >
                      {/* Header with round name and Next badge */}
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[#525252]">
                          {match.round.name}
                        </span>
                        {match.isNextMatch && (
                          <motion.div
                            className="flex items-center gap-1.5 rounded-full bg-emerald-500/20 px-2.5 py-1 border border-emerald-500/30"
                            animate={{
                              boxShadow: [
                                "0 0 0 0 rgba(16, 185, 129, 0)",
                                "0 0 0 4px rgba(16, 185, 129, 0.2)",
                                "0 0 0 0 rgba(16, 185, 129, 0)",
                              ],
                            }}
                            transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                          >
                            <motion.span
                              className="relative flex h-1.5 w-1.5"
                            >
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
                            </motion.span>
                            <span className="text-[9px] font-bold uppercase tracking-wider text-emerald-400">
                              Next
                            </span>
                          </motion.div>
                        )}
                      </div>

                      {/* Players */}
                      <div className="space-y-1">
                        <div className={cn(
                          "flex items-center gap-2 rounded-lg px-2.5 py-2 transition-colors",
                          match.isNextMatch ? "bg-emerald-500/5" : "bg-[#111]"
                        )}>
                          <div className="h-6 w-6 rounded-full bg-[#1a1a1a] flex items-center justify-center text-[10px] font-bold text-[#525252]">
                            {match.participant1?.player.displayName.charAt(0)}
                          </div>
                          <span className="text-sm font-medium text-white truncate flex-1">
                            {match.participant1?.player.displayName}
                            {tournament.matchType === "doubles" && match.participant1?.partner && (
                              <span className="text-[#525252]"> & {match.participant1.partner.displayName}</span>
                            )}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 px-2.5">
                          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-[#262626] to-transparent" />
                          <span className="text-[9px] font-bold text-[#333]">VS</span>
                          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-[#262626] to-transparent" />
                        </div>

                        <div className={cn(
                          "flex items-center gap-2 rounded-lg px-2.5 py-2 transition-colors",
                          match.isNextMatch ? "bg-emerald-500/5" : "bg-[#111]"
                        )}>
                          <div className="h-6 w-6 rounded-full bg-[#1a1a1a] flex items-center justify-center text-[10px] font-bold text-[#525252]">
                            {match.participant2?.player.displayName.charAt(0)}
                          </div>
                          <span className="text-sm font-medium text-white truncate flex-1">
                            {match.participant2?.player.displayName}
                            {tournament.matchType === "doubles" && match.participant2?.partner && (
                              <span className="text-[#525252]"> & {match.participant2.partner.displayName}</span>
                            )}
                          </span>
                        </div>
                      </div>

                      {/* Click to record hint */}
                      <div className={cn(
                        "mt-3 flex items-center justify-center gap-2 rounded-lg border border-dashed py-2 transition-colors",
                        match.isNextMatch
                          ? "border-emerald-500/30 bg-emerald-500/5 text-emerald-400"
                          : "border-[#262626] text-[#525252] hover:border-[#333] hover:text-[#737373]"
                      )}>
                        <Sparkles className="h-3.5 w-3.5" />
                        <span className="text-xs font-medium">Click to record result</span>
                      </div>
                    </button>

                    {/* Set as Next button - outside clickable area */}
                    {!match.isNextMatch && (
                      <div className="px-4 pb-4 -mt-1">
                        <motion.button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSetNextMatch(match.id);
                          }}
                          disabled={settingNextMatchId === match.id}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          className={cn(
                            "w-full flex items-center justify-center gap-2 rounded-lg border py-2 text-xs font-medium transition-all",
                            settingNextMatchId === match.id
                              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                              : "border-[#262626] bg-[#111] text-[#737373] hover:border-emerald-500/30 hover:bg-emerald-500/5 hover:text-emerald-400"
                          )}
                        >
                          {settingNextMatchId === match.id ? (
                            <>
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              Setting...
                            </>
                          ) : (
                            <>
                              <Zap className="h-3.5 w-3.5" />
                              Set as Next
                            </>
                          )}
                        </motion.button>
                      </div>
                    )}
                  </motion.div>
                ))}
              {tournament.matches.filter((m) => m.status === "ready" && m.participant1 && m.participant2).length === 0 && (
                <div className="col-span-full flex flex-col items-center justify-center rounded-xl border border-dashed border-[#262626] py-12">
                  <Trophy className="h-8 w-8 text-[#333] mb-3" />
                  <p className="text-sm text-[#525252]">No matches ready to be played yet</p>
                  <p className="text-xs text-[#333] mt-1">Waiting for previous rounds to complete</p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </div>

      {/* Score Recording Dialog */}
      <MatchRecordDialog
        match={selectedMatch}
        open={scoreDialogOpen}
        onOpenChange={setScoreDialogOpen}
        bestOf={getResolvedBestOf(selectedMatch)}
        isDoubles={tournament.matchType === "doubles"}
        onRecordResult={handleRecordResult}
        onQuickResult={handleQuickResult}
        onBestOfChange={isAdmin ? handleBestOfChange : undefined}
      />
    </div>
  );
}
