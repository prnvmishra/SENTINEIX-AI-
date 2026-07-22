import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  CheckCircle2,
  FileDown,
  Gavel,
  MessageSquare,
  Network,
  PlayCircle,
  Play,
  Pause,
  RotateCcw,
} from "lucide-react";
import type { TimelineEvent, TimelineEventType } from "@shared/types";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/Button";
import { cn } from "@/utils/cn";
import { formatTimestampMs } from "@/utils/formatTime";
import { useReplayPlayback } from "@/features/replay/useReplayPlayback";
import { useGenerateReport } from "@/features/report/useGenerateReport";

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
}: {
  caseId: string | null;
  caseTitle: string;
  timeline: TimelineEvent[];
  durationMs: number;
}) {
  const { cursorMs, isPlaying, play, pause, reset, seek } = useReplayPlayback(durationMs);
  const { generateReport, isGenerating } = useGenerateReport();
  const listRef = useRef<HTMLDivElement>(null);

  const revealedEvents = timeline.filter((event) => event.timestampMs <= cursorMs);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [revealedEvents.length]);

  if (timeline.length === 0) {
    return (
      <EmptyState
        icon={PlayCircle}
        title="No case to replay"
        description="Once a case is resolved, scrub through its full transcript, threat and graph timeline here."
      />
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 border-b border-border px-4 py-3">
        <Button size="sm" variant="primary" onClick={() => (isPlaying ? pause() : play())}>
          {isPlaying ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
          {isPlaying ? "Pause" : "Play"}
        </Button>
        <Button size="sm" variant="ghost" onClick={reset}>
          <RotateCcw className="h-3.5 w-3.5" /> Reset
        </Button>
        <p className="truncate text-xs text-text-secondary">
          <span className="font-semibold text-text-primary">{caseTitle}</span>
        </p>
        <span className="ml-auto shrink-0 font-mono text-[11px] text-text-muted">
          {formatTimestampMs(cursorMs)} / {formatTimestampMs(durationMs)}
        </span>
        {caseId && (
          <Button size="sm" variant="outline" disabled={isGenerating} onClick={() => generateReport(caseId)}>
            <FileDown className="h-3.5 w-3.5" /> {isGenerating ? "Generating…" : "Report"}
          </Button>
        )}
      </div>

      <div className="px-4 py-3">
        <input
          type="range"
          min={0}
          max={durationMs}
          step={100}
          value={cursorMs}
          onChange={(event) => seek(Number(event.target.value))}
          aria-label="Seek replay timeline"
          className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-border accent-primary"
        />
      </div>

      <div ref={listRef} className="flex-1 space-y-2 overflow-y-auto px-4 pb-4">
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
