"use client";

import { motion } from "framer-motion";
import { Swords, Clock, Check, X } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from "@/lib/format";
import { cn } from "@/lib/utils";

interface Player {
  id: string;
  displayName: string;
  elo: number;
  avatarUrl?: string | null;
}

interface Challenge {
  id: string;
  challenger?: Player;
  challenged?: Player;
  status: "pending" | "accepted" | "declined" | "completed" | "expired";
  message?: string | null;
  createdAt: Date;
  expiresAt: Date;
}

interface ActiveChallengesProps {
  challenges: Challenge[];
  currentPlayerId?: string;
  onAccept?: (id: string) => void;
  onDecline?: (id: string) => void;
  onCancel?: (id: string) => void;
}

export function ActiveChallenges({
  challenges,
  currentPlayerId,
  onAccept,
  onDecline,
  onCancel,
}: ActiveChallengesProps) {
  const pendingChallenges = challenges.filter((c) => c.status === "pending");
  const incomingChallenges = pendingChallenges.filter(
    (c) => c.challenged?.id === currentPlayerId
  );
  const outgoingChallenges = pendingChallenges.filter(
    (c) => c.challenger?.id === currentPlayerId
  );

  if (pendingChallenges.length === 0) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.3 }}
      className="overflow-hidden rounded-xl border border-[#1a1a1a] bg-[#0a0a0a]"
    >
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-[#1a1a1a] px-5 py-4">
        <Swords className="h-4 w-4 text-[#525252]" />
        <h2 className="text-sm font-medium tracking-wide">Active Challenges</h2>
        <span className="ml-auto rounded-full bg-[#1a1a1a] px-2 py-0.5 font-mono text-xs text-white">
          {pendingChallenges.length}
        </span>
      </div>

      <div className="divide-y divide-[#1a1a1a]/50">
        {/* Incoming Challenges */}
        {incomingChallenges.map((challenge, index) => (
          <motion.div
            key={challenge.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: 0.1 + index * 0.05 }}
            className="flex items-center justify-between px-5 py-4"
          >
            <div className="flex items-center gap-4">
              <Avatar className="h-10 w-10 border border-[#262626]">
                <AvatarImage src={challenge.challenger?.avatarUrl || undefined} />
                <AvatarFallback className="bg-[#1a1a1a]">
                  {challenge.challenger?.displayName.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="text-sm font-medium text-white">
                  {challenge.challenger?.displayName}
                  <span className="ml-2 font-mono text-xs text-[#525252]">
                    {challenge.challenger?.elo}
                  </span>
                </p>
                <p className="text-xs text-[#525252]">
                  challenged you • {formatDistanceToNow(challenge.createdAt)}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => onDecline?.(challenge.id)}
                className="h-8 border-[#262626] bg-transparent text-[#737373] hover:bg-red-500/10 hover:text-red-500 hover:border-red-500/50"
              >
                <X className="mr-1 h-3 w-3" />
                Decline
              </Button>
              <Button
                size="sm"
                onClick={() => onAccept?.(challenge.id)}
                className="h-8 bg-white text-black hover:bg-[#e5e5e5]"
              >
                <Check className="mr-1 h-3 w-3" />
                Accept
              </Button>
            </div>
          </motion.div>
        ))}

        {/* Outgoing Challenges */}
        {outgoingChallenges.map((challenge, index) => (
          <motion.div
            key={challenge.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{
              duration: 0.3,
              delay: 0.1 + (incomingChallenges.length + index) * 0.05,
            }}
            className="flex items-center justify-between px-5 py-4"
          >
            <div className="flex items-center gap-4">
              <Avatar className="h-10 w-10 border border-[#262626]">
                <AvatarImage src={challenge.challenged?.avatarUrl || undefined} />
                <AvatarFallback className="bg-[#1a1a1a]">
                  {challenge.challenged?.displayName.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="text-sm font-medium text-white">
                  {challenge.challenged?.displayName}
                  <span className="ml-2 font-mono text-xs text-[#525252]">
                    {challenge.challenged?.elo}
                  </span>
                </p>
                <div className="flex items-center gap-2 text-xs text-[#525252]">
                  <span>you challenged</span>
                  <span>•</span>
                  <Clock className="h-3 w-3" />
                  <span>expires in {formatDistanceToNow(challenge.expiresAt).replace(" ago", "")}</span>
                </div>
              </div>
            </div>

            <Button
              size="sm"
              variant="outline"
              onClick={() => onCancel?.(challenge.id)}
              className="h-8 border-[#262626] bg-transparent text-[#525252] hover:bg-[#1a1a1a] hover:text-white"
            >
              Cancel
            </Button>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
