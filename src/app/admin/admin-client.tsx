"use client";

import { useState, useTransition } from "react";
import { motion } from "framer-motion";
import {
  Users,
  Gamepad2,
  TrendingUp,
  Activity,
  Trash2,
  Shield,
  ShieldOff,
  User,
  Loader2,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "@/lib/format";
import { deleteMatch, toggleAdminStatus } from "@/actions/admin";
import { toast } from "sonner";

interface Stats {
  totalPlayers: number;
  totalMatches: number;
  matchesToday: number;
  activePlayers: number;
}

interface Player {
  id: string;
  displayName: string;
  elo: number;
  xp: number;
  level: number;
  matchesPlayed: number;
  matchesWon: number;
  currentStreak: number;
  bestStreak: number;
  createdAt: Date;
  updatedAt: Date;
  email: string | null;
  isAdmin: boolean | null;
  avatarUrl: string | null;
}

interface Match {
  id: string;
  type: "singles" | "doubles";
  winnerScore: number;
  loserScore: number;
  eloChange: number;
  playedAt: Date;
  winner?: { displayName: string };
  loser?: { displayName: string };
  winnerTeam?: [{ displayName: string }, { displayName: string }];
  loserTeam?: [{ displayName: string }, { displayName: string }];
}

interface AdminDashboardClientProps {
  stats: Stats;
  players: Player[];
  matches: Match[];
}

export function AdminDashboardClient({
  stats,
  players,
  matches,
}: AdminDashboardClientProps) {
  const [isPending, startTransition] = useTransition();
  const [processingId, setProcessingId] = useState<string | null>(null);

  const handleDeleteMatch = (matchId: string) => {
    if (!confirm("Are you sure you want to delete this match? This cannot be undone.")) {
      return;
    }

    setProcessingId(matchId);
    startTransition(async () => {
      try {
        await deleteMatch(matchId);
        toast.success("Match deleted");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to delete");
      } finally {
        setProcessingId(null);
      }
    });
  };

  const handleToggleAdmin = (playerId: string, playerEmail: string | null) => {
    if (!confirm(`Toggle admin status for ${playerEmail}?`)) {
      return;
    }

    setProcessingId(playerId);
    startTransition(async () => {
      try {
        // Find user ID from player
        const player = players.find(p => p.id === playerId);
        if (!player) throw new Error("Player not found");

        await toggleAdminStatus(playerId);
        toast.success("Admin status updated");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to update");
      } finally {
        setProcessingId(null);
      }
    });
  };

  const statCards = [
    { label: "Total Players", value: stats.totalPlayers, icon: Users },
    { label: "Total Matches", value: stats.totalMatches, icon: Gamepad2 },
    { label: "Matches Today", value: stats.matchesToday, icon: TrendingUp },
    { label: "Active Players (7d)", value: stats.activePlayers, icon: Activity },
  ];

  return (
    <div className="min-h-screen bg-black p-6 md:p-8">
      <div className="mx-auto max-w-7xl space-y-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3"
        >
          <Shield className="h-6 w-6 text-[#525252]" />
          <h1 className="text-2xl font-bold tracking-tight">Admin Dashboard</h1>
        </motion.div>

        {/* Stats Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-2 gap-4 md:grid-cols-4"
        >
          {statCards.map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1 + index * 0.05 }}
              className="rounded-xl border border-[#1a1a1a] bg-[#0a0a0a] p-5"
            >
              <div className="flex items-center gap-2 text-[10px] font-medium uppercase tracking-[0.15em] text-[#525252]">
                <stat.icon className="h-3.5 w-3.5" />
                {stat.label}
              </div>
              <p className="mt-2 font-mono text-3xl font-bold text-white">
                {stat.value}
              </p>
            </motion.div>
          ))}
        </motion.div>

        {/* Tabs */}
        <Tabs defaultValue="players" className="space-y-6">
          <TabsList className="bg-[#0a0a0a] border border-[#1a1a1a] p-1">
            <TabsTrigger
              value="players"
              className="data-[state=active]:bg-white data-[state=active]:text-black"
            >
              Players ({players.length})
            </TabsTrigger>
            <TabsTrigger
              value="matches"
              className="data-[state=active]:bg-white data-[state=active]:text-black"
            >
              Recent Matches ({matches.length})
            </TabsTrigger>
          </TabsList>

          {/* Players Tab */}
          <TabsContent value="players">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="overflow-hidden rounded-xl border border-[#1a1a1a] bg-[#0a0a0a]"
            >
              {/* Table Header */}
              <div className="grid grid-cols-[1fr_100px_80px_80px_100px_80px] gap-4 border-b border-[#1a1a1a] px-5 py-3 text-[10px] font-medium uppercase tracking-[0.15em] text-[#525252]">
                <div>Player</div>
                <div className="text-right">ELO</div>
                <div className="text-right">Wins</div>
                <div className="text-right">Level</div>
                <div className="text-right">Last Active</div>
                <div className="text-right">Admin</div>
              </div>

              {/* Player Rows */}
              <div className="divide-y divide-[#1a1a1a]/50">
                {players.map((player) => (
                  <div
                    key={player.id}
                    className="grid grid-cols-[1fr_100px_80px_80px_100px_80px] items-center gap-4 px-5 py-3"
                  >
                    {/* Player Info */}
                    <div className="flex items-center gap-3 min-w-0">
                      <Avatar className="h-8 w-8 border border-[#262626]">
                        <AvatarImage src={player.avatarUrl || undefined} />
                        <AvatarFallback className="bg-[#1a1a1a] text-xs">
                          {player.displayName.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-white">
                          {player.displayName}
                        </p>
                        <p className="truncate text-[10px] text-[#525252]">
                          {player.email}
                        </p>
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="text-right font-mono text-sm text-white">
                      {player.elo}
                    </div>
                    <div className="text-right font-mono text-sm text-[#737373]">
                      {player.matchesWon}
                    </div>
                    <div className="text-right font-mono text-sm text-[#737373]">
                      {player.level}
                    </div>
                    <div className="text-right text-[10px] text-[#525252]">
                      {formatDistanceToNow(player.updatedAt)}
                    </div>

                    {/* Admin Toggle */}
                    <div className="flex justify-end">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleToggleAdmin(player.id, player.email)}
                        disabled={isPending && processingId === player.id}
                        className={cn(
                          "h-7 w-7 p-0",
                          player.isAdmin
                            ? "text-emerald-500 hover:text-emerald-400"
                            : "text-[#525252] hover:text-white"
                        )}
                      >
                        {isPending && processingId === player.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : player.isAdmin ? (
                          <Shield className="h-4 w-4" />
                        ) : (
                          <ShieldOff className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </TabsContent>

          {/* Matches Tab */}
          <TabsContent value="matches">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="overflow-hidden rounded-xl border border-[#1a1a1a] bg-[#0a0a0a]"
            >
              {/* Table Header */}
              <div className="grid grid-cols-[60px_1fr_80px_80px_100px_50px] gap-4 border-b border-[#1a1a1a] px-5 py-3 text-[10px] font-medium uppercase tracking-[0.15em] text-[#525252]">
                <div>Type</div>
                <div>Players</div>
                <div className="text-right">Score</div>
                <div className="text-right">ELO ±</div>
                <div className="text-right">When</div>
                <div></div>
              </div>

              {/* Match Rows */}
              <div className="divide-y divide-[#1a1a1a]/50">
                {matches.map((match) => (
                  <div
                    key={match.id}
                    className="grid grid-cols-[60px_1fr_80px_80px_100px_50px] items-center gap-4 px-5 py-3"
                  >
                    {/* Type */}
                    <div className="flex h-6 w-12 items-center justify-center rounded bg-[#1a1a1a] text-[10px] font-medium text-[#737373]">
                      {match.type === "singles" ? (
                        <>
                          <User className="mr-1 h-3 w-3" />
                          1v1
                        </>
                      ) : (
                        <>
                          <Users className="mr-1 h-3 w-3" />
                          2v2
                        </>
                      )}
                    </div>

                    {/* Players */}
                    <div className="text-sm text-[#a3a3a3]">
                      {match.type === "singles" ? (
                        <>
                          <span className="text-emerald-500">
                            {match.winner?.displayName}
                          </span>
                          <span className="mx-2 text-[#333]">vs</span>
                          <span className="text-red-500">
                            {match.loser?.displayName}
                          </span>
                        </>
                      ) : (
                        <>
                          <span className="text-emerald-500">
                            {match.winnerTeam?.[0]?.displayName} & {match.winnerTeam?.[1]?.displayName}
                          </span>
                          <span className="mx-2 text-[#333]">vs</span>
                          <span className="text-red-500">
                            {match.loserTeam?.[0]?.displayName} & {match.loserTeam?.[1]?.displayName}
                          </span>
                        </>
                      )}
                    </div>

                    {/* Score */}
                    <div className="text-right font-mono text-sm">
                      <span className="text-white">{match.winnerScore}</span>
                      <span className="mx-1 text-[#333]">-</span>
                      <span className="text-[#525252]">{match.loserScore}</span>
                    </div>

                    {/* ELO Change */}
                    <div className="text-right font-mono text-sm text-[#737373]">
                      ±{match.eloChange}
                    </div>

                    {/* When */}
                    <div className="text-right text-[10px] text-[#525252]">
                      {formatDistanceToNow(match.playedAt)}
                    </div>

                    {/* Delete */}
                    <div className="flex justify-end">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDeleteMatch(match.id)}
                        disabled={isPending && processingId === match.id}
                        className="h-7 w-7 p-0 text-[#525252] hover:text-red-500"
                      >
                        {isPending && processingId === match.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
