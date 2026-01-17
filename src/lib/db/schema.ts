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
export const challengeStatusEnum = pgEnum("challenge_status", [
  "pending",
  "accepted",
  "declined",
  "completed",
  "expired",
]);
export const achievementTierEnum = pgEnum("achievement_tier", [
  "bronze",
  "silver",
  "gold",
  "platinum",
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
  elo: integer("elo").notNull().default(1000),
  xp: integer("xp").notNull().default(0),
  level: integer("level").notNull().default(1),
  matchesPlayed: integer("matches_played").notNull().default(0),
  matchesWon: integer("matches_won").notNull().default(0),
  currentStreak: integer("current_streak").notNull().default(0),
  bestStreak: integer("best_streak").notNull().default(0),
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
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Challenges
export const challenges = pgTable("challenges", {
  id: uuid("id").primaryKey().defaultRandom(),
  challengerId: uuid("challenger_id")
    .notNull()
    .references(() => players.id, { onDelete: "cascade" }),
  challengedId: uuid("challenged_id")
    .notNull()
    .references(() => players.id, { onDelete: "cascade" }),
  status: challengeStatusEnum("status").notNull().default("pending"),
  message: text("message"),
  matchId: uuid("match_id").references(() => matches.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  expiresAt: timestamp("expires_at").notNull(),
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
  challengesSent: many(challenges, { relationName: "challenger" }),
  challengesReceived: many(challenges, { relationName: "challenged" }),
  achievements: many(playerAchievements),
}));

export const challengesRelations = relations(challenges, ({ one }) => ({
  challenger: one(players, {
    fields: [challenges.challengerId],
    references: [players.id],
    relationName: "challenger",
  }),
  challenged: one(players, {
    fields: [challenges.challengedId],
    references: [players.id],
    relationName: "challenged",
  }),
  match: one(matches, {
    fields: [challenges.matchId],
    references: [matches.id],
  }),
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

// Type exports
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Player = typeof players.$inferSelect;
export type NewPlayer = typeof players.$inferInsert;
export type Match = typeof matches.$inferSelect;
export type NewMatch = typeof matches.$inferInsert;
export type Challenge = typeof challenges.$inferSelect;
export type NewChallenge = typeof challenges.$inferInsert;
export type Achievement = typeof achievements.$inferSelect;
export type PlayerAchievement = typeof playerAchievements.$inferSelect;
