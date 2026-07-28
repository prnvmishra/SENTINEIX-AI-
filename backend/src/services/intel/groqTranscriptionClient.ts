import { env } from "../../utils/env.js";
import { AUDIO_CHUNK_OVERLAP_SEC, prepareAudioChunks } from "./audioChunker.js";
import { isPromptContamination } from "./transcriptNormalizer.js";

const REQUEST_TIMEOUT_MS = 120_000;

export type TranscriptionLanguage = "auto" | "en" | "hi";

export interface TranscribedSegment {
  text: string;
  startMs: number;
  endMs: number;
}

export interface RecordingTranscript {
  segments: TranscribedSegment[];
  fullText: string;
  language: string | null;
  durationSec?: number | null;
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

/**
 * Transcribes uploaded audio with Groq Whisper.
 * - No style/instruction prompt (those get echoed / hallucinated into the transcript).
 * - Audio is normalized + chunked so long calls are fully covered.
 * - Output stays as spoken; Latin Hinglish normalization happens afterwards only for non-Latin script.
 */
export async function transcribeRecordedAudio(
  audioBuffer: Buffer,
  mimeType: string,
  language: TranscriptionLanguage = "auto",
): Promise<RecordingTranscript | null> {
  if (!isGroqTranscriptionEnabled()) return null;

  try {
    const { chunks, durationSec } = await prepareAudioChunks(audioBuffer, mimeType);
    const allSegments: TranscribedSegment[] = [];
    const textParts: string[] = [];
    let detectedLanguage: string | null = null;

    for (const chunk of chunks) {
      const part =
        (await transcribeWithModel(chunk.buffer, chunk.mimeType, language, "whisper-large-v3")) ??
        (await transcribeWithModel(chunk.buffer, chunk.mimeType, language, "whisper-large-v3-turbo"));

      if (!part) {
        console.warn(`[groq-stt] chunk ${chunk.index}@${chunk.startSec.toFixed(1)}s failed`);
        continue;
      }

      if (!detectedLanguage && part.language) detectedLanguage = part.language;

      const offsetMs = Math.round(chunk.startSec * 1000);
      const overlapMs = chunk.index > 0 ? AUDIO_CHUNK_OVERLAP_SEC * 1000 : 0;

      for (const segment of part.segments) {
        if (chunk.index > 0 && segment.startMs < overlapMs - 250) continue;
        allSegments.push({
          text: segment.text,
          startMs: segment.startMs + offsetMs,
          endMs: segment.endMs + offsetMs,
        });
      }

      const cleaned = part.fullText.trim();
      if (cleaned) textParts.push(cleaned);
    }

    if (allSegments.length === 0 && textParts.length === 0) return null;

    const fullText = textParts.join(" ").replace(/\s+/g, " ").trim();
    console.info(
      `[groq-stt] done: ${allSegments.length} segments, ${fullText.length} chars` +
        (durationSec != null ? `, audio ${durationSec.toFixed(1)}s` : ""),
    );

    return {
      segments: allSegments,
      fullText,
      language: detectedLanguage,
      durationSec,
    };
  } catch (error) {
    console.warn("[groq-stt] transcription failed:", error instanceof Error ? error.message : error);
    return null;
  }
}

async function transcribeWithModel(
  audioBuffer: Buffer,
  mimeType: string,
  language: TranscriptionLanguage,
  model: string,
): Promise<RecordingTranscript | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const form = new FormData();
    const blob = new Blob([audioBuffer], { type: mimeType });
    form.append("file", blob, "recording.wav");
    form.append("model", model);
    form.append("response_format", "verbose_json");
    form.append("temperature", "0");
    // Intentionally NO `prompt` — instructional/style prompts leak into real transcripts.
    if (language === "en") {
      form.append("language", "en");
    }

    const response = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
      method: "POST",
      signal: controller.signal,
      headers: { Authorization: `Bearer ${env.groqApiKey}` },
      body: form,
    });

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      console.warn(`[groq-stt] ${model} failed with status ${response.status}: ${body.slice(0, 200)}`);
      return null;
    }

    const data = (await response.json()) as GroqTranscriptionResponse;
    return parseGroqResponse(data);
  } catch (error) {
    console.warn(`[groq-stt] ${model} error:`, error instanceof Error ? error.message : error);
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

function parseGroqResponse(data: GroqTranscriptionResponse): RecordingTranscript {
  const segments: TranscribedSegment[] = (data.segments ?? [])
    .filter((segment) => {
      const text = segment.text?.trim() ?? "";
      return text.length > 0 && !isPromptContamination(text);
    })
    .map((segment) => ({
      text: segment.text!.trim(),
      startMs: Math.round((segment.start ?? 0) * 1000),
      endMs: Math.round((segment.end ?? 0) * 1000),
    }));

  const fullRaw = data.text?.trim() ?? "";
  const fullText = isPromptContamination(fullRaw)
    ? segments.map((s) => s.text).join(" ").trim()
    : fullRaw
        .split(/\n+/)
        .map((line) => line.trim())
        .filter((line) => line.length > 0 && !isPromptContamination(line))
        .join(" ")
        .trim() || fullRaw;

  return {
    segments,
    fullText,
    language: data.language ?? null,
  };
}
