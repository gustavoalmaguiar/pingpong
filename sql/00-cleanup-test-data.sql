-- Cleanup test data (run before re-testing)
-- WARNING: This deletes ALL test tournaments and their related data

-- Delete tournament matches first (foreign key dependency)
DELETE FROM tournament_matches
WHERE tournament_id IN (
  SELECT id FROM tournaments WHERE name LIKE '[TEST]%'
);

-- Delete tournament rounds
DELETE FROM tournament_rounds
WHERE tournament_id IN (
  SELECT id FROM tournaments WHERE name LIKE '[TEST]%'
);

-- Delete tournament enrollments
DELETE FROM tournament_enrollments
WHERE tournament_id IN (
  SELECT id FROM tournaments WHERE name LIKE '[TEST]%'
);

-- Delete tournament groups
DELETE FROM tournament_groups
WHERE tournament_id IN (
  SELECT id FROM tournaments WHERE name LIKE '[TEST]%'
);

-- Delete tournaments
DELETE FROM tournaments
WHERE name LIKE '[TEST]%';

-- Optionally: Delete test players (uncomment if needed)
-- DELETE FROM players
-- WHERE user_id IN (
--   SELECT id FROM "user" WHERE email LIKE 'test%@pingpong.local'
-- );

-- Optionally: Delete test users (uncomment if needed)
-- DELETE FROM "user" WHERE email LIKE 'test%@pingpong.local';

-- Verify cleanup
SELECT 'Remaining test tournaments:' as info, COUNT(*) as count
FROM tournaments WHERE name LIKE '[TEST]%';

SELECT 'Remaining test players:' as info, COUNT(*) as count
FROM players p
JOIN "user" u ON p.user_id = u.id
WHERE u.email LIKE 'test%@pingpong.local';
