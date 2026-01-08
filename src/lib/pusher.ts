import Pusher from "pusher";
import PusherClient from "pusher-js";

// Server-side Pusher instance
export const pusherServer = new Pusher({
  appId: process.env.PUSHER_APP_ID!,
  key: process.env.PUSHER_KEY!,
  secret: process.env.PUSHER_SECRET!,
  cluster: process.env.PUSHER_CLUSTER!,
  useTLS: true,
});

// Client-side Pusher instance (singleton)
let pusherClientInstance: PusherClient | null = null;

export function getPusherClient(): PusherClient {
  if (!pusherClientInstance) {
    pusherClientInstance = new PusherClient(
      process.env.NEXT_PUBLIC_PUSHER_KEY!,
      {
        cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
      }
    );
  }
  return pusherClientInstance;
}

// Channel names
export const CHANNELS = {
  LEADERBOARD: "leaderboard",
  MATCHES: "matches",
  CHALLENGES: "challenges",
  TOURNAMENTS: "tournaments",
} as const;

// Dynamic channel for specific tournament
export function getTournamentChannel(tournamentId: string) {
  return `tournament-${tournamentId}`;
}

// Event names
export const EVENTS = {
  MATCH_CREATED: "match:created",
  LEADERBOARD_UPDATE: "leaderboard:update",
  PLAYER_UPDATE: "player:update",
  CHALLENGE_CREATED: "challenge:created",
  CHALLENGE_UPDATED: "challenge:updated",
  ACHIEVEMENT_UNLOCKED: "achievement:unlocked",
  // Tournament events
  TOURNAMENT_ENROLLMENT: "tournament:enrollment",
  TOURNAMENT_WITHDRAWAL: "tournament:withdrawal",
  TOURNAMENT_STARTED: "tournament:started",
  TOURNAMENT_MATCH_COMPLETED: "tournament:match:completed",
  TOURNAMENT_BRACKET_UPDATE: "tournament:bracket:update",
  TOURNAMENT_COMPLETED: "tournament:completed",
} as const;

// Type definitions for tournament events
export interface TournamentEnrollmentEvent {
  tournamentId: string;
  playerId: string;
  playerName: string;
  enrollmentCount: number;
}

export interface TournamentMatchCompletedEvent {
  tournamentId: string;
  matchId: string;
  roundId: string;
  winnerId: string;
  loserId: string;
  scores: string;
}

export interface TournamentBracketUpdateEvent {
  tournamentId: string;
  currentRound: number;
  totalRounds: number;
}

export interface TournamentCompletedEvent {
  tournamentId: string;
  championId: string;
  championName: string;
}
