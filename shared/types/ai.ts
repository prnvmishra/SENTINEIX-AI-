import type { ThreatLevel } from "./enums";

/**
 * Output of the real, LLM-backed "AI Threat Analyst" (OpenRouter). This runs
 * alongside — never in place of — the deterministic rule engine, so the
 * platform can show both an explainable heuristic score and a genuine
 * generative-AI second opinion.
 */
export interface AiInsight {
  id: string;
  caseId: string;
  score: number;
  level: ThreatLevel;
  summary: string;
  keyIndicators: string[];
  agreesWithEngine: boolean;
  model: string;
  generatedAt: string;
}
