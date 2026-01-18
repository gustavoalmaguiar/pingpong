"use server";

import { db } from "@/lib/db";
import { matches, players, users } from "@/lib/db/schema";
import { eq, desc, count, sql } from "drizzle-orm";
import { getEffectiveSession } from "@/lib/auth";
import { revalidatePath } from "next/cache";

async function requireAdmin() {
  const session = await getEffectiveSession();
  if (!session?.user?.isAdmin) {
    throw new Error("Unauthorized: Admin access required");
  }
  return session;
}

export async function getAdminStats() {
  await requireAdmin();

  const [
    totalPlayersResult,
    totalMatchesResult,
    matchesToday,
    activePlayersResult,
  ] = await Promise.all([
    db.select({ count: count() }).from(players),
    db.select({ count: count() }).from(matches),
    db
      .select({ count: count() })
      .from(matches)
      .where(
        sql`DATE(${matches.playedAt}) = CURRENT_DATE`
      ),
    db
      .select({ count: count() })
      .from(players)
      .where(
        sql`${players.updatedAt} > NOW() - INTERVAL '7 days'`
      ),
  ]);

  return {
    totalPlayers: totalPlayersResult[0]?.count || 0,
    totalMatches: totalMatchesResult[0]?.count || 0,
    matchesToday: matchesToday[0]?.count || 0,
    activePlayers: activePlayersResult[0]?.count || 0,
  };
}

export async function getAllPlayersAdmin() {
  await requireAdmin();

  const allPlayers = await db
    .select({
      id: players.id,
      displayName: players.displayName,
      elo: players.elo,
      xp: players.xp,
      level: players.level,
      matchesPlayed: players.matchesPlayed,
      matchesWon: players.matchesWon,
      currentStreak: players.currentStreak,
      bestStreak: players.bestStreak,
      createdAt: players.createdAt,
      updatedAt: players.updatedAt,
      email: users.email,
      isAdmin: users.isAdmin,
      avatarUrl: users.image,
    })
    .from(players)
    .leftJoin(users, eq(players.userId, users.id))
    .orderBy(desc(players.elo));

  return allPlayers;
}

export async function updatePlayerStats(
  playerId: string,
  data: {
    elo?: number;
    xp?: number;
    matchesWon?: number;
    matchesPlayed?: number;
    currentStreak?: number;
    bestStreak?: number;
  }
) {
  await requireAdmin();

  await db
    .update(players)
    .set({
      ...data,
      updatedAt: new Date(),
    })
    .where(eq(players.id, playerId));

  revalidatePath("/admin");
  revalidatePath("/leaderboard");

  return { success: true };
}

export async function getAllMatchesAdmin(limit = 50) {
  await requireAdmin();

  const allMatches = await db
    .select()
    .from(matches)
    .orderBy(desc(matches.playedAt))
    .limit(limit);

  // Fetch player details
  const matchesWithPlayers = await Promise.all(
    allMatches.map(async (match) => {
      if (match.type === "singles") {
        const [winner, loser] = await Promise.all([
          db.select().from(players).where(eq(players.id, match.winnerId!)).limit(1),
          db.select().from(players).where(eq(players.id, match.loserId!)).limit(1),
        ]);
        return {
          ...match,
          winner: winner[0],
          loser: loser[0],
        };
      } else {
        const [w1, w2, l1, l2] = await Promise.all([
          db.select().from(players).where(eq(players.id, match.winnerTeamP1!)).limit(1),
          db.select().from(players).where(eq(players.id, match.winnerTeamP2!)).limit(1),
          db.select().from(players).where(eq(players.id, match.loserTeamP1!)).limit(1),
          db.select().from(players).where(eq(players.id, match.loserTeamP2!)).limit(1),
        ]);
        return {
          ...match,
          winnerTeam: [w1[0], w2[0]],
          loserTeam: [l1[0], l2[0]],
        };
      }
    })
  );

  return matchesWithPlayers;
}

export async function deleteMatch(matchId: string) {
  await requireAdmin();

  // Note: This doesn't recalculate ELO - would need more complex logic for that
  await db.delete(matches).where(eq(matches.id, matchId));

  revalidatePath("/admin");
  revalidatePath("/");
  revalidatePath("/matches");

  return { success: true };
}

export async function toggleAdminStatus(userId: string) {
  const session = await requireAdmin();

  // Prevent self-demotion
  if (session.user.id === userId) {
    throw new Error("Cannot change your own admin status");
  }

  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
  });

  if (!user) {
    throw new Error("User not found");
  }

  await db
    .update(users)
    .set({ isAdmin: !user.isAdmin })
    .where(eq(users.id, userId));

  revalidatePath("/admin");

  return { success: true, isAdmin: !user.isAdmin };
}
