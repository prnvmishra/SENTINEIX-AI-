import { v4 as uuid } from "uuid";
import type { DecisionRecommendation, GraphUpdate, ThreatReason, TimelineEvent } from "@shared/types";
import type { ScenarioDefinition } from "../../data/scenarioTypes.js";

interface BuildTimelineParams {
  scenario: ScenarioDefinition;
  reasons: ThreatReason[];
  graph: GraphUpdate;
  decision: DecisionRecommendation;
  totalDurationMs: number;
}

export function buildCaseTimeline({ scenario, reasons, graph, decision, totalDurationMs }: BuildTimelineParams): TimelineEvent[] {
  const events: TimelineEvent[] = [];

  events.push({
    id: uuid(),
    caseId: scenario.id,
    type: "case_started",
    title: "Call intercepted",
    description: `Incoming call flagged involving impersonation of ${scenario.impersonatedAuthority}.`,
    timestampMs: 0,
  });

  for (const reason of reasons) {
    events.push({
      id: uuid(),
      caseId: scenario.id,
      type: "threat_change",
      title: reason.label,
      description: `"${reason.matchedPhrase}" — threat score +${reason.delta}`,
      timestampMs: reason.timestampMs,
    });
  }

  events.push({
    id: uuid(),
    caseId: scenario.id,
    type: "graph_update",
    title: "Fraud network linked",
    description: `${graph.nodes.length} entities linked to campaign "${graph.campaignLabel}".`,
    timestampMs: Math.round(totalDurationMs * 0.7),
  });

  events.push({
    id: uuid(),
    caseId: scenario.id,
    type: "decision",
    title: decision.headline,
    description: decision.actions[0] ?? "Recommendation generated.",
    timestampMs: Math.round(totalDurationMs * 0.85),
  });

  events.push({
    id: uuid(),
    caseId: scenario.id,
    type: "case_resolved",
    title: "Case resolved",
    description: "Interaction concluded and archived for investigation review.",
    timestampMs: totalDurationMs,
  });

  return events.sort((a, b) => a.timestampMs - b.timestampMs);
}
