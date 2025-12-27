"use client";

import { motion } from "framer-motion";
import { Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

interface ScoreInputProps {
  value: number;
  onChange: (value: number) => void;
  label?: string;
  max?: number;
  highlight?: boolean;
}

export function ScoreInput({
  value,
  onChange,
  label,
  max = 11,
  highlight = false,
}: ScoreInputProps) {
  const increment = () => {
    if (value < max) onChange(value + 1);
  };

  const decrement = () => {
    if (value > 0) onChange(value - 1);
  };

  return (
    <div className="flex flex-col items-center gap-2">
      {label && (
        <label className="text-[11px] font-medium uppercase tracking-widest text-[#525252]">
          {label}
        </label>
      )}
      <div className="flex items-center gap-2">
        {/* Decrement button */}
        <motion.button
          type="button"
          onClick={decrement}
          disabled={value <= 0}
          className="flex h-10 w-10 items-center justify-center rounded-lg border border-[#262626] bg-[#0a0a0a] text-[#737373] transition-colors hover:border-[#333] hover:bg-[#111] hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
          whileTap={{ scale: 0.95 }}
        >
          <Minus className="h-4 w-4" />
        </motion.button>

        {/* Score display */}
        <motion.div
          className={cn(
            "flex h-16 w-20 items-center justify-center rounded-lg border bg-[#0a0a0a] font-mono text-4xl font-bold transition-all",
            highlight
              ? "border-white/20 text-white glow-medium"
              : "border-[#262626] text-[#737373]"
          )}
          animate={{
            scale: highlight ? 1.02 : 1,
          }}
          transition={{ duration: 0.2 }}
        >
          {value}
        </motion.div>

        {/* Increment button */}
        <motion.button
          type="button"
          onClick={increment}
          disabled={value >= max}
          className="flex h-10 w-10 items-center justify-center rounded-lg border border-[#262626] bg-[#0a0a0a] text-[#737373] transition-colors hover:border-[#333] hover:bg-[#111] hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
          whileTap={{ scale: 0.95 }}
        >
          <Plus className="h-4 w-4" />
        </motion.button>
      </div>
    </div>
  );
}
