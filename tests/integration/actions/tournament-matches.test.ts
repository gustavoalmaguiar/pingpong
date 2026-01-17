import { describe, it, expect, beforeEach } from 'vitest';
import { recordTournamentMatchResult, recordQuickResult } from '@/actions/tournament-matches';
import { startTournament } from '@/actions/tournament-bracket';
import { createTestPlayer, createTestAdmin } from '../../setup/fixtures/players';
import { createTestTournament, enrollPlayerInTournament } from '../../setup/fixtures/tournaments';
import { setMockUser, createMockAdminUser } from '../../setup/mocks/auth';
import { getTestDb } from '../../setup/db';
import { matches, players, tournamentMatches, tournaments } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

describe('Tournament Match Recording', () => {
  describe('recordTournamentMatchResult', () => {
    it('should create separate match records for each game in a Bo3 series', async () => {
      const db = await getTestDb();
      const admin = await createTestAdmin();
      const player1 = await createTestPlayer({ displayName: 'Player 1', elo: 1000 });
      const player2 = await createTestPlayer({ displayName: 'Player 2', elo: 1000 });

      setMockUser(
        createMockAdminUser({
          id: admin.userId,
          playerId: admin.playerId,
        })
      );

      // Create and setup tournament
      const { tournament } = await createTestTournament({
        name: 'Test Tournament',
        format: 'single_elimination',
        matchType: 'singles',
        status: 'enrollment',
        createdBy: admin.userId,
        bestOf: 3,
      });

      // Enroll both players
      const { enrollment: e1 } = await enrollPlayerInTournament({
        tournamentId: tournament.id,
        playerId: player1.playerId,
      });
      const { enrollment: e2 } = await enrollPlayerInTournament({
        tournamentId: tournament.id,
        playerId: player2.playerId,
      });

      // Start tournament to generate bracket
      await startTournament(tournament.id);

      // Get the first match
      const tournamentMatchesList = await db
        .select()
        .from(tournamentMatches)
        .where(eq(tournamentMatches.tournamentId, tournament.id));

      expect(tournamentMatchesList.length).toBeGreaterThan(0);
      const match = tournamentMatchesList[0];

      // Count matches before recording
      const matchesBefore = await db
        .select()
        .from(matches)
        .where(eq(matches.tournamentMatchId, match.id));
      const matchCountBefore = matchesBefore.length;

      // Record a 2-1 series with detailed scores [11-9, 8-11, 11-7]
      // Player 1 wins game 1 (11-9), Player 2 wins game 2 (11-8), Player 1 wins game 3 (11-7)
      await recordTournamentMatchResult(match.id, e1.id, [
        { p1: 11, p2: 9 },  // P1 wins
        { p1: 8, p2: 11 },  // P2 wins
        { p1: 11, p2: 7 },  // P1 wins
      ]);

      // Count matches after recording
      const matchesAfter = await db
        .select()
        .from(matches)
        .where(eq(matches.tournamentMatchId, match.id));

      // Should have created 3 match records (one for each game)
      expect(matchesAfter.length - matchCountBefore).toBe(3);

      // Verify each match has correct scores
      const gameMatches = matchesAfter.sort((a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );

      // Game 1: P1 wins 11-9
      expect(gameMatches[0].winnerId).toBe(player1.playerId);
      expect(gameMatches[0].loserId).toBe(player2.playerId);
      expect(gameMatches[0].winnerScore).toBe(11);
      expect(gameMatches[0].loserScore).toBe(9);

      // Game 2: P2 wins 11-8
      expect(gameMatches[1].winnerId).toBe(player2.playerId);
      expect(gameMatches[1].loserId).toBe(player1.playerId);
      expect(gameMatches[1].winnerScore).toBe(11);
      expect(gameMatches[1].loserScore).toBe(8);

      // Game 3: P1 wins 11-7
      expect(gameMatches[2].winnerId).toBe(player1.playerId);
      expect(gameMatches[2].loserId).toBe(player2.playerId);
      expect(gameMatches[2].winnerScore).toBe(11);
      expect(gameMatches[2].loserScore).toBe(7);
    });

    it('should update player tournament stats (not regular stats)', async () => {
      const db = await getTestDb();
      const admin = await createTestAdmin();
      const player1 = await createTestPlayer({
        displayName: 'Player 1',
        elo: 1000,
        matchesPlayed: 5,
        matchesWon: 3,
        tournamentMatchesPlayed: 0,
        tournamentMatchesWon: 0,
      });
      const player2 = await createTestPlayer({
        displayName: 'Player 2',
        elo: 1000,
        matchesPlayed: 5,
        matchesWon: 2,
        tournamentMatchesPlayed: 0,
        tournamentMatchesWon: 0,
      });

      setMockUser(
        createMockAdminUser({
          id: admin.userId,
          playerId: admin.playerId,
        })
      );

      const { tournament } = await createTestTournament({
        name: 'Stats Test Tournament',
        format: 'single_elimination',
        matchType: 'singles',
        status: 'enrollment',
        createdBy: admin.userId,
        bestOf: 1,
      });

      await enrollPlayerInTournament({
        tournamentId: tournament.id,
        playerId: player1.playerId,
      });
      const { enrollment: e2 } = await enrollPlayerInTournament({
        tournamentId: tournament.id,
        playerId: player2.playerId,
      });

      await startTournament(tournament.id);

      const tournamentMatchesList = await db
        .select()
        .from(tournamentMatches)
        .where(eq(tournamentMatches.tournamentId, tournament.id));

      const match = tournamentMatchesList[0];

      // Record result - P2 wins
      await recordTournamentMatchResult(match.id, e2.id, [
        { p1: 7, p2: 11 },
      ]);

      // Get updated player stats
      const [updatedP1] = await db
        .select()
        .from(players)
        .where(eq(players.id, player1.playerId));
      const [updatedP2] = await db
        .select()
        .from(players)
        .where(eq(players.id, player2.playerId));

      // Regular match stats should NOT change
      expect(updatedP1.matchesPlayed).toBe(5); // Unchanged
      expect(updatedP1.matchesWon).toBe(3); // Unchanged
      expect(updatedP2.matchesPlayed).toBe(5); // Unchanged
      expect(updatedP2.matchesWon).toBe(2); // Unchanged

      // Tournament stats SHOULD change
      expect(updatedP1.tournamentMatchesPlayed).toBe(1);
      expect(updatedP1.tournamentMatchesWon).toBe(0); // Lost
      expect(updatedP2.tournamentMatchesPlayed).toBe(1);
      expect(updatedP2.tournamentMatchesWon).toBe(1); // Won
    });

    it('should calculate ELO per-game and sum changes', async () => {
      const db = await getTestDb();
      const admin = await createTestAdmin();
      const player1 = await createTestPlayer({ displayName: 'Player 1', elo: 1000 });
      const player2 = await createTestPlayer({ displayName: 'Player 2', elo: 1000 });

      setMockUser(
        createMockAdminUser({
          id: admin.userId,
          playerId: admin.playerId,
        })
      );

      const { tournament } = await createTestTournament({
        name: 'ELO Test Tournament',
        format: 'single_elimination',
        matchType: 'singles',
        status: 'enrollment',
        createdBy: admin.userId,
        bestOf: 3,
        eloMultiplierBase: 100, // 1x for easier calculation
      });

      const { enrollment: e1 } = await enrollPlayerInTournament({
        tournamentId: tournament.id,
        playerId: player1.playerId,
      });
      await enrollPlayerInTournament({
        tournamentId: tournament.id,
        playerId: player2.playerId,
      });

      await startTournament(tournament.id);

      const tournamentMatchesList = await db
        .select()
        .from(tournamentMatches)
        .where(eq(tournamentMatches.tournamentId, tournament.id));

      const match = tournamentMatchesList[0];

      // Record a 2-0 sweep
      await recordTournamentMatchResult(match.id, e1.id, [
        { p1: 11, p2: 5 },
        { p1: 11, p2: 8 },
      ]);

      // Get updated ELOs
      const [updatedP1] = await db
        .select()
        .from(players)
        .where(eq(players.id, player1.playerId));
      const [updatedP2] = await db
        .select()
        .from(players)
        .where(eq(players.id, player2.playerId));

      // P1 won both games, so should have gained ELO
      expect(updatedP1.elo).toBeGreaterThan(1000);
      // P2 lost both games, so should have lost ELO
      expect(updatedP2.elo).toBeLessThan(1000);

      // The changes should be symmetric (what P1 gained = what P2 lost)
      const p1Gain = updatedP1.elo - 1000;
      const p2Loss = 1000 - updatedP2.elo;
      expect(p1Gain).toBe(p2Loss);
    });
  });

  describe('recordQuickResult', () => {
    it('should NOT create any match records', async () => {
      const db = await getTestDb();
      const admin = await createTestAdmin();
      const player1 = await createTestPlayer({ displayName: 'Player 1', elo: 1000 });
      const player2 = await createTestPlayer({ displayName: 'Player 2', elo: 1000 });

      setMockUser(
        createMockAdminUser({
          id: admin.userId,
          playerId: admin.playerId,
        })
      );

      const { tournament } = await createTestTournament({
        name: 'Quick Result Tournament',
        format: 'single_elimination',
        matchType: 'singles',
        status: 'enrollment',
        createdBy: admin.userId,
        bestOf: 3,
      });

      const { enrollment: e1 } = await enrollPlayerInTournament({
        tournamentId: tournament.id,
        playerId: player1.playerId,
      });
      await enrollPlayerInTournament({
        tournamentId: tournament.id,
        playerId: player2.playerId,
      });

      await startTournament(tournament.id);

      const tournamentMatchesList = await db
        .select()
        .from(tournamentMatches)
        .where(eq(tournamentMatches.tournamentId, tournament.id));

      const match = tournamentMatchesList[0];

      // Count all matches before
      const matchesBefore = await db
        .select()
        .from(matches)
        .where(eq(matches.tournamentMatchId, match.id));
      const matchCountBefore = matchesBefore.length;

      // Record quick result (2-1 series score)
      await recordQuickResult(match.id, e1.id, '2-1');

      // Count matches after - should be same (no new matches created)
      const matchesAfter = await db
        .select()
        .from(matches)
        .where(eq(matches.tournamentMatchId, match.id));

      expect(matchesAfter.length).toBe(matchCountBefore);
    });

    it('should still update player ELOs with flat calculation', async () => {
      const db = await getTestDb();
      const admin = await createTestAdmin();
      const player1 = await createTestPlayer({ displayName: 'Player 1', elo: 1000 });
      const player2 = await createTestPlayer({ displayName: 'Player 2', elo: 1000 });

      setMockUser(
        createMockAdminUser({
          id: admin.userId,
          playerId: admin.playerId,
        })
      );

      const { tournament } = await createTestTournament({
        name: 'ELO Quick Result Tournament',
        format: 'single_elimination',
        matchType: 'singles',
        status: 'enrollment',
        createdBy: admin.userId,
        bestOf: 3,
        eloMultiplierBase: 100, // 1x for easier calculation
        eloMultiplierFinals: 100, // 2-player tournament's first match is finals
      });

      const { enrollment: e1 } = await enrollPlayerInTournament({
        tournamentId: tournament.id,
        playerId: player1.playerId,
      });
      await enrollPlayerInTournament({
        tournamentId: tournament.id,
        playerId: player2.playerId,
      });

      await startTournament(tournament.id);

      const tournamentMatchesList = await db
        .select()
        .from(tournamentMatches)
        .where(eq(tournamentMatches.tournamentId, tournament.id));

      const match = tournamentMatchesList[0];

      await recordQuickResult(match.id, e1.id, '2-0');

      // Get updated ELOs
      const [updatedP1] = await db
        .select()
        .from(players)
        .where(eq(players.id, player1.playerId));
      const [updatedP2] = await db
        .select()
        .from(players)
        .where(eq(players.id, player2.playerId));

      // ELOs should have changed
      expect(updatedP1.elo).toBeGreaterThan(1000);
      expect(updatedP2.elo).toBeLessThan(1000);

      // Flat ELO change (no score margin) for equal ELOs at 100% = 16
      // Winner gains 16, loser loses 16
      expect(updatedP1.elo).toBe(1016);
      expect(updatedP2.elo).toBe(984);
    });

    it('should advance winner in bracket', async () => {
      const db = await getTestDb();
      const admin = await createTestAdmin();
      const player1 = await createTestPlayer({ displayName: 'Player 1', elo: 1000 });
      const player2 = await createTestPlayer({ displayName: 'Player 2', elo: 1000 });

      setMockUser(
        createMockAdminUser({
          id: admin.userId,
          playerId: admin.playerId,
        })
      );

      const { tournament } = await createTestTournament({
        name: 'Bracket Advancement Tournament',
        format: 'single_elimination',
        matchType: 'singles',
        status: 'enrollment',
        createdBy: admin.userId,
        bestOf: 3,
      });

      const { enrollment: e1 } = await enrollPlayerInTournament({
        tournamentId: tournament.id,
        playerId: player1.playerId,
      });
      await enrollPlayerInTournament({
        tournamentId: tournament.id,
        playerId: player2.playerId,
      });

      await startTournament(tournament.id);

      const tournamentMatchesList = await db
        .select()
        .from(tournamentMatches)
        .where(eq(tournamentMatches.tournamentId, tournament.id));

      const match = tournamentMatchesList[0];

      await recordQuickResult(match.id, e1.id, '2-1');

      // Check the tournament match was updated
      const [updatedMatch] = await db
        .select()
        .from(tournamentMatches)
        .where(eq(tournamentMatches.id, match.id));

      expect(updatedMatch.status).toBe('completed');
      expect(updatedMatch.winnerId).toBe(e1.id);
      expect(updatedMatch.linkedMatchId).toBeNull(); // No linked match for quick result
    });

    it('should update player tournament stats', async () => {
      const db = await getTestDb();
      const admin = await createTestAdmin();
      const player1 = await createTestPlayer({
        displayName: 'Player 1',
        elo: 1000,
        tournamentMatchesPlayed: 0,
        tournamentMatchesWon: 0,
        tournamentCurrentStreak: 0,
      });
      const player2 = await createTestPlayer({
        displayName: 'Player 2',
        elo: 1000,
        tournamentMatchesPlayed: 0,
        tournamentMatchesWon: 0,
        tournamentCurrentStreak: 0,
      });

      setMockUser(
        createMockAdminUser({
          id: admin.userId,
          playerId: admin.playerId,
        })
      );

      const { tournament } = await createTestTournament({
        name: 'Stats Quick Result Tournament',
        format: 'single_elimination',
        matchType: 'singles',
        status: 'enrollment',
        createdBy: admin.userId,
        bestOf: 1,
      });

      const { enrollment: e1 } = await enrollPlayerInTournament({
        tournamentId: tournament.id,
        playerId: player1.playerId,
      });
      await enrollPlayerInTournament({
        tournamentId: tournament.id,
        playerId: player2.playerId,
      });

      await startTournament(tournament.id);

      const tournamentMatchesList = await db
        .select()
        .from(tournamentMatches)
        .where(eq(tournamentMatches.tournamentId, tournament.id));

      const match = tournamentMatchesList[0];

      await recordQuickResult(match.id, e1.id, '1-0');

      // Get updated stats
      const [updatedP1] = await db
        .select()
        .from(players)
        .where(eq(players.id, player1.playerId));
      const [updatedP2] = await db
        .select()
        .from(players)
        .where(eq(players.id, player2.playerId));

      // Tournament stats should be updated
      expect(updatedP1.tournamentMatchesPlayed).toBe(1);
      expect(updatedP1.tournamentMatchesWon).toBe(1);
      expect(updatedP1.tournamentCurrentStreak).toBe(1);

      expect(updatedP2.tournamentMatchesPlayed).toBe(1);
      expect(updatedP2.tournamentMatchesWon).toBe(0);
      expect(updatedP2.tournamentCurrentStreak).toBe(0);
    });
  });
});
