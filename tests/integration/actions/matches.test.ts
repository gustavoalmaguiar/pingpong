import { describe, it, expect, beforeEach } from 'vitest';
import { logSinglesMatch, logDoublesMatch, getRecentMatches } from '@/actions/matches';
import { createTestPlayer, createTestPlayers } from '../../setup/fixtures/players';
import { setMockUser, createMockUser } from '../../setup/mocks/auth';
import { getTestDb } from '../../setup/db';
import { players, matches } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { getTriggeredEvents } from '../../setup/mocks/pusher';

describe('Match Server Actions', () => {
  describe('logSinglesMatch', () => {
    it('should log a valid singles match', async () => {
      const db = await getTestDb();
      const winner = await createTestPlayer({ displayName: 'Winner', elo: 1000 });
      const loser = await createTestPlayer({ displayName: 'Loser', elo: 1000 });

      setMockUser(
        createMockUser({
          id: winner.userId,
          playerId: winner.playerId,
        })
      );

      const result = await logSinglesMatch({
        winnerId: winner.playerId,
        loserId: loser.playerId,
        winnerScore: 11,
        loserScore: 9,
      });

      expect(result.success).toBe(true);
      expect(result.eloChange).toBe(16); // Equal ELO players
      expect(result.match).toBeDefined();
      expect(result.match.type).toBe('singles');
    });

    it('should update player stats correctly after match', async () => {
      const db = await getTestDb();
      const winner = await createTestPlayer({ displayName: 'Winner', elo: 1000 });
      const loser = await createTestPlayer({ displayName: 'Loser', elo: 1000 });

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

      // Verify winner stats updated
      const [updatedWinner] = await db.select().from(players).where(eq(players.id, winner.playerId));
      expect(updatedWinner.elo).toBe(1016);
      expect(updatedWinner.matchesWon).toBe(1);
      expect(updatedWinner.matchesPlayed).toBe(1);
      expect(updatedWinner.currentStreak).toBe(1);

      // Verify loser stats updated
      const [updatedLoser] = await db.select().from(players).where(eq(players.id, loser.playerId));
      expect(updatedLoser.elo).toBe(984);
      expect(updatedLoser.matchesPlayed).toBe(1);
      expect(updatedLoser.matchesWon).toBe(0);
      expect(updatedLoser.currentStreak).toBe(0);
    });

    it('should reject unauthenticated requests', async () => {
      const winner = await createTestPlayer();
      const loser = await createTestPlayer();

      // No mock user set - simulating unauthenticated
      setMockUser(null);

      await expect(
        logSinglesMatch({
          winnerId: winner.playerId,
          loserId: loser.playerId,
          winnerScore: 11,
          loserScore: 0,
        })
      ).rejects.toThrow('Not authenticated');
    });

    it('should validate score - winner must have 11 points minimum', async () => {
      const winner = await createTestPlayer();
      const loser = await createTestPlayer();

      setMockUser(
        createMockUser({
          id: winner.userId,
          playerId: winner.playerId,
        })
      );

      await expect(
        logSinglesMatch({
          winnerId: winner.playerId,
          loserId: loser.playerId,
          winnerScore: 10,
          loserScore: 8,
        })
      ).rejects.toThrow('Winner must have 11 points or win by 2 in deuce');
    });

    it('should allow standard 11 point win', async () => {
      const winner = await createTestPlayer();
      const loser = await createTestPlayer();

      setMockUser(
        createMockUser({
          id: winner.userId,
          playerId: winner.playerId,
        })
      );

      const result = await logSinglesMatch({
        winnerId: winner.playerId,
        loserId: loser.playerId,
        winnerScore: 11,
        loserScore: 9,
      });

      expect(result.success).toBe(true);
    });

    it('should reject scores greater than 11', async () => {
      // Current implementation doesn't allow deuce scores > 11
      const winner = await createTestPlayer();
      const loser = await createTestPlayer();

      setMockUser(
        createMockUser({
          id: winner.userId,
          playerId: winner.playerId,
        })
      );

      await expect(
        logSinglesMatch({
          winnerId: winner.playerId,
          loserId: loser.playerId,
          winnerScore: 13,
          loserScore: 11,
        })
      ).rejects.toThrow('Invalid score');
    });

    it('should reject when loser score is higher', async () => {
      const winner = await createTestPlayer();
      const loser = await createTestPlayer();

      setMockUser(
        createMockUser({
          id: winner.userId,
          playerId: winner.playerId,
        })
      );

      await expect(
        logSinglesMatch({
          winnerId: winner.playerId,
          loserId: loser.playerId,
          winnerScore: 8,
          loserScore: 11,
        })
      ).rejects.toThrow();
    });

    it('should track streak correctly', async () => {
      const db = await getTestDb();
      const winner = await createTestPlayer({ currentStreak: 5, bestStreak: 5 });
      const loser = await createTestPlayer({ currentStreak: 3 });

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

      const [updatedWinner] = await db.select().from(players).where(eq(players.id, winner.playerId));
      expect(updatedWinner.currentStreak).toBe(6);
      expect(updatedWinner.bestStreak).toBe(6);

      const [updatedLoser] = await db.select().from(players).where(eq(players.id, loser.playerId));
      expect(updatedLoser.currentStreak).toBe(0); // Reset on loss
    });

    it('should award XP to both players', async () => {
      const db = await getTestDb();
      const winner = await createTestPlayer({ xp: 0 });
      const loser = await createTestPlayer({ xp: 0 });

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

      const [updatedWinner] = await db.select().from(players).where(eq(players.id, winner.playerId));
      // Win XP = 25 + (5 * 1 streak) = 30
      expect(updatedWinner.xp).toBeGreaterThan(0);

      const [updatedLoser] = await db.select().from(players).where(eq(players.id, loser.playerId));
      // Loss XP = 10
      expect(updatedLoser.xp).toBe(10);
    });

    it('should trigger real-time events', async () => {
      const winner = await createTestPlayer();
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

      const events = getTriggeredEvents();
      const matchEvent = events.find((e) => e.event === 'match:created');
      const leaderboardEvent = events.find((e) => e.event === 'leaderboard:update');

      expect(matchEvent).toBeDefined();
      expect(leaderboardEvent).toBeDefined();
    });

    it('should reject invalid negative scores', async () => {
      const winner = await createTestPlayer();
      const loser = await createTestPlayer();

      setMockUser(
        createMockUser({
          id: winner.userId,
          playerId: winner.playerId,
        })
      );

      await expect(
        logSinglesMatch({
          winnerId: winner.playerId,
          loserId: loser.playerId,
          winnerScore: -1,
          loserScore: 0,
        })
      ).rejects.toThrow('Invalid score');
    });

    it('should reject player not found', async () => {
      const winner = await createTestPlayer();

      setMockUser(
        createMockUser({
          id: winner.userId,
          playerId: winner.playerId,
        })
      );

      // Use a valid UUID that doesn't exist in the database
      const nonExistentId = '00000000-0000-0000-0000-000000000000';

      await expect(
        logSinglesMatch({
          winnerId: winner.playerId,
          loserId: nonExistentId,
          winnerScore: 11,
          loserScore: 0,
        })
      ).rejects.toThrow('Player not found');
    });
  });

  describe('logDoublesMatch', () => {
    it('should log a valid doubles match', async () => {
      // Create all players with the same ELO for predictable calculations
      const w1 = await createTestPlayer({ elo: 1000 });
      const w2 = await createTestPlayer({ elo: 1000 });
      const l1 = await createTestPlayer({ elo: 1000 });
      const l2 = await createTestPlayer({ elo: 1000 });

      setMockUser(
        createMockUser({
          id: w1.userId,
          playerId: w1.playerId,
        })
      );

      const result = await logDoublesMatch({
        winnerTeam: [w1.playerId, w2.playerId],
        loserTeam: [l1.playerId, l2.playerId],
        winnerScore: 11,
        loserScore: 5,
      });

      expect(result.success).toBe(true);
      // Doubles applies 75% factor: 16 * 0.75 = 12
      expect(result.eloChange).toBe(12);
    });

    it('should update all four players', async () => {
      const db = await getTestDb();
      // Create all players with the same ELO
      const w1 = await createTestPlayer({ elo: 1000 });
      const w2 = await createTestPlayer({ elo: 1000 });
      const l1 = await createTestPlayer({ elo: 1000 });
      const l2 = await createTestPlayer({ elo: 1000 });

      setMockUser(
        createMockUser({
          id: w1.userId,
          playerId: w1.playerId,
        })
      );

      await logDoublesMatch({
        winnerTeam: [w1.playerId, w2.playerId],
        loserTeam: [l1.playerId, l2.playerId],
        winnerScore: 11,
        loserScore: 5,
      });

      // Check winners - should gain 12 ELO each (75% of 16)
      const [updatedW1] = await db.select().from(players).where(eq(players.id, w1.playerId));
      const [updatedW2] = await db.select().from(players).where(eq(players.id, w2.playerId));
      expect(updatedW1.elo).toBe(1012);
      expect(updatedW2.elo).toBe(1012);

      // Check losers - should lose 12 ELO each
      const [updatedL1] = await db.select().from(players).where(eq(players.id, l1.playerId));
      const [updatedL2] = await db.select().from(players).where(eq(players.id, l2.playerId));
      expect(updatedL1.elo).toBe(988);
      expect(updatedL2.elo).toBe(988);
    });

    it('should reject duplicate players across teams', async () => {
      const testPlayers = await createTestPlayers(3);
      const [p1, p2, p3] = testPlayers;

      setMockUser(
        createMockUser({
          id: p1.userId,
          playerId: p1.playerId,
        })
      );

      await expect(
        logDoublesMatch({
          winnerTeam: [p1.playerId, p2.playerId],
          loserTeam: [p2.playerId, p3.playerId], // p2 is on both teams
          winnerScore: 11,
          loserScore: 5,
        })
      ).rejects.toThrow('All players must be different');
    });

    it('should reject same player on same team', async () => {
      const testPlayers = await createTestPlayers(3);
      const [p1, p2, p3] = testPlayers;

      setMockUser(
        createMockUser({
          id: p1.userId,
          playerId: p1.playerId,
        })
      );

      await expect(
        logDoublesMatch({
          winnerTeam: [p1.playerId, p1.playerId], // p1 twice
          loserTeam: [p2.playerId, p3.playerId],
          winnerScore: 11,
          loserScore: 5,
        })
      ).rejects.toThrow('All players must be different');
    });

    it('should validate scores same as singles', async () => {
      const testPlayers = await createTestPlayers(4);
      const [w1, w2, l1, l2] = testPlayers;

      setMockUser(
        createMockUser({
          id: w1.userId,
          playerId: w1.playerId,
        })
      );

      await expect(
        logDoublesMatch({
          winnerTeam: [w1.playerId, w2.playerId],
          loserTeam: [l1.playerId, l2.playerId],
          winnerScore: 10,
          loserScore: 8,
        })
      ).rejects.toThrow('Winner must have 11 points or win by 2 in deuce');
    });

    it('should trigger real-time events for doubles', async () => {
      const testPlayers = await createTestPlayers(4);
      const [w1, w2, l1, l2] = testPlayers;

      setMockUser(
        createMockUser({
          id: w1.userId,
          playerId: w1.playerId,
        })
      );

      await logDoublesMatch({
        winnerTeam: [w1.playerId, w2.playerId],
        loserTeam: [l1.playerId, l2.playerId],
        winnerScore: 11,
        loserScore: 5,
      });

      const events = getTriggeredEvents();
      const matchEvent = events.find((e) => e.event === 'match:created');

      expect(matchEvent).toBeDefined();
      expect((matchEvent?.data as any).type).toBe('doubles');
    });
  });

  describe('getRecentMatches', () => {
    it('should return empty array when no matches', async () => {
      const result = await getRecentMatches();
      expect(result).toEqual([]);
    });

    it('should return matches with player details', async () => {
      const winner = await createTestPlayer({ displayName: 'Winner' });
      const loser = await createTestPlayer({ displayName: 'Loser' });

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
        loserScore: 5,
      });

      const result = await getRecentMatches();

      expect(result.length).toBe(1);
      expect(result[0].type).toBe('singles');
      expect(result[0].winner?.displayName).toBe('Winner');
      expect(result[0].loser?.displayName).toBe('Loser');
    });

    it('should respect limit parameter', async () => {
      const player1 = await createTestPlayer();
      const player2 = await createTestPlayer();

      setMockUser(
        createMockUser({
          id: player1.userId,
          playerId: player1.playerId,
        })
      );

      // Log 5 matches
      for (let i = 0; i < 5; i++) {
        await logSinglesMatch({
          winnerId: player1.playerId,
          loserId: player2.playerId,
          winnerScore: 11,
          loserScore: i,
        });
      }

      const result = await getRecentMatches(3);
      expect(result.length).toBe(3);
    });
  });
});
