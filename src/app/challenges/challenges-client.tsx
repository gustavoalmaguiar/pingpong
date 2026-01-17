"use client";

import { useState, useTransition } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Swords, Clock, Check, X, ChevronRight, Loader2 } from "lucide-react";
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "@/lib/format";
import { acceptChallenge, declineChallenge, cancelChallenge } from "@/actions/challenges";
import { useLogMatch } from "@/contexts/log-match-context";
import { toast } from "sonner";

interface Player {
  id: string;
  displayName: string;
  elo: number;
  avatarUrl?: string | null;
}

interface Challenge {
  id: string;
  challengerId: string;
  challengedId: string;
  status: "pending" | "accepted" | "declined" | "completed" | "expired";
  message?: string | null;
  createdAt: Date;
  expiresAt: Date;
  challenger?: Player;
  challenged?: Player;
}

interface ChallengesClientProps {
  challenges: Challenge[];
  currentPlayerId?: string;
}

export function ChallengesClient({
  challenges,
  currentPlayerId,
}: ChallengesClientProps) {
  const [isPending, startTransition] = useTransition();
  const [processingId, setProcessingId] = useState<string | null>(null);
  const { openModal } = useLogMatch();

  const incomingPending = challenges.filter(
    (c) => c.challengedId === currentPlayerId && c.status === "pending"
  );
  const outgoingPending = challenges.filter(
    (c) => c.challengerId === currentPlayerId && c.status === "pending"
  );
  const accepted = challenges.filter((c) => c.status === "accepted");
  const history = challenges.filter(
    (c) => c.status === "declined" || c.status === "completed" || c.status === "expired"
  );

  const handleAccept = async (id: string) => {
    setProcessingId(id);
    startTransition(async () => {
      try {
        await acceptChallenge(id);
        toast.success("Challenge accepted! Time to play!");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to accept");
      } finally {
        setProcessingId(null);
      }
    });
  };

  const handleDecline = async (id: string) => {
    setProcessingId(id);
    startTransition(async () => {
      try {
        await declineChallenge(id);
        toast.success("Challenge declined");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to decline");
      } finally {
        setProcessingId(null);
      }
    });
  };

  const handleCancel = async (id: string) => {
    setProcessingId(id);
    startTransition(async () => {
      try {
        await cancelChallenge(id);
        toast.success("Challenge cancelled");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to cancel");
      } finally {
        setProcessingId(null);
      }
    });
  };

  return (
    <div className="min-h-screen bg-black p-6 md:p-8">
      <div className="mx-auto max-w-3xl">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 flex items-center gap-3"
        >
          <Swords className="h-6 w-6 text-[#525252]" />
          <h1 className="text-2xl font-bold tracking-tight">Challenges</h1>
          {incomingPending.length > 0 && (
            <span className="rounded-full bg-white px-2 py-0.5 font-mono text-xs text-black">
              {incomingPending.length} new
            </span>
          )}
        </motion.div>

        <Tabs defaultValue="pending" className="space-y-6">
          <TabsList className="bg-[#0a0a0a] border border-[#1a1a1a] p-1">
            <TabsTrigger
              value="pending"
              className="data-[state=active]:bg-white data-[state=active]:text-black"
            >
              Pending
              {(incomingPending.length + outgoingPending.length) > 0 && (
                <span className="ml-2 rounded-full bg-[#1a1a1a] px-1.5 py-0.5 text-[10px] data-[state=active]:bg-black/10">
                  {incomingPending.length + outgoingPending.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger
              value="accepted"
              className="data-[state=active]:bg-white data-[state=active]:text-black"
            >
              Accepted
              {accepted.length > 0 && (
                <span className="ml-2 rounded-full bg-[#1a1a1a] px-1.5 py-0.5 text-[10px] data-[state=active]:bg-black/10">
                  {accepted.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger
              value="history"
              className="data-[state=active]:bg-white data-[state=active]:text-black"
            >
              History
            </TabsTrigger>
          </TabsList>

          {/* Pending Tab */}
          <TabsContent value="pending" className="space-y-6">
            {/* Incoming */}
            {incomingPending.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="overflow-hidden rounded-xl border border-[#1a1a1a] bg-[#0a0a0a]"
              >
                <div className="border-b border-[#1a1a1a] px-5 py-3">
                  <h3 className="text-[11px] font-medium uppercase tracking-[0.15em] text-[#525252]">
                    Incoming Challenges
                  </h3>
                </div>
                <div className="divide-y divide-[#1a1a1a]/50">
                  <AnimatePresence>
                    {incomingPending.map((challenge) => (
                      <ChallengeRow
                        key={challenge.id}
                        challenge={challenge}
                        type="incoming"
                        onAccept={() => handleAccept(challenge.id)}
                        onDecline={() => handleDecline(challenge.id)}
                        isProcessing={processingId === challenge.id && isPending}
                      />
                    ))}
                  </AnimatePresence>
                </div>
              </motion.div>
            )}

            {/* Outgoing */}
            {outgoingPending.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="overflow-hidden rounded-xl border border-[#1a1a1a] bg-[#0a0a0a]"
              >
                <div className="border-b border-[#1a1a1a] px-5 py-3">
                  <h3 className="text-[11px] font-medium uppercase tracking-[0.15em] text-[#525252]">
                    Outgoing Challenges
                  </h3>
                </div>
                <div className="divide-y divide-[#1a1a1a]/50">
                  <AnimatePresence>
                    {outgoingPending.map((challenge) => (
                      <ChallengeRow
                        key={challenge.id}
                        challenge={challenge}
                        type="outgoing"
                        onCancel={() => handleCancel(challenge.id)}
                        isProcessing={processingId === challenge.id && isPending}
                      />
                    ))}
                  </AnimatePresence>
                </div>
              </motion.div>
            )}

            {/* Empty State */}
            {incomingPending.length === 0 && outgoingPending.length === 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="rounded-xl border border-[#1a1a1a] bg-[#0a0a0a] py-16 text-center"
              >
                <Swords className="mx-auto h-12 w-12 text-[#262626]" />
                <p className="mt-4 text-white">No pending challenges</p>
                <p className="mt-1 text-sm text-[#525252]">
                  Challenge someone from their profile page
                </p>
              </motion.div>
            )}
          </TabsContent>

          {/* Accepted Tab */}
          <TabsContent value="accepted">
            {accepted.length > 0 ? (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="overflow-hidden rounded-xl border border-[#1a1a1a] bg-[#0a0a0a]"
              >
                <div className="divide-y divide-[#1a1a1a]/50">
                  {accepted.map((challenge) => (
                    <ChallengeRow
                      key={challenge.id}
                      challenge={challenge}
                      type="accepted"
                      currentPlayerId={currentPlayerId}
                      onLogMatch={() => openModal({
                        challengeId: challenge.id,
                        challengerId: challenge.challengerId,
                        challengedId: challenge.challengedId,
                      })}
                    />
                  ))}
                </div>
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="rounded-xl border border-[#1a1a1a] bg-[#0a0a0a] py-16 text-center"
              >
                <p className="text-[#525252]">No accepted challenges</p>
              </motion.div>
            )}
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history">
            {history.length > 0 ? (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="overflow-hidden rounded-xl border border-[#1a1a1a] bg-[#0a0a0a]"
              >
                <div className="divide-y divide-[#1a1a1a]/50">
                  {history.map((challenge) => (
                    <ChallengeRow
                      key={challenge.id}
                      challenge={challenge}
                      type="history"
                      currentPlayerId={currentPlayerId}
                    />
                  ))}
                </div>
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="rounded-xl border border-[#1a1a1a] bg-[#0a0a0a] py-16 text-center"
              >
                <p className="text-[#525252]">No challenge history</p>
              </motion.div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

interface ChallengeRowProps {
  challenge: Challenge;
  type: "incoming" | "outgoing" | "accepted" | "history";
  currentPlayerId?: string;
  onAccept?: () => void;
  onDecline?: () => void;
  onCancel?: () => void;
  onLogMatch?: () => void;
  isProcessing?: boolean;
}

function ChallengeRow({
  challenge,
  type,
  currentPlayerId,
  onAccept,
  onDecline,
  onCancel,
  onLogMatch,
  isProcessing,
}: ChallengeRowProps) {
  const otherPlayer = type === "incoming" || type === "history"
    ? challenge.challenger
    : challenge.challenged;

  if (!otherPlayer) return null;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className="flex items-center justify-between px-5 py-4"
    >
      <Link
        href={`/players/${otherPlayer.id}`}
        className="flex items-center gap-4 min-w-0"
      >
        <Avatar className="h-10 w-10 border border-[#262626]">
          <AvatarImage src={otherPlayer.avatarUrl || undefined} />
          <AvatarFallback className="bg-[#1a1a1a]">
            {otherPlayer.displayName.charAt(0)}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <p className="font-medium text-white">
            {otherPlayer.displayName}
            <span className="ml-2 font-mono text-xs text-[#525252]">
              {otherPlayer.elo}
            </span>
          </p>
          <div className="flex items-center gap-2 text-xs text-[#525252]">
            {type === "incoming" && <span>challenged you</span>}
            {type === "outgoing" && <span>you challenged</span>}
            {type === "accepted" && <span>ready to play</span>}
            {type === "history" && (
              <span
                className={cn(
                  challenge.status === "declined" && "text-red-500",
                  challenge.status === "completed" && "text-emerald-500",
                  challenge.status === "expired" && "text-[#525252]"
                )}
              >
                {challenge.status}
              </span>
            )}
            <span>•</span>
            <Clock className="h-3 w-3" />
            <span>{formatDistanceToNow(challenge.createdAt)}</span>
          </div>
        </div>
      </Link>

      <div className="flex items-center gap-2">
        {type === "incoming" && (
          <>
            <Button
              size="sm"
              variant="outline"
              onClick={onDecline}
              disabled={isProcessing}
              className="h-8 border-[#262626] bg-transparent text-[#737373] hover:bg-red-500/10 hover:text-red-500 hover:border-red-500/50"
            >
              {isProcessing ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <>
                  <X className="mr-1 h-3 w-3" />
                  Decline
                </>
              )}
            </Button>
            <Button
              size="sm"
              onClick={onAccept}
              disabled={isProcessing}
              className="h-8 bg-white text-black hover:bg-[#e5e5e5]"
            >
              {isProcessing ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <>
                  <Check className="mr-1 h-3 w-3" />
                  Accept
                </>
              )}
            </Button>
          </>
        )}

        {type === "outgoing" && (
          <Button
            size="sm"
            variant="outline"
            onClick={onCancel}
            disabled={isProcessing}
            className="h-8 border-[#262626] bg-transparent text-[#525252] hover:bg-[#1a1a1a] hover:text-white"
          >
            {isProcessing ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              "Cancel"
            )}
          </Button>
        )}

        {type === "accepted" && (
          <Button
            size="sm"
            onClick={onLogMatch}
            className="h-8 bg-emerald-500 text-white hover:bg-emerald-600"
          >
            Log Match
            <ChevronRight className="ml-1 h-3 w-3" />
          </Button>
        )}
      </div>
    </motion.div>
  );
}
