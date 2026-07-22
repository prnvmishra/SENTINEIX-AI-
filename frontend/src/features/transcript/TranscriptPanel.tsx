import { useEffect, useRef } from "react";
import { MessageSquareText, Radio } from "lucide-react";
import { GlassPanel } from "@/components/GlassPanel";
import { PanelHeader } from "@/components/PanelHeader";
import { EmptyState } from "@/components/EmptyState";
import { Badge } from "@/components/Badge";
import { useLiveCase } from "@/hooks/useLiveCase";
import { AudioWaveform } from "@/features/transcript/AudioWaveform";
import { TranscriptLineItem } from "@/features/transcript/TranscriptLineItem";

export function TranscriptPanel() {
  const { transcript, isRunning, activeCase } = useLiveCase();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [transcript.length]);

  return (
    <GlassPanel noPadding className="flex h-full flex-col overflow-hidden">
      <PanelHeader
        icon={MessageSquareText}
        title="Live Transcript"
        subtitle={activeCase ? activeCase.title : "Speaker-aware call feed"}
        actions={isRunning && <Badge tone="danger" dot>LIVE</Badge>}
      />
      <div className="border-b border-border px-3.5 py-2">
        <AudioWaveform active={isRunning} />
      </div>
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        {transcript.length === 0 ? (
          <EmptyState
            icon={Radio}
            title="Awaiting active call"
            description="Start a simulation to stream a live transcript with speaker detection and keyword highlighting."
          />
        ) : (
          <div className="flex flex-col divide-y divide-border/60">
            {transcript.map((line) => (
              <TranscriptLineItem key={line.id} line={line} />
            ))}
            {isRunning && (
              <div className="flex items-center gap-1.5 px-3.5 py-3">
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary [animation-delay:-0.3s]" />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary [animation-delay:-0.15s]" />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary" />
              </div>
            )}
          </div>
        )}
      </div>
    </GlassPanel>
  );
}
