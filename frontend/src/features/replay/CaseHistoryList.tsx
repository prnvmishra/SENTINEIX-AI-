import { useState } from "react";
import type { MouseEvent } from "react";
import { motion } from "framer-motion";
import { ChevronRight, FileAudio, FolderClock, ImageIcon, Loader2, MessageSquare, Trash2 } from "lucide-react";
import type { CaseDetail, CaseStatus, ThreatLevel } from "@shared/types";
import { EmptyState } from "@/components/EmptyState";
import { Badge } from "@/components/Badge";
import { Button } from "@/components/Button";
import { LoadingState } from "@/components/Skeleton";
import { cn } from "@/utils/cn";
import { formatTimestampMs } from "@/utils/formatTime";
import { resolveCaseDetailDurationMs } from "@/utils/caseDuration";
import { isScreenshotEvidenceCase } from "@/utils/caseEvidenceType";
import { deleteRegisteredCase } from "@/services/caseRegistry";
import { useAuth } from "@/hooks/useAuth";
import { canDeleteRegisteredCase } from "@/utils/caseAccess";

const levelTone: Record<ThreatLevel, "success" | "warning" | "danger" | "neutral"> = {
  low: "success",
  elevated: "warning",
  high: "warning",
  critical: "danger",
};

const sourceLabel: Record<string, string> = {
  "live-mic": "Live mic",
  "recorded-upload": "Recorded call",
  "screenshot-upload": "Chat screenshot",
  manual: "Manual",
};

function displayStatus(caseSummary: CaseDetail): { label: string; tone: "success" | "warning" | "danger" | "neutral" } {
  if (caseSummary.status === "resolved" && !caseSummary.resolution) {
    return { label: "ONGOING (needs Mark Complete)", tone: "warning" };
  }
  const map: Record<CaseStatus, { label: string; tone: "success" | "warning" | "danger" | "neutral" }> = {
    live: { label: "ONGOING", tone: "warning" },
    resolved: { label: "COMPLETED", tone: "success" },
    escalated: { label: "ESCALATED", tone: "warning" },
    archived: { label: "ARCHIVED", tone: "neutral" },
  };
  return map[caseSummary.status];
}

export function CaseHistoryList({
  cases,
  isLoading,
  selectedCaseId,
  onSelectCase,
}: {
  cases: CaseDetail[];
  isLoading: boolean;
  selectedCaseId: string | null;
  onSelectCase: (id: string) => void;
}) {
  const { user } = useAuth();
  const canDelete = canDeleteRegisteredCase(user);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  async function handleDelete(event: MouseEvent, caseId: string) {
    event.stopPropagation();
    if (!window.confirm("Permanently delete this case from the database and Analytics? This cannot be undone.")) return;
    setDeletingId(caseId);
    setDeleteError(null);
    const error = await deleteRegisteredCase(caseId);
    setDeletingId(null);
    if (error) setDeleteError(error);
  }

  if (isLoading) {
    return <LoadingState label="Loading historical cases..." />;
  }

  if (cases.length === 0) {
    return (
      <EmptyState
        icon={FolderClock}
        title="No registered cases yet"
        description="Analyze evidence → Register as ONGOING, or open the Cases page in the top nav to register manually / Mark Complete / Delete."
      />
    );
  }

  return (
    <div className="flex flex-col gap-2 p-3">
      {deleteError && (
        <div className="rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-[11px] text-danger">{deleteError}</div>
      )}
      {cases.map((caseSummary) => {
        const status = displayStatus(caseSummary);
        const durationMs = resolveCaseDetailDurationMs(caseSummary);
        const hasEvidence = Boolean(caseSummary.recordingUrl || caseSummary.evidenceImageUrl);
        const screenshotCase = isScreenshotEvidenceCase(
          caseSummary.source,
          caseSummary.title,
          caseSummary.evidenceImageUrl,
          caseSummary.recordingUrl,
        );

        return (
          <motion.div
            key={caseSummary.id}
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn(
              "flex items-start justify-between gap-3 rounded-lg border border-border bg-surface-raised/60 p-3 transition hover:border-primary/40",
              selectedCaseId === caseSummary.id && "border-primary/60 bg-primary/5",
            )}
          >
            <button type="button" onClick={() => onSelectCase(caseSummary.id)} className="min-w-0 flex-1 text-left">
              <div className="flex flex-wrap items-center gap-2">
                <p className="truncate text-xs font-semibold text-text-primary">{caseSummary.title}</p>
                <Badge tone={status.tone} className="shrink-0 text-[10px]">
                  {status.label}
                </Badge>
                {caseSummary.source && (
                  <Badge tone="neutral" className="shrink-0 text-[9px]">
                    {sourceLabel[caseSummary.source] ?? caseSummary.source}
                  </Badge>
                )}
              </div>
              <p className="mt-1 text-[11px] text-text-secondary">
                {caseSummary.city}, {caseSummary.state} · Victim {caseSummary.victimAlias}
              </p>
              <div className="mt-1.5 flex flex-wrap items-center gap-2">
                <Badge tone={levelTone[caseSummary.threatLevel]} className="text-[10px]">
                  {caseSummary.threatLevel} · {caseSummary.finalScore}
                </Badge>
                {durationMs > 0 && !screenshotCase && (
                  <span className="font-mono text-[10px] text-text-muted">
                    {formatTimestampMs(durationMs)} duration
                  </span>
                )}
                {caseSummary.recordingUrl && (
                  <span className="flex items-center gap-1 text-[10px] text-text-muted">
                    <FileAudio className="h-3 w-3 text-primary" /> Audio evidence
                  </span>
                )}
                {caseSummary.evidenceImageUrl && (
                  <span className="flex items-center gap-1 text-[10px] text-text-muted">
                    <ImageIcon className="h-3 w-3 text-primary" /> WhatsApp / chat screenshot
                  </span>
                )}
                {screenshotCase && !caseSummary.evidenceImageUrl && (
                  <span className="flex items-center gap-1 text-[10px] text-warning">
                    <MessageSquare className="h-3 w-3" /> Screenshot missing — re-register
                  </span>
                )}
                {!hasEvidence && (
                  <span className="text-[10px] text-warning">No evidence file attached</span>
                )}
              </div>
              {caseSummary.evidenceImageUrl && (
                <img
                  src={caseSummary.evidenceImageUrl}
                  alt="Chat screenshot evidence"
                  className="mt-2 max-h-24 rounded border border-border-strong object-contain bg-bg/40"
                />
              )}
            </button>
            {canDelete && (
              <Button
                size="sm"
                variant="ghost"
                className="shrink-0 text-danger hover:bg-danger/10"
                onClick={(event) => handleDelete(event, caseSummary.id)}
                disabled={deletingId === caseSummary.id}
                title="Admin only — permanently delete case"
              >
                {deletingId === caseSummary.id ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Trash2 className="h-3.5 w-3.5" />
                )}
                Delete
              </Button>
            )}
            <button type="button" onClick={() => onSelectCase(caseSummary.id)} aria-label="Open case">
              <ChevronRight className="h-4 w-4 shrink-0 text-text-muted" />
            </button>
          </motion.div>
        );
      })}
    </div>
  );
}
