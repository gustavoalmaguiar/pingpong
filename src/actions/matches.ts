"use server";

import { db } from "@/lib/db";
import { matches, players, users } from "@/lib/db/schema";
import { eq, desc, or, sql } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { calculateEloChange, calculateDoublesEloChange } from "@/lib/elo";
import { calculateMatchXp, calculateLevel } from "@/lib/xp";
import { pusherServer, CHANNELS, EVENTS } from "@/lib/pusher";
import { revalidatePath } from "next/cache";
import { checkAndAwardAchievements } from "./achievements";

interface LogSinglesMatchInput {
  winnerId: string;
  loserId: string;
  winnerScore: number;
  loserScore: number;
}

interface LogDoublesMatchInput {
  winnerTeam: [string, string];
  loserTeam: [string, string];
  winnerScore: number;
  loserScore: number;
}

export async function logSinglesMatch(input: LogSinglesMatchInput) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Not authenticated");
  }

  const { winnerId, loserId, winnerScore, loserScore } = input;

  // Validate scores
  if (winnerScore < 0 || loserScore < 0 || winnerScore > 11 || loserScore > 11) {
    throw new Error("Invalid score");
  }
  if (winnerScore !== 11 && !(winnerScore > 11 && winnerScore - loserScore === 2)) {
    throw new Error("Winner must have 11 points or win by 2 in deuce");
  }
  if (loserScore >= winnerScore) {
    throw new Error("Winner score must be higher than loser score");
  }

  // Get current player stats
  const [winner, loser] = await Promise.all([
    db.select().from(players).where(eq(players.id, winnerId)).limit(1),
    db.select().from(players).where(eq(players.id, loserId)).limit(1),
  ]);

  if (!winner[0] || !loser[0]) {
    throw new Error("Player not found");
  }

  // Calculate ELO changes
  const { winnerNewElo, loserNewElo, change } = calculateEloChange(
    winner[0].elo,
    loser[0].elo
  );

  // Calculate XP
  const winnerNewStreak = winner[0].currentStreak + 1;
  const winnerXpGain = calculateMatchXp(true, winnerNewStreak);
  const loserXpGain = calculateMatchXp(false, 0);

  // Create match record
  const [match] = await db
    .insert(matches)
    .values({
      type: "singles",
      winnerId,
      loserId,
      winnerScore,
      loserScore,
      eloChange: change,
      loggedBy: session.user.id,
    })
    .returning();

  // Update winner stats
  const winnerNewXp = winner[0].xp + winnerXpGain;
  await db
    .update(players)
    .set({
      elo: winnerNewElo,
      xp: winnerNewXp,
      level: calculateLevel(winnerNewXp),
      matchesPlayed: winner[0].matchesPlayed + 1,
      matchesWon: winner[0].matchesWon + 1,
      currentStreak: winnerNewStreak,
      bestStreak: Math.max(winner[0].bestStreak, winnerNewStreak),
      updatedAt: new Date(),
    })
    .where(eq(players.id, winnerId));

  // Update loser stats
  const loserNewXp = loser[0].xp + loserXpGain;
  await db
    .update(players)
    .set({
      elo: loserNewElo,
      xp: loserNewXp,
      level: calculateLevel(loserNewXp),
      matchesPlayed: loser[0].matchesPlayed + 1,
      currentStreak: 0,
      updatedAt: new Date(),
    })
    .where(eq(players.id, loserId));

  // Check for new achievements
  await Promise.all([
    checkAndAwardAchievements(winnerId),
    checkAndAwardAchievements(loserId),
  ]);

  // Trigger real-time updates
  try {
    await pusherServer.trigger(CHANNELS.MATCHES, EVENTS.MATCH_CREATED, {
      matchId: match.id,
      type: "singles",
      winnerId,
      loserId,
      eloChange: change,
    });
    await pusherServer.trigger(CHANNELS.LEADERBOARD, EVENTS.LEADERBOARD_UPDATE, {
      timestamp: Date.now(),
    });
  } catch (e) {
    // Pusher errors shouldn't block the match logging
    console.error("Pusher error:", e);
  }

  revalidatePath("/");
  revalidatePath("/leaderboard");
  revalidatePath("/matches");

  return {
    success: true,
    match,
    eloChange: change,
  };
}

