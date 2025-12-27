import { getPlayers } from "@/actions/players";
import { PlayersClient } from "./players-client";

export default async function PlayersPage() {
  const players = await getPlayers();

  return <PlayersClient players={players} />;
}
