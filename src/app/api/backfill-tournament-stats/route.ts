import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  players,
  tournaments,
  tournamentEnrollments,
  tournamentMatches,
  matches,
} from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";
import { auth } from "@/lib/auth";

/**
 * One-time backfill script to populate tournament stats from existing data
 * POST /api/backfill-tournament-stats
 */
export async function POST() {
  // Require admin
  const session = await auth();
  if (!session?.user?.isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Step 1: Build tournament match stats per player
    const allTournamentMatches = await db.query.tournamentMatches.findMany({
      where: eq(tournamentMatches.status, "completed"),
      with: {
        participant1: true,
        participant2: true,
      },
    });

    const playerStats: Map<
      string,
      { matchesPlayed: number; matchesWon: number }
    > = new Map();

    for (const match of allTournamentMatches) {
      // Participant 1
      if (match.participant1) {
        const playerId = match.participant1.playerId;
        const stats = playerStats.get(playerId) || {
          matchesPlayed: 0,
          matchesWon: 0,
        };
        stats.matchesPlayed++;
        if (match.winnerId === match.participant1Id) {
          stats.matchesWon++;
        }
        playerStats.set(playerId, stats);
      }

      // Participant 2
      if (match.participant2) {
        const playerId = match.participant2.playerId;
        const stats = playerStats.get(playerId) || {
          matchesPlayed: 0,
          matchesWon: 0,
        };
        stats.matchesPlayed++;
        if (match.winnerId === match.participant2Id) {
          stats.matchesWon++;
        }
        playerStats.set(playerId, stats);
      }
    }

    // Step 2: Count tournaments played and won per player
    const completedTournaments = await db.query.tournaments.findMany({
      where: eq(tournaments.status, "completed"),
      with: {
        enrollments: true,
      },
    });

    const tournamentCounts: Map<
      string,
      { played: number; won: number }
    > = new Map();

    for (const tournament of completedTournaments) {
      for (const enrollment of tournament.enrollments) {
        const playerId = enrollment.playerId;
        const counts = tournamentCounts.get(playerId) || {
          played: 0,
          won: 0,
        };
        counts.played++;
        if (enrollment.finalPlacement === 1) {
          counts.won++;
        }
        tournamentCounts.set(playerId, counts);
      }
    }

    // Step 3: Update all players with their stats
    const allPlayerIds = new Set([
      ...playerStats.keys(),
      ...tournamentCounts.keys(),
    ]);

    let updatedPlayers = 0;
    for (const playerId of allPlayerIds) {
      const matchStats = playerStats.get(playerId) || {
        matchesPlayed: 0,
        matchesWon: 0,
      };
      const tournamentStats = tournamentCounts.get(playerId) || {
        played: 0,
        won: 0,
      };

      await db
        .update(players)
        .set({
          tournamentMatchesPlayed: matchStats.matchesPlayed,
          tournamentMatchesWon: matchStats.matchesWon,
          tournamentsPlayed: tournamentStats.played,
          tournamentsWon: tournamentStats.won,
        })
        .where(eq(players.id, playerId));

      updatedPlayers++;
    }

    // Step 4: Link existing matches to tournament matches
    const matchesWithLinks = await db.query.tournamentMatches.findMany({
      where: sql`${tournamentMatches.linkedMatchId} IS NOT NULL`,
    });

    let linkedMatches = 0;
    for (const tm of matchesWithLinks) {
      if (tm.linkedMatchId) {
        await db
          .update(matches)
          .set({ tournamentMatchId: tm.id })
          .where(eq(matches.id, tm.linkedMatchId));
        linkedMatches++;
      }
    }

    return NextResponse.json({
      success: true,
      stats: {
        updatedPlayers,
        linkedMatches,
        tournamentMatchesProcessed: allTournamentMatches.length,
        completedTournamentsProcessed: completedTournaments.length,
      },
    });
  } catch (error) {
    console.error("Backfill error:", error);
    return NextResponse.json(
      { error: "Backfill failed", details: String(error) },
      { status: 500 }
    );
  }
}
