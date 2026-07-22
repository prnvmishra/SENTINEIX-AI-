import { motion } from "framer-motion";
import { Bot, ShieldAlert, User } from "lucide-react";
import type { TranscriptLine } from "@shared/types";
import { cn } from "@/utils/cn";
import { formatTimestampMs } from "@/utils/formatTime";
import { highlightKeywords } from "@/features/transcript/highlightKeywords";

const speakerConfig = {
  scammer: { label: "SCAMMER", icon: ShieldAlert, textClass: "text-danger", badgeClass: "bg-danger/10 text-danger border-danger/30" },
  victim: { label: "VICTIM", icon: User, textClass: "text-text-primary", badgeClass: "bg-surface-raised text-text-secondary border-border-strong" },
  system: { label: "SYSTEM", icon: Bot, textClass: "text-text-muted italic", badgeClass: "bg-primary/10 text-primary border-primary/30" },
} as const;

export function TranscriptLineItem({ line }: { line: TranscriptLine }) {
  const config = speakerConfig[line.speaker];
  const Icon = config.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="flex gap-2 px-3.5 py-2"
    >
      <span className="mt-0.5 shrink-0 font-mono text-[10px] text-text-muted">{formatTimestampMs(line.timestampMs)}</span>
      <div className="flex flex-1 flex-col gap-1">
        <span className={cn("inline-flex w-fit items-center gap-1 rounded border px-1.5 py-0.5 text-[9px] font-semibold tracking-wider", config.badgeClass)}>
          <Icon className="h-2.5 w-2.5" /> {config.label}
        </span>
        <p className={cn("text-xs leading-relaxed", config.textClass)}>{highlightKeywords(line.text, line.keywords)}</p>
      </div>
    </motion.div>
  );
}
