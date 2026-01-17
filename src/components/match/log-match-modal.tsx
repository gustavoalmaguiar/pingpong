"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Loader2, Trophy, X, User, Users } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { PlayerSelect, type PlayerOption } from "./player-select";
import { getPlayers } from "@/actions/players";
import { logSinglesMatch, logDoublesMatch } from "@/actions/matches";
import { completeChallenge } from "@/actions/challenges";
import { calculateEloChange, calculateDoublesEloChange } from "@/lib/elo";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface ChallengeData {
  challengeId: string;
  challengerId: string;
  challengedId: string;
}

interface LogMatchModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  challengeData?: ChallengeData | null;
}

type MatchType = "singles" | "doubles";

export function LogMatchModal({ open, onOpenChange, challengeData }: LogMatchModalProps) {
  const [matchType, setMatchType] = useState<MatchType>("singles");
  const [players, setPlayers] = useState<PlayerOption[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [lastEloChange, setLastEloChange] = useState(0);

  // Singles state
  const [winnerId, setWinnerId] = useState<string | null>(null);
  const [loserId, setLoserId] = useState<string | null>(null);

  // Doubles state
  const [winnerTeam, setWinnerTeam] = useState<[string | null, string | null]>([null, null]);
  const [loserTeam, setLoserTeam] = useState<[string | null, string | null]>([null, null]);

  // Score state
  const [winnerScore, setWinnerScore] = useState(11);
  const [loserScore, setLoserScore] = useState(0);

  // Track if we've initialized from challenge data
  const [initializedFromChallenge, setInitializedFromChallenge] = useState(false);

  // Load players
  useEffect(() => {
    if (open) {
      setIsLoading(true);
      getPlayers()
        .then((data) => {
          setPlayers(
            data.map((p) => ({
              id: p.id,
              displayName: p.displayName,
              elo: p.elo,
              avatarUrl: p.avatarUrl,
            }))
          );
        })
        .finally(() => setIsLoading(false));
    }
  }, [open]);

  // Pre-select players from challenge data
  useEffect(() => {
    if (challengeData && players.length > 0 && !initializedFromChallenge) {
      // For challenges, we don't know who won yet, but we can inform the user
      // The user will select who won - the challenger and challenged are both potential players
      // We don't pre-select winner/loser since the challenge doesn't dictate who won
      setMatchType("singles");
      setInitializedFromChallenge(true);
    }
  }, [challengeData, players, initializedFromChallenge]);

  // Reset initialized flag when modal closes
  useEffect(() => {
    if (!open) {
      setInitializedFromChallenge(false);
    }
  }, [open]);

  // Reset form
  const resetForm = useCallback(() => {
    setWinnerId(null);
    setLoserId(null);
    setWinnerTeam([null, null]);
    setLoserTeam([null, null]);
    setWinnerScore(11);
    setLoserScore(0);
    setShowSuccess(false);
  }, []);

  // Calculate ELO preview
  const getEloPreview = () => {
    if (matchType === "singles") {
      if (!winnerId || !loserId) return null;
      const winner = players.find((p) => p.id === winnerId);
      const loser = players.find((p) => p.id === loserId);
      if (!winner || !loser) return null;
      return calculateEloChange(winner.elo, loser.elo);
    } else {
      if (!winnerTeam[0] || !winnerTeam[1] || !loserTeam[0] || !loserTeam[1]) return null;
      const w1 = players.find((p) => p.id === winnerTeam[0]);
      const w2 = players.find((p) => p.id === winnerTeam[1]);
      const l1 = players.find((p) => p.id === loserTeam[0]);
      const l2 = players.find((p) => p.id === loserTeam[1]);
      if (!w1 || !w2 || !l1 || !l2) return null;
      return calculateDoublesEloChange([w1.elo, w2.elo], [l1.elo, l2.elo]);
    }
  };

  const eloPreview = getEloPreview();

  // Validate form
  const isValid = () => {
    if (winnerScore < loserScore) return false;
    if (winnerScore !== 11 && !(winnerScore > 11 && winnerScore - loserScore === 2)) return false;

    if (matchType === "singles") {
      return winnerId && loserId && winnerId !== loserId;
    } else {
      const allIds = [...winnerTeam, ...loserTeam].filter(Boolean);
      return allIds.length === 4 && new Set(allIds).size === 4;
    }
  };

  // Submit match
  const handleSubmit = async () => {
    if (!isValid()) return;

    setIsSubmitting(true);
    try {
      let matchId: string | undefined;

      if (matchType === "singles") {
        const result = await logSinglesMatch({
          winnerId: winnerId!,
          loserId: loserId!,
          winnerScore,
          loserScore,
        });
        setLastEloChange(result.eloChange);
        matchId = result.match.id;
      } else {
        const result = await logDoublesMatch({
          winnerTeam: winnerTeam as [string, string],
          loserTeam: loserTeam as [string, string],
          winnerScore,
          loserScore,
        });
        setLastEloChange(result.eloChange);
        matchId = result.match.id;
      }

      // Complete challenge if this match was from a challenge
      if (challengeData?.challengeId && matchId) {
        try {
          await completeChallenge(challengeData.challengeId, matchId);
        } catch (e) {
          // Non-blocking - match is already logged
          console.error("Failed to complete challenge:", e);
        }
      }

      setShowSuccess(true);
      toast.success("Match logged successfully!");

      // Close after showing success
      setTimeout(() => {
        onOpenChange(false);
        resetForm();
      }, 1500);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to log match");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Get excluded IDs for player selects
  const getExcludedIds = (currentField: string) => {
    const ids: string[] = [];
    if (matchType === "singles") {
      if (currentField !== "winner" && winnerId) ids.push(winnerId);
      if (currentField !== "loser" && loserId) ids.push(loserId);
    } else {
      if (currentField !== "w1" && winnerTeam[0]) ids.push(winnerTeam[0]);
      if (currentField !== "w2" && winnerTeam[1]) ids.push(winnerTeam[1]);
      if (currentField !== "l1" && loserTeam[0]) ids.push(loserTeam[0]);
      if (currentField !== "l2" && loserTeam[1]) ids.push(loserTeam[1]);
    }
    return ids;
  };

  // Score adjustment
  const adjustScore = (type: "winner" | "loser", delta: number) => {
    if (type === "winner") {
      const newScore = Math.max(0, Math.min(15, winnerScore + delta));
      setWinnerScore(newScore);
    } else {
      const newScore = Math.max(0, Math.min(14, loserScore + delta));
      setLoserScore(newScore);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="max-w-md gap-0 overflow-hidden border-[#1a1a1a] bg-[#0a0a0a] p-0 sm:rounded-2xl"
      >
        <DialogTitle className="sr-only">Log Match</DialogTitle>

        <AnimatePresence mode="wait">
          {showSuccess ? (
            // Success state
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="flex flex-col items-center justify-center py-20"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 400, damping: 20, delay: 0.1 }}
                className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500"
                style={{ boxShadow: "0 0 60px rgba(16, 185, 129, 0.4)" }}
              >
                <Check className="h-10 w-10 text-white" strokeWidth={3} />
              </motion.div>
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="text-xl font-semibold text-white"
              >
                Match Logged!
              </motion.p>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="mt-2 font-mono text-2xl text-emerald-500"
              >
                ±{lastEloChange} ELO
              </motion.p>
            </motion.div>
          ) : (
            // Form state
            <motion.div
              key="form"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10">
                    <div className="h-3 w-3 rounded-full bg-white" />
                  </div>
                  <div>
                    <h2 className="text-base font-semibold tracking-tight">Log Match</h2>
                    {challengeData && (
                      <p className="text-[10px] text-emerald-500">Challenge Match</p>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => onOpenChange(false)}
                  className="flex h-8 w-8 items-center justify-center rounded-full text-[#525252] transition-all hover:bg-white/10 hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Match Type Tabs - Edge to Edge */}
              <div className="relative mx-0 flex bg-black">
                {/* Animated background */}
                <motion.div
                  className="absolute inset-y-0 w-1/2 bg-white"
                  animate={{ x: matchType === "singles" ? 0 : "100%" }}
                  transition={{ type: "spring", stiffness: 400, damping: 35 }}
                />

                <button
                  onClick={() => setMatchType("singles")}
                  className={cn(
                    "relative z-10 flex flex-1 items-center justify-center gap-2 py-3.5 text-sm font-medium transition-colors",
                    matchType === "singles" ? "text-black" : "text-[#737373] hover:text-white"
                  )}
                >
                  <User className="h-4 w-4" />
                  Singles
                </button>
                <button
                  onClick={() => setMatchType("doubles")}
                  className={cn(
                    "relative z-10 flex flex-1 items-center justify-center gap-2 py-3.5 text-sm font-medium transition-colors",
                    matchType === "doubles" ? "text-black" : "text-[#737373] hover:text-white"
                  )}
                >
                  <Users className="h-4 w-4" />
                  Doubles
                </button>
              </div>

              {isLoading ? (
                <div className="flex items-center justify-center py-20">
                  <Loader2 className="h-6 w-6 animate-spin text-[#525252]" />
                </div>
              ) : (
                <>
                  {/* Player Selection */}
                  <div className="space-y-5 p-5">
                    <AnimatePresence mode="wait">
                      {matchType === "singles" ? (
                        <motion.div
                          key="singles"
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 10 }}
                          transition={{ duration: 0.15 }}
                          className="space-y-4"
                        >
                          {/* Winner */}
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <div className="h-2 w-2 rounded-full bg-emerald-500" />
                              <span className="text-[11px] font-semibold uppercase tracking-widest text-[#737373]">
                                Winner
                              </span>
                            </div>
                            <PlayerSelect
                              players={players}
                              value={winnerId}
                              onChange={setWinnerId}
                              placeholder="Select winner"
                              excludeIds={getExcludedIds("winner")}
                            />
                          </div>

                          {/* Loser */}
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <div className="h-2 w-2 rounded-full bg-red-500/70" />
                              <span className="text-[11px] font-semibold uppercase tracking-widest text-[#737373]">
                                Loser
                              </span>
                            </div>
                            <PlayerSelect
                              players={players}
                              value={loserId}
                              onChange={setLoserId}
                              placeholder="Select loser"
                              excludeIds={getExcludedIds("loser")}
                            />
                          </div>
                        </motion.div>
                      ) : (
                        <motion.div
                          key="doubles"
                          initial={{ opacity: 0, x: 10 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -10 }}
                          transition={{ duration: 0.15 }}
                          className="space-y-5"
                        >
                          {/* Winner Team */}
                          <div className="space-y-3">
                            <div className="flex items-center gap-2">
                              <Trophy className="h-3.5 w-3.5 text-emerald-500" />
                              <span className="text-[11px] font-semibold uppercase tracking-widest text-[#737373]">
                                Winner Team
                              </span>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <PlayerSelect
                                players={players}
                                value={winnerTeam[0]}
                                onChange={(v) => setWinnerTeam([v, winnerTeam[1]])}
                                placeholder="Player 1"
                                excludeIds={getExcludedIds("w1")}
                                compact
                              />
                              <PlayerSelect
                                players={players}
                                value={winnerTeam[1]}
                                onChange={(v) => setWinnerTeam([winnerTeam[0], v])}
                                placeholder="Player 2"
                                excludeIds={getExcludedIds("w2")}
                                compact
                              />
                            </div>
                          </div>

                          {/* Loser Team */}
                          <div className="space-y-3">
                            <div className="flex items-center gap-2">
                              <div className="h-3.5 w-3.5 rounded-full border-2 border-[#525252]" />
                              <span className="text-[11px] font-semibold uppercase tracking-widest text-[#737373]">
                                Loser Team
                              </span>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <PlayerSelect
                                players={players}
                                value={loserTeam[0]}
                                onChange={(v) => setLoserTeam([v, loserTeam[1]])}
                                placeholder="Player 1"
                                excludeIds={getExcludedIds("l1")}
                                compact
                              />
                              <PlayerSelect
                                players={players}
                                value={loserTeam[1]}
                                onChange={(v) => setLoserTeam([loserTeam[0], v])}
                                placeholder="Player 2"
                                excludeIds={getExcludedIds("l2")}
                                compact
                              />
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Score Section */}
                  <div className="border-t border-[#1a1a1a] bg-black px-5 py-6">
                    <div className="mb-5 text-center">
                      <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#525252]">
                        Final Score
                      </span>
                    </div>

                    <div className="flex items-center justify-center gap-4">
                      {/* Winner Score */}
                      <div className="text-center">
                        <div className="mb-2 text-[10px] font-medium uppercase tracking-wider text-emerald-500/70">
                          Winner
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => adjustScore("winner", -1)}
                            className="flex h-10 w-10 items-center justify-center rounded-lg border border-[#262626] bg-[#0a0a0a] text-[#525252] transition-all hover:border-[#333] hover:text-white active:scale-95"
                          >
                            <span className="text-lg">−</span>
                          </button>
                          <div className="flex h-16 w-20 items-center justify-center rounded-lg border border-emerald-500/30 bg-emerald-500/10">
                            <span className="font-mono text-4xl font-bold text-white">
                              {winnerScore}
                            </span>
                          </div>
                          <button
                            onClick={() => adjustScore("winner", 1)}
                            className="flex h-10 w-10 items-center justify-center rounded-lg border border-[#262626] bg-[#0a0a0a] text-[#525252] transition-all hover:border-[#333] hover:text-white active:scale-95"
                          >
                            <span className="text-lg">+</span>
                          </button>
                        </div>
                      </div>

                      {/* Separator */}
                      <div className="flex h-16 items-center">
                        <span className="text-3xl font-light text-[#333]">:</span>
                      </div>

                      {/* Loser Score */}
                      <div className="text-center">
                        <div className="mb-2 text-[10px] font-medium uppercase tracking-wider text-[#525252]">
                          Loser
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => adjustScore("loser", -1)}
                            className="flex h-10 w-10 items-center justify-center rounded-lg border border-[#262626] bg-[#0a0a0a] text-[#525252] transition-all hover:border-[#333] hover:text-white active:scale-95"
                          >
                            <span className="text-lg">−</span>
                          </button>
                          <div className="flex h-16 w-20 items-center justify-center rounded-lg border border-[#262626] bg-[#0a0a0a]">
                            <span className="font-mono text-4xl font-bold text-[#737373]">
                              {loserScore}
                            </span>
                          </div>
                          <button
                            onClick={() => adjustScore("loser", 1)}
                            className="flex h-10 w-10 items-center justify-center rounded-lg border border-[#262626] bg-[#0a0a0a] text-[#525252] transition-all hover:border-[#333] hover:text-white active:scale-95"
                          >
                            <span className="text-lg">+</span>
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* ELO Preview */}
                    <AnimatePresence>
                      {eloPreview && (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          className="mt-5 flex justify-center"
                        >
                          <div className="flex items-center gap-3 rounded-full bg-[#0a0a0a] border border-[#1a1a1a] px-4 py-2">
                            <span className="text-[10px] font-semibold uppercase tracking-widest text-[#525252]">
                              ELO
                            </span>
                            <div className="flex items-center gap-2 font-mono text-sm font-semibold">
                              <span className="text-emerald-500">
                                +{"change" in eloPreview ? eloPreview.change : eloPreview.winnerChange}
                              </span>
                              <span className="text-[#333]">/</span>
                              <span className="text-red-500/80">
                                −{"change" in eloPreview ? eloPreview.change : eloPreview.loserChange}
                              </span>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Submit Button */}
                  <div className="p-5 pt-0">
                    <Button
                      onClick={handleSubmit}
                      disabled={!isValid() || isSubmitting}
                      className="h-12 w-full rounded-xl bg-white font-semibold text-black transition-all hover:bg-white/90 disabled:opacity-30"
                    >
                      {isSubmitting ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                      ) : (
                        <span className="tracking-tight">Log Match</span>
                      )}
                    </Button>
                  </div>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}
