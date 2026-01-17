"use client";

import { useState, useTransition } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Loader2, User, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { updatePlayerName } from "@/actions/players";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface EditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  player: {
    displayName: string;
    avatarUrl: string | null;
  };
}

export function EditProfileModal({
  isOpen,
  onClose,
  player,
}: EditProfileModalProps) {
  const router = useRouter();
  const [displayName, setDisplayName] = useState(player.displayName);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!displayName.trim()) {
      toast.error("Display name cannot be empty");
      return;
    }

    if (displayName.trim().length < 2) {
      toast.error("Display name must be at least 2 characters");
      return;
    }

    if (displayName.trim().length > 30) {
      toast.error("Display name must be 30 characters or less");
      return;
    }

    startTransition(async () => {
      try {
        await updatePlayerName(displayName.trim());
        toast.success("Profile updated!");
        router.refresh();
        onClose();
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Failed to update profile"
        );
      }
    });
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", duration: 0.3 }}
            className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 p-4"
          >
            <div className="overflow-hidden rounded-2xl border border-[#1a1a1a] bg-[#0a0a0a] shadow-2xl">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-[#1a1a1a] px-6 py-4">
                <h2 className="text-lg font-semibold text-white">
                  Edit Profile
                </h2>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={onClose}
                  className="h-8 w-8 p-0 text-[#525252] hover:text-white"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="p-6 space-y-6">
                {/* Avatar Preview */}
                <div className="flex flex-col items-center gap-4">
                  <Avatar className="h-24 w-24 border-2 border-[#262626]">
                    <AvatarImage src={player.avatarUrl || undefined} />
                    <AvatarFallback className="bg-[#1a1a1a] text-2xl">
                      {displayName.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex items-start gap-2 rounded-lg bg-[#111] border border-[#1a1a1a] p-3">
                    <Info className="h-4 w-4 text-[#525252] shrink-0 mt-0.5" />
                    <p className="text-xs text-[#525252]">
                      Your profile picture is synced from your OAuth provider
                      (Google/GitHub). To change it, update your picture there.
                    </p>
                  </div>
                </div>

                {/* Display Name Field */}
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-[#525252]">
                    <User className="h-3 w-3" />
                    Display Name
                  </label>
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Enter your display name"
                    maxLength={30}
                    className="h-12 w-full rounded-lg border border-[#262626] bg-[#111] px-4 text-white placeholder-[#525252] outline-none transition-all focus:border-[#404040] focus:ring-1 focus:ring-[#404040]"
                  />
                  <p className="text-right text-[10px] text-[#525252]">
                    {displayName.length}/30 characters
                  </p>
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={onClose}
                    disabled={isPending}
                    className="flex-1 border-[#262626] bg-transparent text-white hover:bg-[#1a1a1a]"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={isPending || displayName.trim() === player.displayName}
                    className="flex-1 bg-white text-black hover:bg-[#e5e5e5] disabled:opacity-50"
                  >
                    {isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      "Save Changes"
                    )}
                  </Button>
                </div>
              </form>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
