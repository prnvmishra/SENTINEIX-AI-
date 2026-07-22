import type { CaseDetail, MapHotspot, TranscriptLine } from "@shared/types";
import type { ScenarioDefinition } from "../data/scenarioTypes.js";
import { threatSignalDefinitions } from "../data/threatSignals.js";
import { runThreatEngine, scoreToLevel } from "./engines/threatEngine.js";
import { buildCaseGraph } from "./engines/graphEngine.js";
import { buildDecision } from "./engines/decisionEngine.js";
import { buildCaseTimeline } from "./engines/timelineEngine.js";

const allKeywords = threatSignalDefinitions.flatMap((signal) => signal.keywords);

function extractKeywords(text: string): string[] {
  const lower = text.toLowerCase();
  return allKeywords.filter((keyword) => lower.includes(keyword));
}

export function scenarioToTranscript(scenario: ScenarioDefinition): TranscriptLine[] {
  return scenario.lines.map((line, index) => ({
    id: `${scenario.id}-line-${index}`,
    caseId: scenario.id,
    sequence: index,
    speaker: line.speaker,
    text: line.text,
    timestampMs: line.offsetMs,
    keywords: extractKeywords(line.text),
  }));
}

export function buildHotspot(scenario: ScenarioDefinition): MapHotspot {
  return {
    id: `hotspot-${scenario.id}`,
    city: scenario.city,
    state: scenario.state,
    lat: scenario.lat,
    lng: scenario.lng,
    incidentCount: 1,
    severity: "high",
  };
}

export function buildCaseDetail(scenario: ScenarioDefinition): CaseDetail {
  const transcript = scenarioToTranscript(scenario);
  const { reasons, finalScore } = runThreatEngine(transcript);
  const graph = buildCaseGraph(scenario);
  const level = scoreToLevel(finalScore);
  const totalDurationMs = transcript[transcript.length - 1]?.timestampMs ?? 0;
  const decision = buildDecision(scenario.id, level, Math.round(totalDurationMs * 0.85));
  const timeline = buildCaseTimeline({ scenario, reasons, graph, decision, totalDurationMs });
  const hotspot = buildHotspot(scenario);

  return {
    id: scenario.id,
    title: scenario.title,
    impersonatedAuthority: scenario.impersonatedAuthority,
    status: "resolved",
    threatLevel: level,
    finalScore,
    city: scenario.city,
    state: scenario.state,
    startedAt: scenario.startedAt,
    durationMs: totalDurationMs,
    victimAlias: scenario.victimAlias,
    transcript,
    reasons,
    nodes: graph.nodes,
    edges: graph.edges,
    timeline,
    hotspot,
  };
}
