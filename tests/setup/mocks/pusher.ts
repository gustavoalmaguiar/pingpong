import { vi } from 'vitest';

// Track triggered events for assertions
export const triggeredEvents: Array<{
  channel: string;
  event: string;
  data: unknown;
}> = [];

export function clearTriggeredEvents() {
  triggeredEvents.length = 0;
}

export function getTriggeredEvents() {
  return [...triggeredEvents];
}

export function getTriggeredEventsByChannel(channel: string) {
  return triggeredEvents.filter((e) => e.channel === channel);
}

export function getTriggeredEventsByEvent(event: string) {
  return triggeredEvents.filter((e) => e.event === event);
}

// Mock Pusher server
export const pusherServer = {
  trigger: vi.fn(async (channel: string | string[], event: string, data: unknown) => {
    const channels = Array.isArray(channel) ? channel : [channel];
    for (const ch of channels) {
      triggeredEvents.push({ channel: ch, event, data });
    }
    return Promise.resolve();
  }),
};

// Mock Pusher client (for frontend tests if needed)
export function getPusherClient() {
  const channels: Record<string, { bind: typeof vi.fn; unbind: typeof vi.fn }> = {};

  return {
    subscribe: vi.fn((channelName: string) => {
      if (!channels[channelName]) {
        channels[channelName] = {
          bind: vi.fn(),
          unbind: vi.fn(),
        };
      }
      return channels[channelName];
    }),
    unsubscribe: vi.fn(),
    channel: vi.fn((channelName: string) => channels[channelName]),
  };
}

// Channel constants
export const CHANNELS = {
  LEADERBOARD: 'leaderboard',
  MATCHES: 'matches',
  CHALLENGES: 'challenges',
  TOURNAMENTS: 'tournaments',
} as const;

export function getTournamentChannel(tournamentId: string) {
  return `tournament-${tournamentId}`;
}

// Event constants
export const EVENTS = {
  MATCH_CREATED: 'match:created',
  LEADERBOARD_UPDATE: 'leaderboard:update',
  PLAYER_UPDATE: 'player:update',
  CHALLENGE_CREATED: 'challenge:created',
  CHALLENGE_UPDATED: 'challenge:updated',
  ACHIEVEMENT_UNLOCKED: 'achievement:unlocked',
  TOURNAMENT_ENROLLMENT: 'tournament:enrollment',
  TOURNAMENT_WITHDRAWAL: 'tournament:withdrawal',
  TOURNAMENT_STARTED: 'tournament:started',
  TOURNAMENT_MATCH_COMPLETED: 'tournament:match:completed',
  TOURNAMENT_BRACKET_UPDATE: 'tournament:bracket:update',
  TOURNAMENT_COMPLETED: 'tournament:completed',
} as const;
