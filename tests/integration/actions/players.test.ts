import { describe, it, expect, beforeEach } from 'vitest';
import {
  getPlayers,
  getLeaderboard,
  getPlayerById,
  getCurrentPlayer,
  updatePlayerName,
  getHotStreaks,
} from '@/actions/players';
import { createTestPlayer, createTestPlayers } from '../../setup/fixtures/players';
import { setMockUser, createMockUser } from '../../setup/mocks/auth';
import { getTestDb } from '../../setup/db';
import { players } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

describe('Player Server Actions', () => {
  describe('getPlayers', () => {
    it('should return empty array when no players', async () => {
      const result = await getPlayers();
      expect(result).toEqual([]);
    });

    it('should return all players', async () => {
      await createTestPlayers(3);

      const result = await getPlayers();
      expect(result.length).toBe(3);
    });

    it('should order players by ELO descending', async () => {
      await createTestPlayer({ displayName: 'Low', elo: 800 });
      await createTestPlayer({ displayName: 'High', elo: 1500 });
      await createTestPlayer({ displayName: 'Medium', elo: 1200 });

      const result = await getPlayers();

      expect(result[0].displayName).toBe('High');
      expect(result[1].displayName).toBe('Medium');
      expect(result[2].displayName).toBe('Low');
    });

    it('should include player stats', async () => {
      await createTestPlayer({
        displayName: 'Test Player',
        elo: 1200,
        matchesPlayed: 10,
        matchesWon: 6,
        currentStreak: 3,
      });

      const result = await getPlayers();

      expect(result[0].displayName).toBe('Test Player');
      expect(result[0].elo).toBe(1200);
      expect(result[0].matchesPlayed).toBe(10);
      expect(result[0].matchesWon).toBe(6);
      expect(result[0].currentStreak).toBe(3);
    });

    it('should include avatar URL from user', async () => {
      await createTestPlayer({
        displayName: 'Player',
        avatarUrl: 'https://example.com/avatar.png',
      });

      const result = await getPlayers();

      expect(result[0].avatarUrl).toBe('https://example.com/avatar.png');
    });
  });

  describe('getLeaderboard', () => {
    it('should return empty array when no players', async () => {
      const result = await getLeaderboard();
      expect(result).toEqual([]);
    });

    it('should return players with rank', async () => {
      await createTestPlayer({ displayName: 'First', elo: 1500 });
      await createTestPlayer({ displayName: 'Second', elo: 1400 });
      await createTestPlayer({ displayName: 'Third', elo: 1300 });

      const result = await getLeaderboard();

      expect(result[0].rank).toBe(1);
      expect(result[0].displayName).toBe('First');
      expect(result[1].rank).toBe(2);
      expect(result[1].displayName).toBe('Second');
      expect(result[2].rank).toBe(3);
      expect(result[2].displayName).toBe('Third');
    });

    it('should respect limit parameter', async () => {
      await createTestPlayers(10);

      const result = await getLeaderboard(5);

      expect(result.length).toBe(5);
    });

    it('should use default limit of 10', async () => {
      await createTestPlayers(15);

      const result = await getLeaderboard();

      expect(result.length).toBe(10);
    });

    it('should include relevant player fields', async () => {
      await createTestPlayer({
        displayName: 'Leader',
        elo: 2000,
        matchesWon: 50,
        matchesPlayed: 60,
        currentStreak: 10,
      });

      const result = await getLeaderboard(1);

      expect(result[0].displayName).toBe('Leader');
      expect(result[0].elo).toBe(2000);
      expect(result[0].matchesWon).toBe(50);
      expect(result[0].matchesPlayed).toBe(60);
      expect(result[0].currentStreak).toBe(10);
    });
  });

  describe('getPlayerById', () => {
    it('should return null for non-existent player', async () => {
      const nonExistentId = '00000000-0000-0000-0000-000000000000';
      const result = await getPlayerById(nonExistentId);
      expect(result).toBeNull();
    });

    it('should return player with all fields', async () => {
      const player = await createTestPlayer({
        displayName: 'Test Player',
        elo: 1300,
        matchesPlayed: 20,
        matchesWon: 15,
        currentStreak: 5,
        bestStreak: 8,
      });

      const result = await getPlayerById(player.playerId);

      expect(result).not.toBeNull();
      expect(result!.displayName).toBe('Test Player');
      expect(result!.elo).toBe(1300);
      expect(result!.matchesPlayed).toBe(20);
      expect(result!.matchesWon).toBe(15);
      expect(result!.currentStreak).toBe(5);
      expect(result!.bestStreak).toBe(8);
    });

    it('should include email from user', async () => {
      const player = await createTestPlayer({ email: 'test@example.com' });

      const result = await getPlayerById(player.playerId);

      expect(result!.email).toBe('test@example.com');
    });

    it('should include createdAt timestamp', async () => {
      const player = await createTestPlayer();

      const result = await getPlayerById(player.playerId);

      expect(result!.createdAt).toBeDefined();
      expect(result!.createdAt).toBeInstanceOf(Date);
    });
  });

  describe('getCurrentPlayer', () => {
    it('should return null when not authenticated', async () => {
      setMockUser(null);

      const result = await getCurrentPlayer();
      expect(result).toBeNull();
    });

    it('should return current player when authenticated', async () => {
      const player = await createTestPlayer({ displayName: 'Current User' });

      setMockUser(
        createMockUser({
          id: player.userId,
          playerId: player.playerId,
        })
      );

      const result = await getCurrentPlayer();

      expect(result).not.toBeNull();
      expect(result!.displayName).toBe('Current User');
      expect(result!.id).toBe(player.playerId);
    });

    it('should return all player details', async () => {
      const player = await createTestPlayer({
        displayName: 'Full Details',
        elo: 1400,
        xp: 500,
        matchesPlayed: 25,
      });

      setMockUser(
        createMockUser({
          id: player.userId,
          playerId: player.playerId,
        })
      );

      const result = await getCurrentPlayer();

      expect(result!.displayName).toBe('Full Details');
      expect(result!.elo).toBe(1400);
      expect(result!.xp).toBe(500);
      expect(result!.matchesPlayed).toBe(25);
    });
  });

  describe('updatePlayerName', () => {
    it('should reject unauthenticated requests', async () => {
      setMockUser(null);

      await expect(updatePlayerName('New Name')).rejects.toThrow('Not authenticated');
    });

    it('should update player display name', async () => {
      const db = await getTestDb();
      const player = await createTestPlayer({ displayName: 'Old Name' });

      setMockUser(
        createMockUser({
          id: player.userId,
          playerId: player.playerId,
        })
      );

      const result = await updatePlayerName('New Name');

      expect(result.success).toBe(true);

      const [updated] = await db.select().from(players).where(eq(players.id, player.playerId));
      expect(updated.displayName).toBe('New Name');
    });

    it('should update timestamp when name changes', async () => {
      const db = await getTestDb();
      const player = await createTestPlayer({ displayName: 'Original' });

      const [before] = await db.select().from(players).where(eq(players.id, player.playerId));
      const beforeTimestamp = before.updatedAt;

      // Wait to ensure timestamp differs
      await new Promise((resolve) => setTimeout(resolve, 10));

      setMockUser(
        createMockUser({
          id: player.userId,
          playerId: player.playerId,
        })
      );

      await updatePlayerName('Changed');

      const [after] = await db.select().from(players).where(eq(players.id, player.playerId));
      expect(after.updatedAt.getTime()).toBeGreaterThan(beforeTimestamp.getTime());
    });

    it('should allow empty display name', async () => {
      const db = await getTestDb();
      const player = await createTestPlayer({ displayName: 'Some Name' });

      setMockUser(
        createMockUser({
          id: player.userId,
          playerId: player.playerId,
        })
      );

      await updatePlayerName('');

      const [updated] = await db.select().from(players).where(eq(players.id, player.playerId));
      expect(updated.displayName).toBe('');
    });

    it('should allow special characters in name', async () => {
      const db = await getTestDb();
      const player = await createTestPlayer();

      setMockUser(
        createMockUser({
          id: player.userId,
          playerId: player.playerId,
        })
      );

      await updatePlayerName('Player™ #1 🏓');

      const [updated] = await db.select().from(players).where(eq(players.id, player.playerId));
      expect(updated.displayName).toBe('Player™ #1 🏓');
    });
  });

  describe('getHotStreaks', () => {
    it('should return empty array when no players have streaks', async () => {
      await createTestPlayer({ currentStreak: 0 });

      const result = await getHotStreaks();
      expect(result).toEqual([]);
    });

    it('should return players with positive streaks', async () => {
      await createTestPlayer({ displayName: 'Streak 1', currentStreak: 5 });
      await createTestPlayer({ displayName: 'Streak 2', currentStreak: 3 });
      await createTestPlayer({ displayName: 'No Streak', currentStreak: 0 });

      const result = await getHotStreaks();

      expect(result.length).toBe(2);
      expect(result.some((p) => p.displayName === 'Streak 1')).toBe(true);
      expect(result.some((p) => p.displayName === 'Streak 2')).toBe(true);
      expect(result.some((p) => p.displayName === 'No Streak')).toBe(false);
    });

    it('should order by streak descending', async () => {
      await createTestPlayer({ displayName: 'Medium', currentStreak: 3 });
      await createTestPlayer({ displayName: 'High', currentStreak: 10 });
      await createTestPlayer({ displayName: 'Low', currentStreak: 1 });

      const result = await getHotStreaks();

      expect(result[0].displayName).toBe('High');
      expect(result[0].currentStreak).toBe(10);
      expect(result[1].displayName).toBe('Medium');
      expect(result[2].displayName).toBe('Low');
    });

    it('should respect limit parameter', async () => {
      await createTestPlayers(10, { currentStreak: 5 });

      const result = await getHotStreaks(3);

      expect(result.length).toBe(3);
    });

    it('should use default limit of 5', async () => {
      await createTestPlayers(10, { currentStreak: 5 });

      const result = await getHotStreaks();

      expect(result.length).toBe(5);
    });

    it('should include relevant fields', async () => {
      await createTestPlayer({
        displayName: 'Hot Streak Player',
        elo: 1600,
        currentStreak: 7,
        matchesWon: 30,
      });

      const result = await getHotStreaks(1);

      expect(result[0].displayName).toBe('Hot Streak Player');
      expect(result[0].elo).toBe(1600);
      expect(result[0].currentStreak).toBe(7);
      expect(result[0].matchesWon).toBe(30);
    });
  });

  describe('Edge Cases', () => {
    it('should handle players with identical ELO', async () => {
      await createTestPlayer({ displayName: 'Player A', elo: 1000 });
      await createTestPlayer({ displayName: 'Player B', elo: 1000 });
      await createTestPlayer({ displayName: 'Player C', elo: 1000 });

      const result = await getPlayers();

      expect(result.length).toBe(3);
      // All should have same ELO
      expect(result.every((p) => p.elo === 1000)).toBe(true);
    });

    it('should handle players with very high ELO', async () => {
      await createTestPlayer({ displayName: 'Pro', elo: 3000 });

      const result = await getPlayers();

      expect(result[0].elo).toBe(3000);
    });

    it('should handle players with minimum ELO', async () => {
      await createTestPlayer({ displayName: 'Beginner', elo: 100 });

      const result = await getPlayers();

      expect(result[0].elo).toBe(100);
    });

    it('should handle long display names', async () => {
      const longName = 'A'.repeat(100);
      await createTestPlayer({ displayName: longName });

      const result = await getPlayers();

      expect(result[0].displayName).toBe(longName);
    });
  });
});
