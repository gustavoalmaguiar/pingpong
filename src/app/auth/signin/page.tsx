"use client";

import { signIn } from "next-auth/react";
import { motion } from "framer-motion";
import { useState } from "react";

// Custom Google icon
function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  );
}

// Custom GitHub icon
function GitHubIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
    </svg>
  );
}

export default function SignInPage() {
  const [isLoading, setIsLoading] = useState<"google" | "github" | null>(null);

  const handleSignIn = async (provider: "google" | "github") => {
    setIsLoading(provider);
    await signIn(provider, { callbackUrl: "/" });
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

        {/* Floating orb 1 */}
        <motion.div
          className="absolute h-[600px] w-[600px] rounded-full"
          style={{
            background:
              "radial-gradient(circle, rgba(255,255,255,0.03) 0%, transparent 70%)",
            left: "10%",
            top: "20%",
          }}
          animate={{
            x: [0, 50, 0],
            y: [0, 30, 0],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />

        {/* Floating orb 2 */}
        <motion.div
          className="absolute h-[400px] w-[400px] rounded-full"
          style={{
            background:
              "radial-gradient(circle, rgba(255,255,255,0.02) 0%, transparent 70%)",
            right: "15%",
            bottom: "10%",
          }}
          animate={{
            x: [0, -30, 0],
            y: [0, -40, 0],
          }}
          transition={{
            duration: 15,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />

        {/* Center glow */}
        <div
          className="absolute left-1/2 top-1/2 h-[800px] w-[800px] -translate-x-1/2 -translate-y-1/2"
          style={{
            background:
              "radial-gradient(circle, rgba(255,255,255,0.02) 0%, transparent 50%)",
          }}
        />
      </div>

      {/* Sign in card */}
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

          <h1 className="text-[15px] font-light tracking-[0.2em] text-[#737373]">
            SIGN IN TO CONTINUE
          </h1>
        </motion.div>

        {/* Buttons */}
        <div className="space-y-3">
          <motion.button
            onClick={() => handleSignIn("google")}
            disabled={isLoading !== null}
            className="group relative flex h-12 w-full items-center justify-center gap-3 rounded-lg border border-[#262626] bg-[#0a0a0a] text-[13px] font-medium tracking-wide text-white transition-all duration-300 hover:border-[#404040] hover:bg-[#111] disabled:cursor-not-allowed disabled:opacity-50"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
          >
            {/* Hover glow */}
            <div className="pointer-events-none absolute inset-0 rounded-lg opacity-0 transition-opacity duration-300 group-hover:opacity-100"
              style={{ boxShadow: "0 0 30px rgba(255,255,255,0.05)" }}
            />

            {isLoading === "google" ? (
              <motion.div
                className="h-4 w-4 rounded-full border-2 border-[#333] border-t-white"
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              />
            ) : (
              <GoogleIcon className="h-4 w-4" />
            )}
            <span>Continue with Google</span>
          </motion.button>

          <motion.button
            onClick={() => handleSignIn("github")}
            disabled={isLoading !== null}
            className="group relative flex h-12 w-full items-center justify-center gap-3 rounded-lg border border-[#262626] bg-[#0a0a0a] text-[13px] font-medium tracking-wide text-white transition-all duration-300 hover:border-[#404040] hover:bg-[#111] disabled:cursor-not-allowed disabled:opacity-50"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
          >
            {/* Hover glow */}
            <div className="pointer-events-none absolute inset-0 rounded-lg opacity-0 transition-opacity duration-300 group-hover:opacity-100"
              style={{ boxShadow: "0 0 30px rgba(255,255,255,0.05)" }}
            />

            {isLoading === "github" ? (
              <motion.div
                className="h-4 w-4 rounded-full border-2 border-[#333] border-t-white"
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              />
            ) : (
              <GitHubIcon className="h-4 w-4" />
            )}
            <span>Continue with GitHub</span>
          </motion.button>
        </div>

        {/* Footer */}
        <motion.p
          className="mt-8 text-center text-[11px] tracking-wide text-[#525252]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.5 }}
        >
          By continuing, you agree to participate fairly
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
