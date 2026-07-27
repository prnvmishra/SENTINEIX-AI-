import { v4 as uuid } from "uuid";
import type { AiInsight, SpeakerType, ThreatLevel, TranscriptLine } from "@shared/types";
import { env } from "../../utils/env.js";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
// Kept short because a slow/timed-out model now falls through to the next
// one in the chain — a low per-attempt timeout gets to a working model
// faster than one long wait on a model that isn't going to respond anyway.
const REQUEST_TIMEOUT_MS = 8000;
const VALID_LEVELS: ThreatLevel[] = ["low", "elevated", "high", "critical"];

/**
 * OpenRouter's genuinely free (":free") models share upstream capacity
 * across every user of that model on the platform, so any single one of
 * them can go temporarily 429-rate-limited without warning (verified live —
 * google/gemma-4-31b-it:free returns "temporarily rate-limited upstream"
 * during peak usage while other free models on the same account succeed at
 * the exact same moment). Falling back through several free models — all
 * $0, none requiring extra setup — makes the AI analyst actually resilient
 * instead of silently doing nothing whenever its one configured model is
 * busy. The primary configured model (env.openRouterModel) is always tried
 * first; these are additional backups only used if it fails.
 */
const FREE_MODEL_FALLBACK_CHAIN = [
  "openai/gpt-oss-20b:free",
  "nvidia/nemotron-nano-9b-v2:free",
  "google/gemma-4-26b-a4b-it:free",
  "nvidia/nemotron-3-nano-30b-a3b:free",
];

export interface AiCaseContext {
  city: string;
  state: string;
  impersonatedAuthority: string;
}

const SYSTEM_PROMPT = `You are the AI Threat Analyst inside SentinelX AI, a national fraud intelligence platform used \
by Cyber Crime Cells to detect "Digital Arrest" scams — calls where a fraudster impersonates a police/customs/RBI/CBI \
official, isolates the victim, and pressures them into transferring money under threat of arrest.

Read the call transcript so far and produce your own independent risk assessment, separate from any rule-based \
engine. Respond with STRICT JSON only, no markdown fencing, matching exactly this shape:
{"score": <integer 0-100>, "level": "low"|"elevated"|"high"|"critical", "summary": "<2-3 sentence analyst summary written for a cyber crime investigator>", "keyIndicators": ["<short phrase>", "..."]}
"keyIndicators" should contain at most 5 short phrases naming the specific manipulation tactics you observed.`;

const VISION_SYSTEM_PROMPT = `You are a visual-consistency assistant inside SentinelX AI. You are shown a single frame \
from a video call in which the caller claims to be a law-enforcement/government official. You CANNOT verify anyone's \
real identity — no such database exists for you to check. Only comment on visual consistency: does the uniform, \
insignia, backdrop, and setting look plausible for the claimed authority in an Indian context, or does it show signs \
of inconsistency, low-effort staging, screen artifacts, or being a pre-recorded loop? Respond with STRICT JSON only: \
{"consistencyScore": <integer 0-100, 100 = fully consistent>, "observations": ["<short phrase>", "..."], "disclaimer": "This is a heuristic visual opinion, not an identity verification."}`;

const SPEAKER_DIARIZATION_SYSTEM_PROMPT = `You are a speaker-diarization assistant inside SentinelX AI. You are given a \
numbered list of lines transcribed from either a phone call recording or a chat conversation between exactly two \
people: a SCAMMER (a fraudster impersonating police/CBI/customs/RBI/a bank official — demanding money, claiming an \
arrest warrant or legal case, pressuring for secrecy, urgency, or a bank transfer/UPI payment) and a VICTIM (the \
target of the scam — asking questions, expressing fear, confusion, or distress, pleading, agreeing to comply, or \
reading back OTPs/account details under pressure). Use BOTH natural conversational turn-taking AND the content/tone \
of each line (who is demanding vs. who is complying/afraid) to decide who most likely said each line. Two lines in a \
row CAN belong to the same speaker (e.g. a scammer giving several instructions back-to-back) — do not force strict \
alternation. Respond with STRICT JSON only, no markdown fencing, matching exactly this shape: \
{"speakers": ["scammer"|"victim", ...]} — the array MUST have exactly the same length and order as the input lines, \
with one entry per line, no more, no less.`;

