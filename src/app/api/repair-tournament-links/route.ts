import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { tournaments, tournamentMatches, tournamentRounds } from "@/lib/db/schema";
import { eq, and, isNull, ne } from "drizzle-orm";
import { auth } from "@/lib/auth";

/**
 * Repair tournament match links for brackets
 * POST /api/repair-tournament-links?tournamentId=xxx
 */
export async function POST(request: Request) {
  // Require admin
  const session = await auth();
  if (!session?.user?.isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const tournamentId = searchParams.get("tournamentId");

  if (!tournamentId) {
    return NextResponse.json({ error: "tournamentId required" }, { status: 400 });
  }

  try {
    // Get tournament with rounds and matches
    const tournament = await db.query.tournaments.findFirst({
      where: eq(tournaments.id, tournamentId),
      with: {
        rounds: {
          orderBy: (rounds, { asc }) => [asc(rounds.roundNumber)],
        },
        matches: {
          orderBy: (matches, { asc }) => [asc(matches.position)],
        },
      },
    });

    if (!tournament) {
      return NextResponse.json({ error: "Tournament not found" }, { status: 404 });
    }

    // Build a map of roundNumber-position -> matchId (ignoring bracket type)
    const matchLookup = new Map<string, string>();
    const matchByRoundAndPosition = new Map<string, typeof tournament.matches[0]>();

    for (const match of tournament.matches) {
      const round = tournament.rounds.find(r => r.id === match.roundId);
      if (round) {
        const key = `${round.roundNumber}-${match.position}`;
        matchLookup.set(key, match.id);
        matchByRoundAndPosition.set(key, match);
      }
    }

    let fixedLinks = 0;
    let advancedWinners = 0;

    // For each round after round 1, fix the fromMatchId links
    for (const round of tournament.rounds) {
      if (round.roundNumber <= 1) continue;

      const roundMatches = tournament.matches.filter(m => m.roundId === round.id);

      for (const match of roundMatches) {
        const updates: Record<string, string | null> = {};

        // Fix participant1FromMatchId
        const prevRound = round.roundNumber - 1;
        const p1SourcePosition = match.position * 2;
        const p2SourcePosition = match.position * 2 + 1;

        const p1SourceKey = `${prevRound}-${p1SourcePosition}`;
        const p2SourceKey = `${prevRound}-${p2SourcePosition}`;

        const p1SourceMatchId = matchLookup.get(p1SourceKey);
        const p2SourceMatchId = matchLookup.get(p2SourceKey);

        // Update links if they're missing
        if (!match.participant1FromMatchId && p1SourceMatchId) {
          updates.participant1FromMatchId = p1SourceMatchId;
          fixedLinks++;
        }
        if (!match.participant2FromMatchId && p2SourceMatchId) {
          updates.participant2FromMatchId = p2SourceMatchId;
          fixedLinks++;
        }

        if (Object.keys(updates).length > 0) {
          await db
            .update(tournamentMatches)
            .set(updates)
            .where(eq(tournamentMatches.id, match.id));
        }

        // Now check if source matches are completed and advance winners
        const p1SourceMatch = matchByRoundAndPosition.get(p1SourceKey);
        const p2SourceMatch = matchByRoundAndPosition.get(p2SourceKey);

        const participantUpdates: Record<string, string | null> = {};

        if (p1SourceMatch?.winnerId && !match.participant1Id) {
          participantUpdates.participant1Id = p1SourceMatch.winnerId;
          advancedWinners++;
        }
        if (p2SourceMatch?.winnerId && !match.participant2Id) {
          participantUpdates.participant2Id = p2SourceMatch.winnerId;
          advancedWinners++;
        }

        if (Object.keys(participantUpdates).length > 0) {
          await db
            .update(tournamentMatches)
            .set(participantUpdates)
            .where(eq(tournamentMatches.id, match.id));

          // Check if match is now ready
          const updatedMatch = await db.query.tournamentMatches.findFirst({
            where: eq(tournamentMatches.id, match.id),
          });

          if (updatedMatch?.participant1Id && updatedMatch?.participant2Id &&
              updatedMatch.status === "pending") {
            await db
              .update(tournamentMatches)
              .set({ status: "ready" })
              .where(eq(tournamentMatches.id, match.id));
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      tournamentId,
      stats: {
        fixedLinks,
        advancedWinners,
        totalMatches: tournament.matches.length,
        totalRounds: tournament.rounds.length,
      },
    });
  } catch (error) {
    console.error("Repair error:", error);
    return NextResponse.json(
      { error: "Repair failed", details: String(error) },
      { status: 500 }
    );
  }
}
