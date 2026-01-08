/**
 * ELO Rating System for Ping-Pong
 * K-factor: 32 (standard for casual play)
 * Starting ELO: 1000
 */

const K_FACTOR = 32;
export const STARTING_ELO = 1000;

/**
 * Calculate expected score (probability of winning)
 */
function expectedScore(playerElo: number, opponentElo: number): number {
  return 1 / (1 + Math.pow(10, (opponentElo - playerElo) / 400));
}

/**
 * Calculate ELO change for a match result
 * @param winnerElo - Winner's current ELO
 * @param loserElo - Loser's current ELO
 * @returns Object with new ELOs and the change amount
 */
export function calculateEloChange(
  winnerElo: number,
  loserElo: number
): {
  winnerNewElo: number;
  loserNewElo: number;
  change: number;
} {
  const expectedWin = expectedScore(winnerElo, loserElo);
  const expectedLose = expectedScore(loserElo, winnerElo);

  // Winner gets points based on how unexpected the win was
  const change = Math.round(K_FACTOR * (1 - expectedWin));

  return {
    winnerNewElo: winnerElo + change,
    loserNewElo: Math.max(loserElo - change, 100), // Minimum ELO of 100
    change,
  };
}

/**
 * Calculate ELO change for doubles match
 * Uses average team ELO for calculations
 */
export function calculateDoublesEloChange(
  winnerTeamElos: [number, number],
  loserTeamElos: [number, number]
): {
  winnerChange: number;
  loserChange: number;
  winnerNewElos: [number, number];
  loserNewElos: [number, number];
} {
  const avgWinnerElo = (winnerTeamElos[0] + winnerTeamElos[1]) / 2;
  const avgLoserElo = (loserTeamElos[0] + loserTeamElos[1]) / 2;

  const { change } = calculateEloChange(avgWinnerElo, avgLoserElo);

  // Apply half the change to each player (since it's a team effort)
  const individualChange = Math.round(change * 0.75);

  return {
    winnerChange: individualChange,
    loserChange: individualChange,
    winnerNewElos: [
      winnerTeamElos[0] + individualChange,
      winnerTeamElos[1] + individualChange,
    ],
    loserNewElos: [
      Math.max(loserTeamElos[0] - individualChange, 100),
      Math.max(loserTeamElos[1] - individualChange, 100),
    ],
  };
}

/**
 * Get ELO tier/rank name based on rating
 */
export function getEloTier(elo: number): {
  name: string;
  color: string;
} {
  if (elo >= 1800) return { name: "Grandmaster", color: "#FFD700" };
  if (elo >= 1600) return { name: "Master", color: "#C0C0C0" };
  if (elo >= 1400) return { name: "Diamond", color: "#B9F2FF" };
  if (elo >= 1200) return { name: "Platinum", color: "#E5E4E2" };
  if (elo >= 1000) return { name: "Gold", color: "#FFD700" };
  if (elo >= 800) return { name: "Silver", color: "#C0C0C0" };
  return { name: "Bronze", color: "#CD7F32" };
}

/**
 * Tournament ELO System
 * Multipliers are stored as percentages (150 = 1.5x, 300 = 3x)
 */

export type TournamentFormat =
  | "single_elimination"
  | "double_elimination"
  | "swiss"
  | "round_robin_knockout";

/**
 * Calculate the ELO multiplier for a specific round based on progression
 * Early rounds use baseMultiplier, finals use finalMultiplier
 */
export function calculateRoundMultiplier(
  roundNumber: number,
  totalRounds: number,
  baseMultiplier = 150, // 1.5x
  finalMultiplier = 300 // 3x
): number {
  if (totalRounds <= 1) return finalMultiplier;

  // Linear interpolation from base to final
  const progress = (roundNumber - 1) / (totalRounds - 1);
  const multiplier = baseMultiplier + (finalMultiplier - baseMultiplier) * progress;

  return Math.round(multiplier);
}

/**
 * Get round name and multiplier for elimination brackets
 */
export function getEliminationRoundInfo(
  roundNumber: number,
  totalRounds: number,
  baseMultiplier = 150,
  finalMultiplier = 300
): { name: string; multiplier: number } {
  const roundFromEnd = totalRounds - roundNumber + 1;

  let name: string;
  switch (roundFromEnd) {
    case 1:
      name = "Finals";
      break;
    case 2:
      name = "Semifinals";
      break;
    case 3:
      name = "Quarterfinals";
      break;
    default:
      const playersInRound = Math.pow(2, roundFromEnd);
      name = `Round of ${playersInRound}`;
  }

  const multiplier = calculateRoundMultiplier(
    roundNumber,
    totalRounds,
    baseMultiplier,
    finalMultiplier
  );

  return { name, multiplier };
}

