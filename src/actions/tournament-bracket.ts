"use server";

import { db } from "@/lib/db";
import {
  tournaments,
  tournamentEnrollments,
  tournamentRounds,
  tournamentMatches,
  tournamentGroups,
  players,
} from "@/lib/db/schema";
import { eq, and, or } from "drizzle-orm";
import { getEffectiveSession } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import {
  generateSingleEliminationBracket,
  generateDoubleEliminationBracket,
  generateRoundRobinGroups,
  generateSwissRound,
  generateKnockoutFromGroups,
  type BracketParticipant,
  type GeneratedRound,
} from "@/lib/bracket";
import { pusherServer, getTournamentChannel, CHANNELS, EVENTS } from "@/lib/pusher";
import { getRoundDefaultBestOf } from "@/lib/bestof";

async function requireAdmin() {
  const session = await getEffectiveSession();
  if (!session?.user?.isAdmin) {
    throw new Error("Unauthorized: Admin access required");
  }
  return session;
}

/**
 * Generate bracket and start tournament (admin only)
 */
export async function startTournament(tournamentId: string): Promise<void> {
  await requireAdmin();

  const tournament = await db.query.tournaments.findFirst({
    where: eq(tournaments.id, tournamentId),
    with: {
      enrollments: {
        with: {
          player: true,
          partner: true,
        },
      },
    },
  });

  if (!tournament) {
    throw new Error("Tournament not found");
  }

  if (tournament.status !== "enrollment") {
    throw new Error("Tournament must be in enrollment status to start");
  }

  if (tournament.enrollments.length < 2) {
    throw new Error("Need at least 2 participants to start tournament");
  }

  // Immediately mark tournament as in_progress to prevent race conditions (double-clicks)
  // The totalRounds will be updated at the end once we know the actual value
  await db
    .update(tournaments)
    .set({
      status: "in_progress",
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(tournaments.id, tournamentId),
        eq(tournaments.status, "enrollment") // Double-check status to prevent race
      )
    );

  // Verify the update succeeded (another request might have won the race)
  const updatedTournament = await db.query.tournaments.findFirst({
    where: eq(tournaments.id, tournamentId),
    columns: { status: true },
  });

  if (updatedTournament?.status !== "in_progress") {
    throw new Error("Tournament is already being started by another request");
  }

  // Convert enrollments to bracket participants
  const participants: BracketParticipant[] = tournament.enrollments.map((e) => {
    // For doubles, use average ELO
    const elo =
      tournament.matchType === "doubles" && e.partner
        ? Math.round((e.player.elo + e.partner.elo) / 2)
        : e.player.elo;

    return {
      id: e.id,
      playerId: e.playerId,
      partnerId: e.partnerId,
      elo,
      seed: e.seed,
      seedOverride: e.seedOverride,
    };
  });

  let generatedRounds: GeneratedRound[] = [];
  let totalRounds = 0;

  // Generate bracket based on format
  switch (tournament.format) {
    case "single_elimination": {
      const result = generateSingleEliminationBracket(
        participants,
        tournament.eloMultiplierBase,
        tournament.eloMultiplierFinals
      );
      generatedRounds = result.rounds;
      totalRounds = result.totalRounds;
      break;
    }

    case "double_elimination": {
      const result = generateDoubleEliminationBracket(
        participants,
        tournament.eloMultiplierBase,
        tournament.eloMultiplierFinals
      );
      generatedRounds = result.rounds;
      totalRounds = result.totalRounds;
      break;
    }

    case "round_robin_knockout": {
      const groupCount = tournament.groupCount || Math.ceil(participants.length / 4);
      const advancePerGroup = tournament.advancePerGroup || 2;
      const minGroupSize = Math.floor(participants.length / groupCount);

      // Validate advance count doesn't exceed smallest group
      if (advancePerGroup > minGroupSize) {
        throw new Error(
          `Cannot advance ${advancePerGroup} players per group when smallest group has ${minGroupSize} players. ` +
          `Either reduce "advance per group" to ${minGroupSize} or fewer, or add more participants.`
        );
      }

      const { groups, rounds } = generateRoundRobinGroups(
        participants,
        groupCount,
        tournament.eloMultiplierBase
      );

      // Create groups in database
      const createdGroups = await Promise.all(
        groups.map(async (group, index) => {
          const [dbGroup] = await db
            .insert(tournamentGroups)
            .values({
              tournamentId,
              name: group.name,
              displayOrder: index,
            })
            .returning();

          // Update enrollments with group assignment
          await Promise.all(
            group.participants.map((p) =>
              db
                .update(tournamentEnrollments)
                .set({ groupId: dbGroup.id })
                .where(eq(tournamentEnrollments.id, p.id))
            )
          );

          return dbGroup;
        })
      );

      // Update group IDs in matches
      generatedRounds = rounds.map((round) => ({
        ...round,
        matches: round.matches.map((match) => {
          const groupIndex = parseInt(match.groupId || "0");
          return {
            ...match,
            groupId: createdGroups[groupIndex]?.id,
          };
        }),
      }));

      totalRounds = rounds.length;
      // Note: Knockout rounds will be added when group stage completes
      break;
    }

    case "swiss": {
      const swissRounds = tournament.swissRounds || Math.ceil(Math.log2(participants.length));

      // Generate first round
      const firstRound = generateSwissRound(
        participants,
        1,
        new Map(),
        new Map(),
        swissRounds,
        tournament.eloMultiplierBase,
        tournament.eloMultiplierFinals
      );

      generatedRounds = [firstRound];
      totalRounds = swissRounds;
      break;
    }

    default:
      throw new Error(`Unsupported tournament format: ${tournament.format}`);
  }

  // Create rounds in database with stage-appropriate bestOf values
  const createdRounds = await Promise.all(
    generatedRounds.map(async (round) => {
      // Calculate bestOf based on round type and tournament config
      const roundBestOf = getRoundDefaultBestOf(round.name, round.bracketType, {
        bestOf: tournament.bestOf,
        bestOfGroupStage: tournament.bestOfGroupStage,
        bestOfEarlyRounds: tournament.bestOfEarlyRounds,
        bestOfSemiFinals: tournament.bestOfSemiFinals,
        bestOfFinals: tournament.bestOfFinals,
      });

      const [dbRound] = await db
        .insert(tournamentRounds)
        .values({
          tournamentId,
          roundNumber: round.roundNumber,
          name: round.name,
          bracketType: round.bracketType,
          eloMultiplier: round.eloMultiplier,
          bestOf: roundBestOf,
        })
        .returning();

      return { ...round, dbId: dbRound.id };
    })
  );

  // Create matches in database and build lookup map for linking
  // Map: "roundNumber-position-bracketType" -> matchId
  const matchIdLookup = new Map<string, string>();

  // Create matches round by round to ensure proper ordering
  for (const round of createdRounds) {
    const createdMatches = await Promise.all(
      round.matches.map(async (match) => {
        // Resolve source match IDs if this match has advancement references
        let participant1FromMatchId: string | null = null;
        let participant2FromMatchId: string | null = null;

        if (match.participant1FromRound !== undefined && match.participant1FromMatchPosition !== undefined) {
          // Try multiple bracket types since finals match may reference winners bracket
          const possibleTypes = ["winners", match.bracketType, "finals", "losers"];
          for (const bracketType of possibleTypes) {
            const key = `${match.participant1FromRound}-${match.participant1FromMatchPosition}-${bracketType}`;
            participant1FromMatchId = matchIdLookup.get(key) || null;
            if (participant1FromMatchId) break;
          }
        }

        if (match.participant2FromRound !== undefined && match.participant2FromMatchPosition !== undefined) {
          // Try multiple bracket types since finals match may reference winners bracket
          const possibleTypes = ["winners", match.bracketType, "finals", "losers"];
          for (const bracketType of possibleTypes) {
            const key = `${match.participant2FromRound}-${match.participant2FromMatchPosition}-${bracketType}`;
            participant2FromMatchId = matchIdLookup.get(key) || null;
            if (participant2FromMatchId) break;
          }
        }

        const [createdMatch] = await db
          .insert(tournamentMatches)
          .values({
            tournamentId,
            roundId: round.dbId,
            position: match.position,
            bracketType: match.bracketType,
            participant1Id: match.participant1Id,
            participant2Id: match.participant2Id,
            participant1FromMatchId,
            participant2FromMatchId,
            participant1IsWinner: match.participant1IsWinner ?? true,
            participant2IsWinner: match.participant2IsWinner ?? true,
            eloMultiplier: match.eloMultiplier,
            status: match.status,
            groupId: match.groupId,
          })
          .returning();

        return createdMatch;
      })
    );

    // Add created matches to lookup
    for (const match of createdMatches) {
      const key = `${round.roundNumber}-${match.position}-${match.bracketType}`;
      matchIdLookup.set(key, match.id);
    }
  }

  // Auto-advance bye winners
  // Find all bye matches and set their winner, then advance them
  const byeMatches = await db.query.tournamentMatches.findMany({
    where: and(
      eq(tournamentMatches.tournamentId, tournamentId),
      eq(tournamentMatches.status, "bye")
    ),
  });

  for (const byeMatch of byeMatches) {
    // The winner is whichever participant is not null
    const winnerId = byeMatch.participant1Id || byeMatch.participant2Id;
    if (!winnerId) continue;

    // Mark the bye match with its winner
    await db
      .update(tournamentMatches)
      .set({ winnerId })
      .where(eq(tournamentMatches.id, byeMatch.id));

    // Advance winner to next match
    await advanceByeWinner(tournamentId, byeMatch.id, winnerId);
  }

  // Assign seeds to enrollments
  const sortedParticipants = participants.sort((a, b) => {
    if (a.seedOverride && b.seedOverride && a.seed && b.seed) {
      return a.seed - b.seed;
    }
    if (a.seedOverride && a.seed) return -1;
    if (b.seedOverride && b.seed) return 1;
    return b.elo - a.elo;
  });

  await Promise.all(
    sortedParticipants.map((p, index) =>
      db
        .update(tournamentEnrollments)
        .set({ seed: index + 1 })
        .where(eq(tournamentEnrollments.id, p.id))
    )
  );

  // Update tournament with round info (status already set at start)
  await db
    .update(tournaments)
    .set({
      currentRound: 1,
      totalRounds,
      startedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(tournaments.id, tournamentId));

  // Trigger real-time updates
  await Promise.all([
    pusherServer.trigger(getTournamentChannel(tournamentId), EVENTS.TOURNAMENT_STARTED, {
      tournamentId,
      totalRounds,
    }),
    pusherServer.trigger(CHANNELS.TOURNAMENTS, EVENTS.TOURNAMENT_STARTED, {
      tournamentId,
      totalRounds,
    }),
  ]);

  revalidatePath(`/tournaments/${tournamentId}`);
  revalidatePath("/tournaments");
}

/**
 * Get bracket data for visualization
 */
export async function getBracket(tournamentId: string) {
  const session = await getEffectiveSession();
  if (!session?.user) {
    throw new Error("Unauthorized");
  }

  const tournament = await db.query.tournaments.findFirst({
    where: eq(tournaments.id, tournamentId),
    with: {
      rounds: {
        orderBy: (rounds, { asc }) => [asc(rounds.roundNumber)],
      },
      matches: {
        with: {
          participant1: {
            with: {
              player: true,
              partner: true,
            },
          },
          participant2: {
            with: {
              player: true,
              partner: true,
            },
          },
          winner: {
            with: {
              player: true,
            },
          },
          round: true,
        },
        orderBy: (matches, { asc }) => [asc(matches.roundId), asc(matches.position)],
      },
      groups: {
        with: {
          enrollments: {
            with: {
              player: true,
              partner: true,
            },
            orderBy: (enrollments, { desc }) => [desc(enrollments.groupPoints)],
          },
        },
        orderBy: (groups, { asc }) => [asc(groups.displayOrder)],
      },
    },
  });

  if (!tournament) {
    throw new Error("Tournament not found");
  }

  // Organize matches by round
  const matchesByRound = tournament.rounds.map((round) => ({
    ...round,
    matches: tournament.matches.filter((m) => m.roundId === round.id),
  }));

  return {
    tournament,
    rounds: matchesByRound,
    groups: tournament.groups,
  };
}

/**
 * Generate next Swiss round (admin only)
 */
export async function generateNextSwissRound(tournamentId: string): Promise<void> {
  await requireAdmin();

  const tournament = await db.query.tournaments.findFirst({
    where: eq(tournaments.id, tournamentId),
    with: {
      enrollments: {
        with: {
          player: true,
        },
      },
      rounds: true,
      matches: true,
    },
  });

  if (!tournament) {
    throw new Error("Tournament not found");
  }

  if (tournament.format !== "swiss") {
    throw new Error("This action is only for Swiss tournaments");
  }

  const currentRoundNumber = tournament.currentRound || 1;
  const nextRoundNumber = currentRoundNumber + 1;

  if (nextRoundNumber > (tournament.totalRounds || 5)) {
    throw new Error("All Swiss rounds have been completed");
  }

  // Check if current round is complete
  const currentRoundMatches = tournament.matches.filter(
    (m) => tournament.rounds.find((r) => r.id === m.roundId)?.roundNumber === currentRoundNumber
  );

  const incompleteMatches = currentRoundMatches.filter(
    (m) => m.status !== "completed" && m.status !== "bye"
  );

  if (incompleteMatches.length > 0) {
    throw new Error("Current round is not complete");
  }

  // Build opponent history and points
  const previousOpponents = new Map<string, string[]>();
  const swissPoints = new Map<string, number>();

  tournament.enrollments.forEach((e) => {
    previousOpponents.set(e.id, JSON.parse(e.swissOpponents || "[]"));
    swissPoints.set(e.id, e.swissPoints);
  });

  // Convert to participants
  const participants: BracketParticipant[] = tournament.enrollments
    .filter((e) => e.isActive)
    .map((e) => ({
      id: e.id,
      playerId: e.playerId,
      elo: e.player.elo,
      seed: e.seed,
      seedOverride: e.seedOverride,
    }));

  // Generate next round
  const nextRound = generateSwissRound(
    participants,
    nextRoundNumber,
    previousOpponents,
    swissPoints,
    tournament.totalRounds || 5,
    tournament.eloMultiplierBase,
    tournament.eloMultiplierFinals
  );

  // Create round in database with stage-appropriate bestOf
  const roundBestOf = getRoundDefaultBestOf(nextRound.name, "swiss_round", {
    bestOf: tournament.bestOf,
    bestOfGroupStage: tournament.bestOfGroupStage,
    bestOfEarlyRounds: tournament.bestOfEarlyRounds,
    bestOfSemiFinals: tournament.bestOfSemiFinals,
    bestOfFinals: tournament.bestOfFinals,
  });

  const [dbRound] = await db
    .insert(tournamentRounds)
    .values({
      tournamentId,
      roundNumber: nextRoundNumber,
      name: nextRound.name,
      bracketType: "swiss_round",
      eloMultiplier: nextRound.eloMultiplier,
      bestOf: roundBestOf,
    })
    .returning();

  // Create matches
  await Promise.all(
    nextRound.matches.map((match) =>
      db.insert(tournamentMatches).values({
        tournamentId,
        roundId: dbRound.id,
        position: match.position,
        bracketType: "swiss_round",
        participant1Id: match.participant1Id,
        participant2Id: match.participant2Id,
        eloMultiplier: match.eloMultiplier,
        status: match.status,
      })
    )
  );

  // Update tournament current round
  await db
    .update(tournaments)
    .set({
      currentRound: nextRoundNumber,
      updatedAt: new Date(),
    })
    .where(eq(tournaments.id, tournamentId));

  revalidatePath(`/tournaments/${tournamentId}`);
}

/**
 * Internal function to generate knockout stage (no auth check)
 * Used by automatic tournament progression
 */
export async function _generateKnockoutStageInternal(tournamentId: string): Promise<void> {
  const tournament = await db.query.tournaments.findFirst({
    where: eq(tournaments.id, tournamentId),
    with: {
      enrollments: {
        with: {
          player: true,
          group: true,
        },
      },
      groups: true,
    },
  });

  if (!tournament) {
    throw new Error("Tournament not found");
  }

  if (tournament.format !== "round_robin_knockout") {
    throw new Error("This action is only for round-robin knockout tournaments");
  }

  const advancePerGroup = tournament.advancePerGroup || 2;

  // Get top players from each group
  const advancingParticipants: BracketParticipant[] = [];
  const groupPlacements = new Map<string, { groupName: string; placement: number }>();

  tournament.groups.forEach((group) => {
    const groupEnrollments = tournament.enrollments
      .filter((e) => e.groupId === group.id)
      .sort((a, b) => {
        // Sort by points, then wins, then point differential
        if (b.groupPoints !== a.groupPoints) return b.groupPoints - a.groupPoints;
        if (b.groupWins !== a.groupWins) return b.groupWins - a.groupWins;
        return b.groupPointDiff - a.groupPointDiff;
      });

    groupEnrollments.slice(0, advancePerGroup).forEach((e, index) => {
      advancingParticipants.push({
        id: e.id,
        playerId: e.playerId,
        elo: e.player.elo,
        seed: e.seed,
        seedOverride: false,
      });
      groupPlacements.set(e.id, {
        groupName: group.name,
        placement: index + 1,
      });
    });
  });

  // Generate knockout bracket
  const { rounds } = generateKnockoutFromGroups(
    advancingParticipants,
    groupPlacements,
    Math.round((tournament.eloMultiplierBase + tournament.eloMultiplierFinals) / 2),
    tournament.eloMultiplierFinals
  );

  // Get current max round number
  const existingRounds = await db.query.tournamentRounds.findMany({
    where: eq(tournamentRounds.tournamentId, tournamentId),
  });
  const maxRound = Math.max(...existingRounds.map((r) => r.roundNumber), 0);

  // Create knockout rounds with stage-appropriate bestOf
  const createdRounds = await Promise.all(
    rounds.map(async (round) => {
      const roundName = `Knockout ${round.name}`;
      const roundBestOf = getRoundDefaultBestOf(roundName, round.bracketType, {
        bestOf: tournament.bestOf,
        bestOfGroupStage: tournament.bestOfGroupStage,
        bestOfEarlyRounds: tournament.bestOfEarlyRounds,
        bestOfSemiFinals: tournament.bestOfSemiFinals,
        bestOfFinals: tournament.bestOfFinals,
      });

      const [dbRound] = await db
        .insert(tournamentRounds)
        .values({
          tournamentId,
          roundNumber: maxRound + round.roundNumber,
          name: roundName,
          bracketType: round.bracketType,
          eloMultiplier: round.eloMultiplier,
          bestOf: roundBestOf,
        })
        .returning();

      return { ...round, dbId: dbRound.id };
    })
  );

  // Create matches
  await Promise.all(
    createdRounds.flatMap((round) =>
      round.matches.map((match) =>
        db.insert(tournamentMatches).values({
          tournamentId,
          roundId: round.dbId,
          position: match.position,
          bracketType: match.bracketType,
          participant1Id: match.participant1Id,
          participant2Id: match.participant2Id,
          eloMultiplier: match.eloMultiplier,
          status: match.status,
        })
      )
    )
  );

  // Update total rounds
  await db
    .update(tournaments)
    .set({
      totalRounds: maxRound + rounds.length,
      updatedAt: new Date(),
    })
    .where(eq(tournaments.id, tournamentId));

  revalidatePath(`/tournaments/${tournamentId}`);
}

/**
 * Generate knockout stage from group stage (admin only)
 */
export async function generateKnockoutStage(tournamentId: string): Promise<void> {
  await requireAdmin();
  await _generateKnockoutStageInternal(tournamentId);
}

/**
 * Helper: Advance a bye winner to their next match
 */
async function advanceByeWinner(
  tournamentId: string,
  byeMatchId: string,
  winnerId: string
): Promise<void> {
  // Find next match that references this bye match
  const nextMatches = await db.query.tournamentMatches.findMany({
    where: and(
      eq(tournamentMatches.tournamentId, tournamentId),
      or(
        eq(tournamentMatches.participant1FromMatchId, byeMatchId),
        eq(tournamentMatches.participant2FromMatchId, byeMatchId)
      )
    ),
  });

  for (const nextMatch of nextMatches) {
    const updates: Record<string, string | null> = {};

    // Determine which slot to fill
    if (nextMatch.participant1FromMatchId === byeMatchId) {
      updates.participant1Id = winnerId;
    }
    if (nextMatch.participant2FromMatchId === byeMatchId) {
      updates.participant2Id = winnerId;
    }

    await db
      .update(tournamentMatches)
      .set(updates)
      .where(eq(tournamentMatches.id, nextMatch.id));

    // Check if match is now ready (both participants set)
    const updatedMatch = await db.query.tournamentMatches.findFirst({
      where: eq(tournamentMatches.id, nextMatch.id),
    });

    if (updatedMatch?.participant1Id && updatedMatch?.participant2Id && updatedMatch.status === "pending") {
      await db
        .update(tournamentMatches)
        .set({ status: "ready" })
        .where(eq(tournamentMatches.id, nextMatch.id));
    }
  }
}
