/**
 * XP and Level System
 *
 * XP Rewards:
 * - Win: +25 XP
 * - Loss: +10 XP
 * - Streak bonus: +5 XP per win in streak
 *
 * Level Formula: level = floor(sqrt(xp / 100)) + 1
 * XP to next level: (level)^2 * 100
 */

export const XP_WIN = 25;
export const XP_LOSS = 10;
export const XP_STREAK_BONUS = 5;

/**
 * Calculate XP reward for a match
 */
export function calculateMatchXp(won: boolean, currentStreak: number): number {
  if (won) {
    return XP_WIN + XP_STREAK_BONUS * Math.min(currentStreak, 10);
  }
  return XP_LOSS;
}

/**
 * Calculate level from total XP
 */
export function calculateLevel(xp: number): number {
  return Math.floor(Math.sqrt(xp / 100)) + 1;
}

/**
 * Calculate XP required for a specific level
 */
export function xpForLevel(level: number): number {
  return Math.pow(level - 1, 2) * 100;
}

/**
 * Calculate XP required for next level
 */
export function xpToNextLevel(currentXp: number): {
  currentLevel: number;
  xpInCurrentLevel: number;
  xpNeededForNext: number;
  progress: number;
} {
  const currentLevel = calculateLevel(currentXp);
  const currentLevelXp = xpForLevel(currentLevel);
  const nextLevelXp = xpForLevel(currentLevel + 1);
  const xpInCurrentLevel = currentXp - currentLevelXp;
  const xpNeededForNext = nextLevelXp - currentLevelXp;

  return {
    currentLevel,
    xpInCurrentLevel,
    xpNeededForNext,
    progress: xpInCurrentLevel / xpNeededForNext,
  };
}

/**
 * Get level tier name
 */
export function getLevelTier(level: number): {
  name: string;
  minLevel: number;
} {
  if (level >= 50) return { name: "Legend", minLevel: 50 };
  if (level >= 40) return { name: "Champion", minLevel: 40 };
  if (level >= 30) return { name: "Expert", minLevel: 30 };
  if (level >= 20) return { name: "Veteran", minLevel: 20 };
  if (level >= 10) return { name: "Regular", minLevel: 10 };
  if (level >= 5) return { name: "Rookie", minLevel: 5 };
  return { name: "Newcomer", minLevel: 1 };
}
