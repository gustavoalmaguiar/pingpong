ALTER TABLE "matches" ADD COLUMN "tournament_match_id" uuid;--> statement-breakpoint
ALTER TABLE "players" ADD COLUMN "tournament_matches_played" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "players" ADD COLUMN "tournament_matches_won" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "players" ADD COLUMN "tournaments_played" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "players" ADD COLUMN "tournaments_won" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "tournament_matches" ADD COLUMN "is_next_match" boolean DEFAULT false NOT NULL;