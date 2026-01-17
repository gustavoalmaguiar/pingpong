"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Home,
  Trophy,
  Users,
  Swords,
  Settings,
  LogOut,
  Gamepad2,
  Medal,
  type LucideIcon,
} from "lucide-react";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { getPendingChallengesCount } from "@/actions/challenges";

interface NavItem {
  icon: LucideIcon;
  label: string;
  href: string;
  adminOnly?: boolean;
}

const navItems: NavItem[] = [
  { icon: Home, label: "Dashboard", href: "/" },
  { icon: Trophy, label: "Leaderboard", href: "/leaderboard" },
  { icon: Gamepad2, label: "Matches", href: "/matches" },
  { icon: Users, label: "Players", href: "/players" },
  { icon: Swords, label: "Challenges", href: "/challenges" },
  { icon: Medal, label: "Achievements", href: "/achievements" },
  { icon: Settings, label: "Admin", href: "/admin", adminOnly: true },
];

export function Navbar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [pendingChallengesCount, setPendingChallengesCount] = useState(0);

  // Fetch pending challenges count
  useEffect(() => {
    if (session?.user?.playerId) {
      getPendingChallengesCount().then(setPendingChallengesCount);

      // Poll every 30 seconds
      const interval = setInterval(() => {
        getPendingChallengesCount().then(setPendingChallengesCount);
      }, 30000);

      return () => clearInterval(interval);
    }
  }, [session?.user?.playerId]);

  const filteredItems = navItems.filter(
    (item) => !item.adminOnly || session?.user?.isAdmin
  );

  return (
    <nav className="fixed left-0 top-0 z-50 flex h-screen w-16 flex-col items-center border-r border-[#1a1a1a] bg-black py-6">
      {/* Navigation Items */}
      <div className="flex flex-1 flex-col items-center gap-1">
        {filteredItems.map((item, index) => {
          const isActive = pathname === item.href;
          const isHovered = hoveredIndex === index;
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className="relative"
              onMouseEnter={() => setHoveredIndex(index)}
              onMouseLeave={() => setHoveredIndex(null)}
            >
              <motion.div
                className={cn(
                  "relative flex h-11 w-11 items-center justify-center rounded-lg transition-colors duration-200",
                  isActive
                    ? "bg-white text-black"
                    : "text-[#737373] hover:bg-[#1a1a1a] hover:text-white"
                )}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                {/* Glow effect for active */}
                {isActive && (
                  <motion.div
                    className="absolute inset-0 rounded-lg"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    style={{
                      boxShadow: "0 0 20px rgba(255, 255, 255, 0.2)",
                    }}
                  />
                )}

                <Icon className="relative z-10 h-5 w-5" strokeWidth={1.5} />

                {/* Badge for Challenges */}
                {item.href === "/challenges" && pendingChallengesCount > 0 && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute -right-0.5 -top-0.5 z-20 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white"
                  >
                    {pendingChallengesCount > 9 ? "9+" : pendingChallengesCount}
                  </motion.div>
                )}

                {/* Hover indicator line */}
                <AnimatePresence>
                  {isHovered && !isActive && (
                    <motion.div
                      className="absolute -right-[1px] h-6 w-[2px] bg-white/50"
                      initial={{ scaleY: 0 }}
                      animate={{ scaleY: 1 }}
                      exit={{ scaleY: 0 }}
                      transition={{ duration: 0.15 }}
                    />
                  )}
                </AnimatePresence>
              </motion.div>

              {/* Label tooltip */}
              <AnimatePresence>
                {isHovered && (
                  <motion.div
                    className="absolute left-full top-1/2 z-50 ml-3"
                    initial={{ opacity: 0, x: -8, y: "-50%" }}
                    animate={{ opacity: 1, x: 0, y: "-50%" }}
                    exit={{ opacity: 0, x: -8, y: "-50%" }}
                    transition={{ duration: 0.15, ease: "easeOut" }}
                  >
                    <div className="whitespace-nowrap rounded-md bg-[#1a1a1a] px-3 py-1.5 text-sm font-medium text-white shadow-lg glow-subtle">
                      {item.label}
                      {/* Arrow */}
                      <div className="absolute -left-1 top-1/2 h-2 w-2 -translate-y-1/2 rotate-45 bg-[#1a1a1a]" />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </Link>
          );
        })}
      </div>

      {/* User section at bottom */}
      {session?.user && (
        <div className="mt-auto flex flex-col items-center gap-3 pt-4">
          {/* Separator */}
          <div className="mb-2 h-px w-8 bg-[#262626]" />

          {/* User avatar */}
          <Link
            href={session.user.playerId ? `/players/${session.user.playerId}` : "#"}
            className="group relative"
          >
            <motion.div
              className="relative h-9 w-9 overflow-hidden rounded-full border border-[#333333] transition-all duration-200 group-hover:border-[#525252]"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
            >
              {session.user.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={session.user.image}
                  alt={session.user.name || "User"}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-[#1a1a1a] text-xs font-medium text-white">
                  {session.user.name?.charAt(0).toUpperCase() || "?"}
                </div>
              )}
            </motion.div>

            {/* Online indicator */}
            <div className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-black bg-emerald-500" />
          </Link>

          {/* Logout button */}
          <Link
            href="/auth/signout"
            className="group relative flex h-9 w-9 items-center justify-center rounded-lg text-[#525252] transition-colors duration-200 hover:bg-[#1a1a1a] hover:text-[#dc2626]"
          >
            <LogOut className="h-4 w-4" strokeWidth={1.5} />
          </Link>
        </div>
      )}
    </nav>
  );
}
