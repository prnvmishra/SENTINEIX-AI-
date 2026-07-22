import { useEffect, useRef, useState } from "react";

const TICK_MS = 120;
const VIRTUAL_MS_PER_TICK = 500;

export function useReplayPlayback(durationMs: number) {
  const [cursorMs, setCursorMs] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const durationRef = useRef(durationMs);
  durationRef.current = durationMs;

  useEffect(() => {
    setCursorMs(0);
    setIsPlaying(false);
  }, [durationMs]);

  useEffect(() => {
    if (!isPlaying) return;

    const interval = window.setInterval(() => {
      setCursorMs((prev) => {
        const next = prev + VIRTUAL_MS_PER_TICK;
        if (next >= durationRef.current) {
          setIsPlaying(false);
          return durationRef.current;
        }
        return next;
      });
    }, TICK_MS);

    return () => window.clearInterval(interval);
  }, [isPlaying]);

  function play() {
    if (durationMs <= 0) return;
    setCursorMs((prev) => (prev >= durationMs ? 0 : prev));
    setIsPlaying(true);
  }

  function pause() {
    setIsPlaying(false);
  }

  function reset() {
    setCursorMs(0);
    setIsPlaying(false);
  }

  function seek(value: number) {
    setIsPlaying(false);
    setCursorMs(Math.min(Math.max(0, value), durationMs));
  }

  return { cursorMs, isPlaying, play, pause, reset, seek };
}
