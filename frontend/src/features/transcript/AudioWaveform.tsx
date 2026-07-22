import { motion } from "framer-motion";
import { cn } from "@/utils/cn";

interface AudioWaveformProps {
  active: boolean;
  className?: string;
}

const barCount = 24;

export function AudioWaveform({ active, className }: AudioWaveformProps) {
  return (
    <div className={cn("flex h-6 items-center gap-[3px]", className)}>
      {Array.from({ length: barCount }).map((_, index) => (
        <motion.span
          key={index}
          className={cn("w-[3px] rounded-full", active ? "bg-primary" : "bg-border-strong")}
          animate={
            active
              ? { height: [4, 6 + ((index * 7) % 18), 4] }
              : { height: 4 }
          }
          transition={{
            duration: 0.6 + (index % 5) * 0.08,
            repeat: active ? Infinity : 0,
            ease: "easeInOut",
            delay: index * 0.03,
          }}
        />
      ))}
    </div>
  );
}
