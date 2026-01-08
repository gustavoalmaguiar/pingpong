"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Trophy,
  Swords,
  Plus,
  Minus,
  Check,
  Clock,
  CircleDot,
  Sparkles,
  X,
  Zap,
  ListOrdered,
  Settings2,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import * as Tabs from "@radix-ui/react-tabs";
import { cn } from "@/lib/utils";

// Types
interface Player {
  id: string;
  displayName: string;
  avatarUrl?: string | null;
  elo: number;
}

interface Enrollment {
  id: string;
  player: Player;
  partner: Player | null;
}

interface TournamentMatch {
  id: string;
  roundId: string;
  position: number;
  status: "pending" | "ready" | "in_progress" | "completed" | "bye" | "walkover";
  participant1: Enrollment | null;
  participant2: Enrollment | null;
  participant1Id: string | null;
  participant2Id: string | null;
  winnerId: string | null;
  scores: string | null;
  round: {
    id: string;
    name: string;
    roundNumber: number;
    bracketType: string;
  };
  groupId?: string | null;
}

interface GameScore {
  p1: number;
  p2: number;
}

interface MatchRecorderProps {
  matches: TournamentMatch[];
  bestOf: number;
  isDoubles?: boolean;
  isAdmin?: boolean;
  groupName?: string;
  onRecordResult: (matchId: string, winnerId: string, scores: GameScore[]) => Promise<void>;
  onQuickResult?: (matchId: string, winnerId: string, seriesScore: string) => Promise<void>;
}

// Match Card Component
function MatchCard({
  match,
  isDoubles,
  isAdmin,
  onClick,
}: {
  match: TournamentMatch;
  isDoubles?: boolean;
  isAdmin?: boolean;
  onClick?: () => void;
}) {
  const isPlayable = match.status === "ready" || match.status === "pending";
  const isCompleted = match.status === "completed";
  const hasBothParticipants = match.participant1 && match.participant2;

  const getParticipantName = (enrollment: Enrollment | null) => {
    if (!enrollment) return "TBD";
    if (isDoubles && enrollment.partner) {
      return `${enrollment.player.displayName} & ${enrollment.partner.displayName}`;
    }
    return enrollment.player.displayName;
  };

  const scores = match.scores ? JSON.parse(match.scores) as GameScore[] : [];
  const p1Wins = scores.filter((g) => g.p1 > g.p2).length;
  const p2Wins = scores.filter((g) => g.p2 > g.p1).length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      whileHover={isPlayable && isAdmin ? { scale: 1.02, y: -2 } : undefined}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
      onClick={isPlayable && isAdmin && hasBothParticipants ? onClick : undefined}
      className={cn(
        "relative overflow-hidden rounded-xl border bg-gradient-to-br p-4",
        isPlayable && isAdmin && hasBothParticipants
          ? "cursor-pointer border-emerald-500/30 from-[#0a0a0a] to-[#0f1a0f] hover:border-emerald-500/50 hover:shadow-[0_0_30px_rgba(16,185,129,0.1)]"
          : isCompleted
          ? "border-[#1a1a1a] from-[#0a0a0a] to-[#0a0a0a]"
          : "border-[#1a1a1a] from-[#0a0a0a] to-[#0a0a0a] opacity-60"
      )}
    >
      {/* Diagonal accent for playable matches */}
      {isPlayable && hasBothParticipants && (
        <div className="absolute -right-8 -top-8 h-16 w-32 rotate-45 bg-gradient-to-r from-emerald-500/20 to-transparent" />
      )}

      {/* Round name */}
      <div className="mb-3 flex items-center justify-between">
        <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#525252]">
          {match.round.name}
        </span>
        <StatusBadge status={match.status} />
      </div>

      {/* Players */}
      <div className="space-y-2">
        {/* Player 1 */}
        <div
          className={cn(
            "flex items-center gap-3 rounded-lg px-3 py-2 transition-colors",
            isCompleted && match.winnerId === match.participant1Id
              ? "bg-emerald-500/10"
              : "bg-[#111]"
          )}
        >
          <Avatar className="h-8 w-8 border border-[#262626]">
            <AvatarImage src={match.participant1?.player.avatarUrl || undefined} />
            <AvatarFallback className="bg-[#1a1a1a] text-[10px] font-bold">
              {match.participant1?.player.displayName.charAt(0) || "?"}
            </AvatarFallback>
          </Avatar>
          <span
            className={cn(
              "flex-1 truncate text-sm font-medium",
              isCompleted && match.winnerId === match.participant1Id
                ? "text-emerald-400"
                : "text-white"
            )}
          >
            {getParticipantName(match.participant1)}
          </span>
          {isCompleted && (
            <span className="font-mono text-lg font-bold text-white">{p1Wins}</span>
          )}
          {isCompleted && match.winnerId === match.participant1Id && (
            <Trophy className="h-4 w-4 text-amber-400" />
          )}
        </div>

        {/* VS divider */}
        <div className="flex items-center gap-2 px-3">
          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-[#262626] to-transparent" />
          <span className="text-[10px] font-bold text-[#333]">VS</span>
          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-[#262626] to-transparent" />
        </div>

        {/* Player 2 */}
        <div
          className={cn(
            "flex items-center gap-3 rounded-lg px-3 py-2 transition-colors",
            isCompleted && match.winnerId === match.participant2Id
              ? "bg-emerald-500/10"
              : "bg-[#111]"
          )}
        >
          <Avatar className="h-8 w-8 border border-[#262626]">
            <AvatarImage src={match.participant2?.player.avatarUrl || undefined} />
            <AvatarFallback className="bg-[#1a1a1a] text-[10px] font-bold">
              {match.participant2?.player.displayName.charAt(0) || "?"}
            </AvatarFallback>
          </Avatar>
          <span
            className={cn(
              "flex-1 truncate text-sm font-medium",
              isCompleted && match.winnerId === match.participant2Id
                ? "text-emerald-400"
                : "text-white"
            )}
          >
            {getParticipantName(match.participant2)}
          </span>
          {isCompleted && (
            <span className="font-mono text-lg font-bold text-white">{p2Wins}</span>
          )}
          {isCompleted && match.winnerId === match.participant2Id && (
            <Trophy className="h-4 w-4 text-amber-400" />
          )}
        </div>
      </div>

      {/* Action hint for admins */}
      {isPlayable && isAdmin && hasBothParticipants && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mt-3 flex items-center justify-center gap-2 rounded-lg border border-dashed border-emerald-500/30 bg-emerald-500/5 py-2"
        >
          <Swords className="h-3.5 w-3.5 text-emerald-500" />
          <span className="text-xs font-medium text-emerald-500">Click to record result</span>
        </motion.div>
      )}

      {/* Scores detail for completed */}
      {isCompleted && scores.length > 0 && (
        <div className="mt-3 flex justify-center gap-1">
          {scores.map((score, i) => (
            <span
              key={i}
              className={cn(
                "rounded px-2 py-0.5 text-[10px] font-mono font-bold",
                score.p1 > score.p2
                  ? "bg-emerald-500/20 text-emerald-400"
                  : "bg-red-500/20 text-red-400"
              )}
            >
              {score.p1}-{score.p2}
            </span>
          ))}
        </div>
      )}
    </motion.div>
  );
}

