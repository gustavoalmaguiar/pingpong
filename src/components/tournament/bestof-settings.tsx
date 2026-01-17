"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Zap, Trophy, Target, Crown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";

const BEST_OF_VALUES = [1, 3, 5, 7] as const;
type BestOfValue = (typeof BEST_OF_VALUES)[number];

type TournamentFormat =
  | "single_elimination"
  | "double_elimination"
  | "swiss"
  | "round_robin_knockout";

interface BestOfSettingsProps {
  format: TournamentFormat;
  bestOf: number;
  bestOfGroupStage: number | null;
  bestOfEarlyRounds: number | null;
  bestOfSemiFinals: number | null;
  bestOfFinals: number | null;
  onBestOfChange: (value: number) => void;
  onBestOfGroupStageChange: (value: number | null) => void;
  onBestOfEarlyRoundsChange: (value: number | null) => void;
  onBestOfSemiFinalsChange: (value: number | null) => void;
  onBestOfFinalsChange: (value: number | null) => void;
}

interface StageConfig {
  key: string;
  label: string;
  icon: typeof Zap;
  value: number | null;
  onChange: (value: number | null) => void;
  accentColor: string;
}

function BestOfButtonGroup({
  value,
  onChange,
  size = "default",
  accentColor = "emerald",
}: {
  value: number;
  onChange: (value: number) => void;
  size?: "default" | "small";
  accentColor?: string;
}) {
  const accentClasses: Record<string, { active: string; glow: string }> = {
    emerald: {
      active: "bg-emerald-600 text-white border-emerald-500",
      glow: "shadow-[0_0_20px_rgba(16,185,129,0.3)]",
    },
    blue: {
      active: "bg-blue-600 text-white border-blue-500",
      glow: "shadow-[0_0_20px_rgba(59,130,246,0.3)]",
    },
    amber: {
      active: "bg-amber-600 text-white border-amber-500",
      glow: "shadow-[0_0_20px_rgba(245,158,11,0.3)]",
    },
    purple: {
      active: "bg-purple-600 text-white border-purple-500",
      glow: "shadow-[0_0_20px_rgba(147,51,234,0.3)]",
    },
  };

  const accent = accentClasses[accentColor] || accentClasses.emerald;

  return (
    <div
      className={cn(
        "inline-flex rounded-lg border border-[#262626] bg-[#0a0a0a] p-0.5",
        size === "small" ? "gap-0" : "gap-0.5"
      )}
    >
      {BEST_OF_VALUES.map((bo) => {
        const isActive = value === bo;
        return (
          <button
            key={bo}
            type="button"
            onClick={() => onChange(bo)}
            className={cn(
              "relative font-mono font-medium transition-all duration-200",
              size === "small"
                ? "px-2.5 py-1 text-xs rounded-md"
                : "px-3 py-1.5 text-sm rounded-md",
              isActive
                ? cn(accent.active, accent.glow)
                : "text-[#737373] hover:text-white hover:bg-[#1a1a1a] border border-transparent"
            )}
          >
            {bo}
          </button>
        );
      })}
    </div>
  );
}

function StageRow({
  stage,
  defaultValue,
}: {
  stage: StageConfig;
  defaultValue: number;
}) {
  const hasOverride = stage.value !== null;
  const displayValue = stage.value ?? defaultValue;

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -10 }}
      className="flex items-center justify-between py-3 border-b border-[#1a1a1a] last:border-0"
    >
      <div className="flex items-center gap-3">
        <div
          className={cn(
            "flex h-8 w-8 items-center justify-center rounded-lg",
            hasOverride
              ? `bg-${stage.accentColor}-950/50 text-${stage.accentColor}-400`
              : "bg-[#1a1a1a] text-[#525252]"
          )}
          style={{
            backgroundColor: hasOverride
              ? `color-mix(in srgb, var(--${stage.accentColor}-600) 15%, transparent)`
              : undefined,
            color: hasOverride
              ? `var(--${stage.accentColor}-400)`
              : undefined,
          }}
        >
          <stage.icon className="h-4 w-4" />
        </div>
        <div>
          <p className="text-sm font-medium text-white">{stage.label}</p>
          <p className="text-[10px] text-[#525252]">
            {hasOverride ? "Custom" : "Using default"}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <BestOfButtonGroup
          value={displayValue}
          onChange={(val) => stage.onChange(val)}
          size="small"
          accentColor={stage.accentColor}
        />
        {hasOverride && (
          <button
            type="button"
            onClick={() => stage.onChange(null)}
            className="text-[10px] text-[#525252] hover:text-red-400 transition-colors px-1"
          >
            Reset
          </button>
        )}
      </div>
    </motion.div>
  );
}

