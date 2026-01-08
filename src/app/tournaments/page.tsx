import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getPublicTournaments } from "@/actions/tournaments";
import { getMyEnrolledTournamentIds } from "@/actions/tournament-enrollment";
import { TournamentsClient } from "./tournaments-client";

export default async function TournamentsPage() {
  const session = await auth();

  if (!session) {
    redirect("/auth/signin");
  }

  const [tournaments, enrolledIds] = await Promise.all([
    getPublicTournaments(),
    getMyEnrolledTournamentIds(),
  ]);

  return (
    <TournamentsClient
      tournaments={tournaments}
      currentPlayerId={session.user.playerId}
      initialEnrolledIds={enrolledIds}
    />
  );
}