// Status Badge Component
function StatusBadge({ status }: { status: string }) {
  const config = {
    pending: { label: "Pending", icon: Clock, color: "bg-zinc-600 text-zinc-300" },
    ready: { label: "Ready", icon: CircleDot, color: "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" },
    in_progress: { label: "Live", icon: Sparkles, color: "bg-amber-500/20 text-amber-400 animate-pulse" },
    completed: { label: "Done", icon: Check, color: "bg-[#1a1a1a] text-[#525252]" },
    bye: { label: "Bye", icon: Check, color: "bg-[#1a1a1a] text-[#525252]" },
    walkover: { label: "W/O", icon: Check, color: "bg-[#1a1a1a] text-[#525252]" },
  }[status] || { label: status, icon: Clock, color: "bg-zinc-600" };

  const Icon = config.icon;

  return (
    <Badge className={cn("gap-1 text-[10px] font-semibold", config.color)}>
      <Icon className="h-3 w-3" />
      {config.label}
    </Badge>
  );
}

// Score preset values for quick entry (max is 11 in ping pong)
const SCORE_PRESETS = [0, 11];

// Premium Score Input Component with dial-style interaction
function ScoreInput({
  value,
  onChange,
  isWinning,
  playerLabel,
}: {
  value: number;
  onChange: (val: number) => void;
  isWinning: boolean;
  playerLabel?: string;
}) {
  const [isHolding, setIsHolding] = useState(false);
  const holdInterval = React.useRef<NodeJS.Timeout | null>(null);
  const [showPresets, setShowPresets] = useState(false);

  // Hold-to-increment functionality
  const startHold = (increment: boolean) => {
    setIsHolding(true);
    const step = increment ? 1 : -1;
    holdInterval.current = setInterval(() => {
      onChange(Math.max(0, Math.min(99, value + step)));
    }, 100);
  };

  const stopHold = () => {
    setIsHolding(false);
    if (holdInterval.current) {
      clearInterval(holdInterval.current);
      holdInterval.current = null;
    }
  };

  React.useEffect(() => {
    return () => {
      if (holdInterval.current) clearInterval(holdInterval.current);
    };
  }, []);

  return (
    <div className="flex flex-col items-center gap-2">
      {/* Main score dial */}
      <div className="relative">
        {/* Winning glow ring */}
        <AnimatePresence>
          {isWinning && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="absolute -inset-1 rounded-2xl bg-gradient-to-b from-emerald-400/30 to-emerald-600/30 blur-md"
            />
          )}
        </AnimatePresence>

        {/* Score container */}
        <motion.div
          className={cn(
            "relative flex flex-col items-center overflow-hidden rounded-2xl transition-all duration-300",
            isWinning
              ? "bg-gradient-to-b from-emerald-950 to-emerald-900/80 ring-2 ring-emerald-400/50"
              : "bg-gradient-to-b from-[#1a1a1a] to-[#111] ring-1 ring-[#262626]"
          )}
        >
          {/* Increment button */}
          <motion.button
            whileTap={{ scale: 0.95, backgroundColor: "rgba(16, 185, 129, 0.2)" }}
            onPointerDown={() => startHold(true)}
            onPointerUp={stopHold}
            onPointerLeave={stopHold}
            onClick={() => onChange(Math.min(99, value + 1))}
            className={cn(
              "flex h-12 w-24 items-center justify-center border-b transition-colors",
              isWinning
                ? "border-emerald-700/50 text-emerald-300 hover:bg-emerald-500/20"
                : "border-[#262626] text-[#525252] hover:bg-[#1a1a1a] hover:text-white"
            )}
          >
            <Plus className="h-5 w-5" />
          </motion.button>

          {/* Score display */}
          <motion.div
            className="relative flex h-20 w-24 items-center justify-center"
            onClick={() => setShowPresets(!showPresets)}
          >
            {/* Background pattern for texture */}
            <div
              className={cn(
                "absolute inset-0 opacity-10",
                isWinning ? "bg-emerald-500" : "bg-white"
              )}
              style={{
                backgroundImage: `repeating-linear-gradient(
                  0deg,
                  transparent,
                  transparent 4px,
                  currentColor 4px,
                  currentColor 5px
                )`,
              }}
            />

            {/* Animated score number */}
            <AnimatePresence mode="popLayout">
              <motion.span
                key={value}
                initial={{ y: -30, opacity: 0, filter: "blur(4px)" }}
                animate={{ y: 0, opacity: 1, filter: "blur(0px)" }}
                exit={{ y: 30, opacity: 0, filter: "blur(4px)" }}
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
                className={cn(
                  "relative z-10 font-mono text-5xl font-black tabular-nums tracking-tighter",
                  isWinning ? "text-emerald-400" : "text-white"
                )}
                style={{
                  textShadow: isWinning
                    ? "0 0 30px rgba(16, 185, 129, 0.5), 0 2px 4px rgba(0,0,0,0.5)"
                    : "0 2px 4px rgba(0,0,0,0.5)",
                }}
              >
                {value}
              </motion.span>
            </AnimatePresence>

            {/* Winner badge */}
            <AnimatePresence>
              {isWinning && (
                <motion.div
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  exit={{ scale: 0, rotate: 180 }}
                  transition={{ type: "spring", stiffness: 400, damping: 20 }}
                  className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500 shadow-lg"
                >
                  <Check className="h-3.5 w-3.5 text-black" />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          {/* Decrement button */}
          <motion.button
            whileTap={{ scale: 0.95, backgroundColor: "rgba(239, 68, 68, 0.2)" }}
            onPointerDown={() => startHold(false)}
            onPointerUp={stopHold}
            onPointerLeave={stopHold}
            onClick={() => onChange(Math.max(0, value - 1))}
            className={cn(
              "flex h-12 w-24 items-center justify-center border-t transition-colors",
              isWinning
                ? "border-emerald-700/50 text-emerald-300 hover:bg-emerald-500/20"
                : "border-[#262626] text-[#525252] hover:bg-[#1a1a1a] hover:text-white"
            )}
          >
            <Minus className="h-5 w-5" />
          </motion.button>
        </motion.div>
      </div>

      {/* Quick preset chips */}
      <AnimatePresence>
        {showPresets && (
          <motion.div
            initial={{ opacity: 0, y: -10, height: 0 }}
            animate={{ opacity: 1, y: 0, height: "auto" }}
            exit={{ opacity: 0, y: -10, height: 0 }}
            className="flex gap-1"
          >
            {SCORE_PRESETS.map((preset) => (
              <motion.button
                key={preset}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => {
                  onChange(preset);
                  setShowPresets(false);
                }}
                className={cn(
                  "rounded-full px-3 py-1 text-xs font-bold transition-colors",
                  value === preset
                    ? "bg-emerald-500 text-black"
                    : "bg-[#1a1a1a] text-[#737373] hover:bg-[#262626] hover:text-white"
                )}
              >
                {preset}
              </motion.button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tap hint */}
      <motion.span
        initial={{ opacity: 0 }}
        animate={{ opacity: showPresets ? 0 : 0.5 }}
        className="text-[10px] text-[#525252]"
      >
        tap score for presets
      </motion.span>
    </div>
  );
}

// Main Match Recorder Component
export function MatchRecorder({
  matches,
  bestOf,
  isDoubles = false,
  isAdmin = false,
  groupName,
  onRecordResult,
  onQuickResult,
}: MatchRecorderProps) {
  const [selectedMatch, setSelectedMatch] = useState<TournamentMatch | null>(null);
  const [games, setGames] = useState<GameScore[]>([{ p1: 0, p2: 0 }]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Quick result state
  const [quickWinnerId, setQuickWinnerId] = useState<string | null>(null);
  const [quickSeriesScore, setQuickSeriesScore] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>("detailed");

  const gamesNeededToWin = Math.ceil(bestOf / 2);

  // Generate possible series scores based on bestOf
  const possibleSeriesScores = React.useMemo(() => {
    const scores: string[] = [];
    for (let loserWins = 0; loserWins < gamesNeededToWin; loserWins++) {
      scores.push(`${gamesNeededToWin}-${loserWins}`);
    }
    return scores;
  }, [gamesNeededToWin]);

  const playableMatches = matches.filter(
    (m) => (m.status === "ready" || m.status === "pending") && m.participant1 && m.participant2
  );
  const completedMatches = matches.filter(
    (m) => m.status === "completed" || m.status === "walkover" || m.status === "bye"
  );
  const upcomingMatches = matches.filter(
    (m) => (m.status === "pending" || m.status === "ready") && (!m.participant1 || !m.participant2)
  );

  const openRecordDialog = (match: TournamentMatch) => {
    setSelectedMatch(match);
    setGames([{ p1: 0, p2: 0 }]);
    setQuickWinnerId(null);
    setQuickSeriesScore(null);
    setActiveTab("detailed");
  };

  const closeDialog = () => {
    setSelectedMatch(null);
    setGames([{ p1: 0, p2: 0 }]);
    setQuickWinnerId(null);
    setQuickSeriesScore(null);
  };

  const handleQuickSubmit = async () => {
    if (!selectedMatch || !quickWinnerId || !quickSeriesScore || !onQuickResult) return;

    setIsSubmitting(true);
    try {
      await onQuickResult(selectedMatch.id, quickWinnerId, quickSeriesScore);
      closeDialog();
    } finally {
      setIsSubmitting(false);
    }
  };

  const addGame = () => {
    if (games.length < bestOf) {
      setGames([...games, { p1: 0, p2: 0 }]);
    }
  };

  const removeGame = (index: number) => {
    if (games.length > 1) {
      setGames(games.filter((_, i) => i !== index));
    }
  };

  const updateScore = (gameIndex: number, player: "p1" | "p2", value: number) => {
    const newGames = [...games];
    newGames[gameIndex] = { ...newGames[gameIndex], [player]: value };
    setGames(newGames);
  };

  const p1Wins = games.filter((g) => g.p1 > g.p2).length;
  const p2Wins = games.filter((g) => g.p2 > g.p1).length;
  const hasWinner = p1Wins >= gamesNeededToWin || p2Wins >= gamesNeededToWin;

  const handleSubmit = async () => {
    if (!selectedMatch || !hasWinner) return;

    const winnerId =
      p1Wins > p2Wins ? selectedMatch.participant1Id : selectedMatch.participant2Id;

    if (!winnerId) return;

    setIsSubmitting(true);
    try {
      await onRecordResult(selectedMatch.id, winnerId, games);
      closeDialog();
    } finally {
      setIsSubmitting(false);
    }
  };

  const getParticipantName = (enrollment: Enrollment | null) => {
    if (!enrollment) return "TBD";
    if (isDoubles && enrollment.partner) {
      return `${enrollment.player.displayName} & ${enrollment.partner.displayName}`;
    }
    return enrollment.player.displayName;
  };

  return (
    <div className="space-y-8">
      {/* Ready to Play Section */}
      {playableMatches.length > 0 && (
        <div>
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/20">
              <Swords className="h-4 w-4 text-emerald-400" />
            </div>
            <div>
              <h3 className="font-semibold text-white">Ready to Play</h3>
              <p className="text-xs text-[#525252]">
                {isAdmin ? "Click a match to record the result" : `${playableMatches.length} match${playableMatches.length > 1 ? "es" : ""} awaiting results`}
              </p>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {playableMatches.map((match, i) => (
              <motion.div
                key={match.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
              >
                <MatchCard
                  match={match}
                  isDoubles={isDoubles}
                  isAdmin={isAdmin}
                  onClick={() => openRecordDialog(match)}
                />
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Completed Matches Section */}
      {completedMatches.length > 0 && (
        <div>
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#1a1a1a]">
              <Trophy className="h-4 w-4 text-[#525252]" />
            </div>
            <div>
              <h3 className="font-semibold text-white">Completed</h3>
              <p className="text-xs text-[#525252]">{completedMatches.length} match{completedMatches.length > 1 ? "es" : ""} finished</p>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {completedMatches.map((match, i) => (
              <motion.div
                key={match.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 0.05 }}
              >
                <MatchCard match={match} isDoubles={isDoubles} />
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Upcoming (waiting for participants) */}
      {upcomingMatches.length > 0 && (
        <div>
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#1a1a1a]">
              <Clock className="h-4 w-4 text-[#525252]" />
            </div>
            <div>
              <h3 className="font-semibold text-[#737373]">Upcoming</h3>
              <p className="text-xs text-[#525252]">Waiting for previous matches</p>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 opacity-50">
            {upcomingMatches.map((match) => (
              <MatchCard key={match.id} match={match} isDoubles={isDoubles} />
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {matches.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-[#262626] py-16">
          <Swords className="mb-4 h-10 w-10 text-[#333]" />
          <p className="text-[#525252]">No matches in this stage yet</p>
        </div>
      )}

      {/* Score Recording Dialog */}
      <Dialog open={!!selectedMatch} onOpenChange={() => closeDialog()}>
        <DialogContent className="max-w-lg overflow-hidden border-[#1a1a1a] bg-[#0a0a0a] p-0 text-white">
          <DialogTitle className="sr-only">Record Match Result</DialogTitle>

          {selectedMatch && (
            <Tabs.Root value={activeTab} onValueChange={setActiveTab} className="flex flex-col">
              {/* Header with dramatic gradient */}
              <div className="relative overflow-hidden bg-gradient-to-b from-[#111] to-transparent px-6 pb-4 pt-6">
                {/* Background decoration */}
                <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAwIDEwIEwgNDAgMTAgTSAxMCAwIEwgMTAgNDAgTSAwIDIwIEwgNDAgMjAgTSAyMCAwIEwgMjAgNDAgTSAwIDMwIEwgNDAgMzAgTSAzMCAwIEwgMzAgNDAiIGZpbGw9Im5vbmUiIHN0cm9rZT0iIzFhMWExYSIgb3BhY2l0eT0iMC41IiBzdHJva2Utd2lkdGg9IjEiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiLz48L3N2Zz4=')] opacity-30" />

                <div className="relative flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#525252]">
                    {selectedMatch.round.name}
                  </span>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={closeDialog}
                    className="h-8 w-8 rounded-full p-0 text-[#525252] hover:text-white"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                {/* Tab Switcher */}
                <Tabs.List className="relative mt-4 flex rounded-xl bg-[#0a0a0a]/80 p-1">
                  <Tabs.Trigger
                    value="quick"
                    className={cn(
                      "flex flex-1 items-center justify-center gap-2 rounded-lg py-2.5 text-xs font-semibold transition-all",
                      activeTab === "quick"
                        ? "bg-emerald-500 text-black shadow-lg shadow-emerald-500/25"
                        : "text-[#525252] hover:text-white"
                    )}
                  >
                    <Zap className="h-3.5 w-3.5" />
                    Quick Result
                  </Tabs.Trigger>
                  <Tabs.Trigger
                    value="detailed"
                    className={cn(
                      "flex flex-1 items-center justify-center gap-2 rounded-lg py-2.5 text-xs font-semibold transition-all",
                      activeTab === "detailed"
                        ? "bg-emerald-500 text-black shadow-lg shadow-emerald-500/25"
                        : "text-[#525252] hover:text-white"
                    )}
                  >
                    <ListOrdered className="h-3.5 w-3.5" />
                    Detailed
                  </Tabs.Trigger>
                </Tabs.List>
              </div>

              {/* Quick Result Tab */}
              <Tabs.Content value="quick" className="flex-1 outline-none">
                <div className="space-y-6 px-6 py-6">
                  {/* Winner Selection */}
                  <div>
                    <p className="mb-3 text-center text-[10px] font-bold uppercase tracking-[0.2em] text-[#525252]">
                      Select Winner
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                      {/* Player 1 Selection */}
                      <motion.button
                        onClick={() => {
                          setQuickWinnerId(selectedMatch.participant1Id);
                          setQuickSeriesScore(null);
                        }}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className={cn(
                          "relative flex flex-col items-center gap-3 rounded-xl border-2 p-4 transition-all",
                          quickWinnerId === selectedMatch.participant1Id
                            ? "border-emerald-500 bg-emerald-500/10 shadow-lg shadow-emerald-500/20"
                            : "border-[#1a1a1a] bg-[#111] hover:border-[#333]"
                        )}
                      >
                        <div className="relative">
                          <Avatar className="h-14 w-14 border-2 border-[#262626]">
                            <AvatarImage src={selectedMatch.participant1?.player.avatarUrl || undefined} />
                            <AvatarFallback className="bg-[#1a1a1a] text-lg font-bold">
                              {selectedMatch.participant1?.player.displayName.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          <AnimatePresence>
                            {quickWinnerId === selectedMatch.participant1Id && (
                              <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                exit={{ scale: 0 }}
                                className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500"
                              >
                                <Check className="h-3.5 w-3.5 text-black" />
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                        <div className="text-center">
                          <p className={cn(
                            "text-sm font-semibold truncate max-w-[120px]",
                            quickWinnerId === selectedMatch.participant1Id ? "text-emerald-400" : "text-white"
                          )}>
                            {getParticipantName(selectedMatch.participant1)}
                          </p>
                          <p className="text-[10px] text-[#525252]">
                            {selectedMatch.participant1?.player.elo} ELO
                          </p>
                        </div>
                      </motion.button>

                      {/* Player 2 Selection */}
                      <motion.button
                        onClick={() => {
                          setQuickWinnerId(selectedMatch.participant2Id);
                          setQuickSeriesScore(null);
                        }}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className={cn(
                          "relative flex flex-col items-center gap-3 rounded-xl border-2 p-4 transition-all",
                          quickWinnerId === selectedMatch.participant2Id
                            ? "border-emerald-500 bg-emerald-500/10 shadow-lg shadow-emerald-500/20"
                            : "border-[#1a1a1a] bg-[#111] hover:border-[#333]"
                        )}
                      >
                        <div className="relative">
                          <Avatar className="h-14 w-14 border-2 border-[#262626]">
                            <AvatarImage src={selectedMatch.participant2?.player.avatarUrl || undefined} />
                            <AvatarFallback className="bg-[#1a1a1a] text-lg font-bold">
                              {selectedMatch.participant2?.player.displayName.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          <AnimatePresence>
                            {quickWinnerId === selectedMatch.participant2Id && (
                              <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                exit={{ scale: 0 }}
                                className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500"
                              >
                                <Check className="h-3.5 w-3.5 text-black" />
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                        <div className="text-center">
                          <p className={cn(
                            "text-sm font-semibold truncate max-w-[120px]",
                            quickWinnerId === selectedMatch.participant2Id ? "text-emerald-400" : "text-white"
                          )}>
                            {getParticipantName(selectedMatch.participant2)}
                          </p>
                          <p className="text-[10px] text-[#525252]">
                            {selectedMatch.participant2?.player.elo} ELO
                          </p>
                        </div>
                      </motion.button>
                    </div>
                  </div>

                  {/* Series Score Selection */}
                  <AnimatePresence>
                    {quickWinnerId && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                      >
                        <p className="mb-3 text-center text-[10px] font-bold uppercase tracking-[0.2em] text-[#525252]">
                          Series Score
                        </p>
                        <div className="flex justify-center gap-2">
                          {possibleSeriesScores.map((score) => (
                            <motion.button
                              key={score}
                              onClick={() => setQuickSeriesScore(score)}
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              className={cn(
                                "relative flex h-14 w-16 items-center justify-center rounded-xl border-2 font-mono text-lg font-black transition-all",
                                quickSeriesScore === score
                                  ? "border-emerald-500 bg-emerald-500/10 text-emerald-400 shadow-lg shadow-emerald-500/20"
                                  : "border-[#1a1a1a] bg-[#111] text-white hover:border-[#333]"
                              )}
                            >
                              {score}
                              <AnimatePresence>
                                {quickSeriesScore === score && (
                                  <motion.div
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    exit={{ scale: 0 }}
                                    className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500"
                                  >
                                    <Check className="h-3 w-3 text-black" />
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </motion.button>
                          ))}
                        </div>
                        <p className="mt-2 text-center text-[10px] text-[#525252]">
                          Best of {bestOf} • First to {gamesNeededToWin} wins
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Quick Submit */}
                <div className="border-t border-[#1a1a1a] px-6 py-4">
                  <Button
                    onClick={handleQuickSubmit}
                    disabled={!quickWinnerId || !quickSeriesScore || isSubmitting || !onQuickResult}
                    className={cn(
                      "w-full py-6 font-semibold transition-all",
                      quickWinnerId && quickSeriesScore && onQuickResult
                        ? "bg-emerald-500 text-black hover:bg-emerald-400"
                        : "bg-[#1a1a1a] text-[#525252]"
                    )}
                  >
                    {isSubmitting ? (
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                      >
                        <Sparkles className="h-5 w-5" />
                      </motion.div>
                    ) : quickWinnerId && quickSeriesScore ? (
                      <>
                        <Trophy className="mr-2 h-5 w-5" />
                        Record {quickSeriesScore} Victory
                      </>
                    ) : (
                      <>
                        Select winner and score
                      </>
                    )}
                  </Button>
                </div>
              </Tabs.Content>

              {/* Detailed Tab */}
              <Tabs.Content value="detailed" className="flex-1 outline-none">
                {/* VS Confrontation with Live Score */}
                <div className="relative px-6 py-4">
                  <div className="relative flex items-center justify-between gap-4">
                    {/* Player 1 */}
                    <motion.div
                      initial={{ x: -50, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      className="flex flex-1 flex-col items-center text-center"
                    >
                      <div className={cn(
                        "relative mb-2 rounded-full p-1",
                        p1Wins >= gamesNeededToWin && "ring-2 ring-emerald-400 ring-offset-2 ring-offset-[#0a0a0a]"
                      )}>
                        <Avatar className="h-12 w-12 border-2 border-[#262626]">
                          <AvatarImage src={selectedMatch.participant1?.player.avatarUrl || undefined} />
                          <AvatarFallback className="bg-[#1a1a1a] text-sm font-bold">
                            {selectedMatch.participant1?.player.displayName.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        {p1Wins >= gamesNeededToWin && (
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="absolute -right-1 -top-1 rounded-full bg-emerald-500 p-1"
                          >
                            <Trophy className="h-2.5 w-2.5 text-black" />
                          </motion.div>
                        )}
                      </div>
                      <p className={cn(
                        "text-xs font-semibold truncate max-w-[100px] transition-colors",
                        p1Wins >= gamesNeededToWin ? "text-emerald-400" : "text-white"
                      )}>
                        {getParticipantName(selectedMatch.participant1)}
                      </p>
                    </motion.div>

                    {/* Live Score */}
                    <motion.div
                      className="flex items-center gap-2"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                    >
                      <motion.span
                        key={`p1-${p1Wins}`}
                        initial={{ scale: 1.5 }}
                        animate={{ scale: 1 }}
                        className={cn(
                          "font-mono text-3xl font-black transition-colors",
                          p1Wins >= gamesNeededToWin ? "text-emerald-400" : "text-white"
                        )}
                      >
                        {p1Wins}
                      </motion.span>
                      <span className="text-lg text-[#333]">:</span>
                      <motion.span
                        key={`p2-${p2Wins}`}
                        initial={{ scale: 1.5 }}
                        animate={{ scale: 1 }}
                        className={cn(
                          "font-mono text-3xl font-black transition-colors",
                          p2Wins >= gamesNeededToWin ? "text-emerald-400" : "text-white"
                        )}
                      >
                        {p2Wins}
                      </motion.span>
                    </motion.div>

                    {/* Player 2 */}
                    <motion.div
                      initial={{ x: 50, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      className="flex flex-1 flex-col items-center text-center"
                    >
                      <div className={cn(
                        "relative mb-2 rounded-full p-1",
                        p2Wins >= gamesNeededToWin && "ring-2 ring-emerald-400 ring-offset-2 ring-offset-[#0a0a0a]"
                      )}>
                        <Avatar className="h-12 w-12 border-2 border-[#262626]">
                          <AvatarImage src={selectedMatch.participant2?.player.avatarUrl || undefined} />
                          <AvatarFallback className="bg-[#1a1a1a] text-sm font-bold">
                            {selectedMatch.participant2?.player.displayName.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        {p2Wins >= gamesNeededToWin && (
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="absolute -right-1 -top-1 rounded-full bg-emerald-500 p-1"
                          >
                            <Trophy className="h-2.5 w-2.5 text-black" />
                          </motion.div>
                        )}
                      </div>
                      <p className={cn(
                        "text-xs font-semibold truncate max-w-[100px] transition-colors",
                        p2Wins >= gamesNeededToWin ? "text-emerald-400" : "text-white"
                      )}>
                        {getParticipantName(selectedMatch.participant2)}
                      </p>
                    </motion.div>
                  </div>
                  <p className="mt-2 text-center text-[10px] uppercase tracking-wider text-[#525252]">
                    First to {gamesNeededToWin} wins
                  </p>
                </div>

                {/* Game Scores */}
                <div className="max-h-[300px] space-y-6 overflow-y-auto px-4 py-4 sm:px-6">
                  <AnimatePresence mode="popLayout">
                    {games.map((game, index) => {
                      const gameWinner = game.p1 > game.p2 ? "p1" : game.p2 > game.p1 ? "p2" : null;
                      return (
                        <motion.div
                          key={index}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -20 }}
                          transition={{ delay: index * 0.05 }}
                          className="relative"
                        >
                          {/* Game header */}
                          <div className="mb-3 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className={cn(
                                "flex h-6 w-6 items-center justify-center rounded-md text-xs font-black",
                                gameWinner
                                  ? "bg-emerald-500/20 text-emerald-400"
                                  : "bg-[#1a1a1a] text-[#525252]"
                              )}>
                                {index + 1}
                              </div>
                              <span className="text-xs font-semibold uppercase tracking-wider text-[#525252]">
                                Game {index + 1}
                              </span>
                              {gameWinner && (
                                <motion.span
                                  initial={{ opacity: 0, scale: 0 }}
                                  animate={{ opacity: 1, scale: 1 }}
                                  className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-400"
                                >
                                  {game.p1 > game.p2 ? "P1 WIN" : "P2 WIN"}
                                </motion.span>
                              )}
                            </div>
                            {games.length > 1 && (
                              <motion.button
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                                onClick={() => removeGame(index)}
                                className="flex h-7 w-7 items-center justify-center rounded-full text-[#525252] transition-colors hover:bg-red-500/20 hover:text-red-400"
                              >
                                <X className="h-4 w-4" />
                              </motion.button>
                            )}
                          </div>

                          {/* Score inputs */}
                          <div className="flex items-start justify-center gap-4 sm:gap-8">
                            <ScoreInput
                              value={game.p1}
                              onChange={(val) => updateScore(index, "p1", val)}
                              isWinning={game.p1 > game.p2}
                            />

                            {/* VS divider */}
                            <div className="flex flex-col items-center justify-center pt-8">
                              <div className="flex h-10 w-10 items-center justify-center rounded-full border border-[#262626] bg-[#111] text-xs font-black text-[#525252]">
                                VS
                              </div>
                            </div>

                            <ScoreInput
                              value={game.p2}
                              onChange={(val) => updateScore(index, "p2", val)}
                              isWinning={game.p2 > game.p1}
                            />
                          </div>

                          {/* Divider between games */}
                          {index < games.length - 1 && (
                            <div className="mt-6 border-b border-dashed border-[#1a1a1a]" />
                          )}
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>

                  {games.length < bestOf && (
                    <motion.button
                      onClick={addGame}
                      whileHover={{ scale: 1.02, borderColor: "#333" }}
                      whileTap={{ scale: 0.98 }}
                      className="group flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-[#1a1a1a] py-4 text-sm font-semibold text-[#525252] transition-all hover:border-emerald-500/30 hover:bg-emerald-500/5 hover:text-emerald-400"
                    >
                      <Plus className="h-4 w-4 transition-transform group-hover:rotate-90" />
                      Add Game {games.length + 1}
                    </motion.button>
                  )}
                </div>

                {/* Detailed Submit */}
                <div className="border-t border-[#1a1a1a] px-6 py-4">
                  <Button
                    onClick={handleSubmit}
                    disabled={!hasWinner || isSubmitting}
                    className={cn(
                      "w-full py-6 font-semibold transition-all",
                      hasWinner
                        ? "bg-emerald-500 text-black hover:bg-emerald-400"
                        : "bg-[#1a1a1a] text-[#525252]"
                    )}
                  >
                    {isSubmitting ? (
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                      >
                        <Sparkles className="h-5 w-5" />
                      </motion.div>
                    ) : hasWinner ? (
                      <>
                        <Trophy className="mr-2 h-5 w-5" />
                        Record Victory
                      </>
                    ) : (
                      <>
                        Enter scores to determine winner
                      </>
                    )}
                  </Button>
                </div>
              </Tabs.Content>
            </Tabs.Root>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Valid bestOf values
const VALID_BEST_OF = [1, 3, 5, 7] as const;

// Standalone dialog component for external use
interface MatchRecordDialogProps {
  match: TournamentMatch | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bestOf: number;
  isDoubles?: boolean;
  onRecordResult: (matchId: string, winnerId: string, scores: GameScore[]) => Promise<void>;
  onQuickResult?: (matchId: string, winnerId: string, seriesScore: string) => Promise<void>;
  onBestOfChange?: (matchId: string, bestOf: number) => Promise<void>;
}

export function MatchRecordDialog({
  match,
  open,
  onOpenChange,
  bestOf,
  isDoubles = false,
  onRecordResult,
  onQuickResult,
  onBestOfChange,
}: MatchRecordDialogProps) {
  const [games, setGames] = useState<GameScore[]>([{ p1: 0, p2: 0 }]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [quickWinnerId, setQuickWinnerId] = useState<string | null>(null);
  const [quickSeriesScore, setQuickSeriesScore] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>("detailed");

  // BestOf override state
  const [localBestOf, setLocalBestOf] = useState<number>(bestOf);
  const [isEditingBestOf, setIsEditingBestOf] = useState(false);
  const [isSavingBestOf, setIsSavingBestOf] = useState(false);

  // Use local bestOf for calculations
  const effectiveBestOf = localBestOf;
  const gamesNeededToWin = Math.ceil(effectiveBestOf / 2);

  const possibleSeriesScores = React.useMemo(() => {
    const scores: string[] = [];
    for (let loserWins = 0; loserWins < gamesNeededToWin; loserWins++) {
      scores.push(`${gamesNeededToWin}-${loserWins}`);
    }
    return scores;
  }, [gamesNeededToWin]);

  // Reset state when dialog opens/closes or match changes
  React.useEffect(() => {
    if (open && match) {
      setGames([{ p1: 0, p2: 0 }]);
      setQuickWinnerId(null);
      setQuickSeriesScore(null);
      setActiveTab("detailed");
      setLocalBestOf(bestOf);
      setIsEditingBestOf(false);
    }
  }, [open, match?.id, bestOf]);

  // Handle bestOf change
  const handleBestOfSelect = async (newBestOf: number) => {
    if (!match || !onBestOfChange) return;

    setIsSavingBestOf(true);
    try {
      await onBestOfChange(match.id, newBestOf);
      setLocalBestOf(newBestOf);
      setIsEditingBestOf(false);
      // Reset series score selection as options may have changed
      setQuickSeriesScore(null);
    } finally {
      setIsSavingBestOf(false);
    }
  };

  const handleQuickSubmit = async () => {
    if (!match || !quickWinnerId || !quickSeriesScore || !onQuickResult) return;

    setIsSubmitting(true);
    try {
      await onQuickResult(match.id, quickWinnerId, quickSeriesScore);
      onOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const addGame = () => {
    if (games.length < effectiveBestOf) {
      setGames([...games, { p1: 0, p2: 0 }]);
    }
  };

  const removeGame = (index: number) => {
    if (games.length > 1) {
      setGames(games.filter((_, i) => i !== index));
    }
  };

  const updateScore = (gameIndex: number, player: "p1" | "p2", value: number) => {
    const newGames = [...games];
    newGames[gameIndex] = { ...newGames[gameIndex], [player]: value };
    setGames(newGames);
  };

  const p1Wins = games.filter((g) => g.p1 > g.p2).length;
  const p2Wins = games.filter((g) => g.p2 > g.p1).length;
  const hasWinner = p1Wins >= gamesNeededToWin || p2Wins >= gamesNeededToWin;

  const handleSubmit = async () => {
    if (!match || !hasWinner) return;

    const winnerId = p1Wins > p2Wins ? match.participant1Id : match.participant2Id;
    if (!winnerId) return;

    setIsSubmitting(true);
    try {
      await onRecordResult(match.id, winnerId, games);
      onOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getParticipantName = (enrollment: Enrollment | null) => {
    if (!enrollment) return "TBD";
    if (isDoubles && enrollment.partner) {
      return `${enrollment.player.displayName} & ${enrollment.partner.displayName}`;
    }
    return enrollment.player.displayName;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg overflow-hidden border-[#1a1a1a] bg-[#0a0a0a] p-0 text-white">
        <DialogTitle className="sr-only">Record Match Result</DialogTitle>

        {match && (
          <Tabs.Root value={activeTab} onValueChange={setActiveTab} className="flex flex-col">
            {/* Header with dramatic gradient */}
            <div className="relative overflow-hidden bg-gradient-to-b from-[#111] to-transparent px-6 pb-4 pt-6">
              {/* Background decoration */}
              <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAwIDEwIEwgNDAgMTAgTSAxMCAwIEwgMTAgNDAgTSAwIDIwIEwgNDAgMjAgTSAyMCAwIEwgMjAgNDAgTSAwIDMwIEwgNDAgMzAgTSAzMCAwIEwgMzAgNDAiIGZpbGw9Im5vbmUiIHN0cm9rZT0iIzFhMWExYSIgb3BhY2l0eT0iMC41IiBzdHJva2Utd2lkdGg9IjEiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiLz48L3N2Zz4=')] opacity-30" />

              <div className="relative flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#525252]">
                  {match.round.name}
                </span>

                {/* BestOf Display/Editor */}
                <div className="flex items-center gap-2">
                  <AnimatePresence mode="wait">
                    {isEditingBestOf ? (
                      <motion.div
                        key="editing"
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        className="flex items-center gap-1"
                      >
                        {VALID_BEST_OF.map((bo) => (
                          <motion.button
                            key={bo}
                            onClick={() => handleBestOfSelect(bo)}
                            disabled={isSavingBestOf}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            className={cn(
                              "flex h-7 w-8 items-center justify-center rounded-md text-xs font-bold transition-all",
                              localBestOf === bo
                                ? "bg-emerald-500 text-black"
                                : "bg-[#1a1a1a] text-[#737373] hover:bg-[#262626] hover:text-white"
                            )}
                          >
                            {bo}
                          </motion.button>
                        ))}
                        <button
                          onClick={() => setIsEditingBestOf(false)}
                          className="ml-1 text-[#525252] hover:text-white"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </motion.div>
                    ) : (
                      <motion.button
                        key="display"
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        onClick={() => onBestOfChange && setIsEditingBestOf(true)}
                        disabled={!onBestOfChange}
                        className={cn(
                          "flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium transition-all",
                          onBestOfChange
                            ? "border-[#262626] bg-[#111] text-[#a3a3a3] hover:border-emerald-500/50 hover:text-white"
                            : "border-[#1a1a1a] bg-transparent text-[#525252] cursor-default"
                        )}
                      >
                        <span className="font-mono font-bold">Bo{effectiveBestOf}</span>
                        {onBestOfChange && <Settings2 className="h-3 w-3" />}
                      </motion.button>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              {/* BestOf change warning */}
              <AnimatePresence>
                {isEditingBestOf && (
                  <motion.p
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-2 text-[10px] text-amber-400"
                  >
                    This will only affect this match
                  </motion.p>
                )}
              </AnimatePresence>

              {/* Tab Switcher */}
              <Tabs.List className="relative mt-4 flex rounded-xl bg-[#0a0a0a]/80 p-1">
                <Tabs.Trigger
                  value="quick"
                  className={cn(
                    "flex flex-1 items-center justify-center gap-2 rounded-lg py-2.5 text-xs font-semibold transition-all",
                    activeTab === "quick"
                      ? "bg-emerald-500 text-black shadow-lg shadow-emerald-500/25"
                      : "text-[#525252] hover:text-white"
                  )}
                >
                  <Zap className="h-3.5 w-3.5" />
                  Quick Result
                </Tabs.Trigger>
                <Tabs.Trigger
                  value="detailed"
                  className={cn(
                    "flex flex-1 items-center justify-center gap-2 rounded-lg py-2.5 text-xs font-semibold transition-all",
                    activeTab === "detailed"
                      ? "bg-emerald-500 text-black shadow-lg shadow-emerald-500/25"
                      : "text-[#525252] hover:text-white"
                  )}
                >
                  <ListOrdered className="h-3.5 w-3.5" />
                  Detailed
                </Tabs.Trigger>
              </Tabs.List>
            </div>

            {/* Quick Result Tab */}
            <Tabs.Content value="quick" className="flex-1 outline-none">
              <div className="space-y-6 px-6 py-6">
                {/* Winner Selection */}
                <div>
                  <p className="mb-3 text-center text-[10px] font-bold uppercase tracking-[0.2em] text-[#525252]">
                    Select Winner
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    {/* Player 1 Selection */}
                    <motion.button
                      onClick={() => {
                        setQuickWinnerId(match.participant1Id);
                        setQuickSeriesScore(null);
                      }}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className={cn(
                        "relative flex flex-col items-center gap-3 rounded-xl border-2 p-4 transition-all",
                        quickWinnerId === match.participant1Id
                          ? "border-emerald-500 bg-emerald-500/10 shadow-lg shadow-emerald-500/20"
                          : "border-[#1a1a1a] bg-[#111] hover:border-[#333]"
                      )}
                    >
                      <div className="relative">
                        <Avatar className="h-14 w-14 border-2 border-[#262626]">
                          <AvatarImage src={match.participant1?.player.avatarUrl || undefined} />
                          <AvatarFallback className="bg-[#1a1a1a] text-lg font-bold">
                            {match.participant1?.player.displayName.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <AnimatePresence>
                          {quickWinnerId === match.participant1Id && (
                            <motion.div
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              exit={{ scale: 0 }}
                              className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500"
                            >
                              <Check className="h-3.5 w-3.5 text-black" />
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                      <div className="text-center">
                        <p className={cn(
                          "text-sm font-semibold truncate max-w-[120px]",
                          quickWinnerId === match.participant1Id ? "text-emerald-400" : "text-white"
                        )}>
                          {getParticipantName(match.participant1)}
                        </p>
                        <p className="text-[10px] text-[#525252]">
                          {match.participant1?.player.elo} ELO
                        </p>
                      </div>
                    </motion.button>

                    {/* Player 2 Selection */}
                    <motion.button
                      onClick={() => {
                        setQuickWinnerId(match.participant2Id);
                        setQuickSeriesScore(null);
                      }}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className={cn(
                        "relative flex flex-col items-center gap-3 rounded-xl border-2 p-4 transition-all",
                        quickWinnerId === match.participant2Id
                          ? "border-emerald-500 bg-emerald-500/10 shadow-lg shadow-emerald-500/20"
                          : "border-[#1a1a1a] bg-[#111] hover:border-[#333]"
                      )}
                    >
                      <div className="relative">
                        <Avatar className="h-14 w-14 border-2 border-[#262626]">
                          <AvatarImage src={match.participant2?.player.avatarUrl || undefined} />
                          <AvatarFallback className="bg-[#1a1a1a] text-lg font-bold">
                            {match.participant2?.player.displayName.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <AnimatePresence>
                          {quickWinnerId === match.participant2Id && (
                            <motion.div
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              exit={{ scale: 0 }}
                              className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500"
                            >
                              <Check className="h-3.5 w-3.5 text-black" />
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                      <div className="text-center">
                        <p className={cn(
                          "text-sm font-semibold truncate max-w-[120px]",
                          quickWinnerId === match.participant2Id ? "text-emerald-400" : "text-white"
                        )}>
                          {getParticipantName(match.participant2)}
                        </p>
                        <p className="text-[10px] text-[#525252]">
                          {match.participant2?.player.elo} ELO
                        </p>
                      </div>
                    </motion.button>
                  </div>
                </div>

                {/* Series Score Selection */}
                <AnimatePresence>
                  {quickWinnerId && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                    >
                      <p className="mb-3 text-center text-[10px] font-bold uppercase tracking-[0.2em] text-[#525252]">
                        Series Score
                      </p>
                      <div className="flex justify-center gap-2">
                        {possibleSeriesScores.map((score) => (
                          <motion.button
                            key={score}
                            onClick={() => setQuickSeriesScore(score)}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            className={cn(
                              "relative flex h-14 w-16 items-center justify-center rounded-xl border-2 font-mono text-lg font-black transition-all",
                              quickSeriesScore === score
                                ? "border-emerald-500 bg-emerald-500/10 text-emerald-400 shadow-lg shadow-emerald-500/20"
                                : "border-[#1a1a1a] bg-[#111] text-white hover:border-[#333]"
                            )}
                          >
                            {score}
                            <AnimatePresence>
                              {quickSeriesScore === score && (
                                <motion.div
                                  initial={{ scale: 0 }}
                                  animate={{ scale: 1 }}
                                  exit={{ scale: 0 }}
                                  className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500"
                                >
                                  <Check className="h-3 w-3 text-black" />
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </motion.button>
                        ))}
                      </div>
                      <p className="mt-2 text-center text-[10px] text-[#525252]">
                        Best of {effectiveBestOf} • First to {gamesNeededToWin} wins
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Quick Submit */}
              <div className="border-t border-[#1a1a1a] px-6 py-4">
                <Button
                  onClick={handleQuickSubmit}
                  disabled={!quickWinnerId || !quickSeriesScore || isSubmitting || !onQuickResult}
                  className={cn(
                    "w-full py-6 font-semibold transition-all",
                    quickWinnerId && quickSeriesScore && onQuickResult
                      ? "bg-emerald-500 text-black hover:bg-emerald-400"
                      : "bg-[#1a1a1a] text-[#525252]"
                  )}
                >
                  {isSubmitting ? (
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                    >
                      <Sparkles className="h-5 w-5" />
                    </motion.div>
                  ) : quickWinnerId && quickSeriesScore ? (
                    <>
                      <Trophy className="mr-2 h-5 w-5" />
                      Record {quickSeriesScore} Victory
                    </>
                  ) : (
                    <>Select winner and score</>
                  )}
                </Button>
              </div>
            </Tabs.Content>

            {/* Detailed Tab */}
            <Tabs.Content value="detailed" className="flex-1 outline-none">
              {/* VS Confrontation with Live Score */}
              <div className="relative px-6 py-4">
                <div className="relative flex items-center justify-between gap-4">
                  {/* Player 1 */}
                  <motion.div
                    initial={{ x: -50, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    className="flex flex-1 flex-col items-center text-center"
                  >
                    <div className={cn(
                      "relative mb-2 rounded-full p-1",
                      p1Wins >= gamesNeededToWin && "ring-2 ring-emerald-400 ring-offset-2 ring-offset-[#0a0a0a]"
                    )}>
                      <Avatar className="h-12 w-12 border-2 border-[#262626]">
                        <AvatarImage src={match.participant1?.player.avatarUrl || undefined} />
                        <AvatarFallback className="bg-[#1a1a1a] text-sm font-bold">
                          {match.participant1?.player.displayName.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      {p1Wins >= gamesNeededToWin && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="absolute -right-1 -top-1 rounded-full bg-emerald-500 p-1"
                        >
                          <Trophy className="h-2.5 w-2.5 text-black" />
                        </motion.div>
                      )}
                    </div>
                    <p className={cn(
                      "text-xs font-semibold truncate max-w-[100px] transition-colors",
                      p1Wins >= gamesNeededToWin ? "text-emerald-400" : "text-white"
                    )}>
                      {getParticipantName(match.participant1)}
                    </p>
                  </motion.div>

                  {/* Live Score */}
                  <motion.div
                    className="flex items-center gap-2"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                  >
                    <motion.span
                      key={`p1-${p1Wins}`}
                      initial={{ scale: 1.5 }}
                      animate={{ scale: 1 }}
                      className={cn(
                        "font-mono text-3xl font-black transition-colors",
                        p1Wins >= gamesNeededToWin ? "text-emerald-400" : "text-white"
                      )}
                    >
                      {p1Wins}
                    </motion.span>
                    <span className="text-lg text-[#333]">:</span>
                    <motion.span
                      key={`p2-${p2Wins}`}
                      initial={{ scale: 1.5 }}
                      animate={{ scale: 1 }}
                      className={cn(
                        "font-mono text-3xl font-black transition-colors",
                        p2Wins >= gamesNeededToWin ? "text-emerald-400" : "text-white"
                      )}
                    >
                      {p2Wins}
                    </motion.span>
                  </motion.div>

                  {/* Player 2 */}
                  <motion.div
                    initial={{ x: 50, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    className="flex flex-1 flex-col items-center text-center"
                  >
                    <div className={cn(
                      "relative mb-2 rounded-full p-1",
                      p2Wins >= gamesNeededToWin && "ring-2 ring-emerald-400 ring-offset-2 ring-offset-[#0a0a0a]"
                    )}>
                      <Avatar className="h-12 w-12 border-2 border-[#262626]">
                        <AvatarImage src={match.participant2?.player.avatarUrl || undefined} />
                        <AvatarFallback className="bg-[#1a1a1a] text-sm font-bold">
                          {match.participant2?.player.displayName.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      {p2Wins >= gamesNeededToWin && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="absolute -right-1 -top-1 rounded-full bg-emerald-500 p-1"
                        >
                          <Trophy className="h-2.5 w-2.5 text-black" />
                        </motion.div>
                      )}
                    </div>
                    <p className={cn(
                      "text-xs font-semibold truncate max-w-[100px] transition-colors",
                      p2Wins >= gamesNeededToWin ? "text-emerald-400" : "text-white"
                    )}>
                      {getParticipantName(match.participant2)}
                    </p>
                  </motion.div>
                </div>
                <p className="mt-2 text-center text-[10px] uppercase tracking-wider text-[#525252]">
                  First to {gamesNeededToWin} wins
                </p>
              </div>

              {/* Game Scores */}
              <div className="max-h-[300px] space-y-6 overflow-y-auto px-4 py-4 sm:px-6">
                <AnimatePresence mode="popLayout">
                  {games.map((game, index) => {
                    const gameWinner = game.p1 > game.p2 ? "p1" : game.p2 > game.p1 ? "p2" : null;
                    return (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ delay: index * 0.05 }}
                        className="relative"
                      >
                        {/* Game header */}
                        <div className="mb-3 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className={cn(
                              "flex h-6 w-6 items-center justify-center rounded-md text-xs font-black",
                              gameWinner
                                ? "bg-emerald-500/20 text-emerald-400"
                                : "bg-[#1a1a1a] text-[#525252]"
                            )}>
                              {index + 1}
                            </div>
                            <span className="text-xs font-semibold uppercase tracking-wider text-[#525252]">
                              Game {index + 1}
                            </span>
                            {gameWinner && (
                              <motion.span
                                initial={{ opacity: 0, scale: 0 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-400"
                              >
                                {game.p1 > game.p2 ? "P1 WIN" : "P2 WIN"}
                              </motion.span>
                            )}
                          </div>
                          {games.length > 1 && (
                            <motion.button
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.9 }}
                              onClick={() => removeGame(index)}
                              className="flex h-7 w-7 items-center justify-center rounded-full text-[#525252] transition-colors hover:bg-red-500/20 hover:text-red-400"
                            >
                              <X className="h-4 w-4" />
                            </motion.button>
                          )}
                        </div>

                        {/* Score inputs */}
                        <div className="flex items-center justify-center gap-3">
                          <ScoreInput
                            value={game.p1}
                            onChange={(v) => updateScore(index, "p1", v)}
                            isWinning={game.p1 > game.p2}
                          />
                          <span className="text-lg font-bold text-[#333]">—</span>
                          <ScoreInput
                            value={game.p2}
                            onChange={(v) => updateScore(index, "p2", v)}
                            isWinning={game.p2 > game.p1}
                          />
                        </div>

                        {/* Divider between games */}
                        {index < games.length - 1 && (
                          <div className="mt-6 border-b border-dashed border-[#1a1a1a]" />
                        )}
                      </motion.div>
                    );
                  })}
                </AnimatePresence>

                {games.length < effectiveBestOf && (
                  <motion.button
                    onClick={addGame}
                    whileHover={{ scale: 1.02, borderColor: "#333" }}
                    whileTap={{ scale: 0.98 }}
                    className="group flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-[#1a1a1a] py-4 text-sm font-semibold text-[#525252] transition-all hover:border-emerald-500/30 hover:bg-emerald-500/5 hover:text-emerald-400"
                  >
                    <Plus className="h-4 w-4 transition-transform group-hover:rotate-90" />
                    Add Game {games.length + 1}
                  </motion.button>
                )}
              </div>

              {/* Detailed Submit */}
              <div className="border-t border-[#1a1a1a] px-6 py-4">
                <Button
                  onClick={handleSubmit}
                  disabled={!hasWinner || isSubmitting}
                  className={cn(
                    "w-full py-6 font-semibold transition-all",
                    hasWinner
                      ? "bg-emerald-500 text-black hover:bg-emerald-400"
                      : "bg-[#1a1a1a] text-[#525252]"
                  )}
                >
                  {isSubmitting ? (
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                    >
                      <Sparkles className="h-5 w-5" />
                    </motion.div>
                  ) : hasWinner ? (
                    <>
                      <Trophy className="mr-2 h-5 w-5" />
                      Record Victory
                    </>
                  ) : (
                    <>Enter scores to determine winner</>
                  )}
                </Button>
              </div>
            </Tabs.Content>
          </Tabs.Root>
        )}
      </DialogContent>
    </Dialog>
  );
}
