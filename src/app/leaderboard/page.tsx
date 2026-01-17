import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getPlayers } from "@/actions/players";
import { LeaderboardClient } from "./leaderboard-client";

export default async function LeaderboardPage() {
  const session = await auth();

  if (!session) {
    redirect("/auth/signin");
  }

  const players = await getPlayers();

  return (
    <LeaderboardClient
      initialPlayers={players}
      currentPlayerId={session.user.playerId}
    />
  );
}
