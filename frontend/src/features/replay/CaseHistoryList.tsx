import { motion } from "framer-motion";
import { ChevronRight, FolderClock } from "lucide-react";
import type { CaseSummary, CaseStatus, ThreatLevel } from "@shared/types";
import { EmptyState } from "@/components/EmptyState";
import { Badge } from "@/components/Badge";
import { LoadingState } from "@/components/Skeleton";
import { cn } from "@/utils/cn";
import { formatTimestampMs } from "@/utils/formatTime";

const levelTone: Record<ThreatLevel, "success" | "warning" | "danger" | "neutral"> = {
  low: "success",
  elevated: "warning",
  high: "warning",
  critical: "danger",
};

const statusTone: Record<CaseStatus, "success" | "warning" | "danger" | "neutral"> = {
  live: "danger",
  resolved: "success",
  escalated: "warning",
  archived: "neutral",
};

export function CaseHistoryList({
  cases,
  isLoading,
  selectedCaseId,
  onSelectCase,
}: {
  cases: CaseSummary[];
  isLoading: boolean;
  selectedCaseId: string | null;
  onSelectCase: (id: string) => void;
}) {
  if (isLoading) {
    return <LoadingState label="Loading historical cases..." />;
  }

  if (cases.length === 0) {
    return (
      <EmptyState
        icon={FolderClock}
        title="No historical cases loaded"
        description="Resolved and archived cases from the mock dataset will be listed here."
      />
    );
  }

  return (
    <div className="flex flex-col gap-2 p-3">
      {cases.map((caseSummary) => (
        <motion.button
          key={caseSummary.id}
          type="button"
          onClick={() => onSelectCase(caseSummary.id)}
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          className={cn(
            "flex items-center justify-between gap-3 rounded-lg border border-border bg-surface-raised/60 p-3 text-left transition hover:border-primary/40",
            selectedCaseId === caseSummary.id && "border-primary/60 bg-primary/5",
          )}
        >
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="truncate text-xs font-semibold text-text-primary">{caseSummary.title}</p>
              <Badge tone={statusTone[caseSummary.status]} className="shrink-0 text-[10px]">
                {caseSummary.status}
              </Badge>
            </div>
            <p className="mt-1 text-[11px] text-text-secondary">
              {caseSummary.city}, {caseSummary.state} · Victim {caseSummary.victimAlias}
            </p>
            <div className="mt-1.5 flex items-center gap-2">
              <Badge tone={levelTone[caseSummary.threatLevel]} className="text-[10px]">
                {caseSummary.threatLevel} · {caseSummary.finalScore}
              </Badge>
              <span className="font-mono text-[10px] text-text-muted">{formatTimestampMs(caseSummary.durationMs)} duration</span>
            </div>
          </div>
          <ChevronRight className="h-4 w-4 shrink-0 text-text-muted" />
        </motion.button>
      ))}
    </div>
  );
}
