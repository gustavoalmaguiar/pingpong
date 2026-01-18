"use client";

import { motion } from "framer-motion";
import {
  QuickStats,
  LeaderboardCard,
  RecentMatches,
  TipsCard,
  HotStreaks,
  RecentAchievements,
  HeadToHead,
  UpcomingTournament,
} from "@/components/dashboard";
import type { Player } from "@/lib/db/schema";

interface LeaderboardPlayer {
  id: string;
  slug: string;
  rank: number;
  displayName: string;
  elo: number;
  matchesWon: number;
  matchesPlayed: number;
  currentStreak: number;
  level: number;
  avatarUrl: string | null;
}

interface MatchPlayer {
  id: string;
  displayName: string;
  avatarUrl?: string | null;
}

interface Match {
  id: string;
  type: "singles" | "doubles";
  winner?: MatchPlayer;
  loser?: MatchPlayer;
  winnerTeam?: MatchPlayer[];
  loserTeam?: MatchPlayer[];
  winnerScore: number;
  loserScore: number;
  eloChange: number;
  playedAt: Date;
  createdAt: Date;
  tournamentMatchId?: string | null;
  loggedByUser?: {
    id: string;
    name: string | null;
    image: string | null;
  } | null;
}

interface CurrentPlayer {
  id: string;
  displayName: string;
  elo: number;
  xp: number;
  level: number;
  matchesPlayed: number;
  matchesWon: number;
  currentStreak: number;
  bestStreak: number;
  avatarUrl: string | null;
}

interface HotStreakPlayer {
  id: string;
  slug: string;
  displayName: string;
  elo: number;
  currentStreak: number;
  matchesWon: number;
  avatarUrl: string | null;
}

interface RecentAchievementData {
  id: string;
  earnedAt: Date;
  playerId: string;
  playerSlug: string;
  playerName: string;
  playerAvatarUrl: string | null;
  achievementName: string;
  achievementIcon: string;
  achievementTier: "bronze" | "silver" | "gold" | "platinum";
  achievementDescription: string;
}

interface HeadToHeadRecord {
  opponent: {
    id: string;
    slug: string;
    displayName: string;
    elo: number;
    avatarUrl: string | null;
  };
  wins: number;
  losses: number;
  lastMatch: Date;
}

interface UpcomingTournamentData {
  id: string;
  name: string;
  format: "single_elimination" | "double_elimination" | "swiss" | "round_robin_knockout";
  matchType: "singles" | "doubles";
  status: "enrollment" | "in_progress";
  scheduledDate: Date | null;
  scheduledTime: string | null;
  location: string | null;
  enrollmentCount: number;
  currentRound?: number | null;
  totalRounds?: number | null;
}

interface MyNextMatchData {
  opponentName: string;
  roundName: string;
}

interface DashboardClientProps {
  leaderboard: LeaderboardPlayer[];
  currentPlayer: CurrentPlayer | null;
  currentPlayerRank: number;
  totalPlayers: number;
  recentMatches: Match[];
  recentForm: ("W" | "L")[];
  eloChange: number;
  hotStreaks: HotStreakPlayer[];
  recentAchievements: RecentAchievementData[];
  headToHead: HeadToHeadRecord[];
  upcomingTournament?: UpcomingTournamentData | null;
  isEnrolledInTournament?: boolean;
  myNextMatch?: MyNextMatchData | null;
}

export function DashboardClient({
  leaderboard,
  currentPlayer,
  currentPlayerRank,
  totalPlayers,
  recentMatches,
  recentForm,
  eloChange,
  hotStreaks,
  recentAchievements,
  headToHead,
  upcomingTournament,
  isEnrolledInTournament,
  myNextMatch,
}: DashboardClientProps) {
  return (
    <div className="min-h-screen bg-black p-6 md:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Quick Stats Header */}
        {currentPlayer && (
          <QuickStats
            rank={currentPlayerRank}
            totalPlayers={totalPlayers}
            elo={currentPlayer.elo}
            eloChange={eloChange}
            currentStreak={currentPlayer.currentStreak}
            recentForm={recentForm}
            xp={currentPlayer.xp}
            level={currentPlayer.level}
          />
        )}

        {/* Main Content Grid */}
        <div className="grid gap-6 lg:grid-cols-[1fr_400px]">
          {/* Leaderboard */}
          <LeaderboardCard
            players={leaderboard}
            currentPlayerId={currentPlayer?.id}
          />

          {/* Recent Matches */}
          <RecentMatches
            matches={recentMatches}
            currentPlayerId={currentPlayer?.id}
          />
        </div>

        {/* Secondary Content Grid - 4 columns on xl, 3 on lg, 2 on md */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {/* Upcoming Tournament */}
          <UpcomingTournament
            tournament={upcomingTournament ?? null}
            isEnrolled={isEnrolledInTournament}
            myNextMatch={myNextMatch}
          />

          {/* Head to Head */}
          <HeadToHead records={headToHead} />

          {/* Recent Achievements */}
          <RecentAchievements achievements={recentAchievements} />

          {/* Hot Streaks */}
          <HotStreaks streaks={hotStreaks} />
        </div>

        {/* Ping-Pong Tip */}
        <TipsCard />

        {/* Empty state for new users */}
        {!currentPlayer && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-xl border border-[#1a1a1a] bg-[#0a0a0a] p-12 text-center"
          >
            <h2 className="text-xl font-medium text-white">Welcome!</h2>
            <p className="mt-2 text-[#737373]">
              Your profile is being set up. Refresh the page to see your stats.
            </p>
          </motion.div>
        )}
      </div>
    </div>
  );
}
