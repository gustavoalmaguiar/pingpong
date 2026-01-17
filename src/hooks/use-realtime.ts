"use client";

import { useEffect, useCallback } from "react";
import {
  getPusherClient,
  getTournamentChannel,
  CHANNELS,
  EVENTS,
  type TournamentEnrollmentEvent,
  type TournamentMatchCompletedEvent,
  type TournamentBracketUpdateEvent,
  type TournamentCompletedEvent,
} from "@/lib/pusher";

type EventCallback = (data: unknown) => void;

export function useRealtime(
  channel: string,
  event: string,
  callback: EventCallback
) {
  const stableCallback = useCallback(callback, [callback]);

  useEffect(() => {
    const pusher = getPusherClient();
    const channelInstance = pusher.subscribe(channel);

    channelInstance.bind(event, stableCallback);

    return () => {
      channelInstance.unbind(event, stableCallback);
      pusher.unsubscribe(channel);
    };
  }, [channel, event, stableCallback]);
}

export function useLeaderboardUpdates(onUpdate: () => void) {
  useRealtime(CHANNELS.LEADERBOARD, EVENTS.LEADERBOARD_UPDATE, onUpdate);
}

export function useMatchUpdates(onUpdate: (data: unknown) => void) {
  useRealtime(CHANNELS.MATCHES, EVENTS.MATCH_CREATED, onUpdate);
}

export function useChallengeUpdates(onUpdate: (data: unknown) => void) {
  useRealtime(CHANNELS.CHALLENGES, EVENTS.CHALLENGE_CREATED, onUpdate);
  useRealtime(CHANNELS.CHALLENGES, EVENTS.CHALLENGE_UPDATED, onUpdate);
}

// Tournament-specific hooks

/**
 * Subscribe to updates for a specific tournament
 */
export function useTournamentUpdates(
  tournamentId: string | undefined,
  callbacks: {
    onEnrollment?: (data: TournamentEnrollmentEvent) => void;
    onWithdrawal?: (data: TournamentEnrollmentEvent) => void;
    onMatchCompleted?: (data: TournamentMatchCompletedEvent) => void;
    onBracketUpdate?: (data: TournamentBracketUpdateEvent) => void;
    onTournamentStarted?: () => void;
    onTournamentCompleted?: (data: TournamentCompletedEvent) => void;
  }
) {
  useEffect(() => {
    if (!tournamentId) return;

    const pusher = getPusherClient();
    const channel = pusher.subscribe(getTournamentChannel(tournamentId));

    if (callbacks.onEnrollment) {
      channel.bind(EVENTS.TOURNAMENT_ENROLLMENT, callbacks.onEnrollment);
    }
    if (callbacks.onWithdrawal) {
      channel.bind(EVENTS.TOURNAMENT_WITHDRAWAL, callbacks.onWithdrawal);
    }
    if (callbacks.onMatchCompleted) {
      channel.bind(EVENTS.TOURNAMENT_MATCH_COMPLETED, callbacks.onMatchCompleted);
    }
    if (callbacks.onBracketUpdate) {
      channel.bind(EVENTS.TOURNAMENT_BRACKET_UPDATE, callbacks.onBracketUpdate);
    }
    if (callbacks.onTournamentStarted) {
      channel.bind(EVENTS.TOURNAMENT_STARTED, callbacks.onTournamentStarted);
    }
    if (callbacks.onTournamentCompleted) {
      channel.bind(EVENTS.TOURNAMENT_COMPLETED, callbacks.onTournamentCompleted);
    }

    return () => {
      if (callbacks.onEnrollment) {
        channel.unbind(EVENTS.TOURNAMENT_ENROLLMENT, callbacks.onEnrollment);
      }
      if (callbacks.onWithdrawal) {
        channel.unbind(EVENTS.TOURNAMENT_WITHDRAWAL, callbacks.onWithdrawal);
      }
      if (callbacks.onMatchCompleted) {
        channel.unbind(EVENTS.TOURNAMENT_MATCH_COMPLETED, callbacks.onMatchCompleted);
      }
      if (callbacks.onBracketUpdate) {
        channel.unbind(EVENTS.TOURNAMENT_BRACKET_UPDATE, callbacks.onBracketUpdate);
      }
      if (callbacks.onTournamentStarted) {
        channel.unbind(EVENTS.TOURNAMENT_STARTED, callbacks.onTournamentStarted);
      }
      if (callbacks.onTournamentCompleted) {
        channel.unbind(EVENTS.TOURNAMENT_COMPLETED, callbacks.onTournamentCompleted);
      }
      pusher.unsubscribe(getTournamentChannel(tournamentId));
    };
  }, [tournamentId, callbacks]);
}

/**
 * Subscribe to global tournament updates (for tournaments list page)
 */
export function useTournamentsListUpdates(onUpdate: () => void) {
  useRealtime(CHANNELS.TOURNAMENTS, EVENTS.TOURNAMENT_ENROLLMENT, onUpdate);
  useRealtime(CHANNELS.TOURNAMENTS, EVENTS.TOURNAMENT_WITHDRAWAL, onUpdate);
  useRealtime(CHANNELS.TOURNAMENTS, EVENTS.TOURNAMENT_STARTED, onUpdate);
  useRealtime(CHANNELS.TOURNAMENTS, EVENTS.TOURNAMENT_COMPLETED, onUpdate);
}
