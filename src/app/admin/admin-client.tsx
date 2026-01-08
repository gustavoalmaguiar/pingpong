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
  Trophy,
  Plus,
  Play,
  XCircle,
  DoorOpen,
  Calendar,
  MapPin,
  Clock,
  ChevronDown,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "@/lib/format";
import { deleteMatch, toggleAdminStatus } from "@/actions/admin";
import { BestOfSettings } from "@/components/tournament/bestof-settings";
import {
  createTournament,
  openEnrollment,
  cancelTournament,
  deleteTournament,
} from "@/actions/tournaments";
import { startTournament } from "@/actions/tournament-bracket";
import { toast } from "sonner";
import type { TournamentWithDetails } from "@/actions/tournaments";

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
  winnerTeam?: { displayName: string }[];
  loserTeam?: { displayName: string }[];
}

interface AdminDashboardClientProps {
  stats: Stats;
  players: Player[];
  matches: Match[];
  tournaments: TournamentWithDetails[];
}

const FORMAT_LABELS: Record<string, string> = {
  single_elimination: "Single Elimination",
  double_elimination: "Double Elimination",
  swiss: "Swiss System",
  round_robin_knockout: "Round Robin + Knockout",
};

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  draft: { label: "Draft", color: "bg-zinc-600" },
  enrollment: { label: "Enrollment Open", color: "bg-blue-600" },
  in_progress: { label: "In Progress", color: "bg-emerald-600" },
  completed: { label: "Completed", color: "bg-purple-600" },
  cancelled: { label: "Cancelled", color: "bg-red-600" },
};

