import { useEffect, useRef, useState } from "react";
import { Pause, Play, Volume2, VolumeX } from "lucide-react";
import { cn } from "@/utils/cn";
import { formatTimestampMs } from "@/utils/formatTime";

/**
 * Custom dark audio player — replaces the browser's default white <audio controls>.
 */
export function AudioPlayer({
  src,
  onDurationMs,
  className,
}: {
  src: string;
  onDurationMs?: (durationMs: number) => void;
  className?: string;
}) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [currentMs, setCurrentMs] = useState(0);
  const [durationMs, setDurationMs] = useState(0);
  const [muted, setMuted] = useState(false);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.playbackRate = 1;
    audio.defaultPlaybackRate = 1;
    setPlaying(false);
    setCurrentMs(0);
    setDurationMs(0);

    function onTimeUpdate() {
      setCurrentMs(Math.round((audio?.currentTime ?? 0) * 1000));
    }
    function onLoaded() {
      if (!audio) return;
      audio.playbackRate = 1;
      const seconds = audio.duration;
      if (Number.isFinite(seconds) && seconds > 0 && seconds !== Infinity) {
        const ms = Math.round(seconds * 1000);
        setDurationMs(ms);
        onDurationMs?.(ms);
      }
    }
    function onPlay() {
      setPlaying(true);
    }
    function onPause() {
      setPlaying(false);
    }
    function onEnded() {
      setPlaying(false);
      setCurrentMs(0);
    }

    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("loadedmetadata", onLoaded);
    audio.addEventListener("durationchange", onLoaded);
    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);
    audio.addEventListener("ended", onEnded);
    audio.load();

    return () => {
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("loadedmetadata", onLoaded);
      audio.removeEventListener("durationchange", onLoaded);
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("ended", onEnded);
    };
  }, [src, onDurationMs]);

  function togglePlay() {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) void audio.play();
    else audio.pause();
  }

  function seek(ms: number) {
    const audio = audioRef.current;
    if (!audio || !durationMs) return;
    audio.currentTime = Math.max(0, Math.min(durationMs, ms)) / 1000;
    setCurrentMs(ms);
  }

  function toggleMute() {
    const audio = audioRef.current;
    if (!audio) return;
    audio.muted = !audio.muted;
    setMuted(audio.muted);
  }

  const progress = durationMs > 0 ? Math.min(100, (currentMs / durationMs) * 100) : 0;

  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-xl border border-border-strong bg-surface-raised/80 px-3 py-2.5",
        className,
      )}
    >
      {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
      <audio ref={audioRef} src={src} preload="metadata" className="hidden" />

      <button
        type="button"
        onClick={togglePlay}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-bg transition hover:bg-primary/90"
        aria-label={playing ? "Pause" : "Play"}
      >
        {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 translate-x-px" />}
      </button>

      <div className="min-w-0 flex-1">
        <input
          type="range"
          min={0}
          max={Math.max(durationMs, 1)}
          step={100}
          value={Math.min(currentMs, durationMs || 1)}
          onChange={(event) => seek(Number(event.target.value))}
          aria-label="Seek audio"
          className="audio-seek h-1.5 w-full cursor-pointer appearance-none rounded-full bg-border accent-primary"
          style={{
            background: `linear-gradient(to right, var(--color-primary) ${progress}%, var(--color-border) ${progress}%)`,
          }}
        />
        <div className="mt-1 flex justify-between font-mono text-[10px] text-text-muted">
          <span>{formatTimestampMs(currentMs)}</span>
          <span>{formatTimestampMs(durationMs)}</span>
        </div>
      </div>

      <button
        type="button"
        onClick={toggleMute}
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-text-secondary transition hover:bg-surface hover:text-primary"
        aria-label={muted ? "Unmute" : "Mute"}
      >
        {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
      </button>
    </div>
  );
}
