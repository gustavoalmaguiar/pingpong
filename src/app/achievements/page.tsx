import { redirect } from "next/navigation";
import { getEffectiveSession } from "@/lib/auth";
import { isAuthRequired } from "@/lib/config";
import {
  getAllAchievements,
  getPlayerAchievements,
  getAchievementLeaderboard,
} from "@/actions/achievements";
import { getCurrentPlayer } from "@/actions/players";
import { ACHIEVEMENTS } from "@/lib/achievements";
import { AchievementsClient } from "./achievements-client";

export default async function AchievementsPage() {
  const session = await getEffectiveSession();

  if (!session && isAuthRequired()) {
    redirect("/auth/signin");
  }

  // Fetch all data in parallel
  const [allAchievements, currentPlayer, leaderboard] = await Promise.all([
    getAllAchievements(),
    getCurrentPlayer(),
    getAchievementLeaderboard(),
  ]);

  // Get player achievements if logged in
  const playerAchievements = currentPlayer
    ? await getPlayerAchievements(currentPlayer.id)
    : [];

  // Map achievement definitions with earned status
  const achievementsWithStatus = ACHIEVEMENTS.map((def) => {
    const dbAchievement = allAchievements.find((a) => a.key === def.key);
    const earned = playerAchievements.find(
      (pa) => pa.achievement?.key === def.key
    );
    return {
      key: def.key,
      name: def.name,
      description: def.description,
      icon: def.icon,
      xpReward: def.xpReward,
      tier: def.tier,
      id: dbAchievement?.id,
      earned: !!earned,
      earnedAt: earned?.earnedAt,
    };
  });

  return (
    <AchievementsClient
      achievements={achievementsWithStatus}
      leaderboard={leaderboard}
      currentPlayerId={currentPlayer?.id}
      currentPlayerStats={
        currentPlayer
          ? {
              matchesWon: currentPlayer.matchesWon,
              matchesPlayed: currentPlayer.matchesPlayed,
              bestStreak: currentPlayer.bestStreak,
              elo: currentPlayer.elo,
              level: currentPlayer.level,
            }
          : null
      }
      totalAchievements={ACHIEVEMENTS.length}
      earnedCount={playerAchievements.length}
    />
  );
}
