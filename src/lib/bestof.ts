/**
 * Best-of configuration utilities for tournament matches.
 *
 * This module handles the resolution chain for bestOf values:
 * match.bestOf → round.bestOf → tournament.bestOf
 */

// Allowed bestOf values: 1, 3, 5, 7 only
export const VALID_BEST_OF = [1, 3, 5, 7] as const;
export type ValidBestOf = (typeof VALID_BEST_OF)[number];

/**
 * Context for resolving bestOf from the fallback chain
 */
export interface BestOfContext {
  matchBestOf: number | null | undefined;
  roundBestOf: number | null | undefined;
  tournamentBestOf: number;
}

/**
 * Tournament configuration with stage-specific bestOf values
 */
export interface TournamentBestOfConfig {
  bestOf: number;
  bestOfGroupStage?: number | null;
  bestOfEarlyRounds?: number | null;
  bestOfSemiFinals?: number | null;
  bestOfFinals?: number | null;
}

/**
 * Game score for a single game in a match
 */
export interface GameScore {
  p1: number;
  p2: number;
}

/**
 * Result of score validation
 */
export interface ScoreValidationResult {
  valid: boolean;
  error?: string;
  p1Wins?: number;
  p2Wins?: number;
  winnerId?: "p1" | "p2";
}

/**
 * Validate that a bestOf value is allowed (1, 3, 5, or 7)
 */
export function validateBestOf(value: number): value is ValidBestOf {
  return VALID_BEST_OF.includes(value as ValidBestOf);
}

/**
 * Resolve bestOf from the fallback chain: match → round → tournament
 * Returns the first non-null value, or tournament.bestOf as fallback
 */
export function resolveBestOf(context: BestOfContext): number {
  const resolved =
    context.matchBestOf ?? context.roundBestOf ?? context.tournamentBestOf;
  return Math.max(1, resolved);
}

/**
 * Calculate the number of games needed to win for a given bestOf
 * e.g., bestOf=3 → 2 wins needed, bestOf=5 → 3 wins needed
 */
export function gamesNeededToWin(bestOf: number): number {
  return Math.ceil(bestOf / 2);
}

/**
 * Determine the appropriate bestOf based on round type/name and tournament config
 * Used during bracket generation to set per-round bestOf values
 */
export function getRoundDefaultBestOf(
  roundName: string,
  bracketType: string,
  tournament: TournamentBestOfConfig
): number {
  const lowerName = roundName.toLowerCase();

  // Group stage or Swiss rounds
  if (bracketType === "group" || bracketType === "swiss_round") {
    return tournament.bestOfGroupStage ?? tournament.bestOf;
  }

  // Finals bracket type
  if (bracketType === "finals") {
    // Check for semifinals specifically
    if (lowerName.includes("semi")) {
      return (
        tournament.bestOfSemiFinals ??
        tournament.bestOfFinals ??
        tournament.bestOf
      );
    }
    // Grand finals or finals
    return tournament.bestOfFinals ?? tournament.bestOf;
  }

  // Check round name for finals indicators
  if (lowerName.includes("final")) {
    if (lowerName.includes("semi")) {
      return (
        tournament.bestOfSemiFinals ??
        tournament.bestOfFinals ??
        tournament.bestOf
      );
    }
    if (lowerName.includes("quarter")) {
      // Quarter finals are early rounds
      return tournament.bestOfEarlyRounds ?? tournament.bestOf;
    }
    // Regular finals
    return tournament.bestOfFinals ?? tournament.bestOf;
  }

  // Early elimination rounds (Round of 16, Round of 8, etc.)
  return tournament.bestOfEarlyRounds ?? tournament.bestOf;
}

/**
 * Validate scores array against bestOf configuration
 * Checks that:
 * 1. Number of games doesn't exceed bestOf
 * 2. A winner has been determined (reached required wins)
 * 3. Both players can't reach required wins
 */
