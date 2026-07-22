import { motion } from "framer-motion";
import { ScrollText } from "lucide-react";
import type { SystemLogEntry } from "@shared/types";
import { EmptyState } from "@/components/EmptyState";
import { cn } from "@/utils/cn";

const levelClass: Record<SystemLogEntry["level"], string> = {
  info: "text-primary",
  warning: "text-warning",
  error: "text-danger",
};

function formatClockTime(timestampMs: number): string {
  return new Date(timestampMs).toLocaleTimeString("en-IN", { hour12: false });
}

export function SystemLogsFeed({ logs }: { logs: SystemLogEntry[] }) {
  if (logs.length === 0) {
    return (
      <EmptyState
        icon={ScrollText}
        title="No system activity yet"
        description="Agent and socket lifecycle events will stream here for auditability."
      />
    );
  }

  return (
    <div className="flex flex-col gap-1 p-3 font-mono text-[11px]">
      {logs.map((log, index) => (
        <motion.div
          key={log.id}
          initial={index === 0 ? { opacity: 0, x: -8 } : false}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.2 }}
          className="flex items-start gap-2 rounded px-2 py-1 hover:bg-surface-raised/60"
        >
          <span className="shrink-0 text-text-muted">{formatClockTime(log.timestampMs)}</span>
          <span className={cn("shrink-0 font-semibold uppercase", levelClass[log.level])}>[{log.level}]</span>
          <span className="shrink-0 text-text-secondary">{log.source}:</span>
          <span className="text-text-primary">{log.message}</span>
        </motion.div>
      ))}
    </div>
  );
}
