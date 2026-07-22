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
      <svg viewBox="0 0 128 128" className="h-full w-full -rotate-90">
        <circle cx="64" cy="64" r={RADIUS} fill="none" stroke="var(--color-border)" strokeWidth="10" />
        <motion.circle
          cx="64"
          cy="64"
          r={RADIUS}
          fill="none"
          stroke={color}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          initial={{ strokeDashoffset: CIRCUMFERENCE }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          style={{ filter: `drop-shadow(0 0 6px ${color}90)` }}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <motion.span
          key={score}
          initial={{ opacity: 0.4, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-3xl font-bold text-text-primary"
        >
          {score}
        </motion.span>
        <span className="text-[10px] font-semibold tracking-wider" style={{ color }}>
          {levelLabel[level]}
        </span>
      </div>
    </div>
  );
}
