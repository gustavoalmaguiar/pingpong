import { redirect } from "next/navigation";
import { getEffectiveSession } from "@/lib/auth";
import { isAuthRequired } from "@/lib/config";
import { getPlayers } from "@/actions/players";
import { LeaderboardClient } from "./leaderboard-client";

export default async function LeaderboardPage() {
  const session = await getEffectiveSession();

  if (!session && isAuthRequired()) {
    redirect("/auth/signin");
  }

  const players = await getPlayers();

  return (
    <LeaderboardClient
      initialPlayers={players}
      currentPlayerId={session?.user?.playerId}
    />
  );
}
