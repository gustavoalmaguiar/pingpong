# Tournament Test SQL Scripts

Scripts for testing tournament bracket generation with various player counts and formats.

## Usage

Run these scripts in order in your PostgreSQL console:

```bash
# 1. Clean up any existing test data (optional)
psql -d your_database -f sql/00-cleanup-test-data.sql

# 2. Create test users and players
psql -d your_database -f sql/01-create-test-users.sql

# 3. Create test tournaments
psql -d your_database -f sql/02-create-tournaments.sql

# 4. Enroll players in tournaments
psql -d your_database -f sql/03-enroll-players.sql

# 5. Start tournaments from the UI (as admin)
# Go to /admin -> click each tournament -> click "Start Tournament"

# 6. Verify bracket generation
psql -d your_database -f sql/04-verify-tournaments.sql
```

## Test Scenarios

### Single Elimination

| Name | Players | Expected Byes | Notes |
|------|---------|---------------|-------|
| SE-2P | 2 | 0 | Minimum tournament, no byes |
| SE-3P | 3 | 1 | One player gets a bye |
| SE-4P | 4 | 0 | Perfect bracket |
| SE-5P | 5 | 3 | Multiple byes |
| SE-7P | 7 | 1 | One bye |
| SE-8P | 8 | 0 | Perfect bracket |

### Round Robin + Knockout

| Name | Players | Groups | Advance per Group | Notes |
|------|---------|--------|-------------------|-------|
| RRK-4P | 4 | 1 | 2 | Single group, top 2 to finals |
| RRK-6P | 6 | 2 | 2 | Two groups of 3 |
| RRK-8P | 8 | 2 | 2 | Two groups of 4 |
| RRK-10P | 10 | 2 | 2 | Two groups of 5 |

## What to Verify

After starting each tournament:

1. **Bye Handling** (Single Elim)
   - Bye matches have `status = 'bye'`
   - Bye matches have `winner_id` set to the non-null participant
   - Winners are advanced to next round matches

2. **Match Linking**
   - Round 2+ matches have `participant1_from_match_id` / `participant2_from_match_id` set
   - When a match completes, the winner appears in the linked next-round match

3. **Ready Matches**
   - At least some matches should have `status = 'ready'`
   - No tournament should be "stuck" with no playable matches

4. **Group Stage** (Round Robin)
   - All group matches created
   - After group stage completes, knockout bracket generates automatically
