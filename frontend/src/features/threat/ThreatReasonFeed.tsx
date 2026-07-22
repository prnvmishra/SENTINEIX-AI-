import { AnimatePresence, motion } from "framer-motion";
import { ArrowUpRight, Info } from "lucide-react";
import type { ThreatReason } from "@shared/types";
import { EmptyState } from "@/components/EmptyState";
import { formatTimestampMs } from "@/utils/formatTime";

export function ThreatReasonFeed({ reasons }: { reasons: ThreatReason[] }) {
  if (reasons.length === 0) {
    return (
      <EmptyState
        icon={Info}
        title="No signals detected yet"
        description="Explainable threat reasons will appear here as the call is analyzed."
      />
    );
  }

  const ordered = [...reasons].reverse();

  return (
    <div className="flex flex-col gap-2 p-3">
      <AnimatePresence initial={false}>
        {ordered.map((reason) => (
          <motion.div
            key={reason.id}
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
            className="flex flex-col gap-1 rounded-lg border border-border bg-surface/60 p-2.5"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-1 text-[11px] font-semibold text-text-primary">
                <ArrowUpRight className="h-3 w-3 text-danger" /> {reason.label}
              </span>
              <span className="shrink-0 rounded-full bg-danger/10 px-1.5 py-0.5 text-[10px] font-semibold text-danger">
                +{reason.delta}
              </span>
            </div>
            <p className="text-[11px] text-text-secondary">
              &ldquo;{reason.matchedPhrase}&rdquo; <span className="text-text-muted">detected in call</span>
            </p>
            <span className="font-mono text-[10px] text-text-muted">{formatTimestampMs(reason.timestampMs)}</span>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
