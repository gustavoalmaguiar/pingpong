-- Fix Tournament Streaks Data Migration
-- This script fixes the inconsistency where tournament matches were updating
-- regular match streaks (currentStreak/bestStreak) instead of separate tournament streaks.

-- Step 1: Reset regular streaks for players who have tournament matches but no regular matches
-- These players got their regular streaks inflated by tournament wins
UPDATE players
SET current_streak = 0
WHERE matches_won = 0 AND current_streak > 0;

-- Step 2: Recalculate tournament streaks based on tournament match history
-- This calculates the best streak for each player from their tournament matches

-- First, let's create a temporary view of consecutive tournament wins
WITH tournament_results AS (
  -- Get all tournament matches with their outcomes for each player
  SELECT
    tm.id,
    tm.played_at,
    te_winner.player_id AS winner_player_id,
    te_loser.player_id AS loser_player_id
  FROM tournament_matches tm
  JOIN tournament_enrollments te_winner ON te_winner.id = tm.winner_id
  JOIN tournament_enrollments te_loser ON (
    te_loser.id = tm.participant1_id OR te_loser.id = tm.participant2_id
  ) AND te_loser.id != tm.winner_id
  WHERE tm.status = 'completed'
    AND tm.winner_id IS NOT NULL
),
player_tournament_matches AS (
  -- Flatten to get each player's match results
  SELECT
    winner_player_id AS player_id,
    played_at,
    TRUE AS is_win
  FROM tournament_results
  UNION ALL
  SELECT
    loser_player_id AS player_id,
    played_at,
    FALSE AS is_win
  FROM tournament_results
),
ordered_matches AS (
  -- Order matches by player and time, mark streak breaks
  SELECT
    player_id,
    is_win,
    played_at,
    ROW_NUMBER() OVER (PARTITION BY player_id ORDER BY played_at) AS match_num,
    SUM(CASE WHEN is_win = FALSE THEN 1 ELSE 0 END) OVER (
      PARTITION BY player_id ORDER BY played_at
    ) AS loss_count
  FROM player_tournament_matches
),
streaks AS (
  -- Calculate streaks (group consecutive wins)
  SELECT
    player_id,
    COUNT(*) AS streak_length
  FROM ordered_matches
  WHERE is_win = TRUE
  GROUP BY player_id, (match_num - loss_count)
),
best_streaks AS (
  -- Get best streak for each player
  SELECT
    player_id,
    MAX(streak_length) AS best_streak
  FROM streaks
  GROUP BY player_id
),
current_streaks AS (
  -- Get current streak (most recent consecutive wins)
  SELECT
    player_id,
    COUNT(*) AS current_streak
  FROM (
    SELECT
      player_id,
      is_win,
      ROW_NUMBER() OVER (PARTITION BY player_id ORDER BY played_at DESC) AS rev_num
    FROM player_tournament_matches
  ) recent
  WHERE is_win = TRUE
    AND rev_num = (
      SELECT MIN(r2.rev_num)
      FROM (
        SELECT player_id, is_win,
          ROW_NUMBER() OVER (PARTITION BY player_id ORDER BY played_at DESC) AS rev_num
        FROM player_tournament_matches
      ) r2
      WHERE r2.player_id = recent.player_id AND r2.is_win = FALSE
      -- If no loss found, this returns NULL and the WHERE fails
    ) + 1
    OR NOT EXISTS (
      SELECT 1 FROM player_tournament_matches ptm
      WHERE ptm.player_id = recent.player_id AND ptm.is_win = FALSE
    )
  GROUP BY player_id
)
-- Update players with their calculated tournament streaks
UPDATE players p
SET
  tournament_best_streak = COALESCE(bs.best_streak, 0),
  tournament_current_streak = COALESCE(cs.current_streak, 0)
FROM best_streaks bs
LEFT JOIN current_streaks cs ON bs.player_id = cs.player_id
WHERE p.id = bs.player_id;

-- Verification: Show players affected
SELECT
  id,
  display_name,
  matches_won,
  current_streak,
  best_streak,
  tournament_matches_won,
  tournament_current_streak,
  tournament_best_streak
FROM players
WHERE tournament_matches_played > 0 OR matches_played > 0
ORDER BY display_name;
