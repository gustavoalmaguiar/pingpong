"use server";

import { db } from "@/lib/db";
import { players, users } from "@/lib/db/schema";
import { eq, desc, asc, gt } from "drizzle-orm";
import { getEffectiveSession } from "@/lib/auth";
import { generateUniqueSlug } from "@/lib/slug";
import { revalidatePath } from "next/cache";

export async function getPlayers() {
  const allPlayers = await db
    .select({
      id: players.id,
      userId: players.userId,
      displayName: players.displayName,
      slug: players.slug,
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
      slug: players.slug,
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
      slug: players.slug,
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

export async function getPlayerBySlug(slug: string) {
  const player = await db
    .select({
      id: players.id,
      userId: players.userId,
      displayName: players.displayName,
      slug: players.slug,
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
    .where(eq(players.slug, slug))
    .limit(1);

  return player[0] || null;
}

export async function getCurrentPlayer() {
  const session = await getEffectiveSession();
  if (!session?.user?.playerId) return null;

  return getPlayerById(session.user.playerId);
}

export async function updatePlayerName(displayName: string) {
  const session = await getEffectiveSession();
  if (!session?.user?.playerId) {
    throw new Error("Not authenticated");
  }

  // Generate a new unique slug for the updated name
  const slug = await generateUniqueSlug(displayName, session.user.playerId);

  await db
    .update(players)
    .set({ displayName, slug, updatedAt: new Date() })
    .where(eq(players.id, session.user.playerId));

  // Revalidate the player profile pages (old and new slug)
  revalidatePath(`/players/${slug}`);
  if (session.user.playerSlug) {
    revalidatePath(`/players/${session.user.playerSlug}`);
  }

  return { success: true, slug };
}

export async function getHotStreaks(limit = 5) {
  const hotStreaks = await db
    .select({
      id: players.id,
      displayName: players.displayName,
      slug: players.slug,
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
