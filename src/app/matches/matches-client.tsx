"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { User, Users, Trophy, Zap, ChevronDown, Pencil } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { TournamentBadge } from "@/components/ui/tournament-badge";
import { LoggedByIndicator } from "@/components/match/logged-by-indicator";
import { cn } from "@/lib/utils";
import { formatDistanceToNow, formatFullDate } from "@/lib/format";

interface Player {
  id: string;
  slug: string;
  displayName: string;
  elo: number;
  avatarUrl?: string | null;
}

interface Match {
  id: string;
  type: "singles" | "doubles";
  winnerScore: number;
  loserScore: number;
  eloChange: number;
  playedAt: Date;
  createdAt: Date;
  winner?: Player;
  loser?: Player;
  winnerTeam?: Player[];
  loserTeam?: Player[];
  tournamentMatchId?: string | null;
  tournament?: {
    id: string;
    name: string;
    format: string;
  } | null;
  loggedByUser?: {
    id: string;
    name: string | null;
    image: string | null;
  } | null;
}

type FilterOption = "all" | "singles" | "doubles" | "tournament" | "regular";

const filterConfig: Record<FilterOption, { label: string; icon: typeof User }> = {
  all: { label: "All", icon: Zap },
  singles: { label: "1v1", icon: User },
  doubles: { label: "2v2", icon: Users },
  tournament: { label: "Tournament", icon: Trophy },
  regular: { label: "Regular", icon: Zap },
};

