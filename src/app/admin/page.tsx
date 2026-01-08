import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getAdminStats, getAllPlayersAdmin, getAllMatchesAdmin } from "@/actions/admin";
import { getTournaments } from "@/actions/tournaments";
import { AdminDashboardClient } from "./admin-client";

export default async function AdminPage() {
  const session = await auth();

  if (!session) {
    redirect("/auth/signin");
  }

  if (!session.user.isAdmin) {
    redirect("/");
  }

  const [stats, players, matches, tournaments] = await Promise.all([
    getAdminStats(),
    getAllPlayersAdmin(),
    getAllMatchesAdmin(30),
    getTournaments(),
  ]);

  return (
    <AdminDashboardClient
      stats={stats}
      players={players}
      matches={matches}
      tournaments={tournaments}
    />
  );
}