interface RawAiResponse {
  score?: number;
  level?: string;
  summary?: string;
  keyIndicators?: string[];
}

interface RawSpeakerDiarizationResponse {
  speakers?: string[];
}

interface RawVisionResponse {
  consistencyScore?: number;
  observations?: string[];
}

interface OpenRouterChatResponse {
  choices?: Array<{ message?: { content?: string } }>;
}

export function isAiAnalystEnabled(): boolean {
  return Boolean(env.openRouterApiKey);
}

function coerceLevel(value: string | undefined, fallback: ThreatLevel): ThreatLevel {
  return value && VALID_LEVELS.includes(value as ThreatLevel) ? (value as ThreatLevel) : fallback;
}

function buildUserPrompt(context: AiCaseContext, transcriptSoFar: TranscriptLine[]): string {
  const transcriptText = transcriptSoFar.map((line) => `[${line.speaker.toUpperCase()}] ${line.text}`).join("\n");

  return [
    `Case location: ${context.city}, ${context.state}.`,
    `Caller is impersonating: ${context.impersonatedAuthority}.`,
    "",
    "Call transcript so far:",
    transcriptText || "(no dialogue captured yet)",
  ].join("\n");
}

function parseJsonResponse<T>(content: string): T | null {
  try {
    return JSON.parse(content) as T;
  } catch {
    const match = content.match(/\{[\s\S]*\}/);
    if (!match) return null;
    try {
      return JSON.parse(match[0]) as T;
    } catch {
      return null;
    }
  }
}

interface OpenRouterCallResult {
  content: string;
  modelUsed: string;
}

