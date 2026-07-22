import { v4 as uuid } from "uuid";
import type {
  AppNotification,
  CaseSummary,
  DecisionRecommendation,
  GraphUpdate,
  MapPing,
  ServerToClientEventName,
  SystemLogEntry,
  ThreatLevel,
  ThreatUpdate,
  TimelineEvent,
  TranscriptLine,
} from "@shared/types";
import type { ScenarioDefinition } from "../data/scenarioTypes.js";
import { getDefaultScenario, getScenarioById } from "../data/scenarios/index.js";
import { scenarioToTranscript } from "./caseBuilder.js";
import { runThreatEngine, scoreToLevel } from "./engines/threatEngine.js";
import { buildCaseGraph } from "./engines/graphEngine.js";
import { buildDecision } from "./engines/decisionEngine.js";
import { analyzeTranscriptWithAI } from "./ai/openRouterClient.js";
import { getIo } from "../socket/socketGateway.js";

const PLAYBACK_SPEED = 4;

interface BufferedEvent {
  event: ServerToClientEventName;
  payload: unknown;
}

interface SimulationState {
  scenario: ScenarioDefinition;
  transcript: TranscriptLine[];
  fullGraph: GraphUpdate;
  isRunning: boolean;
  isPaused: boolean;
  elapsedVirtualMs: number;
  resumedAtRealMs: number;
  timeouts: NodeJS.Timeout[];
  buffer: BufferedEvent[];
  revealedCategories: Set<string>;
  currentScore: number;
  currentLevel: ThreatLevel;
}

let state: SimulationState | null = null;

function log(source: string, message: string, level: SystemLogEntry["level"] = "info") {
  const entry: SystemLogEntry = { id: uuid(), level, source, message, timestampMs: Date.now() };
  broadcast("log:entry", entry);
}

type UntypedEmitter = { emit: (event: string, payload: unknown) => void };

function broadcast<T>(event: ServerToClientEventName, payload: T): void {
  state?.buffer.push({ event, payload });
  (getIo() as unknown as UntypedEmitter).emit(event, payload);
}

function totalDurationMs(transcript: TranscriptLine[]): number {
  return transcript[transcript.length - 1]?.timestampMs ?? 0;
}

/**
 * Fires a real OpenRouter LLM analysis in the background (never blocking or
 * breaking playback) and broadcasts the result as a second, AI-generated
 * opinion alongside the deterministic engine's score.
 */
function requestAiInsight(
  scenario: ScenarioDefinition,
  linesSoFar: TranscriptLine[],
  engineScore: number,
  engineLevel: ThreatLevel,
  logLabel: string,
): void {
  analyzeTranscriptWithAI(scenario.id, scenario, linesSoFar, engineScore, engineLevel)
    .then((insight) => {
      if (!insight) return;
      broadcast("ai:insight", insight);
      log(
        "AI Threat Analyst",
        `${logLabel} — OpenRouter (${insight.model}) assessed ${insight.score}/100 (${insight.level}), ` +
          `${insight.agreesWithEngine ? "concurring with" : "diverging from"} the rule engine.`,
        insight.level === "critical" ? "error" : "info",
      );
    })
    .catch(() => {
      // AI analysis is a best-effort enrichment; failures never affect the simulation.
    });
}

function buildInitialSummary(scenario: ScenarioDefinition, transcript: TranscriptLine[]): CaseSummary {
  return {
    id: scenario.id,
    title: scenario.title,
    impersonatedAuthority: scenario.impersonatedAuthority,
    status: "live",
    threatLevel: "low",
    finalScore: 0,
    city: scenario.city,
    state: scenario.state,
    startedAt: new Date().toISOString(),
    durationMs: totalDurationMs(transcript),
    victimAlias: scenario.victimAlias,
  };
}

