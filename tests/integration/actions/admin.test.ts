import { describe, it, expect, beforeEach } from 'vitest';
import {
  getAdminStats,
  getAllPlayersAdmin,
  updatePlayerStats,
  getAllMatchesAdmin,
  deleteMatch,
  toggleAdminStatus,
} from '@/actions/admin';
import { logSinglesMatch } from '@/actions/matches';
import { createTestPlayer, createTestAdmin, createTestPlayers } from '../../setup/fixtures/players';
import { setMockUser, createMockUser, createMockAdminUser } from '../../setup/mocks/auth';
import { getTestDb } from '../../setup/db';
import { players, matches, users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

describe('Admin Server Actions', () => {
  describe('Authorization', () => {
    it('should reject non-admin for getAdminStats', async () => {
      const player = await createTestPlayer();

      setMockUser(
        createMockUser({
          id: player.userId,
          playerId: player.playerId,
        })
      );

      await expect(getAdminStats()).rejects.toThrow('Unauthorized: Admin access required');
    });

    it('should reject non-admin for getAllPlayersAdmin', async () => {
      const player = await createTestPlayer();

      setMockUser(
        createMockUser({
          id: player.userId,
          playerId: player.playerId,
        })
      );

      await expect(getAllPlayersAdmin()).rejects.toThrow('Unauthorized: Admin access required');
    });

    it('should reject non-admin for updatePlayerStats', async () => {
      const player = await createTestPlayer();

      setMockUser(
        createMockUser({
          id: player.userId,
          playerId: player.playerId,
        })
      );

      await expect(updatePlayerStats('any', { elo: 1500 })).rejects.toThrow(
        'Unauthorized: Admin access required'
      );
    });

    it('should reject non-admin for deleteMatch', async () => {
      const player = await createTestPlayer();

      setMockUser(
        createMockUser({
          id: player.userId,
          playerId: player.playerId,
        })
      );

      await expect(deleteMatch('any')).rejects.toThrow('Unauthorized: Admin access required');
    });

    it('should reject non-admin for toggleAdminStatus', async () => {
      const player = await createTestPlayer();

      setMockUser(
        createMockUser({
          id: player.userId,
          playerId: player.playerId,
        })
      );

      await expect(toggleAdminStatus('any')).rejects.toThrow('Unauthorized: Admin access required');
    });

    it('should reject unauthenticated for all admin endpoints', async () => {
      setMockUser(null);

      await expect(getAdminStats()).rejects.toThrow();
      await expect(getAllPlayersAdmin()).rejects.toThrow();
      await expect(updatePlayerStats('any', {})).rejects.toThrow();
      await expect(deleteMatch('any')).rejects.toThrow();
      await expect(toggleAdminStatus('any')).rejects.toThrow();
    });
  });

  describe('getAdminStats', () => {
    it('should return stats for admin', async () => {
      const admin = await createTestAdmin();

      setMockUser(
        createMockAdminUser({
          id: admin.userId,
          playerId: admin.playerId,
        })
      );

      const stats = await getAdminStats();

      expect(stats).toBeDefined();
      expect(stats.totalPlayers).toBeGreaterThanOrEqual(1);
      expect(stats.totalMatches).toBeDefined();
      expect(stats.matchesToday).toBeDefined();
      expect(stats.activePlayers).toBeDefined();
    });

    it('should count players correctly', async () => {
      await createTestPlayers(3);
      const admin = await createTestAdmin();

      setMockUser(
        createMockAdminUser({
          id: admin.userId,
          playerId: admin.playerId,
        })
      );

      const stats = await getAdminStats();

      // 3 regular players + 1 admin = 4
      expect(stats.totalPlayers).toBe(4);
    });
  });

  describe('getAllPlayersAdmin', () => {
    it('should return all players with details', async () => {
      await createTestPlayer({ displayName: 'Player 1', elo: 1200 });
      await createTestPlayer({ displayName: 'Player 2', elo: 1100 });
      const admin = await createTestAdmin({ displayName: 'Admin' });

      setMockUser(
        createMockAdminUser({
          id: admin.userId,
          playerId: admin.playerId,
        })
      );

      const allPlayers = await getAllPlayersAdmin();

      expect(allPlayers.length).toBe(3);
      // Should be sorted by ELO descending
      expect(allPlayers[0].elo).toBeGreaterThanOrEqual(allPlayers[1].elo);
    });

    it('should include user email and admin status', async () => {
      const admin = await createTestAdmin({ email: 'admin@test.com' });

      setMockUser(
        createMockAdminUser({
          id: admin.userId,
          playerId: admin.playerId,
        })
      );

      const allPlayers = await getAllPlayersAdmin();
      const adminPlayer = allPlayers.find((p) => p.id === admin.playerId);

      expect(adminPlayer?.email).toBe('admin@test.com');
      expect(adminPlayer?.isAdmin).toBe(true);
    });
  });

  describe('updatePlayerStats', () => {
    it('should update player ELO', async () => {
      const db = await getTestDb();
      const player = await createTestPlayer({ elo: 1000 });
      const admin = await createTestAdmin();

      setMockUser(
        createMockAdminUser({
          id: admin.userId,
          playerId: admin.playerId,
        })
      );

      await updatePlayerStats(player.playerId, { elo: 1500 });

      const [updated] = await db.select().from(players).where(eq(players.id, player.playerId));
      expect(updated.elo).toBe(1500);
    });

    it('should update multiple stats at once', async () => {
      const db = await getTestDb();
      const player = await createTestPlayer();
      const admin = await createTestAdmin();

      setMockUser(
        createMockAdminUser({
          id: admin.userId,
          playerId: admin.playerId,
        })
      );

      await updatePlayerStats(player.playerId, {
        elo: 1200,
        xp: 500,
        matchesWon: 10,
        matchesPlayed: 15,
        currentStreak: 3,
        bestStreak: 5,
      });

      const [updated] = await db.select().from(players).where(eq(players.id, player.playerId));
      expect(updated.elo).toBe(1200);
      expect(updated.xp).toBe(500);
      expect(updated.matchesWon).toBe(10);
      expect(updated.matchesPlayed).toBe(15);
      expect(updated.currentStreak).toBe(3);
      expect(updated.bestStreak).toBe(5);
    });

    it('should update timestamp', async () => {
      const db = await getTestDb();
      const player = await createTestPlayer();
      const admin = await createTestAdmin();

      const [beforeUpdate] = await db.select().from(players).where(eq(players.id, player.playerId));
      const beforeTimestamp = beforeUpdate.updatedAt;

      // Wait a bit to ensure timestamp differs
      await new Promise((resolve) => setTimeout(resolve, 10));

      setMockUser(
        createMockAdminUser({
          id: admin.userId,
          playerId: admin.playerId,
        })
      );

      await updatePlayerStats(player.playerId, { elo: 1100 });

      const [afterUpdate] = await db.select().from(players).where(eq(players.id, player.playerId));
      expect(afterUpdate.updatedAt.getTime()).toBeGreaterThan(beforeTimestamp.getTime());
    });
  });

  describe('getAllMatchesAdmin', () => {
    it('should return empty array when no matches', async () => {
      const admin = await createTestAdmin();

      setMockUser(
        createMockAdminUser({
          id: admin.userId,
          playerId: admin.playerId,
        })
      );

      const allMatches = await getAllMatchesAdmin();
      expect(allMatches).toEqual([]);
    });

    it('should return matches with player details', async () => {
      const winner = await createTestPlayer({ displayName: 'Winner' });
      const loser = await createTestPlayer({ displayName: 'Loser' });
      const admin = await createTestAdmin();

      // Log a match as the winner
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

      // Get matches as admin
      setMockUser(
        createMockAdminUser({
          id: admin.userId,
          playerId: admin.playerId,
        })
      );

      const allMatches = await getAllMatchesAdmin();

      expect(allMatches.length).toBe(1);
      expect(allMatches[0].winner?.displayName).toBe('Winner');
      expect(allMatches[0].loser?.displayName).toBe('Loser');
    });

    it('should respect limit parameter', async () => {
      const player1 = await createTestPlayer();
      const player2 = await createTestPlayer();
      const admin = await createTestAdmin();

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

      setMockUser(
        createMockAdminUser({
          id: admin.userId,
          playerId: admin.playerId,
        })
      );

      const limitedMatches = await getAllMatchesAdmin(3);
      expect(limitedMatches.length).toBe(3);
    });
  });

  describe('deleteMatch', () => {
    it('should delete a match', async () => {
      const db = await getTestDb();
      const winner = await createTestPlayer();
      const loser = await createTestPlayer();
      const admin = await createTestAdmin();

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
        loserScore: 5,
      });

      const matchId = result.match.id;

      setMockUser(
        createMockAdminUser({
          id: admin.userId,
          playerId: admin.playerId,
        })
      );

      await deleteMatch(matchId);

      const found = await db.select().from(matches).where(eq(matches.id, matchId));
      expect(found.length).toBe(0);
    });

    it('should return success status', async () => {
      const winner = await createTestPlayer();
      const loser = await createTestPlayer();
      const admin = await createTestAdmin();

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
        loserScore: 5,
      });

      setMockUser(
        createMockAdminUser({
          id: admin.userId,
          playerId: admin.playerId,
        })
      );

      const deleteResult = await deleteMatch(result.match.id);
      expect(deleteResult.success).toBe(true);
    });
  });

  describe('toggleAdminStatus', () => {
    it('should toggle admin status for another user', async () => {
      const db = await getTestDb();
      const player = await createTestPlayer();
      const admin = await createTestAdmin();

      setMockUser(
        createMockAdminUser({
          id: admin.userId,
          playerId: admin.playerId,
        })
      );

      const result = await toggleAdminStatus(player.userId);

      expect(result.success).toBe(true);
      expect(result.isAdmin).toBe(true);

      const [updated] = await db.select().from(users).where(eq(users.id, player.userId));
      expect(updated.isAdmin).toBe(true);
    });

    it('should toggle back to non-admin', async () => {
      const db = await getTestDb();
      const player = await createTestPlayer();
      const admin = await createTestAdmin();

      setMockUser(
        createMockAdminUser({
          id: admin.userId,
          playerId: admin.playerId,
        })
      );

      // Make admin
      await toggleAdminStatus(player.userId);

      // Remove admin
      const result = await toggleAdminStatus(player.userId);

      expect(result.success).toBe(true);
      expect(result.isAdmin).toBe(false);

      const [updated] = await db.select().from(users).where(eq(users.id, player.userId));
      expect(updated.isAdmin).toBe(false);
    });

    it('should prevent self-demotion', async () => {
      const admin = await createTestAdmin();

      setMockUser(
        createMockAdminUser({
          id: admin.userId,
          playerId: admin.playerId,
        })
      );

      await expect(toggleAdminStatus(admin.userId)).rejects.toThrow(
        'Cannot change your own admin status'
      );
    });

    it('should reject non-existent user', async () => {
      const admin = await createTestAdmin();

      setMockUser(
        createMockAdminUser({
          id: admin.userId,
          playerId: admin.playerId,
        })
      );

      const nonExistentId = '00000000-0000-0000-0000-000000000000';

      await expect(toggleAdminStatus(nonExistentId)).rejects.toThrow('User not found');
    });
  });
});
