import { v4 as uuid } from "uuid";
import type { AiInsight, SpeakerType, ThreatLevel, TranscriptLine } from "@shared/types";
import { env } from "../../utils/env.js";
import { askAdvisorViaGroq, analyzeTranscriptViaGroq } from "./advisorGroqClient.js";
import { labelSpeakersViaGroq } from "../intel/conversationTurns.js";

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

const SPEAKER_DIARIZATION_SYSTEM_PROMPT = `You label lines from a 2-person Indian phone scam call.

SCAMMER: pitches scheme ("international payment", ITR/tax, "you will not give taxes"), commands ("you have to pay"), OTP/UPI demands, authority claims.
VICTIM: asks questions, thinks aloud about the demand ("so I have to pay…", "I'll get only…"), confirms what they heard, refuses/angers ("fuck off").

CRITICAL: "I have to pay / I'll get only" = VICTIM. "you have to pay / you will not give taxes" = SCAMMER.

Respond STRICT JSON only: {"speakers":["scammer"|"victim",...]} — same length/order as input.`;

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

type OpenRouterMessage = { role: "system" | "user" | "assistant"; content: unknown };

async function callOpenRouterOnce(
  model: string,
  systemPrompt: string,
  userContent: unknown,
  options?: {
    maxTokens?: number;
    temperature?: number;
    history?: Array<{ role: "user" | "assistant"; content: string }>;
    timeoutMs?: number;
  },
): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options?.timeoutMs ?? REQUEST_TIMEOUT_MS);

  try {
    const messages: OpenRouterMessage[] = [{ role: "system", content: systemPrompt }];
    for (const turn of options?.history ?? []) {
      messages.push({ role: turn.role, content: turn.content });
    }
    messages.push({ role: "user", content: userContent });

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
        messages,
        temperature: options?.temperature ?? 0.2,
        max_tokens: options?.maxTokens ?? 400,
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

// OpenRouter's free tier resets on a rolling daily window (not per-minute),
// so once every model in the fallback chain has hit "free-models-per-day" in
// the SAME request, retrying immediately is guaranteed to fail identically
// (confirmed live — 5 sequential 429s per call) while adding real latency to
// every single transcript line for the rest of the day. This short-circuits
// for a cooldown window instead of hammering an exhausted quota, and the UI
// is told honestly (`isAiDailyQuotaExhausted`) instead of showing a
// perpetual "Standby" that implies the AI just hasn't run yet.
const DAILY_QUOTA_COOLDOWN_MS = 10 * 60 * 1000;
let quotaExhaustedUntilMs = 0;

export function isAiDailyQuotaExhausted(): boolean {
  return Date.now() < quotaExhaustedUntilMs;
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
  options?: {
    maxTokens?: number;
    temperature?: number;
    history?: Array<{ role: "user" | "assistant"; content: string }>;
    timeoutMs?: number;
  },
): Promise<OpenRouterCallResult | null> {
  if (isAiDailyQuotaExhausted()) return null;

  // Cap the cascade — trying 5 free models on every failure burns the
  // shared daily quota 5× faster and was the main reason the UI hit
  // "quota reached" mid-demo. Primary + 1 backup is enough resilience.
  const backups = FREE_MODEL_FALLBACK_CHAIN.filter((m) => m !== primaryModel).slice(0, 1);
  const candidates = [primaryModel, ...backups];

  for (const model of candidates) {
    try {
      const content = await callOpenRouterOnce(model, systemPrompt, userContent, options);
      return { content, modelUsed: model };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.warn(
        `[ai-analyst] ${model} failed (${message}) — ${
          model === candidates[candidates.length - 1] ? "no more OpenRouter fallbacks" : "trying next free model"
        }.`,
      );
      // Daily free-tier hit: stop immediately so we don't spend the rest of
      // the day's quota hammering sibling :free models.
      if (message.includes("free-models-per-day") || message.includes("rate_limit")) {
        if (message.includes("free-models-per-day")) {
          quotaExhaustedUntilMs = Date.now() + DAILY_QUOTA_COOLDOWN_MS;
          console.warn(
            `[ai-analyst] OpenRouter daily free quota hit — pausing OpenRouter for ${DAILY_QUOTA_COOLDOWN_MS / 60_000} min. Groq / rule engine continue.`,
          );
        }
        break;
      }
    }
  }

  return null;
}

const ADVISOR_SYSTEM_PROMPT = `You are the SentinelX AI investigation advisor for Indian cyber-crime officers and \
citizens facing Digital Arrest / UPI / sextortion scams. Answer in the SAME language the user writes in \
(Hindi, Hinglish, or English). Be concrete and actionable — tell them what to do NEXT, in short numbered steps. \
Never invent case facts that are not in the provided context. Never claim you can arrest anyone or access CDR/bank \
records yourself — those require police / telecom / bank processes. Keep replies under 180 words.`;

export interface AdvisorCaseContext {
  threatScore: number;
  threatLevel: string;
  city?: string;
  state?: string;
  impersonatedAuthority?: string;
  decisionHeadline?: string;
  decisionActions?: string[];
  transcriptLines?: Array<{ speaker: string; text: string }>;
  entities?: string[];
  latestAiSummary?: string;
}

export interface AdvisorChatResult {
  reply: string;
  model: string;
  fallback: boolean;
}

/**
 * Interactive "what should I do next?" advisor chat grounded in the live
 * case / threat context. Tries OpenRouter → Groq → smart offline advisor.
 */
export async function askAdvisorChat(
  message: string,
  context: AdvisorCaseContext,
  history: Array<{ role: "user" | "assistant"; content: string }> = [],
): Promise<AdvisorChatResult> {
  const trimmed = message.trim();
  if (!trimmed) {
    return { reply: "Ask me what to do next — e.g. “Ab aage kya karun?”", model: "local", fallback: true };
  }

  const transcriptText = (context.transcriptLines ?? [])
    .slice(-20)
    .map((line) => `[${line.speaker.toUpperCase()}] ${line.text}`)
    .join("\n");

  const userContent = [
    "Live case context (use only these facts):",
    `- Threat score: ${context.threatScore}/100 (${context.threatLevel})`,
    `- Location: ${context.city ?? "unknown"}, ${context.state ?? "unknown"}`,
    `- Claimed authority: ${context.impersonatedAuthority ?? "unknown"}`,
    context.decisionHeadline ? `- Decision headline: ${context.decisionHeadline}` : null,
    context.decisionActions?.length ? `- Recommended actions: ${context.decisionActions.join("; ")}` : null,
    context.entities?.length ? `- Entities mentioned: ${context.entities.join(", ")}` : null,
    context.latestAiSummary ? `- Latest AI assessment: ${context.latestAiSummary}` : null,
    "",
    "Recent transcript:",
    transcriptText || "(none yet)",
    "",
    `Officer/citizen question: ${trimmed}`,
  ]
    .filter(Boolean)
    .join("\n");

  if (isAiAnalystEnabled() && !isAiDailyQuotaExhausted()) {
    const result = await callOpenRouterWithFallback(env.openRouterModel, ADVISOR_SYSTEM_PROMPT, userContent, {
      maxTokens: 500,
      temperature: 0.35,
      history: history.slice(-8),
      timeoutMs: 20_000,
    });

    if (result) {
      return { reply: result.content.trim(), model: result.modelUsed, fallback: false };
    }
  }

  const groqResult = await askAdvisorViaGroq(ADVISOR_SYSTEM_PROMPT, userContent, history);
  if (groqResult) {
    return { reply: groqResult.reply, model: groqResult.model, fallback: false };
  }

  // Honest failure — never invent canned scam advice when models are down.
  return {
    reply:
      "AI advisor is temporarily unavailable (API quota or network). No automatic answer was generated — please retry in a few minutes.",
    model: "none",
    fallback: true,
  };
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
  const userPrompt = buildUserPrompt(context, transcriptSoFar);

  // OpenRouter first (when enabled and not quota-cooled), then Groq so the
  // live threat gauge can still climb when OpenRouter free tier is exhausted.
  if (isAiAnalystEnabled()) {
    const result = await callOpenRouterWithFallback(env.openRouterModel, SYSTEM_PROMPT, userPrompt);
    if (result) {
      const insight = parseThreatInsight(result.content, caseId, engineScore, engineLevel, result.modelUsed);
      if (insight) return insight;
    }
  }

  const groqContent = await analyzeTranscriptViaGroq(SYSTEM_PROMPT, userPrompt);
  if (groqContent) {
    return parseThreatInsight(groqContent.content, caseId, engineScore, engineLevel, groqContent.model);
  }

  return null;
}

function parseThreatInsight(
  content: string,
  caseId: string,
  engineScore: number,
  engineLevel: ThreatLevel,
  modelUsed: string,
): AiInsight | null {
  const parsed = parseJsonResponse<RawAiResponse>(content);
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
    model: modelUsed,
    generatedAt: new Date().toISOString(),
  };
}

