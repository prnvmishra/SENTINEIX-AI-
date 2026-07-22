import { v4 as uuid } from "uuid";
import type { AiInsight, ThreatLevel, TranscriptLine } from "@shared/types";
import type { ScenarioDefinition } from "../../data/scenarioTypes.js";
import { env } from "../../utils/env.js";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const REQUEST_TIMEOUT_MS = 12000;
const VALID_LEVELS: ThreatLevel[] = ["low", "elevated", "high", "critical"];

const SYSTEM_PROMPT = `You are the AI Threat Analyst inside SentinelX AI, a national fraud intelligence platform used \
by Cyber Crime Cells to detect "Digital Arrest" scams — calls where a fraudster impersonates a police/customs/RBI/CBI \
official, isolates the victim, and pressures them into transferring money under threat of arrest.

Read the call transcript so far and produce your own independent risk assessment, separate from any rule-based \
engine. Respond with STRICT JSON only, no markdown fencing, matching exactly this shape:
{"score": <integer 0-100>, "level": "low"|"elevated"|"high"|"critical", "summary": "<2-3 sentence analyst summary written for a cyber crime investigator>", "keyIndicators": ["<short phrase>", "..."]}
"keyIndicators" should contain at most 5 short phrases naming the specific manipulation tactics you observed.`;

interface RawAiResponse {
  score?: number;
  level?: string;
  summary?: string;
  keyIndicators?: string[];
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

function buildUserPrompt(scenario: ScenarioDefinition, transcriptSoFar: TranscriptLine[]): string {
  const transcriptText = transcriptSoFar.map((line) => `[${line.speaker.toUpperCase()}] ${line.text}`).join("\n");

  return [
    `Case location: ${scenario.city}, ${scenario.state}.`,
    `Caller is impersonating: ${scenario.impersonatedAuthority}.`,
    "",
    "Call transcript so far:",
    transcriptText || "(no dialogue captured yet)",
  ].join("\n");
}

function parseJsonResponse(content: string): RawAiResponse | null {
  try {
    return JSON.parse(content) as RawAiResponse;
  } catch {
    const match = content.match(/\{[\s\S]*\}/);
    if (!match) return null;
    try {
      return JSON.parse(match[0]) as RawAiResponse;
    } catch {
      return null;
    }
  }
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
  scenario: ScenarioDefinition,
  transcriptSoFar: TranscriptLine[],
  engineScore: number,
  engineLevel: ThreatLevel,
): Promise<AiInsight | null> {
  if (!isAiAnalystEnabled()) return null;

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
        model: env.openRouterModel,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: buildUserPrompt(scenario, transcriptSoFar) },
        ],
        temperature: 0.2,
        max_tokens: 400,
      }),
    });

    if (!response.ok) {
      console.warn(`[ai-analyst] OpenRouter request failed with status ${response.status}`);
      return null;
    }

    const data = (await response.json()) as OpenRouterChatResponse;
    const content = data.choices?.[0]?.message?.content;
    if (!content) return null;

    const parsed = parseJsonResponse(content);
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
      model: env.openRouterModel,
      generatedAt: new Date().toISOString(),
    };
  } catch (error) {
    console.warn("[ai-analyst] OpenRouter analysis failed:", error instanceof Error ? error.message : error);
    return null;
  } finally {
    clearTimeout(timeout);
  }
}
