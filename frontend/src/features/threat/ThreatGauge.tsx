import { motion } from "framer-motion";
import type { ThreatLevel } from "@shared/types";
import { threatLevelColor } from "@/theme/tokens";

interface ThreatGaugeProps {
  score: number;
  level: ThreatLevel;
}

const RADIUS = 54;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

const levelLabel: Record<ThreatLevel, string> = {
  low: "LOW",
  elevated: "ELEVATED",
  high: "HIGH",
  critical: "CRITICAL",
};

export function ThreatGauge({ score, level }: ThreatGaugeProps) {
  const color = threatLevelColor[level];
  const offset = CIRCUMFERENCE * (1 - Math.min(100, Math.max(0, score)) / 100);

  return (
    <div className="relative flex h-32 w-32 items-center justify-center">
      <div
        className="pointer-events-none absolute inset-3 rounded-full opacity-40 blur-xl"
        style={{ background: `radial-gradient(circle, ${color}55 0%, transparent 70%)` }}
      />
      <svg viewBox="0 0 128 128" className="h-full w-full -rotate-90">
        <circle
          cx="64"
          cy="64"
          r={RADIUS}
          fill="none"
          stroke="var(--color-border-strong)"
          strokeWidth="8"
          opacity={0.55}
        />
        <motion.circle
          cx="64"
          cy="64"
          r={RADIUS}
          fill="none"
          stroke={color}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          initial={{ strokeDashoffset: CIRCUMFERENCE }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <motion.span
          key={score}
          initial={{ opacity: 0.4, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="font-display text-3xl font-bold tracking-tight text-text-primary"
        >
          {score}
        </motion.span>
        <span className="mt-0.5 font-mono text-[9px] font-semibold tracking-[0.16em]" style={{ color }}>
          {levelLabel[level]}
        </span>
      </div>
    </div>
  );
}
