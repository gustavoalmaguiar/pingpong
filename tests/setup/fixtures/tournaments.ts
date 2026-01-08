import { getTestDb } from '../db';
import { tournaments, tournamentEnrollments, tournamentGroups } from '@/lib/db/schema';

export interface CreateTournamentOptions {
  name?: string;
  description?: string;
  format?: 'single_elimination' | 'double_elimination' | 'swiss' | 'round_robin_knockout';
  matchType?: 'singles' | 'doubles';
  status?: 'draft' | 'enrollment' | 'in_progress' | 'completed' | 'cancelled';
  createdBy: string;
  eloMultiplierBase?: number;
  eloMultiplierFinals?: number;
  bestOf?: number;
  swissRounds?: number;
  groupCount?: number;
  advancePerGroup?: number;
}

export interface TestTournament {
  tournament: typeof tournaments.$inferSelect;
}

export async function createTestTournament(
  options: CreateTournamentOptions
): Promise<TestTournament> {
  const db = await getTestDb();

  const [tournament] = await db
    .insert(tournaments)
    .values({
      name: options.name || 'Test Tournament',
      description: options.description,
      format: options.format || 'single_elimination',
      matchType: options.matchType || 'singles',
      status: options.status || 'draft',
      createdBy: options.createdBy,
      eloMultiplierBase: options.eloMultiplierBase ?? 150,
      eloMultiplierFinals: options.eloMultiplierFinals ?? 300,
      bestOf: options.bestOf ?? 1,
      swissRounds: options.swissRounds,
      groupCount: options.groupCount,
      advancePerGroup: options.advancePerGroup,
    })
    .returning();

  return { tournament };
}

export interface EnrollPlayerOptions {
  tournamentId: string;
  playerId: string;
  partnerId?: string;
  teamName?: string;
  seed?: number;
  seedOverride?: boolean;
}

export interface TestEnrollment {
  enrollment: typeof tournamentEnrollments.$inferSelect;
}

export async function enrollPlayerInTournament(
  options: EnrollPlayerOptions
): Promise<TestEnrollment> {
  const db = await getTestDb();

  const [enrollment] = await db
    .insert(tournamentEnrollments)
    .values({
      tournamentId: options.tournamentId,
      playerId: options.playerId,
      partnerId: options.partnerId,
      teamName: options.teamName,
      seed: options.seed,
      seedOverride: options.seedOverride ?? false,
    })
    .returning();

  return { enrollment };
}

export interface CreateTournamentGroupOptions {
  tournamentId: string;
  name: string;
  displayOrder?: number;
}

export async function createTournamentGroup(
  options: CreateTournamentGroupOptions
): Promise<typeof tournamentGroups.$inferSelect> {
  const db = await getTestDb();

  const [group] = await db
    .insert(tournamentGroups)
    .values({
      tournamentId: options.tournamentId,
      name: options.name,
      displayOrder: options.displayOrder ?? 0,
    })
    .returning();

  return group;
}
