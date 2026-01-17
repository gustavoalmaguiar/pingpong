"use server";

import { db } from "@/lib/db";
import { players, users } from "@/lib/db/schema";
import { eq, desc, asc, gt } from "drizzle-orm";
import { auth } from "@/lib/auth";

export async function getPlayers() {
  const allPlayers = await db
    .select({
      id: players.id,
      userId: players.userId,
      displayName: players.displayName,
      elo: players.elo,
      xp: players.xp,
      level: players.level,
      matchesPlayed: players.matchesPlayed,
      matchesWon: players.matchesWon,
      currentStreak: players.currentStreak,
      bestStreak: players.bestStreak,
      avatarUrl: users.image,
    })
    .from(players)
    .leftJoin(users, eq(players.userId, users.id))
    .orderBy(desc(players.elo));

  return allPlayers;
}

export async function getLeaderboard(limit = 10) {
  const leaderboard = await db
    .select({
      id: players.id,
      displayName: players.displayName,
      elo: players.elo,
      matchesWon: players.matchesWon,
      matchesPlayed: players.matchesPlayed,
      currentStreak: players.currentStreak,
      level: players.level,
      avatarUrl: users.image,
    })
    .from(players)
    .leftJoin(users, eq(players.userId, users.id))
    .orderBy(desc(players.elo))
    .limit(limit);

  return leaderboard.map((player, index) => ({
    ...player,
    rank: index + 1,
  }));
}

export async function getPlayerById(id: string) {
  const player = await db
    .select({
      id: players.id,
      userId: players.userId,
      displayName: players.displayName,
      elo: players.elo,
      xp: players.xp,
      level: players.level,
      matchesPlayed: players.matchesPlayed,
      matchesWon: players.matchesWon,
      currentStreak: players.currentStreak,
      bestStreak: players.bestStreak,
      createdAt: players.createdAt,
      avatarUrl: users.image,
      email: users.email,
      // Tournament stats
      tournamentMatchesPlayed: players.tournamentMatchesPlayed,
      tournamentMatchesWon: players.tournamentMatchesWon,
      tournamentsPlayed: players.tournamentsPlayed,
      tournamentsWon: players.tournamentsWon,
    })
    .from(players)
    .leftJoin(users, eq(players.userId, users.id))
    .where(eq(players.id, id))
    .limit(1);

  return player[0] || null;
}

export async function getCurrentPlayer() {
  const session = await auth();
  if (!session?.user?.playerId) return null;

  return getPlayerById(session.user.playerId);
}

export async function updatePlayerName(displayName: string) {
  const session = await auth();
  if (!session?.user?.playerId) {
    throw new Error("Not authenticated");
  }

  await db
    .update(players)
    .set({ displayName, updatedAt: new Date() })
    .where(eq(players.id, session.user.playerId));

  return { success: true };
}

export async function getHotStreaks(limit = 5) {
  const hotStreaks = await db
    .select({
      id: players.id,
      displayName: players.displayName,
      elo: players.elo,
      currentStreak: players.currentStreak,
      matchesWon: players.matchesWon,
      avatarUrl: users.image,
    })
    .from(players)
    .leftJoin(users, eq(players.userId, users.id))
    .where(gt(players.currentStreak, 0))
    .orderBy(desc(players.currentStreak))
    .limit(limit);

  return hotStreaks;
}
