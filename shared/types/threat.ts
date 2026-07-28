import type { ThreatLevel, ThreatSignalCategory } from "./enums";

export interface ThreatReason {
  id: string;
  category: ThreatSignalCategory;
  label: string;
  explanation: string;
  matchedPhrase: string;
  delta: number;
  timestampMs: number;
  transcriptLineId: string;
}

export interface ThreatUpdate {
  caseId: string;
  score: number;
  delta: number;
  level: ThreatLevel;
  reason: ThreatReason | null;
  reasons: ThreatReason[];
}

export interface ThreatSignalDefinition {
  category: ThreatSignalCategory;
  label: string;
  weight: number;
  keywords: string[];
  /**
   * Optional regex patterns checked IN ADDITION to the fixed keyword list —
   * used for signals better expressed as a pattern than an exhaustive phrase
   * list (e.g. ANY numeric money amount in lakhs/crore, regardless of the
   * exact surrounding words a real caller happens to use).
   */
  patterns?: RegExp[];
}

export interface DecisionRecommendation {
  id: string;
  caseId: string;
  level: ThreatLevel;
  headline: string;
  actions: string[];
  timestampMs: number;
}
