import { env } from "../../utils/env.js";

const REQUEST_TIMEOUT_MS = 60_000;

export interface TranscribedSegment {
  text: string;
  startMs: number;
  endMs: number;
}

export interface RecordingTranscript {
  segments: TranscribedSegment[];
  fullText: string;
  language: string | null;
}

interface GroqVerboseSegment {
  text?: string;
  start?: number;
  end?: number;
}

interface GroqTranscriptionResponse {
  text?: string;
  language?: string;
  segments?: GroqVerboseSegment[];
}

export function isGroqTranscriptionEnabled(): boolean {
  return Boolean(env.groqApiKey);
}

function extFromMimeType(mimeType: string): string {
  if (mimeType.includes("webm")) return "webm";
  if (mimeType.includes("ogg")) return "ogg";
  if (mimeType.includes("wav")) return "wav";
  if (mimeType.includes("mp4") || mimeType.includes("m4a")) return "m4a";
  if (mimeType.includes("mpeg") || mimeType.includes("mp3")) return "mp3";
  return "webm";
}

/**
 * Transcribes a previously RECORDED audio clip (a citizen's own recording of
 * a suspicious call, uploaded after the fact) using Groq's free-tier hosted
 * Whisper Large v3 Turbo — a genuinely real, keyless-signup speech-to-text
 * API distinct from the Live Mic Session's browser-native Web Speech API
 * (which only works on a *live* microphone feed, not an uploaded file).
 *
 * Returns timestamped segments so each can be fed into the same threat/AI
 * engines as individual "transcript lines," exactly like a live session —
 * this is a real transcription, not a mock/random verdict.
 */
export async function transcribeRecordedAudio(
  audioBuffer: Buffer,
  mimeType: string,
  language?: "en" | "hi",
): Promise<RecordingTranscript | null> {
  if (!isGroqTranscriptionEnabled()) return null;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const form = new FormData();
    const blob = new Blob([audioBuffer], { type: mimeType });
    form.append("file", blob, `recording.${extFromMimeType(mimeType)}`);
    form.append("model", "whisper-large-v3-turbo");
    form.append("response_format", "verbose_json");
    if (language) form.append("language", language);

    const response = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
      method: "POST",
      signal: controller.signal,
      headers: { Authorization: `Bearer ${env.groqApiKey}` },
      body: form,
    });

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      console.warn(`[groq-stt] transcription request failed with status ${response.status}: ${body}`);
      return null;
    }

    const data = (await response.json()) as GroqTranscriptionResponse;
    const segments: TranscribedSegment[] = (data.segments ?? [])
      .filter((segment) => segment.text && segment.text.trim().length > 0)
      .map((segment) => ({
        text: segment.text!.trim(),
        startMs: Math.round((segment.start ?? 0) * 1000),
        endMs: Math.round((segment.end ?? 0) * 1000),
      }));

    return {
      segments,
      fullText: data.text?.trim() ?? "",
      language: data.language ?? null,
    };
  } catch (error) {
    console.warn("[groq-stt] transcription failed:", error instanceof Error ? error.message : error);
    return null;
  } finally {
    clearTimeout(timeout);
  }
}
