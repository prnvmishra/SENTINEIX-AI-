import type { NextFunction, Request, Response } from "express";
import { analyzeRecordedCall, analyzeTextConversation } from "../services/liveSessionEngine.js";
import { isGroqTranscriptionEnabled } from "../services/intel/groqTranscriptionClient.js";
import { ApiError } from "../middleware/error.middleware.js";

interface AnalyzeRecordingBody {
  audioBase64?: string;
  mimeType?: string;
  victimAlias?: string;
  speaker?: "scammer" | "victim";
  language?: "en" | "hi";
}

interface AnalyzeTextBody {
  lines?: string[];
  victimAlias?: string;
  speaker?: "scammer" | "victim";
}

/**
 * "I already recorded this call — tell me if it was a scam" endpoint.
 * Transcribes the uploaded audio (Groq Whisper, real speech-to-text) and
 * runs the exact same threat/decision/AI-analyst pipeline used by a live
 * mic session, streaming the replay over Socket.IO so the dashboard
 * visualizes it exactly like a live call, then returns the final verdict.
 */
export async function analyzeRecording(
  req: Request<Record<string, never>, unknown, AnalyzeRecordingBody>,
  res: Response,
  next: NextFunction,
): Promise<void> {
  // Everything is inside this try/catch — including the very first guard
  // check — because Express 4 does NOT automatically catch a `throw` (or a
  // rejected promise) from an `async` route handler. A throw here that
  // escapes the try/catch becomes an unhandled promise rejection, which
  // crashes the entire Node process (not just this request) since there's
  // no global unhandledRejection handler. That previously took the whole
  // backend down on every request with a missing GROQ_API_KEY or a bad
  // phone number, until a file was saved and tsx watch happened to restart it.
  try {
    if (!isGroqTranscriptionEnabled()) {
      throw new ApiError(
        503,
        "Recorded-call analysis isn't configured on this server yet — it needs a free GROQ_API_KEY (see README).",
      );
    }

    const { audioBase64, mimeType, victimAlias, speaker, language } = req.body;
    if (!audioBase64 || typeof audioBase64 !== "string") {
      throw new ApiError(400, "audioBase64 is required.");
    }
    if (!mimeType || typeof mimeType !== "string") {
      throw new ApiError(400, "mimeType is required.");
    }

    const base64Data = audioBase64.includes(",") ? audioBase64.split(",")[1]! : audioBase64;
    const buffer = Buffer.from(base64Data, "base64");
    if (buffer.length === 0) {
      throw new ApiError(400, "Uploaded audio file is empty.");
    }
    if (buffer.length > 24 * 1024 * 1024) {
      throw new ApiError(413, "Recording is too large — Groq's free tier accepts files up to 25MB.");
    }

    const result = await analyzeRecordedCall(
      victimAlias?.trim() || "Citizen (recorded call)",
      buffer,
      mimeType,
      speaker === "victim" ? "victim" : "scammer",
      language,
    );

    if ("error" in result) {
      throw new ApiError(422, result.error);
    }

    res.json(result);
  } catch (error) {
    next(error);
  }
}

/**
 * "I have a chat/DM screenshot — tell me if it was a scam/blackmail attempt"
 * endpoint. The screenshot is OCR'd entirely client-side (free, on-device,
 * no API key) — this endpoint only receives the already-extracted text
 * lines and runs them through the exact same threat/decision/AI pipeline
 * used by live sessions and recorded calls.
 */
export async function analyzeChatScreenshot(
  req: Request<Record<string, never>, unknown, AnalyzeTextBody>,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { lines, victimAlias, speaker } = req.body;
    if (!Array.isArray(lines) || lines.length === 0 || !lines.every((l) => typeof l === "string")) {
      throw new ApiError(400, "lines (a non-empty array of extracted text strings) is required.");
    }

    const result = await analyzeTextConversation(
      victimAlias?.trim() || "Citizen (chat screenshot)",
      lines,
      speaker === "victim" ? "victim" : "scammer",
    );

    if ("error" in result) {
      throw new ApiError(422, result.error);
    }

    res.json(result);
  } catch (error) {
    next(error);
  }
}
