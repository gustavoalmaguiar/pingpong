import { Trophy } from "lucide-react";
import { cn } from "@/lib/utils";

interface TournamentBadgeProps {
  className?: string;
  /** Show only the icon for ultra-compact layouts */
  iconOnly?: boolean;
}

/**
 * A badge to indicate tournament matches.
 * Distinguishes tournament matches from regular matches with a violet/purple theme.
 */
export function TournamentBadge({ className, iconOnly = false }: TournamentBadgeProps) {
  if (iconOnly) {
    return (
      <span
        className={cn(
          "inline-flex items-center justify-center",
          "h-5 w-5 rounded",
          "bg-violet-500/15 text-violet-400",
          "ring-1 ring-inset ring-violet-500/20",
          className
        )}
        title="Tournament Match"
      >
        <Trophy className="h-3 w-3" />
      </span>
    );
  }

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1",
        "rounded-full px-2 py-0.5",
        "text-[10px] font-medium uppercase tracking-wider",
        "bg-violet-500/15 text-violet-400",
        "ring-1 ring-inset ring-violet-500/20",
        className
      )}
    >
      <Trophy className="h-2.5 w-2.5" />
      <span>Tournament</span>
    </span>
  );
}
