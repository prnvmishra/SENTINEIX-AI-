import { v4 as uuid } from "uuid";
import type { DecisionRecommendation, ThreatLevel } from "@shared/types";

const decisionCopy: Record<ThreatLevel, { headline: string; actions: string[] }> = {
  low: {
    headline: "Monitor — no immediate action required",
    actions: [
      "Continue passive monitoring of the call",
      "Log signals for pattern analysis",
    ],
  },
  elevated: {
    headline: "Elevated risk — prepare advisory intervention",
    actions: [
      "Flag call for supervisor review",
      "Prepare a scam-awareness advisory for the subscriber",
      "Cross-check caller number against known fraud registries",
    ],
  },
  high: {
    headline: "High risk — active intervention recommended",
    actions: [
      "Trigger real-time citizen advisory notification",
      "Alert bank risk team to watch linked accounts",
      "Escalate caller number to telecom fraud desk",
    ],
  },
  critical: {
    headline: "Critical — escalate to Cyber Crime Cell immediately",
    actions: [
      "Auto-escalate case to nearest Cyber Crime Cell",
      "Recommend freeze on suspected money-mule account",
      "Notify bank risk team to hold pending outbound transfer",
      "Generate prototype investigation report for human review",
    ],
  },
};

export function buildDecision(caseId: string, level: ThreatLevel, timestampMs: number): DecisionRecommendation {
  const copy = decisionCopy[level];

  return {
    id: uuid(),
    caseId,
    level,
    headline: copy.headline,
    actions: copy.actions,
    timestampMs,
  };
}
