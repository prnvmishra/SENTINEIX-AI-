import { useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";
import { motion } from "framer-motion";
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  FileDown,
  Gavel,
  Loader2,
  ImageIcon,
  MessageSquare,
  Network,
  PlayCircle,
  Play,
  Pause,
  RotateCcw,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import type { CaseDetail, CaseResolution, CaseStatus, TimelineEvent, TimelineEventType } from "@shared/types";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/Button";
import { Badge } from "@/components/Badge";
import { cn } from "@/utils/cn";
import { formatTimestampMs } from "@/utils/formatTime";
import { resolveCaseDurationMs } from "@/utils/caseDuration";
import { isScreenshotEvidenceCase } from "@/utils/caseEvidenceType";
import { useReplayPlayback } from "@/features/replay/useReplayPlayback";
import { useGenerateReport } from "@/features/report/useGenerateReport";
import { useAuth } from "@/hooks/useAuth";
import { deleteRegisteredCase, markCaseSolved, updateRegisteredCase } from "@/services/caseRegistry";
import { canDeleteRegisteredCase, canMarkRegisteredCaseSolved } from "@/utils/caseAccess";
import { CaseEvidencePanel } from "@/features/replay/CaseEvidencePanel";

const eventConfig: Record<TimelineEventType, { icon: typeof PlayCircle; className: string }> = {
  case_started: { icon: PlayCircle, className: "text-primary border-primary/30 bg-primary/10" },
  transcript: { icon: MessageSquare, className: "text-text-secondary border-border-strong bg-surface-raised" },
  threat_change: { icon: AlertTriangle, className: "text-warning border-warning/30 bg-warning/10" },
  graph_update: { icon: Network, className: "text-primary border-primary/30 bg-primary/10" },
  decision: { icon: Gavel, className: "text-danger border-danger/30 bg-danger/10" },
  case_resolved: { icon: CheckCircle2, className: "text-success border-success/30 bg-success/10" },
};

export function ReplayTimeline({
  caseId,
  caseTitle,
  timeline,
  durationMs,
  recordingUrl,
  evidenceImageUrl,
  source,
  status,
  resolution,
  isRealCase = false,
  caseDetail = null,
  onCaseDeleted,
}: {
  caseId: string | null;
  caseTitle: string;
  timeline: TimelineEvent[];
  durationMs: number;
  recordingUrl?: string;
  evidenceImageUrl?: string;
  source?: string;
  status?: CaseStatus;
  resolution?: CaseResolution;
  isRealCase?: boolean;
  caseDetail?: CaseDetail | null;
  onCaseDeleted?: () => void;
}) {
  const [mediaDurationMs, setMediaDurationMs] = useState(0);
  const effectiveDurationMs = useMemo(
    () => resolveCaseDurationMs(durationMs, timeline, mediaDurationMs),
    [durationMs, timeline, mediaDurationMs],
  );
  const { cursorMs, isPlaying, play, pause, reset, seek } = useReplayPlayback(effectiveDurationMs);
  const { generateReport, isGenerating, error: reportError } = useGenerateReport();
  const listRef = useRef<HTMLDivElement>(null);

  const revealedEvents = timeline.filter((event) => event.timestampMs <= cursorMs);

  useEffect(() => {
    if (!isPlaying) return;
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [revealedEvents.length, isPlaying]);

  function handleAudioDuration(discoveredMs: number) {
    setMediaDurationMs((previous) => Math.max(previous, discoveredMs));
    if (caseId && isRealCase && discoveredMs > durationMs) {
      void updateRegisteredCase(caseId, { durationMs: discoveredMs });
    }
  }

  if (timeline.length === 0) {
    return (
      <EmptyState
        icon={PlayCircle}
        title="No case to replay"
        description="Once a case is resolved, scrub through its full transcript, threat and graph timeline here."
      />
    );
  }

  const screenshotCase = isScreenshotEvidenceCase(source, caseTitle, evidenceImageUrl, recordingUrl);

  return (
    <div className="flex flex-col pb-10">
      <div className="sticky top-0 z-10 flex shrink-0 flex-wrap items-center gap-3 border-b border-border bg-surface/95 px-4 py-3 backdrop-blur-sm">
        {!screenshotCase && !recordingUrl && (
          <>
            <Button size="sm" variant="primary" onClick={() => (isPlaying ? pause() : play())}>
              {isPlaying ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
              {isPlaying ? "Pause" : "Play"}
            </Button>
            <Button size="sm" variant="ghost" onClick={reset}>
              <RotateCcw className="h-3.5 w-3.5" /> Reset
            </Button>
          </>
        )}
        {screenshotCase && (
          <span className="flex items-center gap-1.5 rounded-md border border-primary/30 bg-primary/10 px-2 py-1 text-[11px] font-medium text-primary">
            <ImageIcon className="h-3.5 w-3.5" /> Chat screenshot case
          </span>
        )}
        {!screenshotCase && recordingUrl && (
          <span className="flex items-center gap-1.5 rounded-md border border-primary/30 bg-primary/10 px-2 py-1 text-[11px] font-medium text-primary">
            Audio evidence case
          </span>
        )}
        <p className="truncate text-xs text-text-secondary">
          <span className="font-semibold text-text-primary">{caseTitle}</span>
        </p>
        {!screenshotCase && !recordingUrl && (
          <span className="ml-auto shrink-0 font-mono text-[11px] text-text-muted">
            {formatTimestampMs(cursorMs)} / {formatTimestampMs(effectiveDurationMs)}
          </span>
        )}
        {caseId && (
          <Button
            size="sm"
            variant="outline"
            disabled={isGenerating}
            onClick={() => generateReport(caseId, caseDetail)}
            className={screenshotCase || recordingUrl ? "ml-auto" : undefined}
          >
            <FileDown className="h-3.5 w-3.5" /> {isGenerating ? "Generating…" : "Download Report"}
          </Button>
        )}
      </div>
      {reportError && (
        <div className="border-b border-danger/30 bg-danger/10 px-4 py-2 text-[11px] text-danger">{reportError}</div>
      )}

      {isRealCase && caseId && (
        <div className="shrink-0">
          <CaseResolutionBar
            caseId={caseId}
            status={status}
            resolution={resolution}
            registeredByUid={caseDetail?.registeredByUid}
            onCaseDeleted={onCaseDeleted}
          />
        </div>
      )}

      {(recordingUrl || evidenceImageUrl) && (
        <CaseEvidencePanel
          recordingUrl={recordingUrl}
          evidenceImageUrl={evidenceImageUrl}
          source={source}
          variant={screenshotCase ? "hero" : "default"}
          onAudioDuration={handleAudioDuration}
        />
      )}

      {!recordingUrl && !evidenceImageUrl && isRealCase && screenshotCase && (
        <div className="shrink-0 border-b border-warning/30 bg-warning/10 px-4 py-3 text-[11px] text-warning">
          <strong>No chat screenshot attached.</strong> This case was registered before the upload finished. Delete it
          from Historical Cases, re-analyze the WhatsApp image, wait for the green &quot;Screenshot evidence
          attached&quot; badge, then register again.
        </div>
      )}

      {!recordingUrl && !evidenceImageUrl && isRealCase && !screenshotCase && (
        <div className="shrink-0 border-b border-border px-4 pb-3 text-[11px] text-warning">
          No evidence file attached to this case yet. If you registered before the upload finished, delete and
          re-register after the green evidence badge appears.
        </div>
      )}

      {screenshotCase ? (
        <details className="shrink-0 border-b border-border px-4 py-2">
          <summary className="cursor-pointer list-none text-[11px] font-semibold uppercase tracking-wide text-text-muted">
            Transcript timeline replay
            <span className="ml-2 font-mono font-normal normal-case text-text-secondary">
              {formatTimestampMs(cursorMs)} / {formatTimestampMs(effectiveDurationMs)}
            </span>
          </summary>
          <div className="mt-2 flex flex-wrap items-center gap-2 pb-2">
            <Button size="sm" variant="primary" onClick={() => (isPlaying ? pause() : play())}>
              {isPlaying ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
              {isPlaying ? "Pause" : "Play transcript"}
            </Button>
            <Button size="sm" variant="ghost" onClick={reset}>
              <RotateCcw className="h-3.5 w-3.5" /> Reset
            </Button>
            <input
              type="range"
              min={0}
              max={Math.max(effectiveDurationMs, 1)}
              step={100}
              value={cursorMs}
              onChange={(event) => seek(Number(event.target.value))}
              aria-label="Seek replay timeline"
              className="h-1.5 min-w-[120px] flex-1 cursor-pointer appearance-none rounded-full bg-border accent-primary"
            />
          </div>
        </details>
      ) : recordingUrl ? (
        // Audio evidence already has its own player — don't show a second seek bar.
        <details className="shrink-0 border-b border-border px-4 py-2">
          <summary className="cursor-pointer list-none text-[11px] font-semibold uppercase tracking-wide text-text-muted">
            Transcript timeline scrub
            <span className="ml-2 font-mono font-normal normal-case text-text-secondary">
              {formatTimestampMs(cursorMs)} / {formatTimestampMs(effectiveDurationMs)}
            </span>
          </summary>
          <div className="mt-2 flex flex-wrap items-center gap-2 pb-2">
            <Button size="sm" variant="ghost" onClick={() => (isPlaying ? pause() : play())}>
              {isPlaying ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
              {isPlaying ? "Pause timeline" : "Play timeline"}
            </Button>
            <Button size="sm" variant="ghost" onClick={reset}>
              <RotateCcw className="h-3.5 w-3.5" /> Reset
            </Button>
            <input
              type="range"
              min={0}
              max={Math.max(effectiveDurationMs, 1)}
              step={100}
              value={cursorMs}
              onChange={(event) => seek(Number(event.target.value))}
              aria-label="Seek transcript timeline"
              className="h-1.5 min-w-[120px] flex-1 cursor-pointer appearance-none rounded-full bg-border accent-primary"
            />
          </div>
        </details>
      ) : (
        <div className="shrink-0 px-4 py-3">
          <input
            type="range"
            min={0}
            max={Math.max(effectiveDurationMs, 1)}
            step={100}
            value={cursorMs}
            onChange={(event) => seek(Number(event.target.value))}
            aria-label="Seek replay timeline"
            className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-border accent-primary"
          />
        </div>
      )}

      <div ref={listRef} className="space-y-2 px-4 pb-4">
        {timeline.map((event) => {
          const revealed = event.timestampMs <= cursorMs;
          const config = eventConfig[event.type];
          const Icon = config.icon;

          return (
            <motion.div
              key={event.id}
              animate={{ opacity: revealed ? 1 : 0.35 }}
              transition={{ duration: 0.25 }}
              className={cn(
                "flex gap-2.5 rounded-lg border p-2.5 transition-colors",
                revealed ? "border-border-strong bg-surface-raised/60" : "border-border bg-transparent",
              )}
            >
              <span className={cn("mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md border", config.className)}>
                <Icon className="h-3.5 w-3.5" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-xs font-semibold text-text-primary">{event.title}</p>
                  <span className="shrink-0 font-mono text-[10px] text-text-muted">{formatTimestampMs(event.timestampMs)}</span>
                </div>
                <p className="mt-0.5 text-[11px] leading-relaxed text-text-secondary">{event.description}</p>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

function CaseResolutionBar({
  caseId,
  status,
  resolution,
  registeredByUid,
  onCaseDeleted,
}: {
  caseId: string;
  status?: CaseStatus;
  resolution?: CaseResolution;
  registeredByUid?: string;
  onCaseDeleted?: () => void;
}) {
  const { user } = useAuth();
  const [showSolveForm, setShowSolveForm] = useState(false);
  const [criminalName, setCriminalName] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isSolved = status === "resolved" && Boolean(resolution);
  const canMarkSolved = canMarkRegisteredCaseSolved(user, { registeredByUid });
  const canDelete = canDeleteRegisteredCase(user);

  async function handleMarkSolved(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user) return;
    if (!notes.trim()) {
      setError("Resolution notes are required — explain how this case was solved.");
      return;
    }
    setSubmitting(true);
    setError(null);
    const resolutionPayload: CaseResolution = {
      resolvedByName: user.name,
      criminalName: criminalName.trim() || undefined,
      notes: notes.trim(),
      resolvedAt: new Date().toISOString(),
    };
    const err = await markCaseSolved(caseId, resolutionPayload);
    setSubmitting(false);
    if (err) {
      setError(err);
    } else {
      setShowSolveForm(false);
    }
  }

  async function handleDelete() {
    if (!window.confirm("Permanently delete this case from the database? This cannot be undone.")) return;
    setDeleting(true);
    setError(null);
    const err = await deleteRegisteredCase(caseId);
    setDeleting(false);
    if (err) {
      setError(err);
    } else {
      onCaseDeleted?.();
    }
  }

  return (
    <div className="flex flex-col gap-2 border-b border-border bg-surface-raised/30 px-4 py-2.5">
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone={isSolved ? "success" : "warning"} className="text-[10px]">
          {isSolved ? "COMPLETED" : "ONGOING"}
        </Badge>
        {!isSolved && canMarkSolved && !showSolveForm && (
          <Button size="sm" variant="outline" onClick={() => setShowSolveForm(true)}>
            <ShieldCheck className="h-3.5 w-3.5" /> Mark Case as Solved
          </Button>
        )}
        {!canMarkSolved && !isSolved && (
          <span className="text-[11px] text-text-muted">
            Only the account that registered this case can mark it complete.
          </span>
        )}
        {canDelete && (
          <Button size="sm" variant="ghost" className="text-danger hover:bg-danger/10" disabled={deleting} onClick={handleDelete}>
            {deleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />} Delete case
          </Button>
        )}
      </div>

      {isSolved && resolution && (
        <div className="flex items-start gap-2 rounded-md border border-success/30 bg-success/10 p-2.5 text-[11px] text-success">
          <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <div>
            <p>
              Solved by <strong>{resolution.resolvedByName}</strong> on {new Date(resolution.resolvedAt).toLocaleString("en-IN")}
              {resolution.criminalName && (
                <>
                  {" "}
                  — suspect identified: <strong>{resolution.criminalName}</strong>
                </>
              )}
            </p>
            <p className="mt-1 text-success/90">{resolution.notes}</p>
          </div>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 rounded-md border border-danger/30 bg-danger/10 px-2.5 py-2 text-[11px] text-danger">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" /> {error}
        </div>
      )}

      {showSolveForm && (
        <form onSubmit={handleMarkSolved} className="flex flex-col gap-2 rounded-md border border-border-strong bg-surface p-2.5">
          <label className="flex flex-col gap-1 text-[11px] font-medium text-text-secondary">
            Criminal / suspect name (optional)
            <input
              value={criminalName}
              onChange={(event) => setCriminalName(event.target.value)}
              placeholder="e.g. Rakesh Kumar"
              className="rounded-md border border-border-strong bg-surface-raised px-2.5 py-1.5 text-xs text-text-primary outline-none focus:border-primary"
            />
          </label>
          <label className="flex flex-col gap-1 text-[11px] font-medium text-text-secondary">
            Resolution notes (required)
            <textarea
              required
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="e.g. Traced via bank transaction, suspect identified and arrested by Cyber Crime Cell."
              rows={2}
              className="resize-none rounded-md border border-border-strong bg-surface-raised px-2.5 py-1.5 text-xs text-text-primary outline-none focus:border-primary"
            />
          </label>
          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={submitting}>
              {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ShieldCheck className="h-3.5 w-3.5" />} Confirm
              solved
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => setShowSolveForm(false)} disabled={submitting}>
              Cancel
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
