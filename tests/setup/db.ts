import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import * as schema from '@/lib/db/schema';

// Create in-memory PGlite instance
let pglite: PGlite | null = null;
let testDb: ReturnType<typeof drizzle<typeof schema>> | null = null;

const createTablesSql = `
  -- Create enums
  DO $$ BEGIN
    CREATE TYPE match_type AS ENUM ('singles', 'doubles');
  EXCEPTION WHEN duplicate_object THEN null; END $$;

  DO $$ BEGIN
    CREATE TYPE achievement_tier AS ENUM ('bronze', 'silver', 'gold', 'platinum');
  EXCEPTION WHEN duplicate_object THEN null; END $$;

  DO $$ BEGIN
    CREATE TYPE tournament_format AS ENUM ('single_elimination', 'double_elimination', 'swiss', 'round_robin_knockout');
  EXCEPTION WHEN duplicate_object THEN null; END $$;

  DO $$ BEGIN
    CREATE TYPE tournament_status AS ENUM ('draft', 'enrollment', 'in_progress', 'completed', 'cancelled');
  EXCEPTION WHEN duplicate_object THEN null; END $$;

  DO $$ BEGIN
    CREATE TYPE bracket_type AS ENUM ('winners', 'losers', 'finals', 'group', 'swiss_round');
  EXCEPTION WHEN duplicate_object THEN null; END $$;

  DO $$ BEGIN
    CREATE TYPE tournament_match_status AS ENUM ('pending', 'ready', 'in_progress', 'completed', 'bye', 'walkover');
  EXCEPTION WHEN duplicate_object THEN null; END $$;

  -- NextAuth required tables
  CREATE TABLE IF NOT EXISTS "user" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT,
    email TEXT UNIQUE,
    "emailVerified" TIMESTAMP,
    image TEXT,
    is_admin BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS account (
    "userId" UUID NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    provider TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    refresh_token TEXT,
    access_token TEXT,
    expires_at INTEGER,
    token_type TEXT,
    scope TEXT,
    id_token TEXT,
    session_state TEXT,
    PRIMARY KEY (provider, "providerAccountId")
  );

  CREATE TABLE IF NOT EXISTS session (
    "sessionToken" TEXT PRIMARY KEY,
    "userId" UUID NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    expires TIMESTAMP NOT NULL
  );

  CREATE TABLE IF NOT EXISTS "verificationToken" (
    identifier TEXT NOT NULL,
    token TEXT NOT NULL,
    expires TIMESTAMP NOT NULL,
    PRIMARY KEY (identifier, token)
  );

  -- Players table
  CREATE TABLE IF NOT EXISTS players (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES "user"(id) ON DELETE CASCADE,
    display_name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    elo INTEGER NOT NULL DEFAULT 1000,
    xp INTEGER NOT NULL DEFAULT 0,
    level INTEGER NOT NULL DEFAULT 1,
    matches_played INTEGER NOT NULL DEFAULT 0,
    matches_won INTEGER NOT NULL DEFAULT 0,
    current_streak INTEGER NOT NULL DEFAULT 0,
    best_streak INTEGER NOT NULL DEFAULT 0,
    tournament_matches_played INTEGER NOT NULL DEFAULT 0,
    tournament_matches_won INTEGER NOT NULL DEFAULT 0,
    tournaments_played INTEGER NOT NULL DEFAULT 0,
    tournaments_won INTEGER NOT NULL DEFAULT 0,
    tournament_current_streak INTEGER NOT NULL DEFAULT 0,
    tournament_best_streak INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
  );

  -- Achievements table
  CREATE TABLE IF NOT EXISTS achievements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    icon TEXT NOT NULL,
    xp_reward INTEGER NOT NULL,
    tier achievement_tier NOT NULL
  );

  -- Player achievements table
  CREATE TABLE IF NOT EXISTS player_achievements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    achievement_id UUID NOT NULL REFERENCES achievements(id) ON DELETE CASCADE,
    earned_at TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE(player_id, achievement_id)
  );

  -- Tournaments table
  CREATE TABLE IF NOT EXISTS tournaments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    format tournament_format NOT NULL,
    match_type match_type NOT NULL,
    status tournament_status NOT NULL DEFAULT 'draft',
    scheduled_date TIMESTAMP,
    scheduled_time TEXT,
    location TEXT,
    prize_description TEXT,
    elo_multiplier_base INTEGER NOT NULL DEFAULT 150,
    elo_multiplier_finals INTEGER NOT NULL DEFAULT 300,
    best_of INTEGER NOT NULL DEFAULT 1,
    best_of_group_stage INTEGER,
    best_of_early_rounds INTEGER,
    best_of_semi_finals INTEGER,
    best_of_finals INTEGER,
    swiss_rounds INTEGER,
    group_count INTEGER,
    advance_per_group INTEGER,
    current_round INTEGER DEFAULT 0,
    total_rounds INTEGER,
    created_by UUID NOT NULL REFERENCES "user"(id),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    started_at TIMESTAMP,
    completed_at TIMESTAMP
  );

  -- Tournament groups table
  CREATE TABLE IF NOT EXISTS tournament_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    display_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
  );

  -- Tournament enrollments table
  CREATE TABLE IF NOT EXISTS tournament_enrollments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
    player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    partner_id UUID REFERENCES players(id) ON DELETE CASCADE,
    team_name TEXT,
    seed INTEGER,
    seed_override BOOLEAN NOT NULL DEFAULT false,
    swiss_points INTEGER NOT NULL DEFAULT 0,
    swiss_opponents TEXT,
    group_id UUID REFERENCES tournament_groups(id),
    group_points INTEGER NOT NULL DEFAULT 0,
    group_wins INTEGER NOT NULL DEFAULT 0,
    group_losses INTEGER NOT NULL DEFAULT 0,
    group_point_diff INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    enrolled_at TIMESTAMP NOT NULL DEFAULT NOW(),
    eliminated_at TIMESTAMP,
    final_placement INTEGER,
    UNIQUE(tournament_id, player_id)
  );

  -- Tournament rounds table
  CREATE TABLE IF NOT EXISTS tournament_rounds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
    round_number INTEGER NOT NULL,
    name TEXT NOT NULL,
    bracket_type bracket_type NOT NULL DEFAULT 'winners',
    elo_multiplier INTEGER NOT NULL,
    best_of INTEGER NOT NULL DEFAULT 1,
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE(tournament_id, round_number, bracket_type)
  );

  -- Matches table (after tournaments so we can reference tournament_matches)
  CREATE TABLE IF NOT EXISTS matches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type match_type NOT NULL,
    winner_score INTEGER NOT NULL,
    loser_score INTEGER NOT NULL,
    elo_change INTEGER NOT NULL,
    played_at TIMESTAMP NOT NULL DEFAULT NOW(),
    logged_by UUID NOT NULL REFERENCES "user"(id),
    winner_id UUID REFERENCES players(id),
    loser_id UUID REFERENCES players(id),
    winner_team_p1 UUID REFERENCES players(id),
    winner_team_p2 UUID REFERENCES players(id),
    loser_team_p1 UUID REFERENCES players(id),
    loser_team_p2 UUID REFERENCES players(id),
    tournament_match_id UUID,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
  );

  -- Tournament matches table
  CREATE TABLE IF NOT EXISTS tournament_matches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
    round_id UUID NOT NULL REFERENCES tournament_rounds(id) ON DELETE CASCADE,
    position INTEGER NOT NULL,
    bracket_type bracket_type NOT NULL DEFAULT 'winners',
    participant1_id UUID REFERENCES tournament_enrollments(id),
    participant2_id UUID REFERENCES tournament_enrollments(id),
    participant1_from_match_id UUID,
    participant2_from_match_id UUID,
    participant1_is_winner BOOLEAN,
    participant2_is_winner BOOLEAN,
    winner_id UUID REFERENCES tournament_enrollments(id),
    scores TEXT,
    linked_match_id UUID REFERENCES matches(id),
    elo_multiplier INTEGER NOT NULL DEFAULT 100,
    best_of INTEGER,
    status tournament_match_status NOT NULL DEFAULT 'pending',
    is_walkover BOOLEAN NOT NULL DEFAULT false,
    walkover_reason TEXT,
    is_next_match BOOLEAN NOT NULL DEFAULT false,
    group_id UUID REFERENCES tournament_groups(id),
    scheduled_time TIMESTAMP,
    played_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE(tournament_id, round_id, position, bracket_type)
  );

  -- Add foreign key for matches.tournament_match_id after tournament_matches exists
  DO $$ BEGIN
    ALTER TABLE matches ADD CONSTRAINT fk_tournament_match
      FOREIGN KEY (tournament_match_id) REFERENCES tournament_matches(id);
  EXCEPTION WHEN duplicate_object THEN null; END $$;
`;