export async function logDoublesMatch(input: LogDoublesMatchInput) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Not authenticated");
  }

  const { winnerTeam, loserTeam, winnerScore, loserScore } = input;

  // Validate scores
  if (winnerScore < 0 || loserScore < 0 || winnerScore > 11 || loserScore > 11) {
    throw new Error("Invalid score");
  }
  if (winnerScore !== 11 && !(winnerScore > 11 && winnerScore - loserScore === 2)) {
    throw new Error("Winner must have 11 points or win by 2 in deuce");
  }

  // Validate no duplicate players
  const allPlayers = [...winnerTeam, ...loserTeam];
  if (new Set(allPlayers).size !== 4) {
    throw new Error("All players must be different");
  }

  // Get current player stats
  const playerStats = await db
    .select()
    .from(players)
    .where(
      or(
        eq(players.id, winnerTeam[0]),
        eq(players.id, winnerTeam[1]),
        eq(players.id, loserTeam[0]),
        eq(players.id, loserTeam[1])
      )
    );

  const playerMap = new Map(playerStats.map((p) => [p.id, p]));

  const w1 = playerMap.get(winnerTeam[0]);
  const w2 = playerMap.get(winnerTeam[1]);
  const l1 = playerMap.get(loserTeam[0]);
  const l2 = playerMap.get(loserTeam[1]);

  if (!w1 || !w2 || !l1 || !l2) {
    throw new Error("Player not found");
  }

  // Calculate ELO changes
  const { winnerChange, loserChange, winnerNewElos, loserNewElos } =
    calculateDoublesEloChange([w1.elo, w2.elo], [l1.elo, l2.elo]);

  // Create match record
  const [match] = await db
    .insert(matches)
    .values({
      type: "doubles",
      winnerTeamP1: winnerTeam[0],
      winnerTeamP2: winnerTeam[1],
      loserTeamP1: loserTeam[0],
      loserTeamP2: loserTeam[1],
      winnerScore,
      loserScore,
      eloChange: winnerChange,
      loggedBy: session.user.id,
    })
    .returning();

  // Update all players
  const updates = [
    { player: w1, newElo: winnerNewElos[0], won: true },
    { player: w2, newElo: winnerNewElos[1], won: true },
    { player: l1, newElo: loserNewElos[0], won: false },
    { player: l2, newElo: loserNewElos[1], won: false },
  ];

  for (const { player, newElo, won } of updates) {
    const newStreak = won ? player.currentStreak + 1 : 0;
    const xpGain = calculateMatchXp(won, newStreak);
    const newXp = player.xp + xpGain;

    await db
      .update(players)
      .set({
        elo: newElo,
        xp: newXp,
        level: calculateLevel(newXp),
        matchesPlayed: player.matchesPlayed + 1,
        matchesWon: won ? player.matchesWon + 1 : player.matchesWon,
        currentStreak: newStreak,
        bestStreak: won
          ? Math.max(player.bestStreak, newStreak)
          : player.bestStreak,
        updatedAt: new Date(),
      })
      .where(eq(players.id, player.id));
  }

  // Check for new achievements
  await Promise.all([
    checkAndAwardAchievements(winnerTeam[0]),
    checkAndAwardAchievements(winnerTeam[1]),
    checkAndAwardAchievements(loserTeam[0]),
    checkAndAwardAchievements(loserTeam[1]),
  ]);

  // Trigger real-time updates
  try {
    await pusherServer.trigger(CHANNELS.MATCHES, EVENTS.MATCH_CREATED, {
      matchId: match.id,
      type: "doubles",
      winnerTeam,
      loserTeam,
      eloChange: winnerChange,
    });
    await pusherServer.trigger(CHANNELS.LEADERBOARD, EVENTS.LEADERBOARD_UPDATE, {
      timestamp: Date.now(),
    });
  } catch (e) {
    console.error("Pusher error:", e);
  }

  revalidatePath("/");
  revalidatePath("/leaderboard");
  revalidatePath("/matches");

  return {
    success: true,
    match,
    eloChange: winnerChange,
  };
}

