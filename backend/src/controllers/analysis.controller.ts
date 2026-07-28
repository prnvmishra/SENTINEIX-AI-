import type { NextFunction, Request, Response } from "express";
import { analyzeRecordedCall, analyzeTextConversation } from "../services/liveSessionEngine.js";
import {
  isGroqTranscriptionEnabled,
  type TranscriptionLanguage,
} from "../services/intel/groqTranscriptionClient.js";
import {
  askAdvisorChat,
  isAiAnalystEnabled,
  isAiDailyQuotaExhausted,
  type AdvisorCaseContext,
} from "../services/ai/openRouterClient.js";
import { ApiError } from "../middleware/error.middleware.js";

/**
 * Lets the dashboard tell "AI hasn't spoken yet because the case just
 * started" apart from "AI can't speak right now because OpenRouter's free
 * daily quota is exhausted" — the two look identical from the frontend's
 * perspective otherwise (no ai:insight has arrived) and showing a perpetual
 * "Standby" for the latter is actively misleading about why scores/speaker
 * labels are falling back to the rule engine/heuristic.
 */
export function getAiStatus(_req: Request, res: Response): void {
  res.json({ enabled: isAiAnalystEnabled(), quotaExhausted: isAiAnalystEnabled() && isAiDailyQuotaExhausted() });
}

interface AnalyzeRecordingBody {
  audioBase64?: string;
  mimeType?: string;
  victimAlias?: string;
  speaker?: "scammer" | "victim";
  language?: TranscriptionLanguage;
}

interface AnalyzeTextBody {
  lines?: string[];
  victimAlias?: string;
  speaker?: "scammer" | "victim";
}

interface AdvisorChatBody {
  message?: string;
  history?: Array<{ role?: string; content?: string }>;
  context?: Partial<AdvisorCaseContext>;
}

/**
 * Interactive advisor chat — officer/citizen asks "ab aage kya karun?" and
 * the LLM (or rule-engine fallback) answers from the live threat context.
 */
export async function advisorChat(
  req: Request<Record<string, never>, unknown, AdvisorChatBody>,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const message = typeof req.body.message === "string" ? req.body.message.trim() : "";
    if (!message) throw new ApiError(400, "message is required.");

    const history = Array.isArray(req.body.history)
      ? req.body.history
          .filter(
            (turn): turn is { role: "user" | "assistant"; content: string } =>
              (turn.role === "user" || turn.role === "assistant") && typeof turn.content === "string" && turn.content.trim().length > 0,
          )
          .map((turn) => ({ role: turn.role, content: turn.content.trim() }))
          .slice(-8)
      : [];

    const raw = req.body.context ?? {};
    const context: AdvisorCaseContext = {
      threatScore: typeof raw.threatScore === "number" ? raw.threatScore : 0,
      threatLevel: typeof raw.threatLevel === "string" ? raw.threatLevel : "low",
      city: typeof raw.city === "string" ? raw.city : undefined,
      state: typeof raw.state === "string" ? raw.state : undefined,
      impersonatedAuthority: typeof raw.impersonatedAuthority === "string" ? raw.impersonatedAuthority : undefined,
      decisionHeadline: typeof raw.decisionHeadline === "string" ? raw.decisionHeadline : undefined,
      decisionActions: Array.isArray(raw.decisionActions)
        ? raw.decisionActions.filter((a): a is string => typeof a === "string")
        : undefined,
      transcriptLines: Array.isArray(raw.transcriptLines)
        ? raw.transcriptLines
            .filter(
              (line): line is { speaker: string; text: string } =>
                typeof line === "object" &&
                line !== null &&
                typeof (line as { speaker?: unknown }).speaker === "string" &&
                typeof (line as { text?: unknown }).text === "string",
            )
            .slice(-20)
        : undefined,
      entities: Array.isArray(raw.entities) ? raw.entities.filter((e): e is string => typeof e === "string") : undefined,
      latestAiSummary: typeof raw.latestAiSummary === "string" ? raw.latestAiSummary : undefined,
    };

    const result = await askAdvisorChat(message, context, history);
    res.json(result);
  } catch (error) {
    next(error);
  }
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

    const { audioBase64, mimeType, victimAlias, language } = req.body;
    if (!audioBase64 || typeof audioBase64 !== "string") {
      throw new ApiError(400, "audioBase64 is required.");
    }
    if (!mimeType || typeof mimeType !== "string") {
      throw new ApiError(400, "mimeType is required.");
    }

    const transcriptionLanguage: TranscriptionLanguage =
      language === "en" || language === "hi" || language === "auto" ? language : "auto";

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
      "unknown",
      transcriptionLanguage,
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
    const { lines, victimAlias } = req.body;
    if (!Array.isArray(lines) || lines.length === 0 || !lines.every((l) => typeof l === "string")) {
      throw new ApiError(400, "lines (a non-empty array of extracted text strings) is required.");
    }

    const result = await analyzeTextConversation(
      victimAlias?.trim() || "Citizen (chat screenshot)",
      lines,
      "unknown",
    );

    if ("error" in result) {
      throw new ApiError(422, result.error);
    }

    res.json(result);
  } catch (error) {
    next(error);
  }
}
