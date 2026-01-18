import {
  pgTable,
  uuid,
  text,
  integer,
  boolean,
  timestamp,
  pgEnum,
  unique,
  primaryKey,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import type { AdapterAccountType } from "next-auth/adapters";

// Enums
export const matchTypeEnum = pgEnum("match_type", ["singles", "doubles"]);
export const achievementTierEnum = pgEnum("achievement_tier", [
  "bronze",
  "silver",
  "gold",
  "platinum",
]);

// Tournament enums
export const tournamentFormatEnum = pgEnum("tournament_format", [
  "single_elimination",
  "double_elimination",
  "swiss",
  "round_robin_knockout",
]);

export const tournamentStatusEnum = pgEnum("tournament_status", [
  "draft",
  "enrollment",
  "in_progress",
  "completed",
  "cancelled",
]);

export const bracketTypeEnum = pgEnum("bracket_type", [
  "winners",
  "losers",
  "finals",
  "group",
  "swiss_round",
]);

export const tournamentMatchStatusEnum = pgEnum("tournament_match_status", [
  "pending",
  "ready",
  "in_progress",
  "completed",
  "bye",
  "walkover",
]);

// NextAuth required tables
export const users = pgTable("user", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name"),
  email: text("email").unique(),
  emailVerified: timestamp("emailVerified", { mode: "date" }),
  image: text("image"),
  // Custom fields
  isAdmin: boolean("is_admin").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const accounts = pgTable(
  "account",
  {
    userId: uuid("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").$type<AdapterAccountType>().notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("providerAccountId").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (account) => [
    primaryKey({ columns: [account.provider, account.providerAccountId] }),
  ]
);

export const sessions = pgTable("session", {
  sessionToken: text("sessionToken").primaryKey(),
  userId: uuid("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { mode: "date" }).notNull(),
});

export const verificationTokens = pgTable(
  "verificationToken",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", { mode: "date" }).notNull(),
  },
  (vt) => [primaryKey({ columns: [vt.identifier, vt.token] })]
);

// Players (game stats)
export const players = pgTable("players", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: "cascade" }),
  displayName: text("display_name").notNull(),
  slug: text("slug").notNull().unique(),
  elo: integer("elo").notNull().default(1000),
  xp: integer("xp").notNull().default(0),
  level: integer("level").notNull().default(1),
  matchesPlayed: integer("matches_played").notNull().default(0),
  matchesWon: integer("matches_won").notNull().default(0),
  currentStreak: integer("current_streak").notNull().default(0),
  bestStreak: integer("best_streak").notNull().default(0),
  // Tournament stats (separate from regular match stats)
  tournamentMatchesPlayed: integer("tournament_matches_played").notNull().default(0),
  tournamentMatchesWon: integer("tournament_matches_won").notNull().default(0),
  tournamentsPlayed: integer("tournaments_played").notNull().default(0),
  tournamentsWon: integer("tournaments_won").notNull().default(0),
  tournamentCurrentStreak: integer("tournament_current_streak").notNull().default(0),
  tournamentBestStreak: integer("tournament_best_streak").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Matches
export const matches = pgTable("matches", {
  id: uuid("id").primaryKey().defaultRandom(),
  type: matchTypeEnum("type").notNull(),
  winnerScore: integer("winner_score").notNull(),
  loserScore: integer("loser_score").notNull(),
  eloChange: integer("elo_change").notNull(),
  playedAt: timestamp("played_at").notNull().defaultNow(),
  loggedBy: uuid("logged_by")
    .notNull()
    .references(() => users.id),
  // Singles
  winnerId: uuid("winner_id").references(() => players.id),
  loserId: uuid("loser_id").references(() => players.id),
  // Doubles
  winnerTeamP1: uuid("winner_team_p1").references(() => players.id),
  winnerTeamP2: uuid("winner_team_p2").references(() => players.id),
  loserTeamP1: uuid("loser_team_p1").references(() => players.id),
  loserTeamP2: uuid("loser_team_p2").references(() => players.id),
  // Tournament match reference (for visual distinction and linking)
  tournamentMatchId: uuid("tournament_match_id"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Achievements (definitions)
export const achievements = pgTable("achievements", {
  id: uuid("id").primaryKey().defaultRandom(),
  key: text("key").notNull().unique(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  icon: text("icon").notNull(),
  xpReward: integer("xp_reward").notNull(),
  tier: achievementTierEnum("tier").notNull(),
});

// Player Achievements (earned)
export const playerAchievements = pgTable(
  "player_achievements",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    playerId: uuid("player_id")
      .notNull()
      .references(() => players.id, { onDelete: "cascade" }),
    achievementId: uuid("achievement_id")
      .notNull()
      .references(() => achievements.id, { onDelete: "cascade" }),
    earnedAt: timestamp("earned_at").notNull().defaultNow(),
  },
  (table) => [unique().on(table.playerId, table.achievementId)]
);

// Tournaments
export const tournaments = pgTable("tournaments", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  description: text("description"),
  format: tournamentFormatEnum("format").notNull(),
  matchType: matchTypeEnum("match_type").notNull(),
  status: tournamentStatusEnum("status").notNull().default("draft"),
  // Schedule
  scheduledDate: timestamp("scheduled_date"),
  scheduledTime: text("scheduled_time"), // e.g., "14:00"
  location: text("location"),
  // Fun prize description
  prizeDescription: text("prize_description"),
  // ELO multiplier settings (stored as percentage: 150 = 1.5x)
  eloMultiplierBase: integer("elo_multiplier_base").notNull().default(150),
  eloMultiplierFinals: integer("elo_multiplier_finals").notNull().default(300),
  // Format configuration
  bestOf: integer("best_of").notNull().default(1),
  // Stage-specific bestOf overrides (nullable - falls back to bestOf if not set)
  bestOfGroupStage: integer("best_of_group_stage"),
  bestOfEarlyRounds: integer("best_of_early_rounds"),
  bestOfSemiFinals: integer("best_of_semi_finals"),
  bestOfFinals: integer("best_of_finals"),
  swissRounds: integer("swiss_rounds"), // For Swiss format
  groupCount: integer("group_count"), // For round-robin
  advancePerGroup: integer("advance_per_group"), // How many advance from each group
  // Tracking
  currentRound: integer("current_round").default(0),
  totalRounds: integer("total_rounds"),
  // Admin
  createdBy: uuid("created_by")
    .notNull()
    .references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
});

// Tournament Groups (for round-robin format)
export const tournamentGroups = pgTable("tournament_groups", {
  id: uuid("id").primaryKey().defaultRandom(),
  tournamentId: uuid("tournament_id")
    .notNull()
    .references(() => tournaments.id, { onDelete: "cascade" }),
  name: text("name").notNull(), // "A", "B", etc.
  displayOrder: integer("display_order").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Tournament Enrollments (players/teams enrolled in tournament)
export const tournamentEnrollments = pgTable(
  "tournament_enrollments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tournamentId: uuid("tournament_id")
      .notNull()
      .references(() => tournaments.id, { onDelete: "cascade" }),
    playerId: uuid("player_id")
      .notNull()
      .references(() => players.id, { onDelete: "cascade" }),
    // For doubles tournaments
    partnerId: uuid("partner_id").references(() => players.id, {
      onDelete: "cascade",
    }),
    teamName: text("team_name"),
    // Seeding
    seed: integer("seed"),
    seedOverride: boolean("seed_override").notNull().default(false),
    // Swiss system tracking
    swissPoints: integer("swiss_points").notNull().default(0),
    swissOpponents: text("swiss_opponents"), // JSON array of opponent enrollment IDs
    // Group assignment
    groupId: uuid("group_id").references(() => tournamentGroups.id),
    groupPoints: integer("group_points").notNull().default(0),
    groupWins: integer("group_wins").notNull().default(0),
    groupLosses: integer("group_losses").notNull().default(0),
    groupPointDiff: integer("group_point_diff").notNull().default(0),
    // Status
    isActive: boolean("is_active").notNull().default(true),
    enrolledAt: timestamp("enrolled_at").notNull().defaultNow(),
    eliminatedAt: timestamp("eliminated_at"),
    finalPlacement: integer("final_placement"),
  },
  (table) => [unique().on(table.tournamentId, table.playerId)]
);

// Tournament Rounds
export const tournamentRounds = pgTable(
  "tournament_rounds",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tournamentId: uuid("tournament_id")
      .notNull()
      .references(() => tournaments.id, { onDelete: "cascade" }),
    roundNumber: integer("round_number").notNull(),
    name: text("name").notNull(), // "Round of 16", "Quarterfinals", etc.
    bracketType: bracketTypeEnum("bracket_type").notNull().default("winners"),
    // ELO multiplier for this round
    eloMultiplier: integer("elo_multiplier").notNull(),
    bestOf: integer("best_of").notNull().default(1),
    // Timestamps
    startedAt: timestamp("started_at"),
    completedAt: timestamp("completed_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    unique().on(table.tournamentId, table.roundNumber, table.bracketType),
  ]
);

// Tournament Matches (bracket matches)
export const tournamentMatches = pgTable(
  "tournament_matches",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tournamentId: uuid("tournament_id")
      .notNull()
      .references(() => tournaments.id, { onDelete: "cascade" }),
    roundId: uuid("round_id")
      .notNull()
      .references(() => tournamentRounds.id, { onDelete: "cascade" }),
    // Position in bracket
    position: integer("position").notNull(),
    bracketType: bracketTypeEnum("bracket_type").notNull().default("winners"),
    // Participants (enrollment IDs)
    participant1Id: uuid("participant1_id").references(
      () => tournamentEnrollments.id
    ),
    participant2Id: uuid("participant2_id").references(
      () => tournamentEnrollments.id
    ),
    // Where participants come from (for advancement)
    participant1FromMatchId: uuid("participant1_from_match_id"),
    participant2FromMatchId: uuid("participant2_from_match_id"),
    participant1IsWinner: boolean("participant1_is_winner"), // True = winner advances, False = loser
    participant2IsWinner: boolean("participant2_is_winner"),
    // Result
    winnerId: uuid("winner_id").references(() => tournamentEnrollments.id),
    scores: text("scores"), // JSON: [{ p1: 11, p2: 9 }, { p1: 11, p2: 7 }]
    // Link to regular match for ELO tracking
    linkedMatchId: uuid("linked_match_id").references(() => matches.id),
    // ELO multiplier applied
    eloMultiplier: integer("elo_multiplier").notNull().default(100),
    // Per-match bestOf override (nullable - falls back to round.bestOf if not set)
    bestOf: integer("best_of"),
    // Status
    status: tournamentMatchStatusEnum("status").notNull().default("pending"),
    isWalkover: boolean("is_walkover").notNull().default(false),
    walkoverReason: text("walkover_reason"),
    // Next match indicator for ordering
    isNextMatch: boolean("is_next_match").notNull().default(false),
    // Group reference (for group stage)
    groupId: uuid("group_id").references(() => tournamentGroups.id),
    // Scheduling
    scheduledTime: timestamp("scheduled_time"),
    playedAt: timestamp("played_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    unique().on(table.tournamentId, table.roundId, table.position, table.bracketType),
  ]
);

// Relations
export const usersRelations = relations(users, ({ many, one }) => ({
  accounts: many(accounts),
  sessions: many(sessions),
  player: one(players, {
    fields: [users.id],
    references: [players.userId],
  }),
}));

export const accountsRelations = relations(accounts, ({ one }) => ({
  user: one(users, {
    fields: [accounts.userId],
    references: [users.id],
  }),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, {
    fields: [sessions.userId],
    references: [users.id],
  }),
}));

export const playersRelations = relations(players, ({ one, many }) => ({
  user: one(users, {
    fields: [players.userId],
    references: [users.id],
  }),
  achievements: many(playerAchievements),
  tournamentEnrollments: many(tournamentEnrollments),
}));

export const achievementsRelations = relations(achievements, ({ many }) => ({
  players: many(playerAchievements),
}));

export const playerAchievementsRelations = relations(playerAchievements, ({ one }) => ({
  player: one(players, {
    fields: [playerAchievements.playerId],
    references: [players.id],
  }),
  achievement: one(achievements, {
    fields: [playerAchievements.achievementId],
    references: [achievements.id],
  }),
}));

// Match relations (for tournament match linking)
export const matchesRelations = relations(matches, ({ one }) => ({
  tournamentMatch: one(tournamentMatches, {
    fields: [matches.tournamentMatchId],
    references: [tournamentMatches.id],
  }),
}));

// Tournament relations
export const tournamentsRelations = relations(tournaments, ({ one, many }) => ({
  creator: one(users, {
    fields: [tournaments.createdBy],
    references: [users.id],
  }),
  enrollments: many(tournamentEnrollments),
  rounds: many(tournamentRounds),
  matches: many(tournamentMatches),
  groups: many(tournamentGroups),
}));

export const tournamentGroupsRelations = relations(tournamentGroups, ({ one, many }) => ({
  tournament: one(tournaments, {
    fields: [tournamentGroups.tournamentId],
    references: [tournaments.id],
  }),
  enrollments: many(tournamentEnrollments),
  matches: many(tournamentMatches),
}));

export const tournamentEnrollmentsRelations = relations(tournamentEnrollments, ({ one }) => ({
  tournament: one(tournaments, {
    fields: [tournamentEnrollments.tournamentId],
    references: [tournaments.id],
  }),
  player: one(players, {
    fields: [tournamentEnrollments.playerId],
    references: [players.id],
  }),
  partner: one(players, {
    fields: [tournamentEnrollments.partnerId],
    references: [players.id],
  }),
  group: one(tournamentGroups, {
    fields: [tournamentEnrollments.groupId],
    references: [tournamentGroups.id],
  }),
}));

export const tournamentRoundsRelations = relations(tournamentRounds, ({ one, many }) => ({
  tournament: one(tournaments, {
    fields: [tournamentRounds.tournamentId],
    references: [tournaments.id],
  }),
  matches: many(tournamentMatches),
}));

export const tournamentMatchesRelations = relations(tournamentMatches, ({ one }) => ({
  tournament: one(tournaments, {
    fields: [tournamentMatches.tournamentId],
    references: [tournaments.id],
  }),
  round: one(tournamentRounds, {
    fields: [tournamentMatches.roundId],
    references: [tournamentRounds.id],
  }),
  participant1: one(tournamentEnrollments, {
    fields: [tournamentMatches.participant1Id],
    references: [tournamentEnrollments.id],
  }),
  participant2: one(tournamentEnrollments, {
    fields: [tournamentMatches.participant2Id],
    references: [tournamentEnrollments.id],
  }),
  winner: one(tournamentEnrollments, {
    fields: [tournamentMatches.winnerId],
    references: [tournamentEnrollments.id],
  }),
  linkedMatch: one(matches, {
    fields: [tournamentMatches.linkedMatchId],
    references: [matches.id],
  }),
  group: one(tournamentGroups, {
    fields: [tournamentMatches.groupId],
    references: [tournamentGroups.id],
  }),
}));

// Type exports
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Player = typeof players.$inferSelect;
export type NewPlayer = typeof players.$inferInsert;
export type Match = typeof matches.$inferSelect;
export type NewMatch = typeof matches.$inferInsert;
export type Achievement = typeof achievements.$inferSelect;
export type PlayerAchievement = typeof playerAchievements.$inferSelect;

// Tournament types
export type Tournament = typeof tournaments.$inferSelect;
export type NewTournament = typeof tournaments.$inferInsert;
export type TournamentGroup = typeof tournamentGroups.$inferSelect;
export type NewTournamentGroup = typeof tournamentGroups.$inferInsert;
export type TournamentEnrollment = typeof tournamentEnrollments.$inferSelect;
export type NewTournamentEnrollment = typeof tournamentEnrollments.$inferInsert;
export type TournamentRound = typeof tournamentRounds.$inferSelect;
export type NewTournamentRound = typeof tournamentRounds.$inferInsert;
export type TournamentMatch = typeof tournamentMatches.$inferSelect;
export type NewTournamentMatch = typeof tournamentMatches.$inferInsert;
