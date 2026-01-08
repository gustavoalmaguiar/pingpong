CREATE TYPE "public"."bracket_type" AS ENUM('winners', 'losers', 'finals', 'group', 'swiss_round');--> statement-breakpoint
CREATE TYPE "public"."tournament_format" AS ENUM('single_elimination', 'double_elimination', 'swiss', 'round_robin_knockout');--> statement-breakpoint
CREATE TYPE "public"."tournament_match_status" AS ENUM('pending', 'ready', 'in_progress', 'completed', 'bye', 'walkover');--> statement-breakpoint
CREATE TYPE "public"."tournament_status" AS ENUM('draft', 'enrollment', 'in_progress', 'completed', 'cancelled');--> statement-breakpoint
CREATE TABLE "tournament_enrollments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tournament_id" uuid NOT NULL,
	"player_id" uuid NOT NULL,
	"partner_id" uuid,
	"team_name" text,
	"seed" integer,
	"seed_override" boolean DEFAULT false NOT NULL,
	"swiss_points" integer DEFAULT 0 NOT NULL,
	"swiss_opponents" text,
	"group_id" uuid,
	"group_points" integer DEFAULT 0 NOT NULL,
	"group_wins" integer DEFAULT 0 NOT NULL,
	"group_losses" integer DEFAULT 0 NOT NULL,
	"group_point_diff" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"enrolled_at" timestamp DEFAULT now() NOT NULL,
	"eliminated_at" timestamp,
	"final_placement" integer,
	CONSTRAINT "tournament_enrollments_tournament_id_player_id_unique" UNIQUE("tournament_id","player_id")
);
--> statement-breakpoint
CREATE TABLE "tournament_groups" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tournament_id" uuid NOT NULL,
	"name" text NOT NULL,
	"display_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tournament_matches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tournament_id" uuid NOT NULL,
	"round_id" uuid NOT NULL,
	"position" integer NOT NULL,
	"bracket_type" "bracket_type" DEFAULT 'winners' NOT NULL,
	"participant1_id" uuid,
	"participant2_id" uuid,
	"participant1_from_match_id" uuid,
	"participant2_from_match_id" uuid,
	"participant1_is_winner" boolean,
	"participant2_is_winner" boolean,
	"winner_id" uuid,
	"scores" text,
	"linked_match_id" uuid,
	"elo_multiplier" integer DEFAULT 100 NOT NULL,
	"status" "tournament_match_status" DEFAULT 'pending' NOT NULL,
	"is_walkover" boolean DEFAULT false NOT NULL,
	"walkover_reason" text,
	"group_id" uuid,
	"scheduled_time" timestamp,
	"played_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "tournament_matches_tournament_id_round_id_position_bracket_type_unique" UNIQUE("tournament_id","round_id","position","bracket_type")
);
--> statement-breakpoint
CREATE TABLE "tournament_rounds" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tournament_id" uuid NOT NULL,
	"round_number" integer NOT NULL,
	"name" text NOT NULL,
	"bracket_type" "bracket_type" DEFAULT 'winners' NOT NULL,
	"elo_multiplier" integer NOT NULL,
	"best_of" integer DEFAULT 1 NOT NULL,
	"started_at" timestamp,
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "tournament_rounds_tournament_id_round_number_bracket_type_unique" UNIQUE("tournament_id","round_number","bracket_type")
);
--> statement-breakpoint
CREATE TABLE "tournaments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"format" "tournament_format" NOT NULL,
	"match_type" "match_type" NOT NULL,
	"status" "tournament_status" DEFAULT 'draft' NOT NULL,
	"scheduled_date" timestamp,
	"scheduled_time" text,
	"location" text,
	"prize_description" text,
	"elo_multiplier_base" integer DEFAULT 150 NOT NULL,
	"elo_multiplier_finals" integer DEFAULT 300 NOT NULL,
	"best_of" integer DEFAULT 1 NOT NULL,
	"swiss_rounds" integer,
	"group_count" integer,
	"advance_per_group" integer,
	"current_round" integer DEFAULT 0,
	"total_rounds" integer,
	"created_by" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"started_at" timestamp,
	"completed_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "tournament_enrollments" ADD CONSTRAINT "tournament_enrollments_tournament_id_tournaments_id_fk" FOREIGN KEY ("tournament_id") REFERENCES "public"."tournaments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tournament_enrollments" ADD CONSTRAINT "tournament_enrollments_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tournament_enrollments" ADD CONSTRAINT "tournament_enrollments_partner_id_players_id_fk" FOREIGN KEY ("partner_id") REFERENCES "public"."players"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tournament_enrollments" ADD CONSTRAINT "tournament_enrollments_group_id_tournament_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."tournament_groups"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tournament_groups" ADD CONSTRAINT "tournament_groups_tournament_id_tournaments_id_fk" FOREIGN KEY ("tournament_id") REFERENCES "public"."tournaments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tournament_matches" ADD CONSTRAINT "tournament_matches_tournament_id_tournaments_id_fk" FOREIGN KEY ("tournament_id") REFERENCES "public"."tournaments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tournament_matches" ADD CONSTRAINT "tournament_matches_round_id_tournament_rounds_id_fk" FOREIGN KEY ("round_id") REFERENCES "public"."tournament_rounds"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tournament_matches" ADD CONSTRAINT "tournament_matches_participant1_id_tournament_enrollments_id_fk" FOREIGN KEY ("participant1_id") REFERENCES "public"."tournament_enrollments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tournament_matches" ADD CONSTRAINT "tournament_matches_participant2_id_tournament_enrollments_id_fk" FOREIGN KEY ("participant2_id") REFERENCES "public"."tournament_enrollments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tournament_matches" ADD CONSTRAINT "tournament_matches_winner_id_tournament_enrollments_id_fk" FOREIGN KEY ("winner_id") REFERENCES "public"."tournament_enrollments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tournament_matches" ADD CONSTRAINT "tournament_matches_linked_match_id_matches_id_fk" FOREIGN KEY ("linked_match_id") REFERENCES "public"."matches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tournament_matches" ADD CONSTRAINT "tournament_matches_group_id_tournament_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."tournament_groups"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tournament_rounds" ADD CONSTRAINT "tournament_rounds_tournament_id_tournaments_id_fk" FOREIGN KEY ("tournament_id") REFERENCES "public"."tournaments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tournaments" ADD CONSTRAINT "tournaments_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;