export function MatchesClient({ matches }: { matches: Match[] }) {
  const [filter, setFilter] = useState<FilterOption>("all");
  const [expandedMatchId, setExpandedMatchId] = useState<string | null>(null);

  const toggleExpanded = (matchId: string) => {
    setExpandedMatchId((prev) => (prev === matchId ? null : matchId));
  };

  const filteredMatches = useMemo(() => {
    switch (filter) {
      case "singles":
        return matches.filter((m) => m.type === "singles");
      case "doubles":
        return matches.filter((m) => m.type === "doubles");
      case "tournament":
        return matches.filter((m) => m.tournamentMatchId);
      case "regular":
        return matches.filter((m) => !m.tournamentMatchId);
      default:
        return matches;
    }
  }, [matches, filter]);

  const stats = useMemo(() => {
    return {
      total: matches.length,
      singles: matches.filter((m) => m.type === "singles").length,
      doubles: matches.filter((m) => m.type === "doubles").length,
      tournament: matches.filter((m) => m.tournamentMatchId).length,
    };
  }, [matches]);

  return (
    <div className="min-h-screen bg-black">
      {/* Gradient overlay for depth */}
      <div className="fixed inset-0 bg-gradient-to-b from-violet-950/5 via-transparent to-emerald-950/5 pointer-events-none" />

      <div className="relative z-10 px-4 py-8 md:px-8 md:py-12">
        <div className="mx-auto max-w-6xl">
          {/* Header Section */}
          <motion.header
            initial={{ opacity: 0, y: -30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="mb-10"
          >
            <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              {/* Title */}
              <div className="space-y-2">
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1, duration: 0.5 }}
                  className="flex items-center gap-3"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500/20 to-emerald-500/5 ring-1 ring-emerald-500/20">
                    <Zap className="h-5 w-5 text-emerald-400" />
                  </div>
                  <span className="text-xs font-medium uppercase tracking-[0.2em] text-neutral-500">
                    Match History
                  </span>
                </motion.div>
                <h1 className="text-4xl font-bold tracking-tight text-white md:text-5xl">
                  All Matches
                </h1>
              </div>

              {/* Stats Pills */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.5 }}
                className="flex flex-wrap items-center gap-2"
              >
                <StatPill value={stats.total} label="Total" />
                <StatPill value={stats.singles} label="Singles" variant="neutral" />
                <StatPill value={stats.doubles} label="Doubles" variant="neutral" />
                <StatPill value={stats.tournament} label="Tournament" variant="tournament" />
              </motion.div>
            </div>
          </motion.header>

          {/* Filter Tabs */}
          <motion.nav
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.5 }}
            className="mb-8"
          >
            <div className="flex items-center gap-1 rounded-xl bg-neutral-900/50 p-1.5 ring-1 ring-white/5 backdrop-blur-sm w-fit">
              {(Object.keys(filterConfig) as FilterOption[]).map((key) => {
                const config = filterConfig[key];
                const isActive = filter === key;
                const Icon = config.icon;

                return (
                  <button
                    key={key}
                    onClick={() => setFilter(key)}
                    className={cn(
                      "relative flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-all duration-200",
                      isActive
                        ? "text-white"
                        : "text-neutral-500 hover:text-neutral-300"
                    )}
                  >
                    {isActive && (
                      <motion.div
                        layoutId="activeFilter"
                        className={cn(
                          "absolute inset-0 rounded-lg",
                          key === "tournament"
                            ? "bg-gradient-to-r from-violet-600/30 to-violet-500/20 ring-1 ring-violet-500/30"
                            : "bg-white/10 ring-1 ring-white/10"
                        )}
                        transition={{ type: "spring", bounce: 0.2, duration: 0.4 }}
                      />
                    )}
                    <Icon className="relative z-10 h-4 w-4" />
                    <span className="relative z-10">{config.label}</span>
                  </button>
                );
              })}
            </div>
          </motion.nav>

          {/* Match List */}
          <AnimatePresence mode="wait">
            {filteredMatches.length === 0 ? (
              <motion.div
                key="empty"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="flex h-80 items-center justify-center rounded-2xl border border-dashed border-neutral-800 bg-neutral-900/30"
              >
                <p className="text-neutral-600">No matches found</p>
              </motion.div>
            ) : (
              <motion.div
                key="list"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-3"
              >
                {filteredMatches.map((match, index) => (
                  <MatchCard
                    key={match.id}
                    match={match}
                    index={index}
                    isExpanded={expandedMatchId === match.id}
                    onToggle={() => toggleExpanded(match.id)}
                  />
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

function StatPill({
  value,
  label,
  variant = "default",
}: {
  value: number;
  label: string;
  variant?: "default" | "neutral" | "tournament";
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-2.5 rounded-full px-4 py-2 ring-1",
        variant === "tournament"
          ? "bg-violet-500/10 ring-violet-500/20"
          : variant === "neutral"
            ? "bg-neutral-900/50 ring-white/5"
            : "bg-emerald-500/10 ring-emerald-500/20"
      )}
    >
      <span
        className={cn(
          "font-mono text-lg font-bold tabular-nums",
          variant === "tournament"
            ? "text-violet-400"
            : variant === "neutral"
              ? "text-white"
              : "text-emerald-400"
        )}
      >
        {value}
      </span>
      <span className="text-xs font-medium uppercase tracking-wider text-neutral-500">
        {label}
      </span>
    </div>
  );
}

function MatchCard({
  match,
  index,
  isExpanded,
  onToggle,
}: {
  match: Match;
  index: number;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const isSingles = match.type === "singles";
  const isTournament = !!match.tournamentMatchId;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        delay: index * 0.03,
        duration: 0.4,
        ease: [0.22, 1, 0.36, 1],
      }}
      onClick={onToggle}
      className={cn(
        "group relative cursor-pointer overflow-hidden rounded-2xl transition-all duration-300",
        isTournament
          ? "bg-gradient-to-r from-violet-950/40 via-neutral-900/80 to-neutral-900/80 ring-1 ring-violet-500/20 hover:ring-violet-500/40"
          : "bg-neutral-900/60 ring-1 ring-white/5 hover:ring-white/10"
      )}
    >
      {/* Tournament glow effect */}
      {isTournament && (
        <div className="absolute -left-20 -top-20 h-40 w-40 rounded-full bg-violet-500/10 blur-3xl" />
      )}

      <div className="relative flex flex-col lg:flex-row lg:items-center">
        {/* Left: Match Type & Tournament Info */}
        <div className="flex items-center gap-4 border-b border-white/5 px-5 py-4 lg:w-56 lg:border-b-0 lg:border-r lg:py-6">
          <div
            className={cn(
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
              isTournament
                ? "bg-violet-500/15 text-violet-400"
                : "bg-neutral-800 text-neutral-400"
            )}
          >
            {isSingles ? (
              <User className="h-5 w-5" />
            ) : (
              <Users className="h-5 w-5" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-neutral-400">
                {isSingles ? "Singles" : "Doubles"}
              </span>
              {isTournament && <TournamentBadge iconOnly />}
            </div>
            {isTournament && match.tournament && (
              <Link
                href={`/tournaments/${match.tournament.id}`}
                className="mt-1 block truncate text-sm text-violet-400 hover:text-violet-300 transition-colors"
              >
                {match.tournament.name}
              </Link>
            )}
          </div>
        </div>

        {/* Center: Players & Score */}
        <div className="flex flex-1 flex-col items-center gap-4 px-5 py-5 sm:flex-row sm:gap-6 lg:px-8">
          {/* Winner Side */}
          <div className="flex flex-1 justify-end">
            {isSingles ? (
              <PlayerDisplay player={match.winner!} isWinner />
            ) : (
              <TeamDisplay players={match.winnerTeam!} isWinner />
            )}
          </div>

          {/* Score Display - The Dramatic Center */}
          <div className="flex items-center gap-3 sm:min-w-[140px] justify-center">
            <ScoreDigit value={match.winnerScore} variant="winner" />
            <div className="flex flex-col items-center gap-0.5">
              <span className="text-neutral-700 text-xl font-light">–</span>
            </div>
            <ScoreDigit value={match.loserScore} variant="loser" />
          </div>

          {/* Loser Side */}
          <div className="flex flex-1 justify-start">
            {isSingles ? (
              <PlayerDisplay player={match.loser!} isWinner={false} />
            ) : (
              <TeamDisplay players={match.loserTeam!} isWinner={false} />
            )}
          </div>
        </div>

        {/* Right: ELO & Time */}
        <div className="flex items-center justify-between gap-6 border-t border-white/5 px-5 py-4 lg:w-56 lg:flex-col lg:items-end lg:justify-center lg:border-l lg:border-t-0 lg:py-6">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-600">
              ELO
            </span>
            <div className="flex items-center gap-1 font-mono text-sm font-bold">
              <span className="text-emerald-400">+{match.eloChange}</span>
              <span className="text-neutral-700">/</span>
              <span className="text-red-400/70">-{match.eloChange}</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <LoggedByIndicator user={match.loggedByUser ?? null} size="md" />
            <span className="text-xs text-neutral-600">
              {formatDistanceToNow(match.playedAt)}
            </span>
            <ChevronDown
              className={cn(
                "h-4 w-4 text-neutral-600 transition-transform duration-200",
                isExpanded && "rotate-180"
              )}
            />
          </div>
        </div>
      </div>

      {/* Expandable Details Panel */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="border-t border-white/5 bg-neutral-950/50 px-5 py-4 lg:px-8">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                {/* Match ID */}
                <div className="flex items-center gap-2">
                  <span className="text-xs text-neutral-500">Match ID</span>
                  <span className="font-mono text-xs text-neutral-600">
                    {match.id.slice(0, 8)}...
                  </span>
                </div>

                {/* Audit info */}
                <div className="flex items-center gap-2">
                  <Pencil className="h-3 w-3 text-neutral-600" />
                  <span className="text-xs text-neutral-500">Logged by</span>
                  {match.loggedByUser ? (
                    <div className="flex items-center gap-2">
                      <Avatar className="h-5 w-5 ring-1 ring-neutral-700/50">
                        <AvatarImage src={match.loggedByUser.image || undefined} />
                        <AvatarFallback className="bg-neutral-800 text-[8px]">
                          {match.loggedByUser.name?.charAt(0) || "?"}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-xs text-neutral-400">
                        {match.loggedByUser.name || "Unknown"}
                      </span>
                    </div>
                  ) : (
                    <span className="text-xs text-neutral-400">Unknown user</span>
                  )}
                  <span className="text-xs text-neutral-600">on</span>
                  <span className="text-xs text-neutral-400">
                    {formatFullDate(match.createdAt)}
                  </span>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hover accent */}
      <div
        className={cn(
          "absolute bottom-0 left-0 h-0.5 w-full origin-left scale-x-0 transition-transform duration-500 group-hover:scale-x-100",
          isTournament
            ? "bg-gradient-to-r from-violet-500/50 via-violet-400/30 to-transparent"
            : "bg-gradient-to-r from-emerald-500/40 via-emerald-400/20 to-transparent"
        )}
      />
    </motion.div>
  );
}

function ScoreDigit({
  value,
  variant,
}: {
  value: number;
  variant: "winner" | "loser";
}) {
  return (
    <div
      className={cn(
        "flex h-14 w-14 items-center justify-center rounded-xl font-mono text-3xl font-black tabular-nums transition-transform duration-200 group-hover:scale-105",
        variant === "winner"
          ? "bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/20"
          : "bg-neutral-800/50 text-neutral-500 ring-1 ring-white/5"
      )}
    >
      {value}
    </div>
  );
}

function PlayerDisplay({
  player,
  isWinner,
}: {
  player: Player;
  isWinner: boolean;
}) {
  return (
    <Link
      href={`/players/${player.slug}`}
      className={cn(
        "flex items-center gap-3 rounded-xl px-3 py-2 transition-all duration-200 hover:bg-white/5",
        isWinner ? "flex-row-reverse text-right" : ""
      )}
    >
      <Avatar
        className={cn(
          "h-10 w-10 ring-2 transition-all duration-200",
          isWinner
            ? "ring-emerald-500/30 group-hover:ring-emerald-500/50"
            : "ring-neutral-700/50"
        )}
      >
        <AvatarImage src={player.avatarUrl || undefined} />
        <AvatarFallback
          className={cn(
            "text-sm font-medium",
            isWinner
              ? "bg-emerald-500/20 text-emerald-400"
              : "bg-neutral-800 text-neutral-400"
          )}
        >
          {player.displayName.charAt(0).toUpperCase()}
        </AvatarFallback>
      </Avatar>
      <div className={cn("min-w-0", isWinner ? "text-right" : "text-left")}>
        <p
          className={cn(
            "truncate text-sm font-semibold transition-colors",
            isWinner
              ? "text-emerald-400 group-hover:text-emerald-300"
              : "text-neutral-400"
          )}
        >
          {player.displayName}
        </p>
        <p className="text-[10px] font-medium text-neutral-600 tabular-nums">
          {player.elo} ELO
        </p>
      </div>
    </Link>
  );
}

function TeamDisplay({
  players,
  isWinner,
}: {
  players: Player[];
  isWinner: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-3",
        isWinner ? "flex-row-reverse" : ""
      )}
    >
      <div className="flex -space-x-3">
        {players.map((player, i) => (
          <Link key={player.id} href={`/players/${player.slug}`}>
            <Avatar
              className={cn(
                "h-10 w-10 ring-2 transition-all duration-200 hover:z-10 hover:scale-110",
                isWinner
                  ? "ring-emerald-500/30 hover:ring-emerald-500/50"
                  : "ring-neutral-800 hover:ring-neutral-600"
              )}
              style={{ zIndex: players.length - i }}
            >
              <AvatarImage src={player.avatarUrl || undefined} />
              <AvatarFallback
                className={cn(
                  "text-sm font-medium",
                  isWinner
                    ? "bg-emerald-500/20 text-emerald-400"
                    : "bg-neutral-800 text-neutral-400"
                )}
              >
                {player.displayName.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </Link>
        ))}
      </div>
      <div
        className={cn(
          "flex flex-col gap-0.5",
          isWinner ? "items-end" : "items-start"
        )}
      >
        {players.map((player, i) => (
          <Link
            key={player.id}
            href={`/players/${player.slug}`}
            className={cn(
              "text-xs font-medium transition-colors hover:underline",
              isWinner ? "text-emerald-400" : "text-neutral-500"
            )}
          >
            {player.displayName}
            {i === 0 && (
              <span className="text-neutral-700 ml-1">&</span>
            )}
          </Link>
        ))}
      </div>
    </div>
  );
}
