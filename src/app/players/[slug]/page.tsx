import { redirect, notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { getPlayerBySlug, getPlayers } from "@/actions/players";
import { getPlayerMatches } from "@/actions/matches";
import { getPlayerAchievements, getAllAchievements } from "@/actions/achievements";
import { PlayerProfileClient } from "./player-profile-client";

interface PlayerPageProps {
  params: Promise<{ slug: string }>;
}

export default async function PlayerPage({ params }: PlayerPageProps) {
  const { slug } = await params;
  const session = await auth();

  if (!session) {
    redirect("/auth/signin");
  }

  const player = await getPlayerBySlug(slug);

  if (!player) {
    notFound();
  }

  const [matches, allPlayers, playerAchievements, allAchievements] = await Promise.all([
    getPlayerMatches(player.id, 20),
    getPlayers(),
    getPlayerAchievements(player.id),
    getAllAchievements(),
  ]);

  // Calculate rank
  const rank = allPlayers.findIndex((p) => p.id === player.id) + 1;

  // Calculate head-to-head records
  const headToHead: Record<string, { wins: number; losses: number; player: typeof allPlayers[0] }> = {};

  for (const match of matches) {
    if (match.type === "singles") {
      const opponentId = match.winnerId === player.id ? match.loserId : match.winnerId;
      if (opponentId) {
        if (!headToHead[opponentId]) {
          const opponent = allPlayers.find((p) => p.id === opponentId);
          if (opponent) {
            headToHead[opponentId] = { wins: 0, losses: 0, player: opponent };
          }
        }
        if (headToHead[opponentId]) {
          if (match.winnerId === player.id) {
            headToHead[opponentId].wins++;
          } else {
            headToHead[opponentId].losses++;
          }
        }
      }
    }
  }

  const headToHeadRecords = Object.values(headToHead)
    .sort((a, b) => (b.wins + b.losses) - (a.wins + a.losses))
    .slice(0, 5);

  const isOwnProfile = session.user.playerId === player.id;

  return (
    <PlayerProfileClient
      player={player}
      rank={rank}
      totalPlayers={allPlayers.length}
      matches={matches}
      headToHeadRecords={headToHeadRecords}
      isOwnProfile={isOwnProfile}
      achievements={playerAchievements}
      allAchievements={allAchievements}
    />
  );
}
