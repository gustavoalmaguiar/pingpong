"use client";

import { useState } from "react";
import { Check, ChevronsUpDown, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export interface PlayerOption {
  id: string;
  displayName: string;
  elo: number;
  avatarUrl: string | null;
}

interface PlayerSelectProps {
  players: PlayerOption[];
  value: string | null;
  onChange: (value: string | null) => void;
  placeholder?: string;
  excludeIds?: string[];
  label?: string;
  compact?: boolean;
}

export function PlayerSelect({
  players,
  value,
  onChange,
  placeholder = "Select player",
  excludeIds = [],
  label,
  compact = false,
}: PlayerSelectProps) {
  const [open, setOpen] = useState(false);

  const selectedPlayer = players.find((p) => p.id === value);
  const filteredPlayers = players.filter((p) => !excludeIds.includes(p.id));

  return (
    <div className="space-y-2">
      {label && (
        <label className="text-[11px] font-medium uppercase tracking-widest text-[#525252]">
          {label}
        </label>
      )}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className={cn(
              "w-full justify-between border-[#262626] bg-[#0a0a0a] text-left font-normal hover:bg-[#111] hover:border-[#333]",
              compact ? "h-10 px-2.5 text-sm" : "h-12 px-3",
              !value && "text-[#525252]"
            )}
          >
            {selectedPlayer ? (
              <div className={cn("flex items-center min-w-0 flex-1", compact ? "gap-2" : "gap-3")}>
                <Avatar className={cn("border border-[#262626] shrink-0", compact ? "h-6 w-6" : "h-7 w-7")}>
                  <AvatarImage src={selectedPlayer.avatarUrl || undefined} />
                  <AvatarFallback className={cn("bg-[#1a1a1a]", compact ? "text-[10px]" : "text-xs")}>
                    {selectedPlayer.displayName.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="truncate">{selectedPlayer.displayName}</span>
                {!compact && (
                  <span className="font-mono text-xs text-[#525252]">
                    {selectedPlayer.elo}
                  </span>
                )}
              </div>
            ) : (
              <span className="truncate">{placeholder}</span>
            )}
            <ChevronsUpDown className={cn("shrink-0 opacity-50", compact ? "ml-1 h-3.5 w-3.5" : "ml-2 h-4 w-4")} />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="w-[--radix-popover-trigger-width] p-0 border-[#262626] bg-[#0a0a0a]"
          align="start"
        >
          <Command className="bg-transparent">
            <div className="flex items-center border-b border-[#1a1a1a] px-3">
              <Search className="mr-2 h-4 w-4 shrink-0 text-[#525252]" />
              <CommandInput
                placeholder="Search players..."
                className="h-10 border-0 bg-transparent focus:ring-0"
              />
            </div>
            <CommandList>
              <CommandEmpty className="py-6 text-center text-sm text-[#525252]">
                No player found.
              </CommandEmpty>
              <CommandGroup>
                {filteredPlayers.map((player) => (
                  <CommandItem
                    key={player.id}
                    value={player.displayName}
                    onSelect={() => {
                      onChange(player.id === value ? null : player.id);
                      setOpen(false);
                    }}
                    className="flex items-center gap-3 px-3 py-2.5 cursor-pointer data-[selected=true]:bg-[#1a1a1a]"
                  >
                    <Avatar className="h-7 w-7 border border-[#262626]">
                      <AvatarImage src={player.avatarUrl || undefined} />
                      <AvatarFallback className="bg-[#1a1a1a] text-xs">
                        {player.displayName.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-1 items-center justify-between">
                      <span className="truncate">{player.displayName}</span>
                      <span className="font-mono text-xs text-[#525252]">
                        {player.elo}
                      </span>
                    </div>
                    {value === player.id && (
                      <Check className="h-4 w-4 text-white" />
                    )}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
