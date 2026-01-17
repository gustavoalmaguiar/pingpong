"use server";

import { db } from "@/lib/db";
import {
  tournaments,
  tournamentEnrollments,
  tournamentRounds,
  tournamentMatches,
  matches,
  players,
  type TournamentMatch,
} from "@/lib/db/schema";
import { eq, and, or, asc, sql } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import {
  calculateTournamentEloChange,
  calculateTournamentDoublesEloChange,
  calculateFlatTournamentElo,
  calculateFlatTournamentDoublesElo,
} from "@/lib/elo";
import { calculateMatchXp, calculateLevel } from "@/lib/xp";
import { pusherServer, getTournamentChannel, CHANNELS, EVENTS } from "@/lib/pusher";
import { resolveBestOf, validateScores, validateSeriesScore, validateBestOf } from "@/lib/bestof";
import { _generateKnockoutStageInternal } from "./tournament-bracket";
import { checkAndAwardAchievements } from "./achievements";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.isAdmin) {
    throw new Error("Unauthorized: Admin access required");
  }
  return session;
}

export type GameScore = { p1: number; p2: number };

/**
 * Record a tournament match result with detailed game scores.
 * Creates a separate match record for EACH game in the series.
 * E.g., a Bo3 series (11-9, 8-11, 11-7) creates 3 match records.
 */
