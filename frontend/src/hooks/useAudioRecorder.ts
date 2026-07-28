import { useRef } from "react";

export type AudioRecorderStartResult = { ok: true } | { ok: false; error: string };

/**
 * Captures raw microphone audio in parallel with Web Speech transcription.
 * Must be started BEFORE speech recognition on some browsers so the mic
 * stream isn't stolen/empty.
 */
export function useAudioRecorder() {
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const startedAtMsRef = useRef<number>(0);
  const mimeTypeRef = useRef<string>("audio/webm");

  function pickMimeType(): string {
    const candidates = [
      "audio/webm;codecs=opus",
      "audio/webm",
      "audio/mp4",
      "audio/ogg;codecs=opus",
    ];
    for (const type of candidates) {
      if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(type)) return type;
    }
    return "";
  }

  async function start(): Promise<AudioRecorderStartResult> {
    if (typeof MediaRecorder === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      return { ok: false, error: "This browser cannot record raw audio (MediaRecorder missing)." };
    }

    try {
      // Stop any previous session cleanly.
      streamRef.current?.getTracks().forEach((track) => track.stop());
      recorderRef.current = null;
      chunksRef.current = [];

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      streamRef.current = stream;

      const mimeType = pickMimeType();
      mimeTypeRef.current = mimeType || "audio/webm";
      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };

      // Timeslice keeps chunks flowing so a crash/stop still has audio bytes.
      recorder.start(500);
      startedAtMsRef.current = Date.now();
      recorderRef.current = recorder;
      return { ok: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Microphone access failed";
      console.warn("[audio-recorder] could not start:", error);
      return { ok: false, error: message };
    }
  }

  function stop(): Promise<{ blob: Blob | null; durationMs: number; error?: string }> {
    return new Promise((resolve) => {
      const recorder = recorderRef.current;
      const wallDurationMs = startedAtMsRef.current > 0 ? Math.max(0, Date.now() - startedAtMsRef.current) : 0;

      if (!recorder || recorder.state === "inactive") {
        streamRef.current?.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
        resolve({ blob: null, durationMs: wallDurationMs, error: "No active recorder — mic capture never started." });
        return;
      }

      const finish = () => {
        const type = (recorder.mimeType || mimeTypeRef.current || "audio/webm").split(";")[0];
        const blob =
          chunksRef.current.length > 0 ? new Blob(chunksRef.current, { type: type || "audio/webm" }) : null;
        streamRef.current?.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
        recorderRef.current = null;
        chunksRef.current = [];
        startedAtMsRef.current = 0;

        if (!blob || blob.size < 256) {
          resolve({
            blob: null,
            durationMs: wallDurationMs,
            error: "Recording was empty — speak near the mic, or grant mic permission and try again.",
          });
          return;
        }
        resolve({ blob, durationMs: wallDurationMs });
      };

      recorder.onstop = finish;
      try {
        // Flush the final timeslice before stopping.
        if (recorder.state === "recording") recorder.requestData();
      } catch {
        // ignore
      }
      recorder.stop();
    });
  }

  return { start, stop };
}
