"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Pencil } from "lucide-react";
import { cn } from "@/lib/utils";

interface LoggedByUser {
  id: string;
  name: string | null;
  image: string | null;
}

interface LoggedByIndicatorProps {
  user: LoggedByUser | null;
  size?: "sm" | "md";
  showTooltip?: boolean;
}

export function LoggedByIndicator({
  user,
  size = "sm",
  showTooltip = true,
}: LoggedByIndicatorProps) {
  if (!user) return null;

  const avatarSizes = {
    sm: "h-5 w-5",
    md: "h-6 w-6",
  };

  const badgeSizes = {
    sm: "h-2.5 w-2.5 -bottom-0.5 -right-0.5",
    md: "h-3 w-3 -bottom-0.5 -right-0.5",
  };

  const iconSizes = {
    sm: "h-1.5 w-1.5",
    md: "h-2 w-2",
  };

  const indicator = (
    <div className="relative inline-flex shrink-0">
      <Avatar
        className={cn(
          avatarSizes[size],
          "ring-1 ring-neutral-700/50 transition-all duration-200",
          "hover:ring-neutral-600/70"
        )}
      >
        <AvatarImage
          src={user.image || undefined}
          alt={user.name || "User"}
          className="object-cover"
        />
        <AvatarFallback
          className={cn(
            "bg-neutral-800 text-neutral-500",
            size === "sm" ? "text-[8px]" : "text-[10px]"
          )}
        >
          {user.name?.charAt(0)?.toUpperCase() || "?"}
        </AvatarFallback>
      </Avatar>

      {/* Pencil badge overlay */}
      <div
        className={cn(
          "absolute flex items-center justify-center rounded-full",
          "bg-neutral-800 ring-1 ring-neutral-900",
          "transition-colors duration-200",
          badgeSizes[size]
        )}
      >
        <Pencil className={cn(iconSizes[size], "text-neutral-500")} />
      </div>
    </div>
  );

  if (!showTooltip) {
    return indicator;
  }

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            className="cursor-default focus:outline-none focus-visible:ring-1 focus-visible:ring-neutral-600 rounded-full"
          >
            {indicator}
          </button>
        </TooltipTrigger>
        <TooltipContent
          side="top"
          className="bg-neutral-800 border-neutral-700 text-neutral-200 text-xs px-2.5 py-1.5"
        >
          <span className="text-neutral-400">Logged by</span>{" "}
          <span className="font-medium">{user.name || "Unknown"}</span>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
