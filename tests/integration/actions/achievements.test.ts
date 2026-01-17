import { describe, it, expect, beforeEach } from 'vitest';
import { checkAndAwardAchievements, getPlayerAchievements, seedAchievements } from '@/actions/achievements';
import { logSinglesMatch } from '@/actions/matches';
import { createTestPlayer, createTestPlayers } from '../../setup/fixtures/players';
import { setMockUser, createMockUser } from '../../setup/mocks/auth';
import { getTestDb } from '../../setup/db';
import { players, achievements, playerAchievements } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

describe('Achievement Server Actions', () => {
  describe('checkAndAwardAchievements', () => {
    it('should award first_win achievement after first win', async () => {
      const db = await getTestDb();
      const winner = await createTestPlayer({ matchesWon: 0 });
      const loser = await createTestPlayer();

      setMockUser(
        createMockUser({
          id: winner.userId,
          playerId: winner.playerId,
        })
      );

      // Log a match to trigger achievement check
      await logSinglesMatch({
        winnerId: winner.playerId,
        loserId: loser.playerId,
        winnerScore: 11,
        loserScore: 0,
      });

      // Check achievements were awarded
      const earned = await getPlayerAchievements(winner.playerId);
      const firstWin = earned.find((e) => e.achievement?.key === 'first_win');

      expect(firstWin).toBeDefined();
    });

    it('should award streak_3 achievement for 3 consecutive wins', async () => {
      const db = await getTestDb();
      const winner = await createTestPlayer({ currentStreak: 2, bestStreak: 2 });
      const loser = await createTestPlayer();

      setMockUser(
        createMockUser({
          id: winner.userId,
          playerId: winner.playerId,
        })
      );

      // Log a match to get 3rd consecutive win
      await logSinglesMatch({
        winnerId: winner.playerId,
        loserId: loser.playerId,
        winnerScore: 11,
        loserScore: 0,
      });

      const earned = await getPlayerAchievements(winner.playerId);
      const streak3 = earned.find((e) => e.achievement?.key === 'streak_3');

      expect(streak3).toBeDefined();
    });

    it('should award ELO achievement when reaching threshold', async () => {
      const db = await getTestDb();
      const winner = await createTestPlayer({ elo: 1095 }); // Just below 1100
      const loser = await createTestPlayer({ elo: 1200 }); // Higher ELO for bigger gain

      setMockUser(
        createMockUser({
          id: winner.userId,
          playerId: winner.playerId,
        })
      );

      await logSinglesMatch({
        winnerId: winner.playerId,
        loserId: loser.playerId,
        winnerScore: 11,
        loserScore: 0,
      });

      // Verify ELO increased past 1100
      const [updatedWinner] = await db.select().from(players).where(eq(players.id, winner.playerId));
      expect(updatedWinner.elo).toBeGreaterThanOrEqual(1100);

      const earned = await getPlayerAchievements(winner.playerId);
      const elo1100 = earned.find((e) => e.achievement?.key === 'elo_1100');

      expect(elo1100).toBeDefined();
    });

    it('should not award already earned achievements', async () => {
      const db = await getTestDb();
      const winner = await createTestPlayer({ matchesWon: 0 });
      const loser = await createTestPlayer();

      setMockUser(
        createMockUser({
          id: winner.userId,
          playerId: winner.playerId,
        })
      );

      // Log two matches
      await logSinglesMatch({
        winnerId: winner.playerId,
        loserId: loser.playerId,
        winnerScore: 11,
        loserScore: 0,
      });

      await logSinglesMatch({
        winnerId: winner.playerId,
        loserId: loser.playerId,
        winnerScore: 11,
        loserScore: 0,
      });

      // Check that first_win was only awarded once
      const earned = await getPlayerAchievements(winner.playerId);
      const firstWinCount = earned.filter((e) => e.achievement?.key === 'first_win').length;

      expect(firstWinCount).toBe(1);
    });

    it('should include tournament stats in check', async () => {
      const db = await getTestDb();

      // Create a player with tournament stats
      const player = await createTestPlayer({
        tournamentMatchesPlayed: 1,
        tournamentMatchesWon: 1,
        tournamentsPlayed: 0,
        tournamentsWon: 0,
      });

      // Manually seed achievements if needed
      await seedAchievements();

      // Run achievement check
      const awarded = await checkAndAwardAchievements(player.playerId);

      // Should have tournament_first_match and tournament_first_win
      const tournamentFirstMatch = awarded.find((a) => a.key === 'tournament_first_match');
      const tournamentFirstWin = awarded.find((a) => a.key === 'tournament_first_win');

      expect(tournamentFirstMatch).toBeDefined();
      expect(tournamentFirstWin).toBeDefined();
    });
  });

  describe('Tournament Achievement Integration', () => {
    it('should award tournament_champion when winning a tournament', async () => {
      const db = await getTestDb();

      // Create a player with tournament win
      const champion = await createTestPlayer({
        tournamentsPlayed: 1,
        tournamentsWon: 1,
        tournamentMatchesPlayed: 3,
        tournamentMatchesWon: 3,
      });

      await seedAchievements();
      const awarded = await checkAndAwardAchievements(champion.playerId);

      const championAchievement = awarded.find((a) => a.key === 'tournament_champion');
      expect(championAchievement).toBeDefined();
    });

    it('should not award tournament achievements for regular match wins', async () => {
      const db = await getTestDb();
      const winner = await createTestPlayer({
        matchesWon: 10,
        tournamentMatchesWon: 0,
      });
      const loser = await createTestPlayer();

      setMockUser(
        createMockUser({
          id: winner.userId,
          playerId: winner.playerId,
        })
      );

      await logSinglesMatch({
        winnerId: winner.playerId,
        loserId: loser.playerId,
        winnerScore: 11,
        loserScore: 0,
      });

      const earned = await getPlayerAchievements(winner.playerId);

      // Should have regular wins_10 but not tournament achievements
      const wins10 = earned.find((e) => e.achievement?.key === 'wins_10');
      const tournamentWins10 = earned.find((e) => e.achievement?.key === 'tournament_wins_10');

      expect(wins10).toBeDefined();
      expect(tournamentWins10).toBeUndefined();
    });

    it('should award tournament_played_5 when participating in 5 tournaments', async () => {
      const db = await getTestDb();

      const player = await createTestPlayer({
        tournamentsPlayed: 5,
        tournamentsWon: 0,
      });

      await seedAchievements();
      const awarded = await checkAndAwardAchievements(player.playerId);

      const tournamentRegular = awarded.find((a) => a.key === 'tournament_played_5');
      expect(tournamentRegular).toBeDefined();
    });
  });

  describe('Stats Separation', () => {
    it('should keep regular match stats separate from tournament stats', async () => {
      const db = await getTestDb();
      const winner = await createTestPlayer({
        matchesPlayed: 0,
        matchesWon: 0,
        tournamentMatchesPlayed: 5,
        tournamentMatchesWon: 3,
      });
      const loser = await createTestPlayer();

      setMockUser(
        createMockUser({
          id: winner.userId,
          playerId: winner.playerId,
        })
      );

      // Log a regular match
      await logSinglesMatch({
        winnerId: winner.playerId,
        loserId: loser.playerId,
        winnerScore: 11,
        loserScore: 0,
      });

      // Verify regular stats updated but tournament stats unchanged
      const [updated] = await db.select().from(players).where(eq(players.id, winner.playerId));

      expect(updated.matchesPlayed).toBe(1);
      expect(updated.matchesWon).toBe(1);
      expect(updated.tournamentMatchesPlayed).toBe(5); // Unchanged
      expect(updated.tournamentMatchesWon).toBe(3); // Unchanged
    });
  });
});