/**
 * Calculate ELO change with tournament multiplier applied
 * @param winnerElo - Winner's current ELO
 * @param loserElo - Loser's current ELO
 * @param multiplier - Tournament multiplier (e.g., 150 = 1.5x)
 */
export function calculateTournamentEloChange(
  winnerElo: number,
  loserElo: number,
  multiplier: number
): {
  winnerNewElo: number;
  loserNewElo: number;
  change: number;
  baseChange: number;
} {
  const { change: baseChange } = calculateEloChange(winnerElo, loserElo);

  // Apply multiplier (stored as percentage)
  const multipliedChange = Math.round(baseChange * (multiplier / 100));

  return {
    winnerNewElo: winnerElo + multipliedChange,
    loserNewElo: Math.max(loserElo - multipliedChange, 100),
    change: multipliedChange,
    baseChange,
  };
}

/**
 * Calculate ELO change for doubles tournament match
 */
export function calculateTournamentDoublesEloChange(
  winnerTeamElos: [number, number],
  loserTeamElos: [number, number],
  multiplier: number
): {
  winnerChange: number;
  loserChange: number;
  winnerNewElos: [number, number];
  loserNewElos: [number, number];
} {
  const { winnerChange, loserChange } = calculateDoublesEloChange(
    winnerTeamElos,
    loserTeamElos
  );

  // Apply tournament multiplier
  const multipliedWinnerChange = Math.round(winnerChange * (multiplier / 100));
  const multipliedLoserChange = Math.round(loserChange * (multiplier / 100));

  return {
    winnerChange: multipliedWinnerChange,
    loserChange: multipliedLoserChange,
    winnerNewElos: [
      winnerTeamElos[0] + multipliedWinnerChange,
      winnerTeamElos[1] + multipliedWinnerChange,
    ],
    loserNewElos: [
      Math.max(loserTeamElos[0] - multipliedLoserChange, 100),
      Math.max(loserTeamElos[1] - multipliedLoserChange, 100),
    ],
  };
}

/**
 * Get multiplier description for display
 */
export function getMultiplierDescription(multiplier: number): string {
  const factor = multiplier / 100;
  return `${factor}x ELO`;
}

/**
 * Calculate flat ELO change for tournament quick results
 * This calculates ELO without score margin bonus - just winner/loser
 * Used when recording quick results that don't have detailed game scores
 */
export function calculateFlatTournamentElo(
  winnerElo: number,
  loserElo: number,
  multiplier: number
): {
  winnerNewElo: number;
  loserNewElo: number;
  change: number;
} {
  const expectedWin = expectedScore(winnerElo, loserElo);

  // Base change without any score margin bonus
  const baseChange = Math.round(K_FACTOR * (1 - expectedWin));

  // Apply tournament multiplier
  const change = Math.round(baseChange * (multiplier / 100));

  return {
    winnerNewElo: winnerElo + change,
    loserNewElo: Math.max(loserElo - change, 100),
    change,
  };
}

/**
 * Calculate flat ELO change for doubles tournament quick results
 */
export function calculateFlatTournamentDoublesElo(
  winnerTeamElos: [number, number],
  loserTeamElos: [number, number],
  multiplier: number
): {
  winnerChange: number;
  loserChange: number;
  winnerNewElos: [number, number];
  loserNewElos: [number, number];
} {
  const avgWinnerElo = (winnerTeamElos[0] + winnerTeamElos[1]) / 2;
  const avgLoserElo = (loserTeamElos[0] + loserTeamElos[1]) / 2;

  const { change } = calculateFlatTournamentElo(avgWinnerElo, avgLoserElo, 100);

  // Apply half the change to each player (since it's a team effort)
  const individualChange = Math.round(change * 0.75);

  // Apply tournament multiplier
  const multipliedChange = Math.round(individualChange * (multiplier / 100));

  return {
    winnerChange: multipliedChange,
    loserChange: multipliedChange,
    winnerNewElos: [
      winnerTeamElos[0] + multipliedChange,
      winnerTeamElos[1] + multipliedChange,
    ],
    loserNewElos: [
      Math.max(loserTeamElos[0] - multipliedChange, 100),
      Math.max(loserTeamElos[1] - multipliedChange, 100),
    ],
  };
}
