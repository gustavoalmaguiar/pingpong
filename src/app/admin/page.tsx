import { redirect } from "next/navigation";
import { getEffectiveSession } from "@/lib/auth";
import { isAuthRequired } from "@/lib/config";
import { getAdminStats, getAllPlayersAdmin, getAllMatchesAdmin } from "@/actions/admin";
import { getTournaments } from "@/actions/tournaments";
import { AdminDashboardClient } from "./admin-client";

export default async function AdminPage() {
  const session = await getEffectiveSession();

  if (!session && isAuthRequired()) {
    redirect("/auth/signin");
  }

  if (!session?.user?.isAdmin) {
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
