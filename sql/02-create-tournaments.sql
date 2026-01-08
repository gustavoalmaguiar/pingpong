-- Create test tournaments with various formats and configurations
-- Run this after 01-create-test-users.sql

-- Get admin user ID (replace with actual admin ID if needed)
DO $$
DECLARE
  admin_id UUID;
BEGIN
  -- Get first admin user
  SELECT id INTO admin_id FROM "user" WHERE is_admin = true LIMIT 1;

  IF admin_id IS NULL THEN
    RAISE EXCEPTION 'No admin user found. Run: UPDATE "user" SET is_admin = true WHERE email = ''your-email@example.com'';';
  END IF;

  -- ============================================
  -- SINGLE ELIMINATION TOURNAMENTS
  -- ============================================

  -- SE-2P: 2 players (minimum, no byes)
  INSERT INTO tournaments (id, name, description, format, match_type, status, best_of, elo_multiplier_base, elo_multiplier_finals, created_by, created_at, updated_at)
  VALUES (
    gen_random_uuid(),
    '[TEST] SE-2P Single Elim 2 Players',
    'Single Elimination: 2 players (minimum, no byes)',
    'single_elimination',
    'singles',
    'enrollment',
    3,
    150,
    300,
    admin_id,
    NOW(),
    NOW()
  );

  -- SE-3P: 3 players (1 bye)
  INSERT INTO tournaments (id, name, description, format, match_type, status, best_of, elo_multiplier_base, elo_multiplier_finals, created_by, created_at, updated_at)
  VALUES (
    gen_random_uuid(),
    '[TEST] SE-3P Single Elim 3 Players',
    'Single Elimination: 3 players (1 bye expected)',
    'single_elimination',
    'singles',
    'enrollment',
    3,
    150,
    300,
    admin_id,
    NOW(),
    NOW()
  );

  -- SE-4P: 4 players (perfect bracket, no byes)
  INSERT INTO tournaments (id, name, description, format, match_type, status, best_of, elo_multiplier_base, elo_multiplier_finals, created_by, created_at, updated_at)
  VALUES (
    gen_random_uuid(),
    '[TEST] SE-4P Single Elim 4 Players',
    'Single Elimination: 4 players (perfect bracket, no byes)',
    'single_elimination',
    'singles',
    'enrollment',
    3,
    150,
    300,
    admin_id,
    NOW(),
    NOW()
  );

  -- SE-5P: 5 players (3 byes)
  INSERT INTO tournaments (id, name, description, format, match_type, status, best_of, elo_multiplier_base, elo_multiplier_finals, created_by, created_at, updated_at)
  VALUES (
    gen_random_uuid(),
    '[TEST] SE-5P Single Elim 5 Players',
    'Single Elimination: 5 players (3 byes expected)',
    'single_elimination',
    'singles',
    'enrollment',
    3,
    150,
    300,
    admin_id,
    NOW(),
    NOW()
  );

  -- SE-7P: 7 players (1 bye)
  INSERT INTO tournaments (id, name, description, format, match_type, status, best_of, elo_multiplier_base, elo_multiplier_finals, created_by, created_at, updated_at)
  VALUES (
    gen_random_uuid(),
    '[TEST] SE-7P Single Elim 7 Players',
    'Single Elimination: 7 players (1 bye expected)',
    'single_elimination',
    'singles',
    'enrollment',
    3,
    150,
    300,
    admin_id,
    NOW(),
    NOW()
  );

  -- SE-8P: 8 players (perfect bracket, no byes)
  INSERT INTO tournaments (id, name, description, format, match_type, status, best_of, elo_multiplier_base, elo_multiplier_finals, created_by, created_at, updated_at)
  VALUES (
    gen_random_uuid(),
    '[TEST] SE-8P Single Elim 8 Players',
    'Single Elimination: 8 players (perfect bracket, no byes)',
    'single_elimination',
    'singles',
    'enrollment',
    5,
    150,
    300,
    admin_id,
    NOW(),
    NOW()
  );

  -- ============================================
  -- ROUND ROBIN + KNOCKOUT TOURNAMENTS
  -- ============================================

  -- RRK-4P: 4 players, 1 group, top 2 advance
  INSERT INTO tournaments (id, name, description, format, match_type, status, best_of, group_count, advance_per_group, elo_multiplier_base, elo_multiplier_finals, created_by, created_at, updated_at)
  VALUES (
    gen_random_uuid(),
    '[TEST] RRK-4P Round Robin 4 Players',
    'Round Robin + Knockout: 4 players, 1 group, top 2 advance',
    'round_robin_knockout',
    'singles',
    'enrollment',
    3,
    1,
    2,
    150,
    300,
    admin_id,
    NOW(),
    NOW()
  );

  -- RRK-6P: 6 players, 2 groups of 3, top 2 advance
  INSERT INTO tournaments (id, name, description, format, match_type, status, best_of, group_count, advance_per_group, elo_multiplier_base, elo_multiplier_finals, created_by, created_at, updated_at)
  VALUES (
    gen_random_uuid(),
    '[TEST] RRK-6P Round Robin 6 Players',
    'Round Robin + Knockout: 6 players, 2 groups of 3, top 2 advance',
    'round_robin_knockout',
    'singles',
    'enrollment',
    3,
    2,
    2,
    150,
    300,
    admin_id,
    NOW(),
    NOW()
  );

  -- RRK-8P: 8 players, 2 groups of 4, top 2 advance
  INSERT INTO tournaments (id, name, description, format, match_type, status, best_of, group_count, advance_per_group, elo_multiplier_base, elo_multiplier_finals, created_by, created_at, updated_at)
  VALUES (
    gen_random_uuid(),
    '[TEST] RRK-8P Round Robin 8 Players',
    'Round Robin + Knockout: 8 players, 2 groups of 4, top 2 advance',
    'round_robin_knockout',
    'singles',
    'enrollment',
    3,
    2,
    2,
    150,
    300,
    admin_id,
    NOW(),
    NOW()
  );

  -- RRK-10P: 10 players, 2 groups of 5, top 2 advance
  INSERT INTO tournaments (id, name, description, format, match_type, status, best_of, group_count, advance_per_group, elo_multiplier_base, elo_multiplier_finals, created_by, created_at, updated_at)
  VALUES (
    gen_random_uuid(),
    '[TEST] RRK-10P Round Robin 10 Players',
    'Round Robin + Knockout: 10 players, 2 groups of 5, top 2 advance',
    'round_robin_knockout',
    'singles',
    'enrollment',
    3,
    2,
    2,
    150,
    300,
    admin_id,
    NOW(),
    NOW()
  );

  RAISE NOTICE 'Created 10 test tournaments successfully!';
END $$;

-- Verify: List created test tournaments
SELECT id, name, format, status, best_of, group_count, advance_per_group
FROM tournaments
WHERE name LIKE '[TEST]%'
ORDER BY name;
