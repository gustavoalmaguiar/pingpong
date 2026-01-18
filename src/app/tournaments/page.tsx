import { redirect } from "next/navigation";
import { getEffectiveSession } from "@/lib/auth";
import { isAuthRequired } from "@/lib/config";
import { getPublicTournaments } from "@/actions/tournaments";
import { getMyEnrolledTournamentIds } from "@/actions/tournament-enrollment";
import { TournamentsClient } from "./tournaments-client";

export default async function TournamentsPage() {
  const session = await getEffectiveSession();

  if (!session && isAuthRequired()) {
    redirect("/auth/signin");
  }

  const [tournaments, enrolledIds] = await Promise.all([
    getPublicTournaments(),
    getMyEnrolledTournamentIds(),
  ]);

  return (
    <TournamentsClient
      tournaments={tournaments}
      currentPlayerId={session?.user?.playerId}
      initialEnrolledIds={enrolledIds}
    />
  );
}
