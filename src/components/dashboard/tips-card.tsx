"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";

interface Tip {
  text: string;
  category: "technique" | "strategy" | "mental" | "etiquette";
}

const TIPS: Tip[] = [
  // Technique
  { text: "Keep your paddle angle slightly closed for topspin returns — let the ball sink into the rubber before brushing up.", category: "technique" },
  { text: "A relaxed grip is a fast grip. Tension kills wrist speed.", category: "technique" },
  { text: "Your ready position should feel athletic, not comfortable. Knees bent, weight forward.", category: "technique" },
  { text: "Contact the ball at the peak of its bounce for maximum control and timing.", category: "technique" },
  { text: "Short backswing, explosive forward motion. Power comes from acceleration, not distance.", category: "technique" },
  { text: "Practice your backhand until it's a weapon, not a weakness.", category: "technique" },
  { text: "The wrist generates spin, the forearm generates power, the shoulder generates consistency.", category: "technique" },

  // Strategy
  { text: "Watch your opponent's paddle face at contact — it tells you everything about where the ball is going.", category: "strategy" },
  { text: "The serve is the only shot where you have complete control. Make it count.", category: "strategy" },
  { text: "When in doubt, aim for your opponent's elbow. It's the hardest spot to return from.", category: "strategy" },
  { text: "Vary your serve placement obsessively. Predictability is the enemy.", category: "strategy" },
  { text: "The best defense is making your opponent move. Place the ball, don't just return it.", category: "strategy" },
  { text: "Play to your opponent's weakness, but don't forget to use your strengths.", category: "strategy" },
  { text: "Deep returns buy you time. Short returns create pressure. Know when to use each.", category: "strategy" },
  { text: "The third ball attack: serve, anticipate the return, win the point.", category: "strategy" },
  { text: "Change the pace unexpectedly. A slow ball after fast ones is devastating.", category: "strategy" },

  // Mental
  { text: "The point is over. The next one hasn't started. Stay in that gap.", category: "mental" },
  { text: "Breathe between points. Your brain needs oxygen to make good decisions.", category: "mental" },
  { text: "Confidence comes from preparation, not from hoping.", category: "mental" },
  { text: "When you're losing, slow down. When you're winning, stay aggressive.", category: "mental" },
  { text: "Your opponent's best shot is also their most predictable. Expect it.", category: "mental" },
  { text: "Frustration is information. It means you need to change something.", category: "mental" },
  { text: "Play the ball, not the score. Every point is 0-0.", category: "mental" },
  { text: "The match isn't over until it's over. Comebacks happen to those who keep competing.", category: "mental" },

  // Etiquette
  { text: "Acknowledge good shots — even your opponent's. It shows respect and keeps you humble.", category: "etiquette" },
  { text: "Call your own net and edge balls honestly. Integrity outlasts any single point.", category: "etiquette" },
  { text: "Warm up your opponent, not just yourself. A good match needs two prepared players.", category: "etiquette" },
  { text: "Win with grace, lose with dignity. How you handle the result matters.", category: "etiquette" },
  { text: "Shake hands like you mean it — win or lose.", category: "etiquette" },
];

const categoryLabels: Record<Tip["category"], string> = {
  technique: "Technique",
  strategy: "Strategy",
  mental: "Mental Game",
  etiquette: "Sportsmanship",
};

const categoryColors: Record<Tip["category"], string> = {
  technique: "text-blue-400",
  strategy: "text-amber-400",
  mental: "text-purple-400",
  etiquette: "text-emerald-400",
};

export function TipsCard() {
  const [tip, setTip] = useState<Tip | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Select random tip on mount
    const randomIndex = Math.floor(Math.random() * TIPS.length);
    setTip(TIPS[randomIndex]);
    // Slight delay for entrance animation
    const timer = setTimeout(() => setIsVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  if (!tip) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: isVisible ? 1 : 0, y: isVisible ? 0 : 20 }}
      transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
      className="relative overflow-hidden rounded-xl border border-[#1a1a1a] bg-[#0a0a0a]"
    >
      {/* Subtle gradient accent */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          background: "radial-gradient(ellipse at 0% 50%, rgba(255,255,255,0.15) 0%, transparent 50%)",
        }}
      />

      <div className="relative flex items-start gap-5 px-6 py-5">
        {/* Ping pong ball visual element */}
        <div className="relative mt-1 flex-shrink-0">
          <div className="relative h-8 w-8">
            {/* Ball */}
            <motion.div
              className="absolute inset-0 rounded-full bg-gradient-to-br from-[#2a2a2a] to-[#1a1a1a] border border-[#333]"
              animate={{
                rotate: [0, 5, 0, -5, 0],
              }}
              transition={{
                duration: 8,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            >
              {/* Ball seam */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="h-full w-[1px] rotate-[30deg] bg-[#404040]" />
              </div>
              {/* Subtle shine */}
              <div className="absolute top-1 left-1.5 h-2 w-2 rounded-full bg-[#404040] opacity-50" />
            </motion.div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Category badge */}
          <div className="mb-2 flex items-center gap-2">
            <span className={`text-[10px] font-semibold uppercase tracking-[0.15em] ${categoryColors[tip.category]}`}>
              {categoryLabels[tip.category]}
            </span>
            <div className="h-px flex-1 bg-gradient-to-r from-[#262626] to-transparent" />
          </div>

          {/* Tip text */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.5 }}
            className="text-[15px] leading-relaxed text-[#e5e5e5] font-light"
            style={{ fontStyle: "italic" }}
          >
            "{tip.text}"
          </motion.p>
        </div>

        {/* Decorative quote mark */}
        <div className="absolute right-6 top-4 select-none pointer-events-none">
          <span className="text-[48px] font-serif leading-none text-[#1a1a1a]">"</span>
        </div>
      </div>

      {/* Bottom accent line */}
      <motion.div
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ delay: 0.5, duration: 0.8, ease: [0.4, 0, 0.2, 1] }}
        className="h-px w-full origin-left bg-gradient-to-r from-[#262626] via-[#333] to-transparent"
      />
    </motion.div>
  );
}