/**
 * Per-line victim/scammer labels from a real LLM only (OpenRouter → Groq).
 * Never invents labels via keyword heuristics — if both models fail, lines
 * are marked `unknown` so the UI stays honest.
 */
export async function inferLineSpeakers(lines: string[], _defaultSpeaker: SpeakerType): Promise<SpeakerType[]> {
  if (lines.length === 0) return [];

  const numbered = lines.map((text, index) => `${index + 1}. ${text}`).join("\n");
  const userPrompt = `Transcript lines (${lines.length} total):\n${numbered}`;

  // Prefer Groq first when OpenRouter free quota is exhausted (common during demos).
  if (!isAiAnalystEnabled() || isAiDailyQuotaExhausted()) {
    const groqFirst = await labelSpeakersViaGroq(lines);
    if (groqFirst) return groqFirst;
  } else {
    const result = await callOpenRouterWithFallback(
      env.openRouterModel,
      SPEAKER_DIARIZATION_SYSTEM_PROMPT,
      userPrompt,
    );
    const mapped = mapSpeakerResponse(result?.content, lines.length);
    if (mapped) return mapped;

    const groq = await labelSpeakersViaGroq(lines);
    if (groq) return groq;

    const groqLegacy = await analyzeTranscriptViaGroq(SPEAKER_DIARIZATION_SYSTEM_PROMPT, userPrompt, {
      maxTokens: 4000,
      temperature: 0,
      json: true,
    });
    const groqMapped = mapSpeakerResponse(groqLegacy?.content, lines.length);
    if (groqMapped) {
      console.info(`[ai-analyst] speaker diarization via ${groqLegacy?.model}`);
      return groqMapped;
    }
  }

  console.warn("[ai-analyst] speaker diarization unavailable — labeling lines as unknown (no fake guess).");
  return lines.map(() => "unknown" as const);
}

function mapSpeakerResponse(content: string | undefined, expectedLength: number): SpeakerType[] | null {
  if (!content) return null;
  const parsed = parseJsonResponse<RawSpeakerDiarizationResponse>(content);
  if (!parsed || !Array.isArray(parsed.speakers)) {
    console.warn("[ai-analyst] speaker JSON parse failed:", content.slice(0, 160));
    return null;
  }
  if (parsed.speakers.length !== expectedLength) {
    console.warn(
      `[ai-analyst] speaker length mismatch: got ${parsed.speakers.length}, need ${expectedLength}`,
    );
    return null;
  }
  return parsed.speakers.map((value) =>
    value === "scammer" || value === "victim" ? (value as SpeakerType) : ("unknown" as const),
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