export async function getRecentMatches(limit = 10) {
  const recentMatches = await db
    .select()
    .from(matches)
    .orderBy(desc(matches.playedAt))
    .limit(limit);

  // Helper to fetch player with avatar from users table
  const getPlayerWithAvatar = async (playerId: string) => {
    const result = await db
      .select({
        id: players.id,
        displayName: players.displayName,
        elo: players.elo,
        avatarUrl: users.image,
      })
      .from(players)
      .leftJoin(users, eq(players.userId, users.id))
      .where(eq(players.id, playerId))
      .limit(1);
    return result[0];
  };

  // Fetch player details for each match
  const matchesWithPlayers = await Promise.all(
    recentMatches.map(async (match) => {
      if (match.type === "singles") {
        const [winner, loser] = await Promise.all([
          getPlayerWithAvatar(match.winnerId!),
          getPlayerWithAvatar(match.loserId!),
        ]);
        return {
          ...match,
          winner,
          loser,
        };
      } else {
        const [w1, w2, l1, l2] = await Promise.all([
          getPlayerWithAvatar(match.winnerTeamP1!),
          getPlayerWithAvatar(match.winnerTeamP2!),
          getPlayerWithAvatar(match.loserTeamP1!),
          getPlayerWithAvatar(match.loserTeamP2!),
        ]);
        return {
          ...match,
          winnerTeam: [w1, w2],
          loserTeam: [l1, l2],
        };
      }
    })
  );

  return matchesWithPlayers;
}

export async function getPlayerMatches(playerId: string, limit = 20) {
  const playerMatches = await db
    .select()
    .from(matches)
    .where(
      or(
        eq(matches.winnerId, playerId),
        eq(matches.loserId, playerId),
        eq(matches.winnerTeamP1, playerId),
        eq(matches.winnerTeamP2, playerId),
        eq(matches.loserTeamP1, playerId),
        eq(matches.loserTeamP2, playerId)
      )
    )
    .orderBy(desc(matches.playedAt))
    .limit(limit);

  return playerMatches;
}

export async function getHeadToHeadStats(playerId: string, limit = 5) {
  // Get all singles matches involving this player
  const playerMatches = await db
    .select()
    .from(matches)
    .where(
      or(
        eq(matches.winnerId, playerId),
        eq(matches.loserId, playerId)
      )
    )
    .orderBy(desc(matches.playedAt));

  // Filter to only singles matches and aggregate by opponent
  const singlesMatches = playerMatches.filter(m => m.type === "singles");

  // Build head-to-head records
  const h2hMap = new Map<string, { wins: number; losses: number; lastMatch: Date }>();

  for (const match of singlesMatches) {
    const isWinner = match.winnerId === playerId;
    const opponentId = isWinner ? match.loserId! : match.winnerId!;

    const existing = h2hMap.get(opponentId) || { wins: 0, losses: 0, lastMatch: match.playedAt };

    if (isWinner) {
      existing.wins += 1;
    } else {
      existing.losses += 1;
    }

    // Update lastMatch if this match is more recent
    if (match.playedAt > existing.lastMatch) {
      existing.lastMatch = match.playedAt;
    }

    h2hMap.set(opponentId, existing);
  }

  // Convert to array and sort by total matches played
  const h2hArray = Array.from(h2hMap.entries())
    .map(([opponentId, stats]) => ({
      opponentId,
      ...stats,
      totalMatches: stats.wins + stats.losses,
    }))
    .sort((a, b) => b.totalMatches - a.totalMatches)
    .slice(0, limit);

  // Fetch opponent details
  const opponentIds = h2hArray.map(h => h.opponentId);

  if (opponentIds.length === 0) {
    return [];
  }

  const opponents = await db
    .select({
      id: players.id,
      displayName: players.displayName,
      elo: players.elo,
      avatarUrl: users.image,
    })
    .from(players)
    .leftJoin(users, eq(players.userId, users.id))
    .where(or(...opponentIds.map(id => eq(players.id, id))));

  // Combine stats with opponent details
  return h2hArray.map(h2h => {
    const opponent = opponents.find(o => o.id === h2h.opponentId);
    return {
      opponent: opponent || { id: h2h.opponentId, displayName: "Unknown", elo: 0, avatarUrl: null },
      wins: h2h.wins,
      losses: h2h.losses,
      lastMatch: h2h.lastMatch,
    };
  });
}