function graphSubsetForCategories(fullGraph: GraphUpdate, revealed: Set<string>): GraphUpdate {
  const revealMule = revealed.has("money_transfer") || revealed.has("safe_account");
  const revealCampaign = revealed.size >= 4;

  const nodes = fullGraph.nodes.filter((node) => {
    if (node.type === "mule_account") return revealMule;
    if (node.type === "campaign") return revealCampaign;
    return true;
  });

  const nodeIds = new Set(nodes.map((n) => n.id));
  const edges = fullGraph.edges.filter((edge) => nodeIds.has(edge.source) && nodeIds.has(edge.target));

  return { ...fullGraph, nodes, edges };
}

function scheduleFrom(fromVirtualMs: number): void {
  if (!state) return;
  const { scenario, transcript } = state;

  for (const line of transcript) {
    if (line.timestampMs < fromVirtualMs) continue;

    const delay = (line.timestampMs - fromVirtualMs) / PLAYBACK_SPEED;
    const timeout = setTimeout(() => emitLine(line), delay);
    state.timeouts.push(timeout);
  }

  const mapPingDelay = Math.max(0, (500 - fromVirtualMs) / PLAYBACK_SPEED);
  if (fromVirtualMs <= 500) {
    const timeout = setTimeout(() => {
      const ping: MapPing = {
        caseId: scenario.id,
        hotspotId: `hotspot-${scenario.id}`,
        lat: scenario.lat,
        lng: scenario.lng,
        city: scenario.city,
        state: scenario.state,
        timestampMs: Date.now(),
      };
      broadcast("map:ping", ping);
      log("Graph Intelligence Agent", `Geolocation ping received from ${scenario.city}, ${scenario.state}.`);
    }, mapPingDelay);
    state.timeouts.push(timeout);
  }

  const endDelay = (totalDurationMs(transcript) - fromVirtualMs) / PLAYBACK_SPEED + 600;
  const endTimeout = setTimeout(() => concludeSimulation(), Math.max(0, endDelay));
  state.timeouts.push(endTimeout);
}

function emitLine(line: TranscriptLine): void {
  if (!state) return;
  broadcast("transcript:line", line);
  log("Transcript Agent", `Line ${line.sequence + 1} streamed (${line.speaker}).`);

  const linesSoFar = state.transcript.filter((l) => l.sequence <= line.sequence);
  const { reasons, finalScore } = runThreatEngine(linesSoFar);
  const newReasons = reasons.filter((r) => r.transcriptLineId === line.id);

  if (newReasons.length > 0) {
    for (const reason of newReasons) {
      state.revealedCategories.add(reason.category);
    }

    const level = scoreToLevel(finalScore);
    const levelChanged = level !== state.currentLevel;
    state.currentScore = finalScore;
    state.currentLevel = level;

    const update: ThreatUpdate = {
      caseId: state.scenario.id,
      score: finalScore,
      delta: newReasons.reduce((sum, r) => sum + r.delta, 0),
      level,
      reason: newReasons[newReasons.length - 1] ?? null,
      reasons,
    };
    broadcast("threat:update", update);
    log("Threat Detection Agent", `Score updated to ${finalScore} (+${update.delta}).`, "warning");

    for (const reason of newReasons) {
      const event: TimelineEvent = {
        id: uuid(),
        caseId: state.scenario.id,
        type: "threat_change",
        title: reason.label,
        description: `"${reason.matchedPhrase}" — threat score +${reason.delta}`,
        timestampMs: line.timestampMs,
      };
      broadcast("timeline:event", event);
    }

    const graphSubset = graphSubsetForCategories(state.fullGraph, state.revealedCategories);
    broadcast("graph:update", graphSubset);

    if (levelChanged) {
      const decision: DecisionRecommendation = buildDecision(state.scenario.id, level, line.timestampMs);
      broadcast("decision:update", decision);
      log("Decision Agent", decision.headline, level === "critical" ? "error" : "info");
      requestAiInsight(state.scenario, linesSoFar, finalScore, level, `Threat escalated to ${level.toUpperCase()}`);

      if (level === "critical" || level === "high") {
        const notification: AppNotification = {
          id: uuid(),
          severity: level === "critical" ? "danger" : "warning",
          title: `${level.toUpperCase()} threat — ${state.scenario.city}`,
          message: decision.headline,
          caseId: state.scenario.id,
          timestampMs: Date.now(),
          read: false,
        };
        broadcast("notification:new", notification);
      }
    }
  }
}

