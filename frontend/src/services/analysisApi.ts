import type { ThreatLevel } from "@shared/types";
import { apiRequest } from "@/services/apiClient";

export interface RecordedCallAnalysisResponse {
  caseId: string;
  lineCount: number;
  finalScore: number;
  finalLevel: ThreatLevel;
  language: string | null;
}

export interface TextConversationAnalysisResponse {
  caseId: string;
  lineCount: number;
  finalScore: number;
  finalLevel: ThreatLevel;
}

export interface AiStatusResponse {
  enabled: boolean;
  /** True when every free OpenRouter model has hit its daily quota — the AI analyst and per-line speaker diarization are both falling back to the rule engine/content heuristic until it resets. */
  quotaExhausted: boolean;
}

export interface AdvisorChatResponse {
  reply: string;
  model: string;
  fallback: boolean;
}

export interface AdvisorChatContext {
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

export const analysisApi = {
  getAiStatus(token: string) {
    return apiRequest<AiStatusResponse>("/analysis/ai-status", { token });
  },
  advisorChat(
    token: string,
    input: {
      message: string;
      history?: Array<{ role: "user" | "assistant"; content: string }>;
      context: AdvisorChatContext;
    },
  ) {
    return apiRequest<AdvisorChatResponse>("/analysis/advisor-chat", {
      method: "POST",
      token,
      body: input,
    });
  },
  analyzeRecording(
    token: string,
    input: {
      audioBase64: string;
      mimeType: string;
      victimAlias: string;
      language?: "auto" | "en" | "hi";
    },
  ) {
    return apiRequest<RecordedCallAnalysisResponse>("/analysis/recording", {
      method: "POST",
      token,
      body: input,
    });
  },
  analyzeText(token: string, input: { lines: string[]; victimAlias: string }) {
    return apiRequest<TextConversationAnalysisResponse>("/analysis/text", {
      method: "POST",
      token,
      body: input,
    });
  },
};
