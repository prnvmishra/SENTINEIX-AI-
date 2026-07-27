import { useRef } from "react";

/**
 * Captures the actual raw microphone audio in parallel with the Web Speech
 * API's live transcription. Speech recognition alone never gives you back
 * playable audio bytes — this is what makes a Live Mic Session's recording
 * genuinely listen-back-able afterwards (Historical Cases), not just text.
 */
export function useAudioRecorder() {
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  async function start(): Promise<void> {
    if (typeof MediaRecorder === "undefined" || !navigator.mediaDevices?.getUserMedia) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];

      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/webm")
          ? "audio/webm"
          : "";

      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };
      recorder.start(1000);
      recorderRef.current = recorder;
    } catch (error) {
      console.warn("[audio-recorder] could not start raw audio capture (transcription still works):", error);
    }
  }

  function stop(): Promise<Blob | null> {
    return new Promise((resolve) => {
      const recorder = recorderRef.current;
      if (!recorder || recorder.state === "inactive") {
        resolve(null);
        return;
      }

      recorder.onstop = () => {
        const blob = chunksRef.current.length > 0 ? new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" }) : null;
        streamRef.current?.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
        recorderRef.current = null;
        resolve(blob);
      };
      recorder.stop();
    });
  }

  return { start, stop };
}