export function validateScores(
  scores: GameScore[],
  bestOf: number
): ScoreValidationResult {
  if (scores.length === 0) {
    return { valid: false, error: "At least one game must be played" };
  }

  if (scores.length > bestOf) {
    return {
      valid: false,
      error: `Cannot have more than ${bestOf} games in a best-of-${bestOf} series`,
    };
  }

  const neededToWin = gamesNeededToWin(bestOf);
  const p1Wins = scores.filter((s) => s.p1 > s.p2).length;
  const p2Wins = scores.filter((s) => s.p2 > s.p1).length;

  // Check for ties (each game must have a winner)
  const ties = scores.filter((s) => s.p1 === s.p2).length;
  if (ties > 0) {
    return { valid: false, error: "Games cannot end in a tie" };
  }

  // Check if a winner has been determined
  if (p1Wins < neededToWin && p2Wins < neededToWin) {
    return {
      valid: false,
      error: `No player has reached ${neededToWin} wins yet`,
      p1Wins,
      p2Wins,
    };
  }

  // Both players can't reach required wins (invalid state)
  if (p1Wins >= neededToWin && p2Wins >= neededToWin) {
    return {
      valid: false,
      error: `Both players cannot reach ${neededToWin} wins`,
      p1Wins,
      p2Wins,
    };
  }

  // Valid - determine winner
  const winnerId = p1Wins >= neededToWin ? "p1" : "p2";

  return { valid: true, p1Wins, p2Wins, winnerId };
}

/**
 * Generate valid series scores for quick result selection
 * e.g., bestOf=3 → ["2-0", "2-1"]
 *       bestOf=5 → ["3-0", "3-1", "3-2"]
 *       bestOf=7 → ["4-0", "4-1", "4-2", "4-3"]
 */
export function getValidSeriesScores(bestOf: number): string[] {
  const neededToWin = gamesNeededToWin(bestOf);
  const scores: string[] = [];

  for (let loserWins = 0; loserWins < neededToWin; loserWins++) {
    scores.push(`${neededToWin}-${loserWins}`);
  }

  return scores;
}

/**
 * Parse a series score string (e.g., "2-1") into winner/loser wins
 */
export function parseSeriesScore(
  seriesScore: string
): { winnerWins: number; loserWins: number } | null {
  const match = seriesScore.match(/^(\d+)-(\d+)$/);
  if (!match) return null;

  const [, first, second] = match;
  const a = parseInt(first, 10);
  const b = parseInt(second, 10);

  // Higher number is winner wins
  return {
    winnerWins: Math.max(a, b),
    loserWins: Math.min(a, b),
  };
}

/**
 * Validate a series score string against bestOf configuration
 */
export function validateSeriesScore(
  seriesScore: string,
  bestOf: number
): boolean {
  const parsed = parseSeriesScore(seriesScore);
  if (!parsed) return false;

  const neededToWin = gamesNeededToWin(bestOf);

  // Winner must have exactly the needed wins
  if (parsed.winnerWins !== neededToWin) return false;

  // Loser must have fewer than needed wins
  if (parsed.loserWins >= neededToWin) return false;

  return true;
}

/**
 * Get a human-readable label for a bestOf value
 */
export function getBestOfLabel(bestOf: number): string {
  if (bestOf === 1) return "Single Game";
  return `Best of ${bestOf}`;
}

/**
 * Check if tournament has any stage-specific bestOf configuration
 */
export function hasStageSpecificBestOf(
  tournament: TournamentBestOfConfig
): boolean {
  return (
    tournament.bestOfGroupStage != null ||
    tournament.bestOfEarlyRounds != null ||
    tournament.bestOfSemiFinals != null ||
    tournament.bestOfFinals != null
  );
}

/**
 * Get a summary of stage-specific bestOf values for display
 */
export function getBestOfSummary(
  tournament: TournamentBestOfConfig
): Record<string, number> {
  const summary: Record<string, number> = {};

  if (tournament.bestOfGroupStage != null) {
    summary["Groups"] = tournament.bestOfGroupStage;
  }
  if (tournament.bestOfEarlyRounds != null) {
    summary["Early Rounds"] = tournament.bestOfEarlyRounds;
  }
  if (tournament.bestOfSemiFinals != null) {
    summary["Semifinals"] = tournament.bestOfSemiFinals;
  }
  if (tournament.bestOfFinals != null) {
    summary["Finals"] = tournament.bestOfFinals;
  }

  // If no stage-specific values, show the default
  if (Object.keys(summary).length === 0) {
    summary["All Rounds"] = tournament.bestOf;
  }

  return summary;
}