export async function createTestDb() {
  // Create fresh in-memory database
  pglite = new PGlite();
  testDb = drizzle(pglite, { schema });

  // Create all tables
  await pglite.exec(createTablesSql);

  return testDb;
}

export async function getTestDb() {
  if (!testDb) {
    return await createTestDb();
  }
  return testDb;
}

export async function resetTestDb() {
  if (pglite) {
    // Truncate all tables in reverse dependency order
    await pglite.exec(`
      TRUNCATE TABLE tournament_matches CASCADE;
      TRUNCATE TABLE tournament_rounds CASCADE;
      TRUNCATE TABLE tournament_enrollments CASCADE;
      TRUNCATE TABLE tournament_groups CASCADE;
      TRUNCATE TABLE tournaments CASCADE;
      TRUNCATE TABLE player_achievements CASCADE;
      TRUNCATE TABLE achievements CASCADE;
      TRUNCATE TABLE matches CASCADE;
      TRUNCATE TABLE players CASCADE;
      TRUNCATE TABLE session CASCADE;
      TRUNCATE TABLE account CASCADE;
      TRUNCATE TABLE "user" CASCADE;
    `);
  }
}

export async function closeTestDb() {
  if (pglite) {
    await pglite.close();
    pglite = null;
    testDb = null;
  }
}

// Export for use in tests
export { testDb as db };
export type TestDb = Awaited<ReturnType<typeof createTestDb>>;
