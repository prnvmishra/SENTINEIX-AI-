import { FileAudio, ImageIcon } from "lucide-react";
import { Badge } from "@/components/Badge";
import { cn } from "@/utils/cn";
import { AudioPlayer } from "@/features/replay/AudioPlayer";

export function CaseEvidencePanel({
  recordingUrl,
  evidenceImageUrl,
  source,
  onAudioDuration,
  variant = "default",
}: {
  recordingUrl?: string;
  evidenceImageUrl?: string;
  source?: string;
  onAudioDuration?: (durationMs: number) => void;
  variant?: "default" | "hero";
}) {
  if (!recordingUrl && !evidenceImageUrl) return null;

  const hero = variant === "hero";

  return (
    <div className={cn("shrink-0 space-y-3 border-b border-border px-4 pb-3", hero && "border-primary/20 bg-primary/5 py-4")}>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-text-muted">Case evidence</span>
        {recordingUrl && (
          <Badge tone="neutral" className="text-[9px]">
            <FileAudio className="mr-1 inline h-3 w-3" /> Audio
          </Badge>
        )}
        {evidenceImageUrl && (
          <Badge tone="neutral" className="text-[9px]">
            <ImageIcon className="mr-1 inline h-3 w-3" /> Chat screenshot
          </Badge>
        )}
        {source === "screenshot-upload" && (
          <span className="text-[10px] text-text-muted">WhatsApp / chat screenshot — primary evidence</span>
        )}
      </div>

      {evidenceImageUrl && (
        <div>
          <p className="mb-1.5 text-[11px] text-text-secondary">
            Original chat screenshot — the evidence this case was opened on
          </p>
          <a href={evidenceImageUrl} target="_blank" rel="noreferrer" className="block">
            <img
              src={evidenceImageUrl}
              alt="Uploaded chat screenshot evidence"
              className={cn(
                "w-full rounded-md border border-border-strong object-contain bg-bg/40",
                hero ? "max-h-[min(280px,40vh)]" : "max-h-48",
              )}
            />
          </a>
        </div>
      )}

      {recordingUrl && (
        <div>
          <p className="mb-1.5 text-[11px] text-text-secondary">Recorded audio — listen to what was actually said</p>
          <AudioPlayer src={recordingUrl} onDurationMs={onAudioDuration} />
        </div>
      )}
    </div>
  );
}
