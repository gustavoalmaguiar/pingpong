"use client";

import { motion } from "framer-motion";
import { BracketMatch } from "./bracket-match";
import { cn } from "@/lib/utils";
import { Trophy } from "lucide-react";

interface Participant {
  id: string;
  player: {
    displayName: string;
    image?: string | null;
    elo: number;
  };
  partner?: {
    displayName: string;
    image?: string | null;
  } | null;
  seed?: number | null;
}

interface Match {
  id: string;
  position: number;
  participant1: Participant | null;
  participant2: Participant | null;
  winnerId: string | null;
  scores?: string | null;
  status: "pending" | "ready" | "in_progress" | "completed" | "bye" | "walkover";
}

interface Round {
  id: string;
  roundNumber: number;
  name: string;
  matches: Match[];
}

interface SingleEliminationBracketProps {
  rounds: Round[];
  isDoubles?: boolean;
  onMatchClick?: (match: Match) => void;
  champion?: Participant | null;
}

export function SingleEliminationBracket({
  rounds,
  isDoubles = false,
  onMatchClick,
  champion,
}: SingleEliminationBracketProps) {
  // Sort rounds by round number
  const sortedRounds = [...rounds].sort((a, b) => a.roundNumber - b.roundNumber);
  const totalRounds = sortedRounds.length;

  return (
    <div className="relative">
      {/* Scrollable bracket container */}
      <div className="overflow-x-auto pb-6">
        <div className="flex gap-8 min-w-fit px-4">
          {sortedRounds.map((round, roundIndex) => {
            const isFinalRound = roundIndex === totalRounds - 1;
            const matchesInRound = round.matches.length;

            // Calculate spacing based on round
            // Each subsequent round needs more vertical spacing
            const verticalGap = Math.pow(2, roundIndex) * 20;

            return (
              <motion.div
                key={round.id}
                className="flex flex-col"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: roundIndex * 0.1 }}
              >
                {/* Round header */}
                <div className="mb-4 text-center">
                  <h4 className={cn(
                    "text-[11px] font-bold uppercase tracking-widest",
                    isFinalRound ? "text-amber-400" : "text-[#525252]"
                  )}>
                    {round.name}
                  </h4>
                </div>

                {/* Matches column with connector lines */}
                <div
                  className="flex flex-col justify-around flex-1"
                  style={{ gap: `${verticalGap}px` }}
                >
                  {round.matches.map((match, matchIndex) => (
                    <div key={match.id} className="relative">
                      {/* Match card */}
                      <BracketMatch
                        match={match}
                        isFinal={isFinalRound}
                        isDoubles={isDoubles}
                        onClick={() => onMatchClick?.(match)}
                      />

                      {/* Connector lines to next round */}
                      {roundIndex < totalRounds - 1 && (
                        <BracketConnector
                          roundIndex={roundIndex}
                          matchIndex={matchIndex}
                          matchesInRound={matchesInRound}
                        />
                      )}
                    </div>
                  ))}
                </div>
              </motion.div>
            );
          })}

          {/* Champion display */}
          {champion && (
            <motion.div
              className="flex flex-col items-center justify-center"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.5 }}
            >
              <div className="mb-4 text-center">
                <h4 className="text-[11px] font-bold uppercase tracking-widest text-amber-400">
                  Champion
                </h4>
              </div>

              <div className="relative">
                {/* Glow effect */}
                <div className="absolute -inset-4 bg-amber-500/20 blur-xl rounded-full" />

                <div className="relative flex flex-col items-center gap-3 rounded-xl border border-amber-500/30 bg-[#0a0a0a] p-6 shadow-[0_0_40px_-10px_rgba(245,158,11,0.3)]">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-amber-600 text-black">
                    <Trophy className="h-6 w-6" />
                  </div>

                  <div className="text-center">
                    <p className="text-lg font-bold text-white">
                      {isDoubles && champion.partner
                        ? `${champion.player.displayName} & ${champion.partner.displayName}`
                        : champion.player.displayName}
                    </p>
                    <p className="text-xs text-amber-400/80 mt-1">Tournament Champion</p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </div>

      {/* Gradient fade edges for scroll indication */}
      <div className="pointer-events-none absolute inset-y-0 left-0 w-8 bg-gradient-to-r from-black to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-black to-transparent" />
    </div>
  );
}

/**
 * Connector lines between bracket matches
 */
function BracketConnector({
  roundIndex,
  matchIndex,
  matchesInRound,
}: {
  roundIndex: number;
  matchIndex: number;
  matchesInRound: number;
}) {
  // Height of connector increases with each round
  const connectorHeight = Math.pow(2, roundIndex) * 20 + 44; // 44 is roughly match height

  // Determine if this is top or bottom of a pair
  const isEvenMatch = matchIndex % 2 === 0;

  return (
    <div className="absolute left-full top-1/2 -translate-y-1/2 w-8 h-0">
      {/* Horizontal line from match */}
      <div className="absolute left-0 top-0 w-4 h-[2px] bg-[#262626]" />

      {/* Vertical line */}
      <div
        className={cn(
          "absolute left-4 w-[2px] bg-[#262626]",
          isEvenMatch ? "top-0" : "bottom-0"
        )}
        style={{
          height: isEvenMatch ? `${connectorHeight / 2}px` : `${connectorHeight / 2}px`,
          transform: isEvenMatch ? "none" : "translateY(-100%)",
        }}
      />

      {/* Horizontal line to next match (only for even matches) */}
      {isEvenMatch && (
        <div
          className="absolute left-4 w-4 h-[2px] bg-[#262626]"
          style={{ top: `${connectorHeight / 2}px` }}
        />
      )}
    </div>
  );
}
