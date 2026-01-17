-- Enroll test players in test tournaments
-- Run this after 01-create-test-users.sql and 02-create-tournaments.sql

-- This script enrolls the correct number of players per tournament configuration

DO $$
DECLARE
  tournament_rec RECORD;
  player_rec RECORD;
  player_count INT;
  enrolled INT;
  target_count INT;
BEGIN
  -- Loop through each test tournament
  FOR tournament_rec IN
    SELECT id, name
    FROM tournaments
    WHERE name LIKE '[TEST]%'
      AND status = 'enrollment'
    ORDER BY name
  LOOP
    -- Determine how many players to enroll based on tournament name
    target_count := CASE
      WHEN tournament_rec.name LIKE '%2P%' THEN 2
      WHEN tournament_rec.name LIKE '%3P%' THEN 3
      WHEN tournament_rec.name LIKE '%4P%' THEN 4
      WHEN tournament_rec.name LIKE '%5P%' THEN 5
      WHEN tournament_rec.name LIKE '%6P%' THEN 6
      WHEN tournament_rec.name LIKE '%7P%' THEN 7
      WHEN tournament_rec.name LIKE '%8P%' THEN 8
      WHEN tournament_rec.name LIKE '%10P%' THEN 10
      WHEN tournament_rec.name LIKE '%12P%' THEN 12
      WHEN tournament_rec.name LIKE '%16P%' THEN 16
      ELSE 4  -- default
    END;

    enrolled := 0;

    -- Enroll players (ordered by ELO descending for seeding)
    FOR player_rec IN
      SELECT p.id
      FROM players p
      JOIN "user" u ON p.user_id = u.id
      WHERE u.email LIKE 'test%@pingpong.local'
      ORDER BY p.elo DESC
      LIMIT target_count
    LOOP
      -- Check if not already enrolled
      IF NOT EXISTS (
        SELECT 1 FROM tournament_enrollments
        WHERE tournament_id = tournament_rec.id
          AND player_id = player_rec.id
      ) THEN
        INSERT INTO tournament_enrollments (
          id, tournament_id, player_id, seed, is_active, enrolled_at
        ) VALUES (
          gen_random_uuid(),
          tournament_rec.id,
          player_rec.id,
          enrolled + 1,  -- seed based on enrollment order
          true,
          NOW()
        );
        enrolled := enrolled + 1;
      END IF;

      EXIT WHEN enrolled >= target_count;
    END LOOP;

    RAISE NOTICE 'Enrolled % players in tournament: %', enrolled, tournament_rec.name;
  END LOOP;
END $$;

-- Verify: Show enrollment counts per tournament
SELECT
  t.name,
  t.format,
  COUNT(te.id) as enrolled_count,
  t.status
FROM tournaments t
LEFT JOIN tournament_enrollments te ON t.id = te.tournament_id
WHERE t.name LIKE '[TEST]%'
GROUP BY t.id, t.name, t.format, t.status
ORDER BY t.name;
