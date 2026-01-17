-- Verification queries to check tournament state after starting
-- Run these after starting tournaments from the UI

-- ============================================
-- 1. Tournament overview
-- ============================================
SELECT
  t.name,
  t.format,
  t.status,
  t.best_of,
  COUNT(DISTINCT te.id) as enrolled,
  COUNT(DISTINCT tr.id) as rounds,
  COUNT(DISTINCT tm.id) as matches
FROM tournaments t
LEFT JOIN tournament_enrollments te ON t.id = te.tournament_id
LEFT JOIN tournament_rounds tr ON t.id = tr.tournament_id
LEFT JOIN tournament_matches tm ON t.id = tm.tournament_id
WHERE t.name LIKE '[TEST]%'
GROUP BY t.id
ORDER BY t.name;

-- ============================================
-- 2. Match status breakdown per tournament
-- ============================================
SELECT
  t.name,
  tm.status,
  COUNT(*) as count
FROM tournaments t
JOIN tournament_matches tm ON t.id = tm.tournament_id
WHERE t.name LIKE '[TEST]%'
GROUP BY t.id, t.name, tm.status
ORDER BY t.name, tm.status;

-- ============================================
-- 3. Bye matches verification
-- ============================================
SELECT
  t.name,
  tr.name as round_name,
  tm.position,
  tm.status,
  p1.display_name as participant1,
  p2.display_name as participant2,
  w.display_name as winner,
  tm.participant1_from_match_id,
  tm.participant2_from_match_id
FROM tournaments t
JOIN tournament_matches tm ON t.id = tm.tournament_id
JOIN tournament_rounds tr ON tm.round_id = tr.id
LEFT JOIN tournament_enrollments te1 ON tm.participant1_id = te1.id
LEFT JOIN players p1 ON te1.player_id = p1.id
LEFT JOIN tournament_enrollments te2 ON tm.participant2_id = te2.id
LEFT JOIN players p2 ON te2.player_id = p2.id
LEFT JOIN tournament_enrollments tew ON tm.winner_id = tew.id
LEFT JOIN players w ON tew.player_id = w.id
WHERE t.name LIKE '[TEST]%'
  AND tm.status = 'bye'
ORDER BY t.name, tr.round_number, tm.position;

-- ============================================
-- 4. Ready matches (should exist if bracket works)
-- ============================================
SELECT
  t.name,
  tr.name as round_name,
  tm.position,
  tm.status,
  p1.display_name as participant1,
  p2.display_name as participant2
FROM tournaments t
JOIN tournament_matches tm ON t.id = tm.tournament_id
JOIN tournament_rounds tr ON tm.round_id = tr.id
LEFT JOIN tournament_enrollments te1 ON tm.participant1_id = te1.id
LEFT JOIN players p1 ON te1.player_id = p1.id
LEFT JOIN tournament_enrollments te2 ON tm.participant2_id = te2.id
LEFT JOIN players p2 ON te2.player_id = p2.id
WHERE t.name LIKE '[TEST]%'
  AND tm.status = 'ready'
ORDER BY t.name, tr.round_number, tm.position;

-- ============================================
-- 5. Match linking verification (participant_from_match_id)
-- ============================================
SELECT
  t.name,
  tr.name as round_name,
  tm.position,
  tm.participant1_from_match_id IS NOT NULL as has_p1_link,
  tm.participant2_from_match_id IS NOT NULL as has_p2_link
FROM tournaments t
JOIN tournament_matches tm ON t.id = tm.tournament_id
JOIN tournament_rounds tr ON tm.round_id = tr.id
WHERE t.name LIKE '[TEST]%'
  AND t.format = 'single_elimination'
  AND tr.round_number > 1
ORDER BY t.name, tr.round_number, tm.position;

-- ============================================
-- 6. Group stage matches (for round robin)
-- ============================================
SELECT
  t.name,
  tg.name as group_name,
  p1.display_name as participant1,
  p2.display_name as participant2,
  tm.status,
  tm.scores
FROM tournaments t
JOIN tournament_matches tm ON t.id = tm.tournament_id
JOIN tournament_groups tg ON tm.group_id = tg.id
LEFT JOIN tournament_enrollments te1 ON tm.participant1_id = te1.id
LEFT JOIN players p1 ON te1.player_id = p1.id
LEFT JOIN tournament_enrollments te2 ON tm.participant2_id = te2.id
LEFT JOIN players p2 ON te2.player_id = p2.id
WHERE t.name LIKE '[TEST]%'
  AND t.format = 'round_robin_knockout'
ORDER BY t.name, tg.name, tm.position;
