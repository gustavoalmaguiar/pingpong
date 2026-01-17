"use client";

import { signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useState } from "react";

export default function SignOutPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const handleSignOut = async () => {
    setIsLoading(true);
    await signOut({ callbackUrl: "/auth/signin" });
  };

  const handleCancel = () => {
    router.back();
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-black">
      {/* Animated background grid */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {/* Subtle grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `
              linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)
            `,
            backgroundSize: "60px 60px",
          }}
        />

        {/* Floating orb 1 - positioned differently for variety */}
        <motion.div
          className="absolute h-[500px] w-[500px] rounded-full"
          style={{
            background:
              "radial-gradient(circle, rgba(255,255,255,0.025) 0%, transparent 70%)",
            right: "5%",
            top: "15%",
          }}
          animate={{
            x: [0, -40, 0],
            y: [0, 25, 0],
          }}
          transition={{
            duration: 18,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />

        {/* Floating orb 2 */}
        <motion.div
          className="absolute h-[350px] w-[350px] rounded-full"
          style={{
            background:
              "radial-gradient(circle, rgba(255,255,255,0.02) 0%, transparent 70%)",
            left: "10%",
            bottom: "20%",
          }}
          animate={{
            x: [0, 35, 0],
            y: [0, -30, 0],
          }}
          transition={{
            duration: 14,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />

        {/* Center glow - slightly dimmer for the departure mood */}
        <div
          className="absolute left-1/2 top-1/2 h-[700px] w-[700px] -translate-x-1/2 -translate-y-1/2"
          style={{
            background:
              "radial-gradient(circle, rgba(255,255,255,0.015) 0%, transparent 50%)",
          }}
        />
      </div>

      {/* Sign out card */}
      <motion.div
        className="relative z-10 w-full max-w-[340px] px-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
      >
        {/* Header */}
        <motion.div
          className="mb-10 text-center"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1, ease: [0.4, 0, 0.2, 1] }}
        >
          {/* Decorative line */}
          <motion.div
            className="mx-auto mb-8 h-px w-12 bg-gradient-to-r from-transparent via-[#333] to-transparent"
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: 0.8, delay: 0.3 }}
          />

          {/* Animated ping pong ball leaving */}
          <motion.div
            className="mx-auto mb-6 flex h-10 w-10 items-center justify-center"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <motion.div
              className="relative h-6 w-6 rounded-full bg-[#1a1a1a] border border-[#333]"
              animate={{
                y: [0, -4, 0],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            >
              {/* Ball seam */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="h-full w-[1px] rotate-45 bg-[#333]" />
              </div>
            </motion.div>
          </motion.div>

          <h1 className="text-[15px] font-light tracking-[0.2em] text-[#737373]">
            LEAVING SO SOON?
          </h1>

          <motion.p
            className="mt-3 text-[12px] tracking-wide text-[#525252]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            The table will be waiting for your return
          </motion.p>
        </motion.div>

        {/* Buttons */}
        <div className="space-y-3">
          {/* Sign Out - Primary/Inverted */}
          <motion.button
            onClick={handleSignOut}
            disabled={isLoading}
            className="group relative flex h-12 w-full items-center justify-center gap-3 rounded-lg bg-white text-[13px] font-medium tracking-wide text-black transition-all duration-300 hover:bg-[#e5e5e5] disabled:cursor-not-allowed disabled:opacity-70"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
          >
            {/* Hover glow */}
            <div
              className="pointer-events-none absolute inset-0 rounded-lg opacity-0 transition-opacity duration-300 group-hover:opacity-100"
              style={{ boxShadow: "0 0 40px rgba(255,255,255,0.15)" }}
            />

            {isLoading ? (
              <motion.div
                className="h-4 w-4 rounded-full border-2 border-[#ccc] border-t-black"
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              />
            ) : (
              <svg
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                />
              </svg>
            )}
            <span>Sign Out</span>
          </motion.button>

          {/* Cancel - Secondary */}
          <motion.button
            onClick={handleCancel}
            disabled={isLoading}
            className="group relative flex h-12 w-full items-center justify-center gap-3 rounded-lg border border-[#262626] bg-[#0a0a0a] text-[13px] font-medium tracking-wide text-white transition-all duration-300 hover:border-[#404040] hover:bg-[#111] disabled:cursor-not-allowed disabled:opacity-50"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
          >
            {/* Hover glow */}
            <div
              className="pointer-events-none absolute inset-0 rounded-lg opacity-0 transition-opacity duration-300 group-hover:opacity-100"
              style={{ boxShadow: "0 0 30px rgba(255,255,255,0.05)" }}
            />

            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M10 19l-7-7m0 0l7-7m-7 7h18"
              />
            </svg>
            <span>Stay & Play</span>
          </motion.button>
        </div>

        {/* Footer */}
        <motion.p
          className="mt-8 text-center text-[11px] tracking-wide text-[#525252]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.5 }}
        >
          See you at the next match
        </motion.p>

        {/* Decorative bottom line */}
        <motion.div
          className="mx-auto mt-8 h-px w-12 bg-gradient-to-r from-transparent via-[#262626] to-transparent"
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 0.8, delay: 0.6 }}
        />
      </motion.div>

      {/* Corner accents */}
      <div className="pointer-events-none absolute left-6 top-6 h-8 w-px bg-gradient-to-b from-[#333] to-transparent" />
      <div className="pointer-events-none absolute left-6 top-6 h-px w-8 bg-gradient-to-r from-[#333] to-transparent" />
      <div className="pointer-events-none absolute bottom-6 right-6 h-8 w-px bg-gradient-to-t from-[#333] to-transparent" />
      <div className="pointer-events-none absolute bottom-6 right-6 h-px w-8 bg-gradient-to-l from-[#333] to-transparent" />
    </div>
  );
}
