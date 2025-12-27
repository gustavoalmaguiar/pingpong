import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getChallenges } from "@/actions/challenges";
import { ChallengesClient } from "./challenges-client";

export default async function ChallengesPage() {
  const session = await auth();

  if (!session) {
    redirect("/auth/signin");
  }

  const challenges = await getChallenges();

  return (
    <ChallengesClient
      challenges={challenges}
      currentPlayerId={session.user.playerId}
    />
  );
}
