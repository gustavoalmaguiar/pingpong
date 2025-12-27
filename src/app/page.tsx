import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getLeaderboard, getCurrentPlayer, getPlayers, getHotStreaks } from "@/actions/players";
import { getRecentMatches, getPlayerMatches, getHeadToHeadStats } from "@/actions/matches";
import { getRecentAchievements } from "@/actions/achievements";
import { getChallenges } from "@/actions/challenges";
import { DashboardClient } from "./dashboard-client";

export default async function DashboardPage() {
  const session = await auth();

  if (!session) {
    redirect("/auth/signin");
  }

  // Fetch all data in parallel
  const [leaderboard, currentPlayer, recentMatches, allPlayers, hotStreaks, recentAchievements, challenges] = await Promise.all([
    getLeaderboard(10),
    getCurrentPlayer(),
    getRecentMatches(8),
    getPlayers(),
    getHotStreaks(5),
    getRecentAchievements(6),
    getChallenges(),
  ]);

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

  return (
    <DashboardClient
      leaderboard={leaderboard}
      currentPlayer={currentPlayer}
      currentPlayerRank={currentPlayerRank}
      totalPlayers={allPlayers.length}
      recentMatches={recentMatches}
      recentForm={recentForm}
      eloChange={eloChange}
      challenges={challenges}
      hotStreaks={hotStreaks}
      recentAchievements={recentAchievements}
      headToHead={headToHead}
    />
  );
}