async function callOpenRouterOnce(model: string, systemPrompt: string, userContent: unknown): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(OPENROUTER_URL, {
      method: "POST",
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${env.openRouterApiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://sentinelx.ai",
        "X-Title": "SentinelX AI - National Fraud Intelligence Platform",
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userContent },
        ],
        temperature: 0.2,
        max_tokens: 400,
      }),
    });

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      throw new Error(`status ${response.status}: ${body.slice(0, 200)}`);
    }

    const data = (await response.json()) as OpenRouterChatResponse;
    const content = data.choices?.[0]?.message?.content;
    if (!content) throw new Error("empty response content");
    return content;
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Tries the primary model, then falls back through FREE_MODEL_FALLBACK_CHAIN
 * (deduped, skipping the primary if it's already in the chain) so a single
 * oversubscribed free model doesn't take the whole AI analyst down. Returns
 * which model actually produced the answer, since the UI is honest about
 * which one served each response.
 */
async function callOpenRouterWithFallback(
  primaryModel: string,
  systemPrompt: string,
  userContent: unknown,
): Promise<OpenRouterCallResult | null> {
  const candidates = [primaryModel, ...FREE_MODEL_FALLBACK_CHAIN.filter((m) => m !== primaryModel)];

  for (const model of candidates) {
    try {
      const content = await callOpenRouterOnce(model, systemPrompt, userContent);
      return { content, modelUsed: model };
    } catch (error) {
      console.warn(
        `[ai-analyst] ${model} failed (${error instanceof Error ? error.message : error}) — ${
          model === candidates[candidates.length - 1] ? "no more fallbacks" : "trying next free model"
        }.`,
      );
    }
  }

  return null;
}

/**
 * Calls OpenRouter for a genuine LLM-based risk assessment of the call so
 * far. Runs alongside the deterministic rule engine (never replacing it) so
 * the demo can show an explainable heuristic score plus a real generative-AI
 * second opinion. Fully optional — returns null (never throws) if no API key
 * is configured or the request fails, so the simulation never breaks.
 */
export async function analyzeTranscriptWithAI(
  caseId: string,
  context: AiCaseContext,
  transcriptSoFar: TranscriptLine[],
  engineScore: number,
  engineLevel: ThreatLevel,
): Promise<AiInsight | null> {
  if (!isAiAnalystEnabled()) return null;

  const result = await callOpenRouterWithFallback(
    env.openRouterModel,
    SYSTEM_PROMPT,
    buildUserPrompt(context, transcriptSoFar),
  );
  if (!result) return null;

  const parsed = parseJsonResponse<RawAiResponse>(result.content);
  if (!parsed) return null;

  const level = coerceLevel(parsed.level, engineLevel);
  const score =
    typeof parsed.score === "number" && Number.isFinite(parsed.score)
      ? Math.max(0, Math.min(100, Math.round(parsed.score)))
      : engineScore;

  return {
    id: uuid(),
    caseId,
    score,
    level,
    summary: parsed.summary?.trim() || "The AI analyst did not return a summary for this update.",
    keyIndicators: Array.isArray(parsed.keyIndicators) ? parsed.keyIndicators.slice(0, 5) : [],
    agreesWithEngine: level === engineLevel,
    model: result.modelUsed,
    generatedAt: new Date().toISOString(),
  };
}

/**
 * A recorded call/chat upload has no per-speaker audio channel, so we can't
 * tell scammer and victim apart mechanically — the citizen previously had to
 * pick ONE fixed speaker label applied to every single line, which meant a
 * victim's own scared replies got mislabeled "scammer voice" (and vice
 * versa). This asks the real LLM to read the whole transcript at once and
 * classify each line individually from conversational turn-taking + content
 * (who's demanding money vs. who's afraid/complying) — a genuine per-line
 * diarization instead of one blanket label. `defaultSpeaker` (the citizen's
 * manual pick) is kept only as the safe fallback if the AI is unavailable,
 * disabled, or returns something malformed — the feature never breaks.
 */
export async function inferLineSpeakers(lines: string[], defaultSpeaker: SpeakerType): Promise<SpeakerType[]> {
  const fallback = lines.map(() => defaultSpeaker);
  if (!isAiAnalystEnabled() || lines.length === 0) return fallback;

  const numbered = lines.map((text, index) => `${index + 1}. ${text}`).join("\n");
  const result = await callOpenRouterWithFallback(
    env.openRouterModel,
    SPEAKER_DIARIZATION_SYSTEM_PROMPT,
    `Transcript lines (${lines.length} total):\n${numbered}`,
  );
  if (!result) return fallback;

  const parsed = parseJsonResponse<RawSpeakerDiarizationResponse>(result.content);
  if (!parsed || !Array.isArray(parsed.speakers) || parsed.speakers.length !== lines.length) {
    console.warn("[ai-analyst] speaker diarization returned an unusable shape — falling back to the manual pick.");
    return fallback;
  }

  return parsed.speakers.map((value) =>
    value === "scammer" || value === "victim" ? (value as SpeakerType) : defaultSpeaker,
  );
}

export interface VisualConsistencyResult {
  consistencyScore: number;
  observations: string[];
  disclaimer: string;
  model: string;
}

/**
 * Best-effort AI *opinion* on whether a video-call frame looks visually
 * consistent with the claimed authority (uniform/backdrop/setting). This is
 * explicitly NOT an identity check — no public database exists to verify a
 * real officer's identity from a photo. Always returns a disclaimer alongside
 * the score so the UI never overstates what this is.
 */
export async function analyzeFrameVisualConsistency(
  imageBase64: string,
  claimedAuthority: string,
): Promise<VisualConsistencyResult | null> {
  if (!isAiAnalystEnabled()) return null;

  let result: OpenRouterCallResult | null = null;
  try {
    const content = await callOpenRouterOnce(env.openRouterVisionModel, VISION_SYSTEM_PROMPT, [
      { type: "text", text: `The caller claims to be from: ${claimedAuthority}. Assess the attached frame.` },
      { type: "image_url", image_url: { url: imageBase64 } },
    ]);
    result = { content, modelUsed: env.openRouterVisionModel };
  } catch (error) {
    console.warn(
      `[ai-analyst] vision model ${env.openRouterVisionModel} failed:`,
      error instanceof Error ? error.message : error,
    );
    return null;
  }
  if (!result) return null;

  const parsed = parseJsonResponse<RawVisionResponse>(result.content);
  if (!parsed) return null;

  return {
    consistencyScore:
      typeof parsed.consistencyScore === "number" ? Math.max(0, Math.min(100, Math.round(parsed.consistencyScore))) : 50,
    observations: Array.isArray(parsed.observations) ? parsed.observations.slice(0, 5) : [],
    disclaimer: "This is a heuristic AI visual opinion, not an identity verification.",
    model: result.modelUsed,
  };
}