export function AdminDashboardClient({
  stats,
  players,
  matches,
  tournaments,
}: AdminDashboardClientProps) {
  const [isPending, startTransition] = useTransition();
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  // Create tournament form state
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    format: "single_elimination" as "single_elimination" | "double_elimination" | "swiss" | "round_robin_knockout",
    matchType: "singles" as "singles" | "doubles",
    bestOf: 3,
    bestOfGroupStage: null as number | null,
    bestOfEarlyRounds: null as number | null,
    bestOfSemiFinals: null as number | null,
    bestOfFinals: null as number | null,
    scheduledDate: "",
    scheduledTime: "",
    location: "",
    prizeDescription: "",
    eloMultiplierBase: 150,
    eloMultiplierFinals: 300,
  });

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

  const handleCreateTournament = () => {
    if (!formData.name.trim()) {
      toast.error("Tournament name is required");
      return;
    }

    startTransition(async () => {
      try {
        await createTournament({
          name: formData.name,
          description: formData.description || null,
          format: formData.format,
          matchType: formData.matchType,
          bestOf: formData.bestOf,
          bestOfGroupStage: formData.bestOfGroupStage,
          bestOfEarlyRounds: formData.bestOfEarlyRounds,
          bestOfSemiFinals: formData.bestOfSemiFinals,
          bestOfFinals: formData.bestOfFinals,
          scheduledDate: formData.scheduledDate ? new Date(formData.scheduledDate) : null,
          scheduledTime: formData.scheduledTime || null,
          location: formData.location || null,
          prizeDescription: formData.prizeDescription || null,
          eloMultiplierBase: formData.eloMultiplierBase,
          eloMultiplierFinals: formData.eloMultiplierFinals,
          status: "draft",
        });
        toast.success("Tournament created!");
        setCreateDialogOpen(false);
        setFormData({
          name: "",
          description: "",
          format: "single_elimination",
          matchType: "singles",
          bestOf: 3,
          bestOfGroupStage: null,
          bestOfEarlyRounds: null,
          bestOfSemiFinals: null,
          bestOfFinals: null,
          scheduledDate: "",
          scheduledTime: "",
          location: "",
          prizeDescription: "",
          eloMultiplierBase: 150,
          eloMultiplierFinals: 300,
        });
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to create tournament");
      }
    });
  };

  const handleOpenEnrollment = (tournamentId: string) => {
    setProcessingId(tournamentId);
    startTransition(async () => {
      try {
        await openEnrollment(tournamentId);
        toast.success("Enrollment opened!");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to open enrollment");
      } finally {
        setProcessingId(null);
      }
    });
  };

  const handleStartTournament = (tournamentId: string, enrollmentCount: number) => {
    if (enrollmentCount < 2) {
      toast.error("Need at least 2 participants to start");
      return;
    }
    if (!confirm(`Start tournament with ${enrollmentCount} participants? This cannot be undone.`)) {
      return;
    }

    setProcessingId(tournamentId);
    startTransition(async () => {
      try {
        await startTournament(tournamentId);
        toast.success("Tournament started! Bracket generated.");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to start tournament");
      } finally {
        setProcessingId(null);
      }
    });
  };

  const handleCancelTournament = (tournamentId: string) => {
    if (!confirm("Are you sure you want to cancel this tournament?")) {
      return;
    }

    setProcessingId(tournamentId);
    startTransition(async () => {
      try {
        await cancelTournament(tournamentId);
        toast.success("Tournament cancelled");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to cancel");
      } finally {
        setProcessingId(null);
      }
    });
  };

  const handleDeleteTournament = (tournamentId: string) => {
    if (!confirm("Are you sure you want to delete this tournament? This cannot be undone.")) {
      return;
    }

    setProcessingId(tournamentId);
    startTransition(async () => {
      try {
        await deleteTournament(tournamentId);
        toast.success("Tournament deleted");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to delete");
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
        <Tabs defaultValue="tournaments" className="space-y-6">
          <TabsList className="bg-[#0a0a0a] border border-[#1a1a1a] p-1">
            <TabsTrigger
              value="tournaments"
              className="data-[state=active]:bg-white data-[state=active]:text-black"
            >
              <Trophy className="mr-1.5 h-3.5 w-3.5" />
              Tournaments ({tournaments.length})
            </TabsTrigger>
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

          {/* Tournaments Tab */}
          <TabsContent value="tournaments">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              {/* Create Tournament Button */}
              <div className="flex justify-end">
                <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="bg-white text-black hover:bg-zinc-200">
                      <Plus className="mr-2 h-4 w-4" />
                      Create Tournament
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl bg-[#0a0a0a] border-[#1a1a1a] text-white max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>Create Tournament</DialogTitle>
                      <DialogDescription className="text-[#737373]">
                        Set up a new tournament. It will start as a draft.
                      </DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-6 py-4">
                      {/* Basic Info */}
                      <div className="grid gap-4">
                        <div className="grid gap-2">
                          <Label htmlFor="name">Tournament Name *</Label>
                          <Input
                            id="name"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            placeholder="Office Championship 2025"
                            className="bg-[#1a1a1a] border-[#262626]"
                          />
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="description">Description</Label>
                          <Textarea
                            id="description"
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            placeholder="The most epic ping pong tournament of the year..."
                            className="bg-[#1a1a1a] border-[#262626] min-h-[80px]"
                          />
                        </div>
                      </div>

                      {/* Format Settings */}
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="grid gap-2">
                          <Label>Format</Label>
                          <Select
                            value={formData.format}
                            onValueChange={(value: typeof formData.format) =>
                              setFormData({ ...formData, format: value })
                            }
                          >
                            <SelectTrigger className="bg-[#1a1a1a] border-[#262626]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-[#1a1a1a] border-[#262626]">
                              <SelectItem value="single_elimination">Single Elimination</SelectItem>
                              <SelectItem value="double_elimination">Double Elimination</SelectItem>
                              <SelectItem value="swiss">Swiss System</SelectItem>
                              <SelectItem value="round_robin_knockout">Round Robin + Knockout</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="grid gap-2">
                          <Label>Match Type</Label>
                          <Select
                            value={formData.matchType}
                            onValueChange={(value: "singles" | "doubles") =>
                              setFormData({ ...formData, matchType: value })
                            }
                          >
                            <SelectTrigger className="bg-[#1a1a1a] border-[#262626]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-[#1a1a1a] border-[#262626]">
                              <SelectItem value="singles">Singles (1v1)</SelectItem>
                              <SelectItem value="doubles">Doubles (2v2)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      {/* Best Of Settings */}
                      <BestOfSettings
                        format={formData.format}
                        bestOf={formData.bestOf}
                        bestOfGroupStage={formData.bestOfGroupStage}
                        bestOfEarlyRounds={formData.bestOfEarlyRounds}
                        bestOfSemiFinals={formData.bestOfSemiFinals}
                        bestOfFinals={formData.bestOfFinals}
                        onBestOfChange={(value) =>
                          setFormData({ ...formData, bestOf: value })
                        }
                        onBestOfGroupStageChange={(value) =>
                          setFormData({ ...formData, bestOfGroupStage: value })
                        }
                        onBestOfEarlyRoundsChange={(value) =>
                          setFormData({ ...formData, bestOfEarlyRounds: value })
                        }
                        onBestOfSemiFinalsChange={(value) =>
                          setFormData({ ...formData, bestOfSemiFinals: value })
                        }
                        onBestOfFinalsChange={(value) =>
                          setFormData({ ...formData, bestOfFinals: value })
                        }
                      />

                      {/* Schedule */}
                      <div className="grid gap-4 sm:grid-cols-3">
                        <div className="grid gap-2">
                          <Label htmlFor="date">Date</Label>
                          <Input
                            id="date"
                            type="date"
                            value={formData.scheduledDate}
                            onChange={(e) => setFormData({ ...formData, scheduledDate: e.target.value })}
                            className="bg-[#1a1a1a] border-[#262626]"
                          />
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="time">Time</Label>
                          <Input
                            id="time"
                            type="time"
                            value={formData.scheduledTime}
                            onChange={(e) => setFormData({ ...formData, scheduledTime: e.target.value })}
                            className="bg-[#1a1a1a] border-[#262626]"
                          />
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="location">Location</Label>
                          <Input
                            id="location"
                            value={formData.location}
                            onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                            placeholder="Break Room"
                            className="bg-[#1a1a1a] border-[#262626]"
                          />
                        </div>
                      </div>

                      {/* Prize */}
                      <div className="grid gap-2">
                        <Label htmlFor="prize">Prize Description</Label>
                        <Input
                          id="prize"
                          value={formData.prizeDescription}
                          onChange={(e) => setFormData({ ...formData, prizeDescription: e.target.value })}
                          placeholder="Eternal glory and a fancy coffee mug"
                          className="bg-[#1a1a1a] border-[#262626]"
                        />
                      </div>

                      {/* ELO Multipliers */}
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="grid gap-2">
                          <Label htmlFor="eloBase">ELO Multiplier (Early Rounds)</Label>
                          <div className="flex items-center gap-2">
                            <Input
                              id="eloBase"
                              type="number"
                              min={100}
                              max={500}
                              value={formData.eloMultiplierBase}
                              onChange={(e) =>
                                setFormData({ ...formData, eloMultiplierBase: parseInt(e.target.value) || 150 })
                              }
                              className="bg-[#1a1a1a] border-[#262626]"
                            />
                            <span className="text-sm text-[#737373] whitespace-nowrap">
                              = {(formData.eloMultiplierBase / 100).toFixed(1)}x
                            </span>
                          </div>
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="eloFinals">ELO Multiplier (Finals)</Label>
                          <div className="flex items-center gap-2">
                            <Input
                              id="eloFinals"
                              type="number"
                              min={100}
                              max={500}
                              value={formData.eloMultiplierFinals}
                              onChange={(e) =>
                                setFormData({ ...formData, eloMultiplierFinals: parseInt(e.target.value) || 300 })
                              }
                              className="bg-[#1a1a1a] border-[#262626]"
                            />
                            <span className="text-sm text-[#737373] whitespace-nowrap">
                              = {(formData.eloMultiplierFinals / 100).toFixed(1)}x
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-end gap-3">
                      <Button
                        variant="outline"
                        onClick={() => setCreateDialogOpen(false)}
                        className="border-[#262626] bg-transparent hover:bg-[#1a1a1a]"
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={handleCreateTournament}
                        disabled={isPending}
                        className="bg-white text-black hover:bg-zinc-200"
                      >
                        {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Create Tournament
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>

              {/* Tournaments List */}
              <div className="overflow-hidden rounded-xl border border-[#1a1a1a] bg-[#0a0a0a]">
                {tournaments.length === 0 ? (
                  <div className="p-12 text-center">
                    <Trophy className="mx-auto h-10 w-10 text-[#333]" />
                    <p className="mt-4 text-[#737373]">No tournaments yet</p>
                    <p className="text-sm text-[#525252]">Create your first tournament to get started</p>
                  </div>
                ) : (
                  <div className="divide-y divide-[#1a1a1a]/50">
                    {tournaments.map((tournament) => {
                      const statusConfig = STATUS_CONFIG[tournament.status] || STATUS_CONFIG.draft;
                      const isProcessing = isPending && processingId === tournament.id;

                      return (
                        <div
                          key={tournament.id}
                          className="flex items-center justify-between gap-4 px-5 py-4"
                        >
                          {/* Tournament Info */}
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-3">
                              <h3 className="font-medium text-white truncate">
                                {tournament.name}
                              </h3>
                              <Badge
                                className={cn(
                                  "shrink-0 text-[10px]",
                                  statusConfig.color
                                )}
                              >
                                {statusConfig.label}
                              </Badge>
                            </div>
                            <div className="mt-1 flex items-center gap-4 text-xs text-[#737373]">
                              <span>{FORMAT_LABELS[tournament.format]}</span>
                              <span className="text-[#333]">•</span>
                              <span>{tournament.matchType === "singles" ? "1v1" : "2v2"}</span>
                              <span className="text-[#333]">•</span>
                              <span>Best of {tournament.bestOf}</span>
                              <span className="text-[#333]">•</span>
                              <span className="flex items-center gap-1">
                                <Users className="h-3 w-3" />
                                {tournament.enrollmentCount} enrolled
                              </span>
                              {tournament.scheduledDate && (
                                <>
                                  <span className="text-[#333]">•</span>
                                  <span className="flex items-center gap-1">
                                    <Calendar className="h-3 w-3" />
                                    {new Date(tournament.scheduledDate).toLocaleDateString()}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="flex items-center gap-2 shrink-0">
                            {tournament.status === "draft" && (
                              <>
                                <Button
                                  size="sm"
                                  onClick={() => handleOpenEnrollment(tournament.id)}
                                  disabled={isProcessing}
                                  className="bg-blue-600 hover:bg-blue-700 text-white"
                                >
                                  {isProcessing ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <>
                                      <DoorOpen className="mr-1.5 h-3.5 w-3.5" />
                                      Open Enrollment
                                    </>
                                  )}
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleDeleteTournament(tournament.id)}
                                  disabled={isProcessing}
                                  className="text-red-500 hover:text-red-400 hover:bg-red-950/30"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </>
                            )}

                            {tournament.status === "enrollment" && (
                              <>
                                <Button
                                  size="sm"
                                  onClick={() => handleStartTournament(tournament.id, tournament.enrollmentCount)}
                                  disabled={isProcessing || tournament.enrollmentCount < 2}
                                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                                >
                                  {isProcessing ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <>
                                      <Play className="mr-1.5 h-3.5 w-3.5" />
                                      Start Tournament
                                    </>
                                  )}
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleCancelTournament(tournament.id)}
                                  disabled={isProcessing}
                                  className="text-red-500 hover:text-red-400 hover:bg-red-950/30"
                                >
                                  <XCircle className="h-4 w-4" />
                                </Button>
                              </>
                            )}

                            {tournament.status === "in_progress" && (
                              <>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  asChild
                                  className="border-[#262626] bg-transparent hover:bg-[#1a1a1a]"
                                >
                                  <a href={`/tournaments/${tournament.id}`}>
                                    View Bracket
                                  </a>
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleCancelTournament(tournament.id)}
                                  disabled={isProcessing}
                                  className="text-red-500 hover:text-red-400 hover:bg-red-950/30"
                                >
                                  <XCircle className="h-4 w-4" />
                                </Button>
                              </>
                            )}

                            {tournament.status === "completed" && (
                              <Button
                                size="sm"
                                variant="outline"
                                asChild
                                className="border-[#262626] bg-transparent hover:bg-[#1a1a1a]"
                              >
                                <a href={`/tournaments/${tournament.id}`}>
                                  View Results
                                </a>
                              </Button>
                            )}

                            {tournament.status === "cancelled" && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleDeleteTournament(tournament.id)}
                                disabled={isProcessing}
                                className="text-red-500 hover:text-red-400 hover:bg-red-950/30"
                              >
                                {isProcessing ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Trash2 className="h-4 w-4" />
                                )}
                              </Button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </motion.div>
          </TabsContent>

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
