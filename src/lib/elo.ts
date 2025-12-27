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
