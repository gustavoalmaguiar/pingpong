import { getTestDb } from '../db';
import { matches } from '@/lib/db/schema';

export interface CreateSinglesMatchOptions {
  winnerId: string;
  loserId: string;
  winnerScore: number;
  loserScore: number;
  eloChange: number;
  loggedBy: string;
  tournamentMatchId?: string;
}

export interface CreateDoublesMatchOptions {
  winnerTeamP1: string;
  winnerTeamP2: string;
  loserTeamP1: string;
  loserTeamP2: string;
  winnerScore: number;
  loserScore: number;
  eloChange: number;
  loggedBy: string;
  tournamentMatchId?: string;
}

export interface TestMatch {
  match: typeof matches.$inferSelect;
}

export async function createTestSinglesMatch(
  options: CreateSinglesMatchOptions
): Promise<TestMatch> {
  const db = await getTestDb();

  const [match] = await db
    .insert(matches)
    .values({
      type: 'singles',
      winnerId: options.winnerId,
      loserId: options.loserId,
      winnerScore: options.winnerScore,
      loserScore: options.loserScore,
      eloChange: options.eloChange,
      loggedBy: options.loggedBy,
      tournamentMatchId: options.tournamentMatchId,
    })
    .returning();

  return { match };
}

export async function createTestDoublesMatch(
  options: CreateDoublesMatchOptions
): Promise<TestMatch> {
  const db = await getTestDb();

  const [match] = await db
    .insert(matches)
    .values({
      type: 'doubles',
      winnerTeamP1: options.winnerTeamP1,
      winnerTeamP2: options.winnerTeamP2,
      loserTeamP1: options.loserTeamP1,
      loserTeamP2: options.loserTeamP2,
      winnerScore: options.winnerScore,
      loserScore: options.loserScore,
      eloChange: options.eloChange,
      loggedBy: options.loggedBy,
      tournamentMatchId: options.tournamentMatchId,
    })
    .returning();

  return { match };
}
