"use server";

import { db } from "@/lib/db";
import { achievements, playerAchievements, players, users } from "@/lib/db/schema";
import { eq, desc, sql } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { ACHIEVEMENTS, checkNewAchievements, type PlayerStats } from "@/lib/achievements";
import { pusherServer, CHANNELS, EVENTS } from "@/lib/pusher";
import { calculateLevel } from "@/lib/xp";

// Seed achievements into database (run once)
export async function seedAchievements() {
  for (const achievement of ACHIEVEMENTS) {
    try {
      await db.insert(achievements).values({
        key: achievement.key,
        name: achievement.name,
        description: achievement.description,
        icon: achievement.icon,
        xpReward: achievement.xpReward,
        tier: achievement.tier,
      }).onConflictDoNothing({ target: achievements.key });
    } catch {
      // Ignore duplicate key errors - achievement already exists
    }
  }
}

export async function checkAndAwardAchievements(playerId: string) {
  // Get player stats
  const player = await db.query.players.findFirst({
    where: eq(players.id, playerId),
  });

  if (!player) return [];

  // Get already earned achievements
  const earned = await db.query.playerAchievements.findMany({
    where: eq(playerAchievements.playerId, playerId),
  });

  const earnedAchievementIds = earned.map((e) => e.achievementId);

  // Get achievement records to map IDs to keys
  let allAchievements = await db.query.achievements.findMany();

  // Auto-seed achievements if table is empty
  if (allAchievements.length === 0) {
    await seedAchievements();
    allAchievements = await db.query.achievements.findMany();
  }
  const earnedKeys = earnedAchievementIds
    .map((id) => allAchievements.find((a) => a.id === id)?.key)
    .filter(Boolean) as string[];

  // Build player stats
  const stats: PlayerStats = {
    matchesWon: player.matchesWon,
    matchesPlayed: player.matchesPlayed,
    currentStreak: player.currentStreak,
    bestStreak: player.bestStreak,
    elo: player.elo,
    level: player.level,
    perfectGames: 0, // Would need to track this
    comebacks: 0, // Would need to track this
    // Tournament stats
    tournamentMatchesWon: player.tournamentMatchesWon,
    tournamentMatchesPlayed: player.tournamentMatchesPlayed,
    tournamentsPlayed: player.tournamentsPlayed,
    tournamentsWon: player.tournamentsWon,
    tournamentCurrentStreak: player.tournamentCurrentStreak,
    tournamentBestStreak: player.tournamentBestStreak,
  };

  // Check for new achievements
  const newAchievements = checkNewAchievements(stats, earnedKeys);

  // Award new achievements
  const awarded = [];
  let totalXpReward = 0;

  for (const achievement of newAchievements) {
    const dbAchievement = allAchievements.find((a) => a.key === achievement.key);
    if (!dbAchievement) continue;

    await db.insert(playerAchievements).values({
      playerId,
      achievementId: dbAchievement.id,
    });

    totalXpReward += achievement.xpReward;
    awarded.push(achievement);

    // Trigger real-time notification
    try {
      await pusherServer.trigger(CHANNELS.LEADERBOARD, EVENTS.ACHIEVEMENT_UNLOCKED, {
        playerId,
        achievement: {
          name: achievement.name,
          icon: achievement.icon,
          tier: achievement.tier,
        },
      });
    } catch (e) {
      console.error("Pusher error:", e);
    }
  }

  // Award XP for achievements
  if (totalXpReward > 0) {
    const newXp = player.xp + totalXpReward;
    await db
      .update(players)
      .set({
        xp: newXp,
        level: calculateLevel(newXp),
        updatedAt: new Date(),
      })
      .where(eq(players.id, playerId));
  }

  return awarded;
}

export async function getPlayerAchievements(playerId: string) {
  const earned = await db.query.playerAchievements.findMany({
    where: eq(playerAchievements.playerId, playerId),
  });

  const allAchievements = await db.query.achievements.findMany();

  return earned.map((e) => {
    const achievement = allAchievements.find((a) => a.id === e.achievementId);
    return {
      ...e,
      achievement,
    };
  });
}

export async function getAllAchievements() {
  return db.query.achievements.findMany();
}

export async function getRecentAchievements(limit = 8) {
  const recentEarned = await db
    .select({
      id: playerAchievements.id,
      earnedAt: playerAchievements.earnedAt,
      playerId: playerAchievements.playerId,
      playerName: players.displayName,
      playerAvatarUrl: users.image,
      achievementName: achievements.name,
      achievementIcon: achievements.icon,
      achievementTier: achievements.tier,
      achievementDescription: achievements.description,
    })
    .from(playerAchievements)
    .innerJoin(achievements, eq(playerAchievements.achievementId, achievements.id))
    .innerJoin(players, eq(playerAchievements.playerId, players.id))
    .leftJoin(users, eq(players.userId, users.id))
    .orderBy(desc(playerAchievements.earnedAt))
    .limit(limit);

  return recentEarned;
}

export async function getAchievementLeaderboard(limit = 10) {
  const leaderboard = await db
    .select({
      playerId: playerAchievements.playerId,
      playerName: players.displayName,
      playerAvatarUrl: users.image,
      playerLevel: players.level,
      achievementCount: sql<number>`count(${playerAchievements.id})::int`,
    })
    .from(playerAchievements)
    .innerJoin(players, eq(playerAchievements.playerId, players.id))
    .leftJoin(users, eq(players.userId, users.id))
    .groupBy(playerAchievements.playerId, players.displayName, users.image, players.level)
    .orderBy(desc(sql`count(${playerAchievements.id})`))
    .limit(limit);

  return leaderboard;
}
