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

export const analysisApi = {
  analyzeRecording(
    token: string,
    input: { audioBase64: string; mimeType: string; victimAlias: string; speaker: "scammer" | "victim"; language?: "en" | "hi" },
  ) {
    return apiRequest<RecordedCallAnalysisResponse>("/analysis/recording", {
      method: "POST",
      token,
      body: input,
    });
  },
  analyzeText(token: string, input: { lines: string[]; victimAlias: string; speaker: "scammer" | "victim" }) {
    return apiRequest<TextConversationAnalysisResponse>("/analysis/text", {
      method: "POST",
      token,
      body: input,
    });
  },
};
