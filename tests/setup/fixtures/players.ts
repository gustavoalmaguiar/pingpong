import { getTestDb } from '../db';
import { users, players } from '@/lib/db/schema';
import { like, ne, and } from 'drizzle-orm';

// Simple slugify for test fixtures
function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

// Generate unique slug for test fixtures
async function generateTestSlug(db: Awaited<ReturnType<typeof getTestDb>>, displayName: string, excludePlayerId?: string): Promise<string> {
  const baseSlug = slugify(displayName);
  if (!baseSlug) {
    return `player-${crypto.randomUUID().slice(0, 8)}`;
  }

  const existingSlugs = await db
    .select({ slug: players.slug })
    .from(players)
    .where(
      excludePlayerId
        ? and(like(players.slug, `${baseSlug}%`), ne(players.id, excludePlayerId))
        : like(players.slug, `${baseSlug}%`)
    );

  const slugSet = new Set(existingSlugs.map((p) => p.slug));
  if (!slugSet.has(baseSlug)) {
    return baseSlug;
  }

  let counter = 1;
  while (slugSet.has(`${baseSlug}-${counter}`)) {
    counter++;
  }
  return `${baseSlug}-${counter}`;
}

export interface CreatePlayerOptions {
  displayName?: string;
  elo?: number;
  xp?: number;
  level?: number;
  matchesPlayed?: number;
  matchesWon?: number;
  currentStreak?: number;
  bestStreak?: number;
  isAdmin?: boolean;
  email?: string;
  avatarUrl?: string;
  // Tournament stats
  tournamentMatchesPlayed?: number;
  tournamentMatchesWon?: number;
  tournamentsPlayed?: number;
  tournamentsWon?: number;
  // Tournament streaks
  tournamentCurrentStreak?: number;
  tournamentBestStreak?: number;
}

export interface TestPlayer {
  userId: string;
  playerId: string;
  user: typeof users.$inferSelect;
  player: typeof players.$inferSelect;
}

export async function createTestPlayer(options: CreatePlayerOptions = {}): Promise<TestPlayer> {
  const db = await getTestDb();
  const userId = crypto.randomUUID();
  const playerId = crypto.randomUUID();
  const displayName = options.displayName || `Player ${playerId.slice(0, 8)}`;
  const slug = await generateTestSlug(db, displayName);

  // Create user first
  const [user] = await db
    .insert(users)
    .values({
      id: userId,
      email: options.email || `player-${playerId.slice(0, 8)}@test.com`,
      name: displayName,
      image: options.avatarUrl,
      isAdmin: options.isAdmin ?? false,
    })
    .returning();

  // Create player
  const [player] = await db
    .insert(players)
    .values({
      id: playerId,
      userId,
      displayName,
      slug,
      elo: options.elo ?? 1000,
      xp: options.xp ?? 0,
      level: options.level ?? 1,
      matchesPlayed: options.matchesPlayed ?? 0,
      matchesWon: options.matchesWon ?? 0,
      currentStreak: options.currentStreak ?? 0,
      bestStreak: options.bestStreak ?? 0,
      // Tournament stats
      tournamentMatchesPlayed: options.tournamentMatchesPlayed ?? 0,
      tournamentMatchesWon: options.tournamentMatchesWon ?? 0,
      tournamentsPlayed: options.tournamentsPlayed ?? 0,
      tournamentsWon: options.tournamentsWon ?? 0,
      // Tournament streaks
      tournamentCurrentStreak: options.tournamentCurrentStreak ?? 0,
      tournamentBestStreak: options.tournamentBestStreak ?? 0,
    })
    .returning();

  return { userId, playerId, user, player };
}

export async function createTestPlayers(
  count: number,
  baseOptions: CreatePlayerOptions = {}
): Promise<TestPlayer[]> {
  const results: TestPlayer[] = [];
  for (let i = 0; i < count; i++) {
    const result = await createTestPlayer({
      ...baseOptions,
      displayName: baseOptions.displayName
        ? `${baseOptions.displayName} ${i + 1}`
        : `Player ${i + 1}`,
      elo: (baseOptions.elo ?? 1000) + i * 50, // Stagger ELOs
    });
    results.push(result);
  }
  return results;
}

export async function createTestAdmin(options: CreatePlayerOptions = {}): Promise<TestPlayer> {
  return createTestPlayer({ ...options, isAdmin: true });
}