export function BestOfSettings({
  format,
  bestOf,
  bestOfGroupStage,
  bestOfEarlyRounds,
  bestOfSemiFinals,
  bestOfFinals,
  onBestOfChange,
  onBestOfGroupStageChange,
  onBestOfEarlyRoundsChange,
  onBestOfSemiFinalsChange,
  onBestOfFinalsChange,
}: BestOfSettingsProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Determine which stages to show based on format
  const getStages = (): StageConfig[] => {
    const stages: StageConfig[] = [];

    if (format === "swiss") {
      stages.push({
        key: "group",
        label: "All Swiss Rounds",
        icon: Target,
        value: bestOfGroupStage,
        onChange: onBestOfGroupStageChange,
        accentColor: "blue",
      });
    } else if (format === "round_robin_knockout") {
      stages.push({
        key: "group",
        label: "Group Stage",
        icon: Target,
        value: bestOfGroupStage,
        onChange: onBestOfGroupStageChange,
        accentColor: "blue",
      });
      stages.push({
        key: "early",
        label: "Early Knockouts",
        icon: Zap,
        value: bestOfEarlyRounds,
        onChange: onBestOfEarlyRoundsChange,
        accentColor: "emerald",
      });
      stages.push({
        key: "semis",
        label: "Semifinals",
        icon: Trophy,
        value: bestOfSemiFinals,
        onChange: onBestOfSemiFinalsChange,
        accentColor: "amber",
      });
      stages.push({
        key: "finals",
        label: "Finals",
        icon: Crown,
        value: bestOfFinals,
        onChange: onBestOfFinalsChange,
        accentColor: "purple",
      });
    } else {
      // single_elimination or double_elimination
      stages.push({
        key: "early",
        label: "Early Rounds",
        icon: Zap,
        value: bestOfEarlyRounds,
        onChange: onBestOfEarlyRoundsChange,
        accentColor: "emerald",
      });
      stages.push({
        key: "semis",
        label: "Semifinals",
        icon: Trophy,
        value: bestOfSemiFinals,
        onChange: onBestOfSemiFinalsChange,
        accentColor: "amber",
      });
      stages.push({
        key: "finals",
        label: "Finals",
        icon: Crown,
        value: bestOfFinals,
        onChange: onBestOfFinalsChange,
        accentColor: "purple",
      });
    }

    return stages;
  };

  const stages = getStages();
  const hasCustomStages = stages.some((s) => s.value !== null);

  // Generate preview summary
  const getSummary = () => {
    const parts: string[] = [];

    if (format === "swiss") {
      parts.push(`Swiss: Bo${bestOfGroupStage ?? bestOf}`);
    } else if (format === "round_robin_knockout") {
      parts.push(`Groups: Bo${bestOfGroupStage ?? bestOf}`);
      parts.push(`Knockouts: Bo${bestOfEarlyRounds ?? bestOf}`);
      if (bestOfSemiFinals !== null && bestOfSemiFinals !== (bestOfEarlyRounds ?? bestOf)) {
        parts.push(`Semis: Bo${bestOfSemiFinals}`);
      }
      parts.push(`Finals: Bo${bestOfFinals ?? bestOf}`);
    } else {
      parts.push(`Early: Bo${bestOfEarlyRounds ?? bestOf}`);
      if (bestOfSemiFinals !== null && bestOfSemiFinals !== (bestOfEarlyRounds ?? bestOf)) {
        parts.push(`Semis: Bo${bestOfSemiFinals}`);
      }
      parts.push(`Finals: Bo${bestOfFinals ?? bestOf}`);
    }

    return parts;
  };

  return (
    <div className="space-y-4">
      {/* Main Best Of Selector */}
      <div className="grid gap-2">
        <div className="flex items-center justify-between">
          <Label>Best Of (Default)</Label>
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className={cn(
              "flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wider transition-colors",
              isExpanded
                ? "text-emerald-400"
                : "text-[#525252] hover:text-white"
            )}
          >
            {isExpanded ? "Simple" : "Advanced"}
            <ChevronDown
              className={cn(
                "h-3 w-3 transition-transform duration-300",
                isExpanded && "rotate-180"
              )}
            />
          </button>
        </div>

        <div className="flex items-center gap-3">
          <BestOfButtonGroup
            value={bestOf}
            onChange={onBestOfChange}
            accentColor="emerald"
          />
          <span className="text-xs text-[#525252]">
            First to {Math.ceil(bestOf / 2)} wins
          </span>
        </div>
      </div>

      {/* Advanced Panel */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
            className="overflow-hidden"
          >
            <div className="rounded-xl border border-[#1a1a1a] bg-[#0a0a0a]/50 backdrop-blur-sm">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-[#1a1a1a] px-4 py-3">
                <div>
                  <p className="text-xs font-medium text-white">
                    Stage-Specific Settings
                  </p>
                  <p className="text-[10px] text-[#525252]">
                    Override Best Of for specific tournament stages
                  </p>
                </div>
                {hasCustomStages && (
                  <button
                    type="button"
                    onClick={() => {
                      onBestOfGroupStageChange(null);
                      onBestOfEarlyRoundsChange(null);
                      onBestOfSemiFinalsChange(null);
                      onBestOfFinalsChange(null);
                    }}
                    className="text-[10px] font-medium text-red-400 hover:text-red-300 transition-colors"
                  >
                    Reset All
                  </button>
                )}
              </div>

              {/* Stage Rows */}
              <div className="px-4">
                <AnimatePresence mode="popLayout">
                  {stages.map((stage, index) => (
                    <motion.div
                      key={stage.key}
                      initial={{ opacity: 0, y: -10 }}
                      animate={{
                        opacity: 1,
                        y: 0,
                        transition: { delay: index * 0.05 },
                      }}
                      exit={{ opacity: 0, y: -10 }}
                    >
                      <StageRow stage={stage} defaultValue={bestOf} />
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>

              {/* Preview Summary */}
              <div className="border-t border-[#1a1a1a] px-4 py-3">
                <p className="text-[10px] font-medium uppercase tracking-wider text-[#525252] mb-2">
                  Preview
                </p>
                <div className="flex items-center gap-2 flex-wrap">
                  {getSummary().map((part, i, arr) => (
                    <span key={part} className="flex items-center gap-2">
                      <span
                        className={cn(
                          "rounded-md px-2 py-1 text-xs font-mono",
                          part.includes("Finals")
                            ? "bg-purple-950/50 text-purple-300 border border-purple-800/50"
                            : part.includes("Semis")
                            ? "bg-amber-950/50 text-amber-300 border border-amber-800/50"
                            : part.includes("Groups") || part.includes("Swiss")
                            ? "bg-blue-950/50 text-blue-300 border border-blue-800/50"
                            : "bg-emerald-950/50 text-emerald-300 border border-emerald-800/50"
                        )}
                      >
                        {part}
                      </span>
                      {i < arr.length - 1 && (
                        <span className="text-[#333]">→</span>
                      )}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Quick indicator when collapsed but has custom stages */}
      {!isExpanded && hasCustomStages && (
        <motion.div
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2 text-[10px] text-emerald-400"
        >
          <div className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
          Custom stage settings active
        </motion.div>
      )}
    </div>
  );
}
