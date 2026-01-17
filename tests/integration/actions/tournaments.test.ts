import { describe, it, expect, beforeEach } from 'vitest';
import {
  createTournament,
  getTournament,
  getTournaments,
  getPublicTournaments,
  openEnrollment,
  cancelTournament,
  deleteTournament,
  updateTournament,
} from '@/actions/tournaments';
import { createTestPlayer, createTestAdmin } from '../../setup/fixtures/players';
import { setMockUser, createMockUser, createMockAdminUser } from '../../setup/mocks/auth';
import { getTestDb } from '../../setup/db';
import { tournaments } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

describe('Tournament Server Actions', () => {
  describe('createTournament', () => {
    it('should create a tournament as admin', async () => {
      const admin = await createTestAdmin();

      setMockUser(
        createMockAdminUser({
          id: admin.userId,
          playerId: admin.playerId,
        })
      );

      const tournament = await createTournament({
        name: 'Test Tournament',
        format: 'single_elimination',
        matchType: 'singles',
      });

      expect(tournament).toBeDefined();
      expect(tournament.name).toBe('Test Tournament');
      expect(tournament.format).toBe('single_elimination');
      expect(tournament.matchType).toBe('singles');
      expect(tournament.status).toBe('draft');
    });

    it('should reject non-admin users', async () => {
      const player = await createTestPlayer();

      setMockUser(
        createMockUser({
          id: player.userId,
          playerId: player.playerId,
        })
      );

      await expect(
        createTournament({
          name: 'Test',
          format: 'single_elimination',
          matchType: 'singles',
        })
      ).rejects.toThrow('Unauthorized: Admin access required');
    });

    it('should reject unauthenticated requests', async () => {
      setMockUser(null);

      await expect(
        createTournament({
          name: 'Test',
          format: 'single_elimination',
          matchType: 'singles',
        })
      ).rejects.toThrow();
    });

    it('should create tournament with all formats', async () => {
      const admin = await createTestAdmin();

      setMockUser(
        createMockAdminUser({
          id: admin.userId,
          playerId: admin.playerId,
        })
      );

      const formats = [
        'single_elimination',
        'double_elimination',
        'swiss',
        'round_robin_knockout',
      ] as const;

      for (const format of formats) {
        const tournament = await createTournament({
          name: `${format} Tournament`,
          format,
          matchType: 'singles',
        });

        expect(tournament.format).toBe(format);
      }
    });

    it('should create doubles tournament', async () => {
      const admin = await createTestAdmin();

      setMockUser(
        createMockAdminUser({
          id: admin.userId,
          playerId: admin.playerId,
        })
      );

      const tournament = await createTournament({
        name: 'Doubles Tournament',
        format: 'single_elimination',
        matchType: 'doubles',
      });

      expect(tournament.matchType).toBe('doubles');
    });

    it('should set custom ELO multipliers', async () => {
      const admin = await createTestAdmin();

      setMockUser(
        createMockAdminUser({
          id: admin.userId,
          playerId: admin.playerId,
        })
      );

      const tournament = await createTournament({
        name: 'High Stakes',
        format: 'single_elimination',
        matchType: 'singles',
        eloMultiplierBase: 200,
        eloMultiplierFinals: 400,
      });

      expect(tournament.eloMultiplierBase).toBe(200);
      expect(tournament.eloMultiplierFinals).toBe(400);
    });
  });

  describe('openEnrollment', () => {
    it('should transition from draft to enrollment', async () => {
      const admin = await createTestAdmin();

      setMockUser(
        createMockAdminUser({
          id: admin.userId,
          playerId: admin.playerId,
        })
      );

      const tournament = await createTournament({
        name: 'Test',
        format: 'single_elimination',
        matchType: 'singles',
      });

      const updated = await openEnrollment(tournament.id);

      expect(updated.status).toBe('enrollment');
    });

    it('should reject if not in draft status', async () => {
      const admin = await createTestAdmin();

      setMockUser(
        createMockAdminUser({
          id: admin.userId,
          playerId: admin.playerId,
        })
      );

      const tournament = await createTournament({
        name: 'Test',
        format: 'single_elimination',
        matchType: 'singles',
      });

      await openEnrollment(tournament.id);

      await expect(openEnrollment(tournament.id)).rejects.toThrow(
        'Tournament must be in draft status'
      );
    });

    it('should reject non-existent tournament', async () => {
      const admin = await createTestAdmin();

      setMockUser(
        createMockAdminUser({
          id: admin.userId,
          playerId: admin.playerId,
        })
      );

      const nonExistentId = '00000000-0000-0000-0000-000000000000';

      await expect(openEnrollment(nonExistentId)).rejects.toThrow('Tournament not found');
    });
  });

  describe('cancelTournament', () => {
    it('should cancel a draft tournament', async () => {
      const admin = await createTestAdmin();

      setMockUser(
        createMockAdminUser({
          id: admin.userId,
          playerId: admin.playerId,
        })
      );

      const tournament = await createTournament({
        name: 'Test',
        format: 'single_elimination',
        matchType: 'singles',
      });

      const cancelled = await cancelTournament(tournament.id);

      expect(cancelled.status).toBe('cancelled');
    });

    it('should cancel an enrollment tournament', async () => {
      const admin = await createTestAdmin();

      setMockUser(
        createMockAdminUser({
          id: admin.userId,
          playerId: admin.playerId,
        })
      );

      const tournament = await createTournament({
        name: 'Test',
        format: 'single_elimination',
        matchType: 'singles',
      });

      await openEnrollment(tournament.id);
      const cancelled = await cancelTournament(tournament.id);

      expect(cancelled.status).toBe('cancelled');
    });

    it('should not cancel a completed tournament', async () => {
      const db = await getTestDb();
      const admin = await createTestAdmin();

      setMockUser(
        createMockAdminUser({
          id: admin.userId,
          playerId: admin.playerId,
        })
      );

      const tournament = await createTournament({
        name: 'Test',
        format: 'single_elimination',
        matchType: 'singles',
      });

      // Manually set to completed
      await db
        .update(tournaments)
        .set({ status: 'completed' })
        .where(eq(tournaments.id, tournament.id));

      await expect(cancelTournament(tournament.id)).rejects.toThrow(
        'Cannot cancel a completed tournament'
      );
    });
  });

  describe('deleteTournament', () => {
    it('should delete a draft tournament', async () => {
      const db = await getTestDb();
      const admin = await createTestAdmin();

      setMockUser(
        createMockAdminUser({
          id: admin.userId,
          playerId: admin.playerId,
        })
      );

      const tournament = await createTournament({
        name: 'Test',
        format: 'single_elimination',
        matchType: 'singles',
      });

      await deleteTournament(tournament.id);

      const found = await db.select().from(tournaments).where(eq(tournaments.id, tournament.id));
      expect(found.length).toBe(0);
    });

    it('should delete a cancelled tournament', async () => {
      const db = await getTestDb();
      const admin = await createTestAdmin();

      setMockUser(
        createMockAdminUser({
          id: admin.userId,
          playerId: admin.playerId,
        })
      );

      const tournament = await createTournament({
        name: 'Test',
        format: 'single_elimination',
        matchType: 'singles',
      });

      await cancelTournament(tournament.id);
      await deleteTournament(tournament.id);

      const found = await db.select().from(tournaments).where(eq(tournaments.id, tournament.id));
      expect(found.length).toBe(0);
    });

    it('should not delete an in-progress tournament', async () => {
      const db = await getTestDb();
      const admin = await createTestAdmin();

      setMockUser(
        createMockAdminUser({
          id: admin.userId,
          playerId: admin.playerId,
        })
      );

      const tournament = await createTournament({
        name: 'Test',
        format: 'single_elimination',
        matchType: 'singles',
      });

      await db
        .update(tournaments)
        .set({ status: 'in_progress' })
        .where(eq(tournaments.id, tournament.id));

      await expect(deleteTournament(tournament.id)).rejects.toThrow(
        'Can only delete draft or cancelled tournaments'
      );
    });

    it('should not delete an enrollment tournament', async () => {
      const admin = await createTestAdmin();

      setMockUser(
        createMockAdminUser({
          id: admin.userId,
          playerId: admin.playerId,
        })
      );

      const tournament = await createTournament({
        name: 'Test',
        format: 'single_elimination',
        matchType: 'singles',
      });

      await openEnrollment(tournament.id);

      await expect(deleteTournament(tournament.id)).rejects.toThrow(
        'Can only delete draft or cancelled tournaments'
      );
    });
  });

  describe('updateTournament', () => {
    it('should update tournament name', async () => {
      const admin = await createTestAdmin();

      setMockUser(
        createMockAdminUser({
          id: admin.userId,
          playerId: admin.playerId,
        })
      );

      const tournament = await createTournament({
        name: 'Original Name',
        format: 'single_elimination',
        matchType: 'singles',
      });

      const updated = await updateTournament(tournament.id, {
        name: 'Updated Name',
      });

      expect(updated.name).toBe('Updated Name');
    });

    it('should update multiple fields', async () => {
      const admin = await createTestAdmin();

      setMockUser(
        createMockAdminUser({
          id: admin.userId,
          playerId: admin.playerId,
        })
      );

      const tournament = await createTournament({
        name: 'Test',
        format: 'single_elimination',
        matchType: 'singles',
      });

      const updated = await updateTournament(tournament.id, {
        name: 'Updated Tournament',
        description: 'A great tournament',
        location: 'Office',
        prizeDescription: 'Winner gets bragging rights',
      });

      expect(updated.name).toBe('Updated Tournament');
      expect(updated.description).toBe('A great tournament');
      expect(updated.location).toBe('Office');
      expect(updated.prizeDescription).toBe('Winner gets bragging rights');
    });
  });

  describe('getTournaments', () => {
    it('should return empty array when no tournaments', async () => {
      const player = await createTestPlayer();

      setMockUser(
        createMockUser({
          id: player.userId,
          playerId: player.playerId,
        })
      );

      const result = await getTournaments();
      expect(result).toEqual([]);
    });

    it('should return all tournaments', async () => {
      const admin = await createTestAdmin();

      setMockUser(
        createMockAdminUser({
          id: admin.userId,
          playerId: admin.playerId,
        })
      );

      await createTournament({
        name: 'Tournament 1',
        format: 'single_elimination',
        matchType: 'singles',
      });

      await createTournament({
        name: 'Tournament 2',
        format: 'swiss',
        matchType: 'singles',
      });

      const result = await getTournaments();
      expect(result.length).toBe(2);
    });

    it('should filter by status', async () => {
      const admin = await createTestAdmin();

      setMockUser(
        createMockAdminUser({
          id: admin.userId,
          playerId: admin.playerId,
        })
      );

      const tournament1 = await createTournament({
        name: 'Draft Tournament',
        format: 'single_elimination',
        matchType: 'singles',
      });

      const tournament2 = await createTournament({
        name: 'Enrollment Tournament',
        format: 'swiss',
        matchType: 'singles',
      });

      await openEnrollment(tournament2.id);

      const draftOnly = await getTournaments('draft');
      expect(draftOnly.length).toBe(1);
      expect(draftOnly[0].name).toBe('Draft Tournament');

      const enrollmentOnly = await getTournaments('enrollment');
      expect(enrollmentOnly.length).toBe(1);
      expect(enrollmentOnly[0].name).toBe('Enrollment Tournament');
    });

    it('should include enrollment count', async () => {
      const admin = await createTestAdmin();

      setMockUser(
        createMockAdminUser({
          id: admin.userId,
          playerId: admin.playerId,
        })
      );

      await createTournament({
        name: 'Test Tournament',
        format: 'single_elimination',
        matchType: 'singles',
      });

      const result = await getTournaments();
      expect(result[0].enrollmentCount).toBe(0);
    });
  });

  describe('getPublicTournaments', () => {
    it('should exclude draft tournaments', async () => {
      const admin = await createTestAdmin();

      setMockUser(
        createMockAdminUser({
          id: admin.userId,
          playerId: admin.playerId,
        })
      );

      await createTournament({
        name: 'Draft Tournament',
        format: 'single_elimination',
        matchType: 'singles',
      });

      const tournament2 = await createTournament({
        name: 'Enrollment Tournament',
        format: 'swiss',
        matchType: 'singles',
      });

      await openEnrollment(tournament2.id);

      const publicTournaments = await getPublicTournaments();
      expect(publicTournaments.length).toBe(1);
      expect(publicTournaments[0].name).toBe('Enrollment Tournament');
    });

    it('should exclude cancelled tournaments', async () => {
      const admin = await createTestAdmin();

      setMockUser(
        createMockAdminUser({
          id: admin.userId,
          playerId: admin.playerId,
        })
      );

      const tournament = await createTournament({
        name: 'Cancelled Tournament',
        format: 'single_elimination',
        matchType: 'singles',
      });

      await cancelTournament(tournament.id);

      const publicTournaments = await getPublicTournaments();
      expect(publicTournaments.length).toBe(0);
    });
  });

  describe('getTournament', () => {
    it('should return tournament with details', async () => {
      const admin = await createTestAdmin();

      setMockUser(
        createMockAdminUser({
          id: admin.userId,
          playerId: admin.playerId,
        })
      );

      const created = await createTournament({
        name: 'Test Tournament',
        format: 'single_elimination',
        matchType: 'singles',
      });

      const tournament = await getTournament(created.id);

      expect(tournament).toBeDefined();
      expect(tournament?.name).toBe('Test Tournament');
      expect(tournament?.enrollments).toBeDefined();
      expect(tournament?.rounds).toBeDefined();
      expect(tournament?.matches).toBeDefined();
    });

    it('should return null for non-existent tournament', async () => {
      const player = await createTestPlayer();

      setMockUser(
        createMockUser({
          id: player.userId,
          playerId: player.playerId,
        })
      );

      const nonExistentId = '00000000-0000-0000-0000-000000000000';
      const tournament = await getTournament(nonExistentId);

      expect(tournament).toBeUndefined();
    });
  });

  describe('Stage-specific BestOf Configuration', () => {
    it('should create tournament with stage-specific bestOf settings', async () => {
      const admin = await createTestAdmin();

      setMockUser(
        createMockAdminUser({
          id: admin.userId,
          playerId: admin.playerId,
        })
      );

      const tournament = await createTournament({
        name: 'Custom BestOf Tournament',
        format: 'single_elimination',
        matchType: 'singles',
        bestOf: 3,
        bestOfGroupStage: 1,
        bestOfEarlyRounds: 3,
        bestOfSemiFinals: 5,
        bestOfFinals: 7,
      });

      expect(tournament.bestOf).toBe(3);
      expect(tournament.bestOfGroupStage).toBe(1);
      expect(tournament.bestOfEarlyRounds).toBe(3);
      expect(tournament.bestOfSemiFinals).toBe(5);
      expect(tournament.bestOfFinals).toBe(7);
    });

    it('should create tournament with partial stage-specific settings', async () => {
      const admin = await createTestAdmin();

      setMockUser(
        createMockAdminUser({
          id: admin.userId,
          playerId: admin.playerId,
        })
      );

      const tournament = await createTournament({
        name: 'Partial BestOf Tournament',
        format: 'single_elimination',
        matchType: 'singles',
        bestOf: 3,
        bestOfFinals: 5, // Only override finals
      });

      expect(tournament.bestOf).toBe(3);
      expect(tournament.bestOfGroupStage).toBeNull();
      expect(tournament.bestOfEarlyRounds).toBeNull();
      expect(tournament.bestOfSemiFinals).toBeNull();
      expect(tournament.bestOfFinals).toBe(5);
    });

    it('should update tournament with stage-specific settings', async () => {
      const admin = await createTestAdmin();

      setMockUser(
        createMockAdminUser({
          id: admin.userId,
          playerId: admin.playerId,
        })
      );

      const tournament = await createTournament({
        name: 'Update BestOf Tournament',
        format: 'round_robin_knockout',
        matchType: 'singles',
        bestOf: 3,
      });

      const updated = await updateTournament(tournament.id, {
        bestOfGroupStage: 1,
        bestOfEarlyRounds: 3,
        bestOfFinals: 7,
      });

      expect(updated.bestOfGroupStage).toBe(1);
      expect(updated.bestOfEarlyRounds).toBe(3);
      expect(updated.bestOfFinals).toBe(7);
    });

    it('should return tournament with bestOf settings via getTournament', async () => {
      const admin = await createTestAdmin();

      setMockUser(
        createMockAdminUser({
          id: admin.userId,
          playerId: admin.playerId,
        })
      );

      const created = await createTournament({
        name: 'Retrieve BestOf Tournament',
        format: 'single_elimination',
        matchType: 'singles',
        bestOf: 3,
        bestOfSemiFinals: 5,
        bestOfFinals: 7,
      });

      const tournament = await getTournament(created.id);

      expect(tournament?.bestOf).toBe(3);
      expect(tournament?.bestOfSemiFinals).toBe(5);
      expect(tournament?.bestOfFinals).toBe(7);
    });

    it('should create swiss tournament with group stage bestOf', async () => {
      const admin = await createTestAdmin();

      setMockUser(
        createMockAdminUser({
          id: admin.userId,
          playerId: admin.playerId,
        })
      );

      const tournament = await createTournament({
        name: 'Swiss BestOf Tournament',
        format: 'swiss',
        matchType: 'singles',
        bestOf: 3,
        bestOfGroupStage: 1, // All swiss rounds are Bo1
      });

      expect(tournament.format).toBe('swiss');
      expect(tournament.bestOf).toBe(3);
      expect(tournament.bestOfGroupStage).toBe(1);
    });

    it('should create round robin knockout with stage settings', async () => {
      const admin = await createTestAdmin();

      setMockUser(
        createMockAdminUser({
          id: admin.userId,
          playerId: admin.playerId,
        })
      );

      const tournament = await createTournament({
        name: 'RR Knockout BestOf',
        format: 'round_robin_knockout',
        matchType: 'singles',
        bestOf: 3,
        bestOfGroupStage: 1, // Groups are Bo1
        bestOfEarlyRounds: 3,
        bestOfSemiFinals: 5,
        bestOfFinals: 7,
      });

      expect(tournament.format).toBe('round_robin_knockout');
      expect(tournament.bestOfGroupStage).toBe(1);
      expect(tournament.bestOfEarlyRounds).toBe(3);
      expect(tournament.bestOfSemiFinals).toBe(5);
      expect(tournament.bestOfFinals).toBe(7);
    });

    it('should clear stage settings with null values', async () => {
      const admin = await createTestAdmin();

      setMockUser(
        createMockAdminUser({
          id: admin.userId,
          playerId: admin.playerId,
        })
      );

      const tournament = await createTournament({
        name: 'Clear BestOf Tournament',
        format: 'single_elimination',
        matchType: 'singles',
        bestOf: 3,
        bestOfFinals: 7,
      });

      expect(tournament.bestOfFinals).toBe(7);

      const updated = await updateTournament(tournament.id, {
        bestOfFinals: null,
      });

      expect(updated.bestOfFinals).toBeNull();
    });
  });
});
