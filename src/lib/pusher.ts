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
} as const;

// Event names
export const EVENTS = {
  MATCH_CREATED: "match:created",
  LEADERBOARD_UPDATE: "leaderboard:update",
  PLAYER_UPDATE: "player:update",
  CHALLENGE_CREATED: "challenge:created",
  CHALLENGE_UPDATED: "challenge:updated",
  ACHIEVEMENT_UNLOCKED: "achievement:unlocked",
} as const;
