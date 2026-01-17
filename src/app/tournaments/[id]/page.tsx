import { redirect, notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { getTournament } from "@/actions/tournaments";
import { getEnrollmentStatus } from "@/actions/tournament-enrollment";
import { TournamentDetailClient } from "./tournament-detail-client";

interface TournamentDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function TournamentDetailPage({ params }: TournamentDetailPageProps) {
  const session = await auth();

  if (!session) {
    redirect("/auth/signin");
  }

  const { id } = await params;
  const tournament = await getTournament(id);

  if (!tournament) {
    notFound();
  }

  const { isEnrolled, enrollment } = await getEnrollmentStatus(id);

  return (
    <TournamentDetailClient
      tournament={tournament}
      isEnrolled={isEnrolled}
      myEnrollment={enrollment}
      currentPlayerId={session.user.playerId}
      isAdmin={session.user.isAdmin}
    />
  );
}