export async function recordTournamentMatchResult(
  matchId: string,
  winnerId: string, // enrollment ID of series winner
  scores: GameScore[] // Array of game scores for best-of series
): Promise<void> {
  const session = await requireAdmin();

  const match = await db.query.tournamentMatches.findFirst({
    where: eq(tournamentMatches.id, matchId),
    with: {
      tournament: true,
      round: true,
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
    },
  });

  if (!match) {
    throw new Error("Match not found");
  }

  if (match.status === "completed") {
    throw new Error("Match has already been completed");
  }

  if (!match.participant1 || !match.participant2) {
    throw new Error("Match participants not set");
  }

  // Resolve the effective bestOf for this match
  const effectiveBestOf = resolveBestOf({
    matchBestOf: match.bestOf,
    roundBestOf: match.round.bestOf,
    tournamentBestOf: match.tournament.bestOf,
  });

  // Validate scores against bestOf configuration
  const scoreValidation = validateScores(scores, effectiveBestOf);
  if (!scoreValidation.valid) {
    throw new Error(scoreValidation.error || "Invalid scores");
  }

  const isP1SeriesWinner = winnerId === match.participant1Id;
  const seriesWinner = isP1SeriesWinner ? match.participant1 : match.participant2;
  const seriesLoser = isP1SeriesWinner ? match.participant2 : match.participant1;

  // Track total ELO changes across all games
  let totalWinnerEloChange = 0;
  let totalLoserEloChange = 0;

  // Track current ELOs (they change with each game)
  let currentP1Elos = {
    player: match.participant1.player.elo,
    partner: match.participant1.partner?.elo || match.participant1.player.elo,
  };
  let currentP2Elos = {
    player: match.participant2.player.elo,
    partner: match.participant2.partner?.elo || match.participant2.player.elo,
  };

  // Store all created match IDs for linking
  const createdMatchIds: string[] = [];

  // Create a match record for EACH game
  for (const gameScore of scores) {
    const isP1GameWinner = gameScore.p1 > gameScore.p2;
    const gameWinnerEnrollment = isP1GameWinner ? match.participant1 : match.participant2;
    const gameLoserEnrollment = isP1GameWinner ? match.participant2 : match.participant1;

    const winnerScore = Math.max(gameScore.p1, gameScore.p2);
    const loserScore = Math.min(gameScore.p1, gameScore.p2);

    if (match.tournament.matchType === "singles") {
      // Get current ELOs for this game
      const gameWinnerElo = isP1GameWinner ? currentP1Elos.player : currentP2Elos.player;
      const gameLoserElo = isP1GameWinner ? currentP2Elos.player : currentP1Elos.player;

      // Calculate ELO for this individual game
      const result = calculateTournamentEloChange(
        gameWinnerElo,
        gameLoserElo,
        match.eloMultiplier
      );

      // Create match record for this game
      const [newMatch] = await db
        .insert(matches)
        .values({
          type: "singles",
          winnerId: gameWinnerEnrollment.playerId,
          loserId: gameLoserEnrollment.playerId,
          winnerScore,
          loserScore,
          eloChange: result.change,
          loggedBy: session.user.id,
          tournamentMatchId: matchId,
        })
        .returning();

      createdMatchIds.push(newMatch.id);

      // Update current ELOs for next game calculation
      if (isP1GameWinner) {
        currentP1Elos.player = result.winnerNewElo;
        currentP2Elos.player = result.loserNewElo;
        totalWinnerEloChange += isP1SeriesWinner ? result.change : -result.change;
        totalLoserEloChange += isP1SeriesWinner ? -result.change : result.change;
      } else {
        currentP2Elos.player = result.winnerNewElo;
        currentP1Elos.player = result.loserNewElo;
        totalWinnerEloChange += isP1SeriesWinner ? -result.change : result.change;
        totalLoserEloChange += isP1SeriesWinner ? result.change : -result.change;
      }
    } else {
      // Doubles
      const gameWinnerTeamElos: [number, number] = isP1GameWinner
        ? [currentP1Elos.player, currentP1Elos.partner]
        : [currentP2Elos.player, currentP2Elos.partner];
      const gameLoserTeamElos: [number, number] = isP1GameWinner
        ? [currentP2Elos.player, currentP2Elos.partner]
        : [currentP1Elos.player, currentP1Elos.partner];

      const result = calculateTournamentDoublesEloChange(
        gameWinnerTeamElos,
        gameLoserTeamElos,
        match.eloMultiplier
      );

      // Create match record for this game
      const [newMatch] = await db
        .insert(matches)
        .values({
          type: "doubles",
          winnerTeamP1: gameWinnerEnrollment.playerId,
          winnerTeamP2: gameWinnerEnrollment.partnerId!,
          loserTeamP1: gameLoserEnrollment.playerId,
          loserTeamP2: gameLoserEnrollment.partnerId!,
          winnerScore,
          loserScore,
          eloChange: result.winnerChange,
          loggedBy: session.user.id,
          tournamentMatchId: matchId,
        })
        .returning();

      createdMatchIds.push(newMatch.id);

      // Update current ELOs for next game calculation
      if (isP1GameWinner) {
        currentP1Elos.player = result.winnerNewElos[0];
        currentP1Elos.partner = result.winnerNewElos[1];
        currentP2Elos.player = result.loserNewElos[0];
        currentP2Elos.partner = result.loserNewElos[1];
      } else {
        currentP2Elos.player = result.winnerNewElos[0];
        currentP2Elos.partner = result.winnerNewElos[1];
        currentP1Elos.player = result.loserNewElos[0];
        currentP1Elos.partner = result.loserNewElos[1];
      }
    }
  }

  // Now update player stats based on SERIES outcome (not per game)
  if (match.tournament.matchType === "singles") {
    // Final ELOs are in currentP1Elos and currentP2Elos
    const winnerFinalElo = isP1SeriesWinner ? currentP1Elos.player : currentP2Elos.player;
    const loserFinalElo = isP1SeriesWinner ? currentP2Elos.player : currentP1Elos.player;

    await Promise.all([
      db
        .update(players)
        .set({
          elo: winnerFinalElo,
          tournamentMatchesPlayed: seriesWinner.player.tournamentMatchesPlayed + 1,
          tournamentMatchesWon: seriesWinner.player.tournamentMatchesWon + 1,
          tournamentCurrentStreak: seriesWinner.player.tournamentCurrentStreak + 1,
          tournamentBestStreak: Math.max(seriesWinner.player.tournamentBestStreak, seriesWinner.player.tournamentCurrentStreak + 1),
          xp: seriesWinner.player.xp + calculateMatchXp(true, seriesWinner.player.tournamentCurrentStreak + 1),
          updatedAt: new Date(),
        })
        .where(eq(players.id, seriesWinner.playerId)),
      db
        .update(players)
        .set({
          elo: loserFinalElo,
          tournamentMatchesPlayed: seriesLoser.player.tournamentMatchesPlayed + 1,
          tournamentCurrentStreak: 0,
          xp: seriesLoser.player.xp + calculateMatchXp(false, 0),
          updatedAt: new Date(),
        })
        .where(eq(players.id, seriesLoser.playerId)),
    ]);
  } else {
    // Doubles - update all 4 players
    const winnerFinalElos = isP1SeriesWinner
      ? [currentP1Elos.player, currentP1Elos.partner]
      : [currentP2Elos.player, currentP2Elos.partner];
    const loserFinalElos = isP1SeriesWinner
      ? [currentP2Elos.player, currentP2Elos.partner]
      : [currentP1Elos.player, currentP1Elos.partner];

    await Promise.all([
      // Winner team
      db
        .update(players)
        .set({
          elo: winnerFinalElos[0],
          tournamentMatchesPlayed: seriesWinner.player.tournamentMatchesPlayed + 1,
          tournamentMatchesWon: seriesWinner.player.tournamentMatchesWon + 1,
          tournamentCurrentStreak: seriesWinner.player.tournamentCurrentStreak + 1,
          tournamentBestStreak: Math.max(seriesWinner.player.tournamentBestStreak, seriesWinner.player.tournamentCurrentStreak + 1),
          xp: seriesWinner.player.xp + calculateMatchXp(true, seriesWinner.player.tournamentCurrentStreak + 1),
          updatedAt: new Date(),
        })
        .where(eq(players.id, seriesWinner.playerId)),
      seriesWinner.partner &&
        db
          .update(players)
          .set({
            elo: winnerFinalElos[1],
            tournamentMatchesPlayed: seriesWinner.partner.tournamentMatchesPlayed + 1,
            tournamentMatchesWon: seriesWinner.partner.tournamentMatchesWon + 1,
            tournamentCurrentStreak: seriesWinner.partner.tournamentCurrentStreak + 1,
            tournamentBestStreak: Math.max(seriesWinner.partner.tournamentBestStreak, seriesWinner.partner.tournamentCurrentStreak + 1),
            xp: seriesWinner.partner.xp + calculateMatchXp(true, seriesWinner.partner.tournamentCurrentStreak + 1),
            updatedAt: new Date(),
          })
          .where(eq(players.id, seriesWinner.partnerId!)),
      // Loser team
      db
        .update(players)
        .set({
          elo: loserFinalElos[0],
          tournamentMatchesPlayed: seriesLoser.player.tournamentMatchesPlayed + 1,
          tournamentCurrentStreak: 0,
          xp: seriesLoser.player.xp + calculateMatchXp(false, 0),
          updatedAt: new Date(),
        })
        .where(eq(players.id, seriesLoser.playerId)),
      seriesLoser.partner &&
        db
          .update(players)
          .set({
            elo: loserFinalElos[1],
            tournamentMatchesPlayed: seriesLoser.partner.tournamentMatchesPlayed + 1,
            tournamentCurrentStreak: 0,
            xp: seriesLoser.partner.xp + calculateMatchXp(false, 0),
            updatedAt: new Date(),
          })
          .where(eq(players.id, seriesLoser.partnerId!)),
    ].filter(Boolean));
  }

  // Update levels for all affected players
  await updatePlayerLevels([
    seriesWinner.playerId,
    seriesLoser.playerId,
    seriesWinner.partnerId,
    seriesLoser.partnerId,
  ].filter((id): id is string => !!id));

  // Check for new achievements for all affected players
  const playerIdsForAchievements = [
    seriesWinner.playerId,
    seriesLoser.playerId,
    seriesWinner.partnerId,
    seriesLoser.partnerId,
  ].filter((id): id is string => !!id);

  await Promise.all(
    playerIdsForAchievements.map((playerId) => checkAndAwardAchievements(playerId))
  );

  // Update tournament match - link to first created match for backwards compatibility
  await db
    .update(tournamentMatches)
    .set({
      winnerId,
      scores: JSON.stringify(scores),
      linkedMatchId: createdMatchIds[0] || null,
      status: "completed",
      playedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(tournamentMatches.id, matchId));

  // Update Swiss points if applicable
  if (match.round.bracketType === "swiss_round") {
    await updateSwissStats(match.tournamentId, winnerId, seriesLoser.id, scores);
  }

  // Update group stats if applicable
  if (match.round.bracketType === "group") {
    await updateGroupStats(winnerId, seriesLoser.id, scores);
  }

  // Advance winner to next match
  await advanceWinner(match.tournamentId, matchId, winnerId);

  // Check if tournament is complete
  await checkTournamentCompletion(match.tournamentId);

  // Auto-set next match
  await autoSetNextMatch(match.tournamentId);

  // Trigger real-time updates
  await pusherServer.trigger(getTournamentChannel(match.tournamentId), EVENTS.TOURNAMENT_MATCH_COMPLETED, {
    tournamentId: match.tournamentId,
    matchId,
    roundId: match.roundId,
    winnerId,
    loserId: seriesLoser.id,
    scores: JSON.stringify(scores),
  });

  revalidatePath(`/tournaments/${match.tournamentId}`);
  revalidatePath("/leaderboard");
}

/**
 * Record a walkover (forfeit/no-show)
 */
export async function recordWalkover(
  matchId: string,
  winnerId: string,
  reason: "forfeit" | "no_show" | "disqualification"
): Promise<void> {
  await requireAdmin();

  const match = await db.query.tournamentMatches.findFirst({
    where: eq(tournamentMatches.id, matchId),
    with: {
      tournament: true,
    },
  });

  if (!match) {
    throw new Error("Match not found");
  }

  if (match.status === "completed" || match.status === "walkover") {
    throw new Error("Match has already been completed");
  }

  const loserId = winnerId === match.participant1Id
    ? match.participant2Id
    : match.participant1Id;

  // Update match as walkover (no ELO change)
  await db
    .update(tournamentMatches)
    .set({
      winnerId,
      status: "walkover",
      isWalkover: true,
      walkoverReason: reason,
      playedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(tournamentMatches.id, matchId));

  // If disqualification, mark player as eliminated
  if (reason === "disqualification" && loserId) {
    await db
      .update(tournamentEnrollments)
      .set({
        isActive: false,
        eliminatedAt: new Date(),
      })
      .where(eq(tournamentEnrollments.id, loserId));
  }

  // Advance winner
  await advanceWinner(match.tournamentId, matchId, winnerId);

  // Check tournament completion
  await checkTournamentCompletion(match.tournamentId);

  // Trigger real-time updates
  await pusherServer.trigger(getTournamentChannel(match.tournamentId), EVENTS.TOURNAMENT_MATCH_COMPLETED, {
    tournamentId: match.tournamentId,
    matchId,
    roundId: match.roundId || "",
    winnerId,
    loserId: loserId || "",
    scores: "walkover",
  });

  revalidatePath(`/tournaments/${match.tournamentId}`);
}

/**
 * Get upcoming matches for a player
 */
export async function getUpcomingMatches(playerId: string) {
  const session = await auth();
  if (!session?.user) {
    throw new Error("Unauthorized");
  }

  // Find player's enrollments
  const enrollments = await db.query.tournamentEnrollments.findMany({
    where: and(
      eq(tournamentEnrollments.playerId, playerId),
      eq(tournamentEnrollments.isActive, true)
    ),
  });

  const enrollmentIds = enrollments.map((e) => e.id);

  if (enrollmentIds.length === 0) {
    return [];
  }

  // Find matches where player is a participant and match is pending/ready
  const upcomingMatches = await db.query.tournamentMatches.findMany({
    where: and(
      or(
        ...enrollmentIds.map((id) => eq(tournamentMatches.participant1Id, id)),
        ...enrollmentIds.map((id) => eq(tournamentMatches.participant2Id, id))
      ),
      or(
        eq(tournamentMatches.status, "pending"),
        eq(tournamentMatches.status, "ready")
      )
    ),
    with: {
      tournament: true,
      round: true,
      participant1: {
        with: { player: true },
      },
      participant2: {
        with: { player: true },
      },
    },
  });

  return upcomingMatches;
}

/**
 * Helper: Advance winner to next match
 */
async function advanceWinner(
  tournamentId: string,
  completedMatchId: string,
  winnerId: string
): Promise<void> {
  // Find next match that references this match
  const nextMatches = await db.query.tournamentMatches.findMany({
    where: and(
      eq(tournamentMatches.tournamentId, tournamentId),
      or(
        eq(tournamentMatches.participant1FromMatchId, completedMatchId),
        eq(tournamentMatches.participant2FromMatchId, completedMatchId)
      )
    ),
  });

  for (const nextMatch of nextMatches) {
    const updates: Partial<TournamentMatch> = {};

    // Determine which slot to fill
    if (nextMatch.participant1FromMatchId === completedMatchId) {
      updates.participant1Id = winnerId;
    }
    if (nextMatch.participant2FromMatchId === completedMatchId) {
      updates.participant2Id = winnerId;
    }

    await db
      .update(tournamentMatches)
      .set(updates)
      .where(eq(tournamentMatches.id, nextMatch.id));

    // Check if match is now ready
    const updatedMatch = await db.query.tournamentMatches.findFirst({
      where: eq(tournamentMatches.id, nextMatch.id),
    });

    if (updatedMatch?.participant1Id && updatedMatch?.participant2Id) {
      await db
        .update(tournamentMatches)
        .set({ status: "ready" })
        .where(eq(tournamentMatches.id, nextMatch.id));
    }
  }
}

/**
 * Helper: Update Swiss stats
 */
async function updateSwissStats(
  tournamentId: string,
  winnerId: string,
  loserId: string,
  scores: GameScore[]
): Promise<void> {
  // Winner gets 3 points
  const winnerEnrollment = await db.query.tournamentEnrollments.findFirst({
    where: eq(tournamentEnrollments.id, winnerId),
  });

  const loserEnrollment = await db.query.tournamentEnrollments.findFirst({
    where: eq(tournamentEnrollments.id, loserId),
  });

  if (!winnerEnrollment || !loserEnrollment) return;

  // Update winner
  const winnerOpponents = JSON.parse(winnerEnrollment.swissOpponents || "[]");
  winnerOpponents.push(loserId);

  await db
    .update(tournamentEnrollments)
    .set({
      swissPoints: winnerEnrollment.swissPoints + 3,
      swissOpponents: JSON.stringify(winnerOpponents),
    })
    .where(eq(tournamentEnrollments.id, winnerId));

  // Update loser
  const loserOpponents = JSON.parse(loserEnrollment.swissOpponents || "[]");
  loserOpponents.push(winnerId);

  await db
    .update(tournamentEnrollments)
    .set({
      swissOpponents: JSON.stringify(loserOpponents),
    })
    .where(eq(tournamentEnrollments.id, loserId));
}

/**
 * Helper: Update group stats
 */
async function updateGroupStats(
  winnerId: string,
  loserId: string,
  scores: GameScore[]
): Promise<void> {
  const winnerEnrollment = await db.query.tournamentEnrollments.findFirst({
    where: eq(tournamentEnrollments.id, winnerId),
  });

  const loserEnrollment = await db.query.tournamentEnrollments.findFirst({
    where: eq(tournamentEnrollments.id, loserId),
  });

  if (!winnerEnrollment || !loserEnrollment) return;

  // Calculate point differential
  const winnerPoints = scores.reduce((sum, s) => sum + s.p1, 0);
  const loserPoints = scores.reduce((sum, s) => sum + s.p2, 0);
  const pointDiff = winnerPoints - loserPoints;

  await Promise.all([
    db
      .update(tournamentEnrollments)
      .set({
        groupPoints: winnerEnrollment.groupPoints + 3,
        groupWins: winnerEnrollment.groupWins + 1,
        groupPointDiff: winnerEnrollment.groupPointDiff + pointDiff,
      })
      .where(eq(tournamentEnrollments.id, winnerId)),
    db
      .update(tournamentEnrollments)
      .set({
        groupLosses: loserEnrollment.groupLosses + 1,
        groupPointDiff: loserEnrollment.groupPointDiff - pointDiff,
      })
      .where(eq(tournamentEnrollments.id, loserId)),
  ]);
}

/**
 * Helper: Check if tournament is complete
 */
async function checkTournamentCompletion(tournamentId: string): Promise<void> {
  const tournament = await db.query.tournaments.findFirst({
    where: eq(tournaments.id, tournamentId),
    with: {
      matches: true,
      rounds: true,
      groups: true,
      enrollments: {
        with: {
          player: true,
        },
      },
    },
  });

  if (!tournament) return;

  // Handle round_robin_knockout - check if group stage is complete
  if (tournament.format === "round_robin_knockout") {
    const groupRounds = tournament.rounds.filter((r) => r.bracketType === "group");
    const knockoutRounds = tournament.rounds.filter(
      (r) => r.bracketType === "winners" || r.bracketType === "finals"
    );

    // Only check if we have group rounds but knockout hasn't started yet
    if (groupRounds.length > 0 && knockoutRounds.length === 0) {
      const groupMatches = tournament.matches.filter((m) =>
        groupRounds.some((r) => r.id === m.roundId)
      );

      const allGroupMatchesComplete = groupMatches.every(
        (m) => m.status === "completed" || m.status === "walkover" || m.status === "bye"
      );

      if (allGroupMatchesComplete && groupMatches.length > 0) {
        // Calculate how many players would advance
        const advancePerGroup = tournament.advancePerGroup || 2;
        const totalGroups = tournament.groups.length;
        const totalAdvancing = advancePerGroup * totalGroups;

        if (totalAdvancing <= 1) {
          // Only 1 player advancing - complete the tournament
          await completeGroupStageTournament(tournament);
          return;
        } else {
          // Generate knockout stage
          await _generateKnockoutStageInternal(tournamentId);
          return;
        }
      }
    }
  }

  // Standard finals completion check
  if (tournament.rounds.length === 0) return;

  const finalRound = tournament.rounds.reduce((max, r) =>
    r.roundNumber > max.roundNumber ? r : max
  );

  const finalMatches = tournament.matches.filter(
    (m) => m.roundId === finalRound.id && m.bracketType === "finals"
  );

  // Check if all final matches are complete
  const allFinalsComplete = finalMatches.every(
    (m) => m.status === "completed" || m.status === "walkover" || m.status === "bye"
  );

  if (allFinalsComplete && finalMatches.length > 0) {
    // Tournament is complete - find the champion
    const championMatch = finalMatches.find((m) => m.winnerId);

    // Mark tournament as completed
    await db
      .update(tournaments)
      .set({
        status: "completed",
        completedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(tournaments.id, tournamentId));

    if (championMatch?.winnerId) {
      // Set final placement for champion
      await db
        .update(tournamentEnrollments)
        .set({ finalPlacement: 1 })
        .where(eq(tournamentEnrollments.id, championMatch.winnerId));

      // Find runner-up
      const runnerUpId =
        championMatch.winnerId === championMatch.participant1Id
          ? championMatch.participant2Id
          : championMatch.participant1Id;

      if (runnerUpId) {
        await db
          .update(tournamentEnrollments)
          .set({ finalPlacement: 2 })
          .where(eq(tournamentEnrollments.id, runnerUpId));
      }

      // Update tournamentsPlayed for all participants
      const allParticipantPlayerIds = tournament.enrollments.map((e) => e.playerId);
      for (const playerId of allParticipantPlayerIds) {
        await db
          .update(players)
          .set({
            tournamentsPlayed: sql`${players.tournamentsPlayed} + 1`,
          })
          .where(eq(players.id, playerId));
      }

      // Get champion enrollment to find champion's player ID
      const championEnrollment = await db.query.tournamentEnrollments.findFirst({
        where: eq(tournamentEnrollments.id, championMatch.winnerId),
        with: { player: true },
      });

      // Update tournamentsWon for champion
      if (championEnrollment) {
        await db
          .update(players)
          .set({
            tournamentsWon: sql`${players.tournamentsWon} + 1`,
          })
          .where(eq(players.id, championEnrollment.playerId));
      }

      // Check achievements for all tournament participants
      await Promise.all(
        allParticipantPlayerIds.map((playerId) => checkAndAwardAchievements(playerId))
      );

      // Trigger real-time updates
      await Promise.all([
        pusherServer.trigger(getTournamentChannel(tournamentId), EVENTS.TOURNAMENT_COMPLETED, {
          tournamentId,
          championId: championMatch.winnerId,
          championName: championEnrollment?.player.displayName || "Champion",
        }),
        pusherServer.trigger(CHANNELS.TOURNAMENTS, EVENTS.TOURNAMENT_COMPLETED, {
          tournamentId,
          championId: championMatch.winnerId,
          championName: championEnrollment?.player.displayName || "Champion",
        }),
      ]);
    }
  }
}

/**
 * Helper: Complete a small tournament where group stage determines the winner
 */
async function completeGroupStageTournament(tournament: {
  id: string;
  groups: { id: string; name: string }[];
  enrollments: {
    id: string;
    playerId: string;
    groupId: string | null;
    groupPoints: number;
    groupWins: number;
    groupPointDiff: number;
    player: { displayName: string };
  }[];
}): Promise<void> {
  // Get standings across all groups and find overall winner
  const sortedEnrollments = tournament.enrollments.sort((a, b) => {
    // Sort by points, then wins, then point differential
    if (b.groupPoints !== a.groupPoints) return b.groupPoints - a.groupPoints;
    if (b.groupWins !== a.groupWins) return b.groupWins - a.groupWins;
    return b.groupPointDiff - a.groupPointDiff;
  });

  const champion = sortedEnrollments[0];
  const runnerUp = sortedEnrollments[1];

  // Set final placements
  if (champion) {
    await db
      .update(tournamentEnrollments)
      .set({ finalPlacement: 1 })
      .where(eq(tournamentEnrollments.id, champion.id));
  }

  if (runnerUp) {
    await db
      .update(tournamentEnrollments)
      .set({ finalPlacement: 2 })
      .where(eq(tournamentEnrollments.id, runnerUp.id));
  }

  // Update tournamentsPlayed for all participants
  for (const enrollment of tournament.enrollments) {
    await db
      .update(players)
      .set({
        tournamentsPlayed: sql`${players.tournamentsPlayed} + 1`,
      })
      .where(eq(players.id, enrollment.playerId));
  }

  // Update tournamentsWon for champion
  if (champion) {
    await db
      .update(players)
      .set({
        tournamentsWon: sql`${players.tournamentsWon} + 1`,
      })
      .where(eq(players.id, champion.playerId));
  }

  // Check achievements for all tournament participants
  await Promise.all(
    tournament.enrollments.map((e) => checkAndAwardAchievements(e.playerId))
  );

  // Mark tournament as completed
  await db
    .update(tournaments)
    .set({
      status: "completed",
      completedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(tournaments.id, tournament.id));

  // Trigger real-time updates
  await Promise.all([
    pusherServer.trigger(getTournamentChannel(tournament.id), EVENTS.TOURNAMENT_COMPLETED, {
      tournamentId: tournament.id,
      championId: champion?.id,
      championName: champion?.player.displayName || "Champion",
    }),
    pusherServer.trigger(CHANNELS.TOURNAMENTS, EVENTS.TOURNAMENT_COMPLETED, {
      tournamentId: tournament.id,
      championId: champion?.id,
      championName: champion?.player.displayName || "Champion",
    }),
  ]);
}

/**
 * Helper: Update player levels based on current XP
 */
async function updatePlayerLevels(playerIds: string[]): Promise<void> {
  const playerRecords = await Promise.all(
    playerIds.map((id) =>
      db.query.players.findFirst({ where: eq(players.id, id) })
    )
  );

  await Promise.all(
    playerRecords
      .filter((p): p is NonNullable<typeof p> => !!p)
      .map((p) =>
        db
          .update(players)
          .set({ level: calculateLevel(p.xp) })
          .where(eq(players.id, p.id))
      )
  );
}

/**
 * Auto-determine the next match based on bracket position
 * Priority: earlier rounds first, then top-to-bottom (by position)
 */
export async function autoSetNextMatch(tournamentId: string): Promise<void> {
  // Clear any existing "next" match for this tournament
  await db
    .update(tournamentMatches)
    .set({ isNextMatch: false })
    .where(eq(tournamentMatches.tournamentId, tournamentId));

  // Find first ready match by round number, then position
  const readyMatches = await db.query.tournamentMatches.findMany({
    where: and(
      eq(tournamentMatches.tournamentId, tournamentId),
      eq(tournamentMatches.status, "ready")
    ),
    with: { round: true },
  });

  if (readyMatches.length === 0) return;

  // Sort by round number then position
  const sorted = readyMatches.sort((a, b) => {
    if (a.round.roundNumber !== b.round.roundNumber) {
      return a.round.roundNumber - b.round.roundNumber;
    }
    return a.position - b.position;
  });

  // Set first one as next
  await db
    .update(tournamentMatches)
    .set({ isNextMatch: true })
    .where(eq(tournamentMatches.id, sorted[0].id));
}

/**
 * Admin override to set a specific match as "next"
 */
export async function setNextMatch(
  tournamentId: string,
  matchId: string
): Promise<void> {
  await requireAdmin();

  // Verify the match exists and is ready
  const match = await db.query.tournamentMatches.findFirst({
    where: and(
      eq(tournamentMatches.id, matchId),
      eq(tournamentMatches.tournamentId, tournamentId)
    ),
  });

  if (!match) {
    throw new Error("Match not found");
  }

  if (match.status !== "ready") {
    throw new Error("Can only set ready matches as next");
  }

  // Clear existing "next" match
  await db
    .update(tournamentMatches)
    .set({ isNextMatch: false })
    .where(eq(tournamentMatches.tournamentId, tournamentId));

  // Set new next match
  await db
    .update(tournamentMatches)
    .set({ isNextMatch: true })
    .where(eq(tournamentMatches.id, matchId));

  revalidatePath(`/tournaments/${tournamentId}`);
}

/**
 * Quick result recording - simplified interface for tournament matches.
 * Does NOT create match records. Only updates:
 * - Tournament bracket (winner, status)
 * - Player ELOs (flat calculation without score margin)
 * - Player tournament stats (matchesPlayed/Won, streaks, XP)
 */
export async function recordQuickResult(
  matchId: string,
  winnerId: string, // enrollment ID
  seriesScore: string // e.g., "2-0", "2-1", "3-0", "3-1", "3-2"
): Promise<void> {
  const session = await requireAdmin();

  // Get match with full details
  const match = await db.query.tournamentMatches.findFirst({
    where: eq(tournamentMatches.id, matchId),
    with: {
      round: true,
      tournament: true,
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
    },
  });

  if (!match) {
    throw new Error("Match not found");
  }

  if (match.status === "completed") {
    throw new Error("Match has already been completed");
  }

  if (!match.participant1 || !match.participant2) {
    throw new Error("Match participants not set");
  }

  // Resolve the effective bestOf for this match
  const effectiveBestOf = resolveBestOf({
    matchBestOf: match.bestOf,
    roundBestOf: match.round.bestOf,
    tournamentBestOf: match.tournament.bestOf,
  });

  // Validate series score against bestOf configuration
  if (!validateSeriesScore(seriesScore, effectiveBestOf)) {
    throw new Error(`Invalid series score "${seriesScore}" for Best of ${effectiveBestOf}`);
  }

  const isP1Winner = winnerId === match.participant1Id;
  const winner = isP1Winner ? match.participant1 : match.participant2;
  const loser = isP1Winner ? match.participant2 : match.participant1;

  // Apply flat ELO change (NO match records created)
  if (match.tournament.matchType === "singles") {
    const result = calculateFlatTournamentElo(
      winner.player.elo,
      loser.player.elo,
      match.eloMultiplier
    );

    // Update player ELOs and tournament stats
    await Promise.all([
      db
        .update(players)
        .set({
          elo: result.winnerNewElo,
          tournamentMatchesPlayed: winner.player.tournamentMatchesPlayed + 1,
          tournamentMatchesWon: winner.player.tournamentMatchesWon + 1,
          tournamentCurrentStreak: winner.player.tournamentCurrentStreak + 1,
          tournamentBestStreak: Math.max(winner.player.tournamentBestStreak, winner.player.tournamentCurrentStreak + 1),
          xp: winner.player.xp + calculateMatchXp(true, winner.player.tournamentCurrentStreak + 1),
          updatedAt: new Date(),
        })
        .where(eq(players.id, winner.playerId)),
      db
        .update(players)
        .set({
          elo: result.loserNewElo,
          tournamentMatchesPlayed: loser.player.tournamentMatchesPlayed + 1,
          tournamentCurrentStreak: 0,
          xp: loser.player.xp + calculateMatchXp(false, 0),
          updatedAt: new Date(),
        })
        .where(eq(players.id, loser.playerId)),
    ]);
  } else {
    // Doubles
    const winnerTeamElos: [number, number] = [
      winner.player.elo,
      winner.partner?.elo || winner.player.elo,
    ];
    const loserTeamElos: [number, number] = [
      loser.player.elo,
      loser.partner?.elo || loser.player.elo,
    ];

    const result = calculateFlatTournamentDoublesElo(
      winnerTeamElos,
      loserTeamElos,
      match.eloMultiplier
    );

    // Update all 4 players with tournament stats
    await Promise.all([
      // Winner team
      db
        .update(players)
        .set({
          elo: result.winnerNewElos[0],
          tournamentMatchesPlayed: winner.player.tournamentMatchesPlayed + 1,
          tournamentMatchesWon: winner.player.tournamentMatchesWon + 1,
          tournamentCurrentStreak: winner.player.tournamentCurrentStreak + 1,
          tournamentBestStreak: Math.max(winner.player.tournamentBestStreak, winner.player.tournamentCurrentStreak + 1),
          xp: winner.player.xp + calculateMatchXp(true, winner.player.tournamentCurrentStreak + 1),
          updatedAt: new Date(),
        })
        .where(eq(players.id, winner.playerId)),
      winner.partner &&
        db
          .update(players)
          .set({
            elo: result.winnerNewElos[1],
            tournamentMatchesPlayed: winner.partner.tournamentMatchesPlayed + 1,
            tournamentMatchesWon: winner.partner.tournamentMatchesWon + 1,
            tournamentCurrentStreak: winner.partner.tournamentCurrentStreak + 1,
            tournamentBestStreak: Math.max(winner.partner.tournamentBestStreak, winner.partner.tournamentCurrentStreak + 1),
            xp: winner.partner.xp + calculateMatchXp(true, winner.partner.tournamentCurrentStreak + 1),
            updatedAt: new Date(),
          })
          .where(eq(players.id, winner.partnerId!)),
      // Loser team
      db
        .update(players)
        .set({
          elo: result.loserNewElos[0],
          tournamentMatchesPlayed: loser.player.tournamentMatchesPlayed + 1,
          tournamentCurrentStreak: 0,
          xp: loser.player.xp + calculateMatchXp(false, 0),
          updatedAt: new Date(),
        })
        .where(eq(players.id, loser.playerId)),
      loser.partner &&
        db
          .update(players)
          .set({
            elo: result.loserNewElos[1],
            tournamentMatchesPlayed: loser.partner.tournamentMatchesPlayed + 1,
            tournamentCurrentStreak: 0,
            xp: loser.partner.xp + calculateMatchXp(false, 0),
            updatedAt: new Date(),
          })
          .where(eq(players.id, loser.partnerId!)),
    ].filter(Boolean));
  }

  // Update levels for all affected players
  await updatePlayerLevels([
    winner.playerId,
    loser.playerId,
    winner.partnerId,
    loser.partnerId,
  ].filter((id): id is string => !!id));

  // Check for new achievements
  const playerIdsForAchievements = [
    winner.playerId,
    loser.playerId,
    winner.partnerId,
    loser.partnerId,
  ].filter((id): id is string => !!id);

  await Promise.all(
    playerIdsForAchievements.map((playerId) => checkAndAwardAchievements(playerId))
  );

  // Update tournament match - NO linked match (quick result)
  await db
    .update(tournamentMatches)
    .set({
      winnerId,
      scores: null, // No detailed scores for quick result
      linkedMatchId: null, // No linked match record
      status: "completed",
      playedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(tournamentMatches.id, matchId));

  // Update Swiss points if applicable
  if (match.round.bracketType === "swiss_round") {
    // For quick results, we don't have detailed scores so pass empty array
    await updateSwissStats(match.tournamentId, winnerId, loser.id, []);
  }

  // Update group stats if applicable
  if (match.round.bracketType === "group") {
    await updateGroupStats(winnerId, loser.id, []);
  }

  // Advance winner to next match
  await advanceWinner(match.tournamentId, matchId, winnerId);

  // Check if tournament is complete
  await checkTournamentCompletion(match.tournamentId);

  // Auto-set next match
  await autoSetNextMatch(match.tournamentId);

  // Trigger real-time updates
  await pusherServer.trigger(getTournamentChannel(match.tournamentId), EVENTS.TOURNAMENT_MATCH_COMPLETED, {
    tournamentId: match.tournamentId,
    matchId,
    roundId: match.roundId,
    winnerId,
    loserId: loser.id,
    scores: `quick:${seriesScore}`,
  });

  revalidatePath(`/tournaments/${match.tournamentId}`);
  revalidatePath("/leaderboard");
}

/**
 * Set/override bestOf for a specific match (admin only)
 * This allows changing the bestOf for an individual match before recording
 */
export async function setMatchBestOf(
  matchId: string,
  bestOf: number
): Promise<void> {
  await requireAdmin();

  // Validate bestOf value
  if (!validateBestOf(bestOf)) {
    throw new Error("bestOf must be 1, 3, 5, or 7");
  }

  const match = await db.query.tournamentMatches.findFirst({
    where: eq(tournamentMatches.id, matchId),
  });

  if (!match) {
    throw new Error("Match not found");
  }

  if (match.status === "completed" || match.status === "walkover") {
    throw new Error("Cannot modify bestOf for completed matches");
  }

  await db
    .update(tournamentMatches)
    .set({
      bestOf,
      updatedAt: new Date(),
    })
    .where(eq(tournamentMatches.id, matchId));

  revalidatePath(`/tournaments/${match.tournamentId}`);
}

/**
 * Get the effective bestOf for a match (resolved from match → round → tournament)
 * Used by the UI to display the current bestOf configuration
 */
export async function getMatchEffectiveBestOf(matchId: string): Promise<number> {
  const session = await auth();
  if (!session?.user) {
    throw new Error("Unauthorized");
  }

  const match = await db.query.tournamentMatches.findFirst({
    where: eq(tournamentMatches.id, matchId),
    with: {
      round: true,
      tournament: true,
    },
  });

  if (!match) {
    throw new Error("Match not found");
  }

  return resolveBestOf({
    matchBestOf: match.bestOf,
    roundBestOf: match.round.bestOf,
    tournamentBestOf: match.tournament.bestOf,
  });
}
