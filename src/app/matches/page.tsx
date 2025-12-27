import { getRecentMatches } from "@/actions/matches";
import { MatchesClient } from "./matches-client";

export default async function MatchesPage() {
  const matches = await getRecentMatches(100);

  return <MatchesClient matches={matches} />;
}
