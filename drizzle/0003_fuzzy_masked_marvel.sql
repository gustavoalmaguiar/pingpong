ALTER TABLE "tournament_matches" ADD COLUMN "best_of" integer;--> statement-breakpoint
ALTER TABLE "tournaments" ADD COLUMN "best_of_group_stage" integer;--> statement-breakpoint
ALTER TABLE "tournaments" ADD COLUMN "best_of_early_rounds" integer;--> statement-breakpoint
ALTER TABLE "tournaments" ADD COLUMN "best_of_semi_finals" integer;--> statement-breakpoint
ALTER TABLE "tournaments" ADD COLUMN "best_of_finals" integer;