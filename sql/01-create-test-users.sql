-- Create test users and players for tournament testing
-- Run this first to create the base data

-- First, get the admin user ID (you need at least one admin to create tournaments)
-- This assumes you already have an admin user. If not, update an existing user:
-- UPDATE "user" SET is_admin = true WHERE email = 'your-email@example.com';

-- Create 16 test users
INSERT INTO "user" (id, name, email, is_admin, created_at)
VALUES
  (gen_random_uuid(), 'Test Player 1', 'test1@pingpong.local', false, NOW()),
  (gen_random_uuid(), 'Test Player 2', 'test2@pingpong.local', false, NOW()),
  (gen_random_uuid(), 'Test Player 3', 'test3@pingpong.local', false, NOW()),
  (gen_random_uuid(), 'Test Player 4', 'test4@pingpong.local', false, NOW()),
  (gen_random_uuid(), 'Test Player 5', 'test5@pingpong.local', false, NOW()),
  (gen_random_uuid(), 'Test Player 6', 'test6@pingpong.local', false, NOW()),
  (gen_random_uuid(), 'Test Player 7', 'test7@pingpong.local', false, NOW()),
  (gen_random_uuid(), 'Test Player 8', 'test8@pingpong.local', false, NOW()),
  (gen_random_uuid(), 'Test Player 9', 'test9@pingpong.local', false, NOW()),
  (gen_random_uuid(), 'Test Player 10', 'test10@pingpong.local', false, NOW()),
  (gen_random_uuid(), 'Test Player 11', 'test11@pingpong.local', false, NOW()),
  (gen_random_uuid(), 'Test Player 12', 'test12@pingpong.local', false, NOW()),
  (gen_random_uuid(), 'Test Player 13', 'test13@pingpong.local', false, NOW()),
  (gen_random_uuid(), 'Test Player 14', 'test14@pingpong.local', false, NOW()),
  (gen_random_uuid(), 'Test Player 15', 'test15@pingpong.local', false, NOW()),
  (gen_random_uuid(), 'Test Player 16', 'test16@pingpong.local', false, NOW())
ON CONFLICT (email) DO NOTHING;

-- Create players for each test user with varied ELO ratings
INSERT INTO players (id, user_id, display_name, elo, xp, level, matches_played, matches_won, created_at, updated_at)
SELECT
  gen_random_uuid(),
  u.id,
  u.name,
  800 + (RANDOM() * 600)::int,  -- ELO between 800-1400
  0,
  1,
  0,
  0,
  NOW(),
  NOW()
FROM "user" u
WHERE u.email LIKE 'test%@pingpong.local'
  AND NOT EXISTS (
    SELECT 1 FROM players p WHERE p.user_id = u.id
  );

-- Verify: Show created test players
SELECT p.id, p.display_name, p.elo, u.email
FROM players p
JOIN "user" u ON p.user_id = u.id
WHERE u.email LIKE 'test%@pingpong.local'
ORDER BY p.display_name;