function concludeSimulation(): void {
  if (!state || !state.isRunning) return;

  const event: TimelineEvent = {
    id: uuid(),
    caseId: state.scenario.id,
    type: "case_resolved",
    title: "Case resolved",
    description: "Interaction concluded and archived for investigation review.",
    timestampMs: totalDurationMs(state.transcript),
  };
  broadcast("timeline:event", event);
  broadcast("case:end", {
    caseId: state.scenario.id,
    finalScore: state.currentScore,
    resolvedAt: new Date().toISOString(),
  });
  log("Report Generator Agent", "Case archived and ready for investigation report export.", "info");

  const notification: AppNotification = {
    id: uuid(),
    severity: state.currentLevel === "critical" ? "danger" : "success",
    title: `Case resolved — ${state.scenario.city}`,
    message: `${state.scenario.title} concluded with a final score of ${state.currentScore} and was archived for review.`,
    caseId: state.scenario.id,
    timestampMs: Date.now(),
    read: false,
  };
  broadcast("notification:new", notification);
  requestAiInsight(state.scenario, state.transcript, state.currentScore, state.currentLevel, "Final case review");

  clearTimers();
  state.isRunning = false;
}

function clearTimers(): void {
  if (!state) return;
  for (const timeout of state.timeouts) clearTimeout(timeout);
  state.timeouts = [];
}

export function startSimulation(scenarioId?: string): void {
  const scenario = (scenarioId && getScenarioById(scenarioId)) || getDefaultScenario();
  const transcript = scenarioToTranscript(scenario);
  const fullGraph = buildCaseGraph(scenario);

  state = {
    scenario,
    transcript,
    fullGraph,
    isRunning: true,
    isPaused: false,
    elapsedVirtualMs: 0,
    resumedAtRealMs: Date.now(),
    timeouts: [],
    buffer: [],
    revealedCategories: new Set(),
    currentScore: 0,
    currentLevel: "low",
  };

  broadcast("case:start", { case: buildInitialSummary(scenario, transcript) });
  const introNode = fullGraph.nodes.filter((n) => n.type === "victim" || n.type === "scammer");
  const introEdges = fullGraph.edges.filter(
    (e) => introNode.some((n) => n.id === e.source) && introNode.some((n) => n.id === e.target),
  );
  broadcast("graph:update", { ...fullGraph, nodes: introNode, edges: introEdges });
  log("Simulation Engine", `Playback started for scenario "${scenario.title}".`);

  scheduleFrom(0);
}

export function pauseSimulation(): void {
  if (!state || !state.isRunning || state.isPaused) return;
  const elapsedReal = Date.now() - state.resumedAtRealMs;
  state.elapsedVirtualMs += elapsedReal * PLAYBACK_SPEED;
  state.isPaused = true;
  clearTimers();
  log("Simulation Engine", "Playback paused by operator.");
}

export function resumeSimulation(): void {
  if (!state || !state.isRunning || !state.isPaused) return;
  state.isPaused = false;
  state.resumedAtRealMs = Date.now();
  scheduleFrom(state.elapsedVirtualMs);
  log("Simulation Engine", "Playback resumed by operator.");
}

export function stopSimulation(): void {
  if (!state) return;
  clearTimers();
  if (state.isRunning) {
    broadcast("case:end", {
      caseId: state.scenario.id,
      finalScore: state.currentScore,
      resolvedAt: new Date().toISOString(),
    });
    log("Simulation Engine", "Playback stopped by operator.");
  }
  state.isRunning = false;
}

export function getBufferedEvents(): BufferedEvent[] {
  return state?.buffer ?? [];
}

export function isSimulationRunning(): boolean {
  return state?.isRunning ?? false;
}
