import { redirect } from "next/navigation";
import { getEffectiveSession } from "@/lib/auth";
import { isAuthRequired } from "@/lib/config";
import { getLeaderboard, getCurrentPlayer, getPlayers, getHotStreaks } from "@/actions/players";
import { getRecentMatches, getPlayerMatches, getHeadToHeadStats } from "@/actions/matches";
import { getRecentAchievements } from "@/actions/achievements";
import { getUpcomingTournament } from "@/actions/tournaments";
import { getEnrollmentStatus } from "@/actions/tournament-enrollment";
import { DashboardClient } from "./dashboard-client";

export default async function DashboardPage() {
  const session = await getEffectiveSession();

  // Only redirect to signin if auth is required and user is not authenticated
  if (!session && isAuthRequired()) {
    redirect("/auth/signin");
  }

  // Fetch all data in parallel
  const [leaderboard, currentPlayer, recentMatches, allPlayers, hotStreaks, recentAchievements, upcomingTournament] = await Promise.all([
    getLeaderboard(10),
    getCurrentPlayer(),
    getRecentMatches(8),
    getPlayers(),
    getHotStreaks(5),
    getRecentAchievements(6),
    getUpcomingTournament(),
  ]);

  // Fetch enrollment status if there's an upcoming tournament
  let isEnrolledInTournament = false;
  let myNextMatch = null;

  if (upcomingTournament) {
    const { isEnrolled } = await getEnrollmentStatus(upcomingTournament.id);
    isEnrolledInTournament = isEnrolled;

    // TODO: Add logic to fetch myNextMatch if tournament is in_progress and user is enrolled
  }

  // Calculate current user's rank
  const currentPlayerRank = currentPlayer
    ? allPlayers.findIndex((p) => p.id === currentPlayer.id) + 1
    : 0;

  // Get recent form (last 5 match results)
  const playerMatches = currentPlayer
    ? await getPlayerMatches(currentPlayer.id, 5)
    : [];

  const recentForm = playerMatches.map((match) => {
    if (match.type === "singles") {
      return match.winnerId === currentPlayer?.id ? "W" : "L";
    } else {
      const isWinner =
        match.winnerTeamP1 === currentPlayer?.id ||
        match.winnerTeamP2 === currentPlayer?.id;
      return isWinner ? "W" : "L";
    }
  }) as ("W" | "L")[];

  // Calculate ELO change (would need match history, using 0 for now)
  const eloChange = 0;

  // Get head-to-head stats for current player
  const headToHead = currentPlayer
    ? await getHeadToHeadStats(currentPlayer.id, 5)
    : [];

  // Transform tournament data for dashboard
  const tournamentForDashboard = upcomingTournament
    ? {
        id: upcomingTournament.id,
        name: upcomingTournament.name,
        format: upcomingTournament.format,
        matchType: upcomingTournament.matchType,
        status: upcomingTournament.status as "enrollment" | "in_progress",
        scheduledDate: upcomingTournament.scheduledDate,
        scheduledTime: upcomingTournament.scheduledTime,
        location: upcomingTournament.location,
        enrollmentCount: upcomingTournament.enrollmentCount,
        currentRound: upcomingTournament.currentRound,
        totalRounds: upcomingTournament.totalRounds,
      }
    : null;

  return (
    <DashboardClient
      leaderboard={leaderboard}
      currentPlayer={currentPlayer}
      currentPlayerRank={currentPlayerRank}
      totalPlayers={allPlayers.length}
      recentMatches={recentMatches}
      recentForm={recentForm}
      eloChange={eloChange}
      hotStreaks={hotStreaks}
      recentAchievements={recentAchievements}
      headToHead={headToHead}
      upcomingTournament={tournamentForDashboard}
      isEnrolledInTournament={isEnrolledInTournament}
      myNextMatch={myNextMatch}
    />
  );
}
