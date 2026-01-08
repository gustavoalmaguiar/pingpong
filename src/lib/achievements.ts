/**
 * Achievement Definitions
 */

export type AchievementTier = "bronze" | "silver" | "gold" | "platinum";

export interface AchievementDef {
  key: string;
  name: string;
  description: string;
  icon: string;
  xpReward: number;
  tier: AchievementTier;
  check: (stats: PlayerStats) => boolean;
}

export interface PlayerStats {
  matchesWon: number;
  matchesPlayed: number;
  currentStreak: number;
  bestStreak: number;
  elo: number;
  level: number;
  perfectGames: number; // 11-0 wins
  comebacks: number; // wins after being down
  // Tournament stats
  tournamentMatchesWon: number;
  tournamentMatchesPlayed: number;
  tournamentsPlayed: number;
  tournamentsWon: number;
  tournamentCurrentStreak: number;
  tournamentBestStreak: number;
}

export const ACHIEVEMENTS: AchievementDef[] = [
  // Win milestones
  {
    key: "first_win",
    name: "First Victory",
    description: "Win your first match",
    icon: "🏓",
    xpReward: 50,
    tier: "bronze",
    check: (s) => s.matchesWon >= 1,
  },
  {
    key: "wins_10",
    name: "Getting Started",
    description: "Win 10 matches",
    icon: "⭐",
    xpReward: 100,
    tier: "bronze",
    check: (s) => s.matchesWon >= 10,
  },
  {
    key: "wins_25",
    name: "Competitor",
    description: "Win 25 matches",
    icon: "🌟",
    xpReward: 200,
    tier: "silver",
    check: (s) => s.matchesWon >= 25,
  },
  {
    key: "wins_50",
    name: "Seasoned Player",
    description: "Win 50 matches",
    icon: "💫",
    xpReward: 400,
    tier: "silver",
    check: (s) => s.matchesWon >= 50,
  },
  {
    key: "wins_100",
    name: "Centurion",
    description: "Win 100 matches",
    icon: "🏆",
    xpReward: 800,
    tier: "gold",
    check: (s) => s.matchesWon >= 100,
  },
  {
    key: "wins_250",
    name: "Legend",
    description: "Win 250 matches",
    icon: "👑",
    xpReward: 1500,
    tier: "platinum",
    check: (s) => s.matchesWon >= 250,
  },

  // Streak achievements
  {
    key: "streak_3",
    name: "Hot Streak",
    description: "Win 3 matches in a row",
    icon: "🔥",
    xpReward: 75,
    tier: "bronze",
    check: (s) => s.bestStreak >= 3,
  },
  {
    key: "streak_5",
    name: "On Fire",
    description: "Win 5 matches in a row",
    icon: "🔥",
    xpReward: 150,
    tier: "silver",
    check: (s) => s.bestStreak >= 5,
  },
  {
    key: "streak_10",
    name: "Unstoppable",
    description: "Win 10 matches in a row",
    icon: "💪",
    xpReward: 500,
    tier: "gold",
    check: (s) => s.bestStreak >= 10,
  },
  {
    key: "streak_20",
    name: "Dominant Force",
    description: "Win 20 matches in a row",
    icon: "⚡",
    xpReward: 1000,
    tier: "platinum",
    check: (s) => s.bestStreak >= 20,
  },

  // ELO achievements
  {
    key: "elo_1100",
    name: "Rising Star",
    description: "Reach 1100 ELO",
    icon: "📈",
    xpReward: 100,
    tier: "bronze",
    check: (s) => s.elo >= 1100,
  },
  {
    key: "elo_1200",
    name: "Skilled Player",
    description: "Reach 1200 ELO",
    icon: "📊",
    xpReward: 200,
    tier: "silver",
    check: (s) => s.elo >= 1200,
  },
  {
    key: "elo_1400",
    name: "Expert",
    description: "Reach 1400 ELO",
    icon: "🎯",
    xpReward: 400,
    tier: "gold",
    check: (s) => s.elo >= 1400,
  },
  {
    key: "elo_1600",
    name: "Master",
    description: "Reach 1600 ELO",
    icon: "🥇",
    xpReward: 800,
    tier: "platinum",
    check: (s) => s.elo >= 1600,
  },

  // Special achievements
  {
    key: "perfect_game",
    name: "Perfect Game",
    description: "Win a match 11-0",
    icon: "💯",
    xpReward: 300,
    tier: "gold",
    check: (s) => s.perfectGames >= 1,
  },
  {
    key: "level_10",
    name: "Dedicated",
    description: "Reach level 10",
    icon: "🎮",
    xpReward: 250,
    tier: "silver",
    check: (s) => s.level >= 10,
  },
  {
    key: "level_25",
    name: "Veteran",
    description: "Reach level 25",
    icon: "🎖️",
    xpReward: 500,
    tier: "gold",
    check: (s) => s.level >= 25,
  },
  {
    key: "matches_100",
    name: "Century Club",
    description: "Play 100 matches",
    icon: "🎳",
    xpReward: 300,
    tier: "silver",
    check: (s) => s.matchesPlayed >= 100,
  },

  // Tournament achievements
  {
    key: "tournament_first_match",
    name: "Tournament Debut",
    description: "Play your first tournament match",
    icon: "🎪",
    xpReward: 50,
    tier: "bronze",
    check: (s) => s.tournamentMatchesPlayed >= 1,
  },
  {
    key: "tournament_first_win",
    name: "Tournament Victor",
    description: "Win your first tournament match",
    icon: "🏅",
    xpReward: 75,
    tier: "bronze",
    check: (s) => s.tournamentMatchesWon >= 1,
  },
  {
    key: "tournament_wins_10",
    name: "Tournament Competitor",
    description: "Win 10 tournament matches",
    icon: "🎯",
    xpReward: 200,
    tier: "silver",
    check: (s) => s.tournamentMatchesWon >= 10,
  },
  {
    key: "tournament_wins_25",
    name: "Tournament Veteran",
    description: "Win 25 tournament matches",
    icon: "⚔️",
    xpReward: 400,
    tier: "gold",
    check: (s) => s.tournamentMatchesWon >= 25,
  },
  {
    key: "tournament_champion",
    name: "Champion",
    description: "Win your first tournament",
    icon: "🏆",
    xpReward: 500,
    tier: "gold",
    check: (s) => s.tournamentsWon >= 1,
  },
  {
    key: "tournament_champion_3",
    name: "Serial Champion",
    description: "Win 3 tournaments",
    icon: "👑",
    xpReward: 1000,
    tier: "platinum",
    check: (s) => s.tournamentsWon >= 3,
  },
  {
    key: "tournament_played_5",
    name: "Tournament Regular",
    description: "Participate in 5 tournaments",
    icon: "🎫",
    xpReward: 150,
    tier: "silver",
    check: (s) => s.tournamentsPlayed >= 5,
  },

  // Tournament streak achievements
  {
    key: "tournament_streak_3",
    name: "Tournament Hot Streak",
    description: "Win 3 tournament matches in a row",
    icon: "🔥",
    xpReward: 100,
    tier: "bronze",
    check: (s) => s.tournamentBestStreak >= 3,
  },
  {
    key: "tournament_streak_5",
    name: "Tournament On Fire",
    description: "Win 5 tournament matches in a row",
    icon: "🔥",
    xpReward: 200,
    tier: "silver",
    check: (s) => s.tournamentBestStreak >= 5,
  },
  {
    key: "tournament_streak_10",
    name: "Tournament Dominator",
    description: "Win 10 tournament matches in a row",
    icon: "💪",
    xpReward: 600,
    tier: "gold",
    check: (s) => s.tournamentBestStreak >= 10,
  },
];

export function getAchievementByKey(key: string): AchievementDef | undefined {
  return ACHIEVEMENTS.find((a) => a.key === key);
}

export function checkNewAchievements(
  stats: PlayerStats,
  earnedKeys: string[]
): AchievementDef[] {
  return ACHIEVEMENTS.filter(
    (a) => !earnedKeys.includes(a.key) && a.check(stats)
  );
}

export function getTierColor(tier: AchievementTier): string {
  switch (tier) {
    case "bronze":
      return "#cd7f32";
    case "silver":
      return "#c0c0c0";
    case "gold":
      return "#ffd700";
    case "platinum":
      return "#e5e4e2";
  }
}
