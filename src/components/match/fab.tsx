"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import { LogMatchModal } from "./log-match-modal";
import { useLogMatch } from "@/contexts/log-match-context";

export function FloatingActionButton() {
  const { isOpen, openModal, closeModal, challengeData } = useLogMatch();
  const [isHovered, setIsHovered] = useState(false);

  return (
    <>
      {/* FAB Button */}
      <motion.button
        onClick={() => openModal()}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className="fixed bottom-6 right-6 z-50 flex items-center gap-3 overflow-hidden rounded-full bg-white text-black shadow-2xl"
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 400, damping: 25 }}
      >
        {/* Animated glow ring */}
        <motion.div
          className="absolute inset-0 rounded-full"
          animate={{
            boxShadow: [
              "0 0 0 0 rgba(255, 255, 255, 0.3)",
              "0 0 0 8px rgba(255, 255, 255, 0)",
            ],
          }}
          transition={{
            duration: 2.5,
            repeat: Infinity,
            ease: "easeOut",
          }}
        />

        {/* Outer glow */}
        <div
          className="pointer-events-none absolute inset-0 rounded-full"
          style={{
            boxShadow: "0 4px 30px rgba(255, 255, 255, 0.25), 0 0 60px rgba(255, 255, 255, 0.1)",
          }}
        />

        {/* Content container */}
        <div className="relative flex items-center gap-2.5 px-5 py-3.5">
          {/* Ping pong ball icon */}
          <div className="relative flex h-7 w-7 items-center justify-center">
            {/* Ball */}
            <motion.div
              className="absolute h-5 w-5 rounded-full bg-black"
              animate={isHovered ? {
                y: [-2, 2, -2],
                rotate: [0, 180, 360]
              } : {}}
              transition={{
                duration: 0.6,
                repeat: isHovered ? Infinity : 0,
                ease: "easeInOut"
              }}
            >
              {/* Ball seam */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="h-full w-[1px] rotate-45 bg-white/30" />
              </div>
            </motion.div>

            {/* Paddle hint */}
            <div className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-500 opacity-80" />
          </div>

          {/* Text */}
          <span className="text-sm font-semibold tracking-tight">Log Match</span>

          {/* Score preview decoration */}
          <div className="flex items-center gap-1 rounded bg-black/10 px-2 py-0.5">
            <span className="font-mono text-xs font-bold">11</span>
            <span className="text-[10px] text-black/40">-</span>
            <span className="font-mono text-xs text-black/50">0</span>
          </div>
        </div>
      </motion.button>

      {/* Modal */}
      <LogMatchModal
        open={isOpen}
        onOpenChange={(open) => !open && closeModal()}
        challengeData={challengeData}
      />
    </>
  );
}
