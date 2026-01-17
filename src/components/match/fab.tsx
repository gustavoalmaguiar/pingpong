"use client";

import { motion } from "framer-motion";
import { Plus } from "lucide-react";
import { useLogMatch } from "@/contexts/log-match-context";
import { LogMatchModal } from "./log-match-modal";

export function FloatingActionButton() {
  const { isOpen, openModal, closeModal } = useLogMatch();

  return (
    <>
      <motion.button
        onClick={() => openModal()}
        className="fixed bottom-6 right-6 z-50 group cursor-pointer"
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 400, damping: 30, delay: 0.3 }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.92 }}
        aria-label="Log match"
      >
        {/* Outer ambient glow */}
        <div
          className="absolute inset-0 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500"
          style={{
            background: "radial-gradient(circle, rgba(255,255,255,0.08) 0%, transparent 70%)",
            transform: "scale(1.8)",
          }}
        />

        {/* Orbiting ring - slow rotation */}
        <motion.div
          className="absolute inset-[-3px] rounded-full"
          style={{
            background: "conic-gradient(from 0deg, transparent 0%, rgba(255,255,255,0.5) 10%, transparent 20%)",
          }}
          animate={{ rotate: 360 }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "linear",
          }}
        />

        {/* Counter-rotating accent ring */}
        <motion.div
          className="absolute inset-[-3px] rounded-full"
          style={{
            background: "conic-gradient(from 180deg, transparent 0%, rgba(255,255,255,0.3) 5%, transparent 10%)",
          }}
          animate={{ rotate: -360 }}
          transition={{
            duration: 12,
            repeat: Infinity,
            ease: "linear",
          }}
        />

        {/* Main button body */}
        <div
          className="relative h-[52px] w-[52px] rounded-full overflow-hidden"
          style={{
            background: "linear-gradient(145deg, #1a1a1a 0%, #0a0a0a 50%, #000000 100%)",
            boxShadow: `
              0 0 0 1px rgba(255,255,255,0.1),
              0 4px 24px rgba(0,0,0,0.8),
              inset 0 1px 0 rgba(255,255,255,0.08)
            `,
          }}
        >
          {/* Inner highlight edge */}
          <div
            className="absolute inset-[1px] rounded-full pointer-events-none"
            style={{
              background: "linear-gradient(180deg, rgba(255,255,255,0.06) 0%, transparent 40%)",
            }}
          />

          {/* Plus icon container */}
          <motion.div
            className="absolute inset-0 flex items-center justify-center"
            initial={false}
            whileHover={{ rotate: 90 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
          >
            <Plus
              className="h-5 w-5 text-white/70 group-hover:text-white transition-colors duration-200"
              strokeWidth={1.5}
            />
          </motion.div>
        </div>

        {/* Hover state: expanding ring pulse */}
        <motion.div
          className="absolute inset-0 rounded-full border border-white/20 opacity-0 group-hover:opacity-100"
          initial={false}
          whileHover={{
            scale: [1, 1.4],
            opacity: [0.3, 0],
          }}
          transition={{
            duration: 1,
            repeat: Infinity,
            ease: "easeOut",
          }}
        />
      </motion.button>

      <LogMatchModal
        open={isOpen}
        onOpenChange={(open) => !open && closeModal()}
      />
    </>
  );
}
