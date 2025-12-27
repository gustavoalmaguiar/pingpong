"use client";

import { useEffect, useCallback } from "react";
import { getPusherClient, CHANNELS, EVENTS } from "@/lib/pusher";

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
