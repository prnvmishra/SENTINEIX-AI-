import { v4 as uuid } from "uuid";
import type {
  AiInsight,
  AppNotification,
  CaseSummary,
  DecisionRecommendation,
  DeepfakeCheckResult,
  EntityIntelResult,
  FraudGraphEdge,
  FraudGraphNode,
  GraphUpdate,
  MapPing,
  ServerToClientEventName,
  SpeakerType,
  SystemLogEntry,
  ThreatLevel,
  ThreatReason,
  ThreatUpdate,
  TimelineEvent,
  TranscriptLine,
} from "@shared/types";
import { runThreatEngine, scoreToLevel } from "./engines/threatEngine.js";
import { buildDecision } from "./engines/decisionEngine.js";
import { analyzeTranscriptWithAI, inferLineSpeakers } from "./ai/openRouterClient.js";
import { checkEntityAgainstFraudIntel, isFraudIntelEnabled } from "./intel/fraudIntelClient.js";
import { checkPhoneAgainstCallTracer } from "./intel/callTracerClient.js";
import { checkDomainOrIpLocation } from "./intel/ipGeoClient.js";
import { checkMediaForDeepfake } from "./intel/realityDefenderClient.js";
import { isGroqTranscriptionEnabled, transcribeRecordedAudio } from "./intel/groqTranscriptionClient.js";
import { getIo } from "../socket/socketGateway.js";

/**
 * Drives a genuine, real-time "live" fraud-analysis session: a citizen's own
 * microphone (via the browser's Web Speech API on the frontend) feeds actual
 * transcribed speech into this engine line-by-line, instead of a pre-scripted
 * scenario played back on a timer. Every downstream engine (threat scoring,
 * decision recommendations, AI second opinion, entity intelligence lookups)
 * is the exact same deterministic/AI logic used by the scripted demo — only
 * the *source* of the transcript differs.
 */

const PHONE_REGEX = /(?:\+?91[-\s]?)?[6-9]\d{9}\b/g;
const UPI_REGEX = /[a-zA-Z0-9.\-]{2,256}@[a-zA-Z]{2,64}\b/g;
const IP_REGEX = /\b(?:\d{1,3}\.){3}\d{1,3}\b/g;
const DOMAIN_REGEX = /\b(?:[a-z0-9-]+\.)+(?:com|in|org|net|info|xyz|link|shop|online|site)\b(?:\/[^\s]*)?/gi;

const AUTHORITY_PATTERNS: Array<[string, RegExp]> = [
  ["CBI", /\bcbi\b/i],
  ["Enforcement Directorate", /\bed\b|enforcement directorate/i],
  ["RBI", /\brbi\b/i],
  ["Customs Department", /\bcustoms\b/i],
  ["Income Tax Department", /income\s*tax/i],
  ["TRAI", /\btrai\b/i],
  ["Local Police", /\bpolice\b/i],
  ["Cyber Crime Cell", /cyber\s*crime/i],
];

type LiveSessionMode = "live-mic" | "recorded-upload" | "screenshot-upload";

interface LiveState {
  caseId: string;
  victimAlias: string;
  startedAtMs: number;
  transcript: TranscriptLine[];
  // `currentScore`/`currentLevel` are the EFFECTIVE, displayed score —
  // max(ruleScore, aiScore). The deterministic keyword engine can miss a
  // real scam's exact phrasing; when the AI analyst independently assesses
  // higher risk, that now actually raises the one score citizens see on the
  // main gauge, instead of only appearing in a separate advisory card that's
  // easy to miss. AI can only ever escalate the effective score, never
  // silently lower it below what the rule engine already found.
  currentScore: number;
  currentLevel: ThreatLevel;
  ruleScore: number;
  ruleReasons: ThreatReason[];
  aiScore: number;
  aiReasons: ThreatReason[];
  checkedEntities: Set<string>;
  nodes: FraudGraphNode[];
  edges: FraudGraphEdge[];
  claimedAuthority: string;
  city: string;
  state: string;
  isRunning: boolean;
  mode: LiveSessionMode;
  lastAiRequestAtMs: number;
}

// The deterministic keyword engine can never cover every real phrasing of a
// scam (paraphrases, typos, code-switching) — so the real LLM analyst runs
// periodically on a timer, independent of whether the rule engine's score
// ever changes. This is what lets the AI catch a scam the keyword list
// missed, instead of being gated entirely behind it.
const MIN_AI_INTERVAL_MS = 7_000;

let live: LiveState | null = null;

type UntypedEmitter = { emit: (event: string, payload: unknown) => void };

function broadcast<T>(event: ServerToClientEventName, payload: T): void {
  (getIo() as unknown as UntypedEmitter).emit(event, payload);
}

function log(source: string, message: string, level: SystemLogEntry["level"] = "info"): void {
  broadcast("log:entry", { id: uuid(), level, source, message, timestampMs: Date.now() } as SystemLogEntry);
}

function buildVictimNode(caseId: string, victimAlias: string, mode: LiveSessionMode): FraudGraphNode {
  const detail =
    mode === "recorded-upload"
      ? "Uploaded recording — transcribed via Groq Whisper"
      : mode === "screenshot-upload"
        ? "Chat screenshot — text extracted via on-device OCR"
        : "Live session — this device's real microphone";
  return {
    id: `${caseId}-victim`,
    caseId,
    type: "victim",
    label: victimAlias,
    detail,
    riskScore: 8,
    x: 80,
    y: 170,
  };
}

function titleForMode(mode: LiveSessionMode): string {
  if (mode === "recorded-upload") return "Recorded Call Analysis (uploaded audio)";
  if (mode === "screenshot-upload") return "Chat Screenshot Analysis (OCR text)";
  return "Live Call Analysis (real mic input)";
}

function buildSummary(): CaseSummary {
  if (!live) throw new Error("No live session in progress");
  return {
    id: live.caseId,
    title: titleForMode(live.mode),
    impersonatedAuthority: live.claimedAuthority,
    status: "live",
    threatLevel: live.currentLevel,
    finalScore: live.currentScore,
    city: live.city,
    state: live.state,
    startedAt: new Date(live.startedAtMs).toISOString(),
    durationMs: Date.now() - live.startedAtMs,
    victimAlias: live.victimAlias,
    source: live.mode,
  };
}

function broadcastGraph(): void {
  if (!live) return;
  const update: GraphUpdate = {
    caseId: live.caseId,
    nodes: live.nodes,
    edges: live.edges,
    campaignId: null,
    campaignLabel: null,
  };
  broadcast("graph:update", update);
}

export function startLiveSession(victimAlias: string, mode: LiveSessionMode = "live-mic"): string {
  const caseId = `live-${uuid()}`;
  live = {
    caseId,
    victimAlias,
    startedAtMs: Date.now(),
    transcript: [],
    currentScore: 0,
    currentLevel: "low",
    ruleScore: 0,
    ruleReasons: [],
    aiScore: 0,
    aiReasons: [],
    checkedEntities: new Set(),
    nodes: [buildVictimNode(caseId, victimAlias, mode)],
    edges: [],
    claimedAuthority: "Unknown (analyzing speech)",
    city: mode === "live-mic" ? "Awaiting location" : "Not applicable (no live GPS for this input type)",
    state: mode === "live-mic" ? "Awaiting location" : "Not applicable (no live GPS for this input type)",
    isRunning: true,
    mode,
    lastAiRequestAtMs: 0,
  };

  broadcast("case:start", { case: buildSummary() });
  broadcastGraph();
  log(
    "Live Session Engine",
    mode === "recorded-upload"
      ? `Analyzing an uploaded call recording for ${victimAlias} — real Whisper transcription, real threat/AI engines.`
      : mode === "screenshot-upload"
        ? `Analyzing an uploaded chat screenshot for ${victimAlias} — real on-device OCR text, real threat/AI engines.`
        : `Real microphone session started for ${victimAlias}. Transcribing and analyzing live speech — no scripted data.`,
  );
  return caseId;
}

function detectAuthority(text: string): void {
  if (!live || live.claimedAuthority !== "Unknown (analyzing speech)") return;
  for (const [label, pattern] of AUTHORITY_PATTERNS) {
    if (pattern.test(text)) {
      live.claimedAuthority = label;
      log("Live Session Engine", `Caller appears to be claiming affiliation with: ${label}.`);
      break;
    }
  }
}

type LiveEntity = { value: string; type: "phone" | "upi" | "ip" | "domain" };

function extractNewEntities(text: string): LiveEntity[] {
  if (!live) return [];
  const found: LiveEntity[] = [];

  for (const match of text.matchAll(PHONE_REGEX)) {
    const value = match[0].replace(/[-\s]/g, "");
    if (!live.checkedEntities.has(value)) found.push({ value, type: "phone" });
  }
  for (const match of text.matchAll(UPI_REGEX)) {
    const value = match[0];
    if (value.includes("@") && !live.checkedEntities.has(value) && !/\.(com|in|org)$/i.test(value)) {
      found.push({ value, type: "upi" });
    }
  }
  for (const match of text.matchAll(IP_REGEX)) {
    const value = match[0];
    if (!live.checkedEntities.has(value)) found.push({ value, type: "ip" });
  }
  for (const match of text.matchAll(DOMAIN_REGEX)) {
    const value = match[0].toLowerCase();
    if (!live.checkedEntities.has(value)) found.push({ value, type: "domain" });
  }
  return found;
}

function graphNodeTypeFor(entityType: LiveEntity["type"]): FraudGraphNode["type"] {
  if (entityType === "phone") return "scammer";
  if (entityType === "upi") return "mule_account";
  return "infrastructure";
}

function edgeLabelFor(entityType: LiveEntity["type"]): string {
  if (entityType === "phone") return "Caller number";
  if (entityType === "upi") return "Payment request";
  return "Phishing link / infra";
}

function upsertEntityNode(entity: LiveEntity, result: { risk: string; score: number; source: string; timesReported: number }): void {
  if (!live) return;
  const nodeId = `${live.caseId}-entity-${entity.value}`;
  const existing = live.nodes.find((n) => n.id === nodeId);

  if (existing) {
    existing.detail = `${result.source}: ${result.risk} risk`;
    existing.riskScore = Math.max(existing.riskScore, Math.round(result.score * 100));
  } else {
    const index = live.nodes.length;
    const node: FraudGraphNode = {
      id: nodeId,
      caseId: live.caseId,
      type: graphNodeTypeFor(entity.type),
      label: entity.value,
      detail: `${result.source}: ${result.risk} risk`,
      riskScore: Math.round(result.score * 100),
      x: 300,
      y: 60 + (index % 5) * 60,
    };
    const edge: FraudGraphEdge = {
      id: `${live.caseId}-edge-${entity.value}`,
      source: `${live.caseId}-victim`,
      target: node.id,
      label: edgeLabelFor(entity.type),
      weight: 1,
    };
    live.nodes.push(node);
    live.edges.push(edge);
  }
  broadcastGraph();
}

function handleIntelResult(caseId: string, entity: LiveEntity, result: EntityIntelResult): void {
  if (!live || live.caseId !== caseId) return;

  broadcast("intel:entityResult", result);
  upsertEntityNode(entity, result);

  log(
    `${result.source} Lookup`,
    `"${result.entity}" checked — ${result.risk} risk (${result.timesReported} report(s)). ${result.signals[0] ?? ""}`,
    result.risk === "HIGH" ? "error" : result.risk === "MEDIUM" ? "warning" : "info",
  );

  if (result.risk === "HIGH" || result.risk === "MEDIUM") {
    const event: TimelineEvent = {
      id: uuid(),
      caseId,
      type: "graph_update",
      title: `${result.risk} risk entity detected`,
      description: `${entity.value} — ${result.recommendation}`,
      timestampMs: Date.now() - live.startedAtMs,
    };
    broadcast("timeline:event", event);
  }
}

function runEntityIntelChecks(entities: LiveEntity[]): void {
  if (!live) return;
  const caseId = live.caseId;

  for (const entity of entities) {
    live.checkedEntities.add(entity.value);

    if (entity.type === "phone") {
      // CallTracer needs zero setup and always runs. FraudIntel India is an
      // optional enhancement layered on top when its free API key is set.
      checkPhoneAgainstCallTracer(caseId, entity.value)
        .then((result) => result && handleIntelResult(caseId, entity, result))
        .catch(() => undefined);

      if (isFraudIntelEnabled()) {
        checkEntityAgainstFraudIntel(caseId, entity.value, entity.type)
          .then((result) => result && handleIntelResult(caseId, entity, result))
          .catch(() => undefined);
      }
    } else if (entity.type === "upi") {
      if (isFraudIntelEnabled()) {
        checkEntityAgainstFraudIntel(caseId, entity.value, entity.type)
          .then((result) => result && handleIntelResult(caseId, entity, result))
          .catch(() => undefined);
      }
    } else {
      checkDomainOrIpLocation(caseId, entity.value, entity.type)
        .then((result) => result && handleIntelResult(caseId, entity, result))
        .catch(() => undefined);
    }
  }
}

/**
 * Folds a real AI assessment into the one score/level the dashboard's main
 * gauge shows. AI can only ever RAISE the effective score (never silently
 * lower it below what the deterministic engine already found) — so a scam
 * phrased outside the fixed keyword list still shows up as HIGH/CRITICAL on
 * the primary display, not just in a side "AI Threat Analyst" card that's
 * easy to miss while the main gauge still reads LOW.
 */
function applyAiInsight(insight: AiInsight): void {
  if (!live) return;
  const previousEffective = live.currentScore;
  const previousLevel = live.currentLevel;

  live.aiScore = Math.max(live.aiScore, insight.score);
  const effectiveScore = Math.max(live.ruleScore, live.aiScore);
  if (effectiveScore <= previousEffective) return;

  const newLevel = scoreToLevel(effectiveScore);
  live.currentScore = effectiveScore;
  live.currentLevel = newLevel;

  const lastLine = live.transcript[live.transcript.length - 1];
  const reason: ThreatReason = {
    id: uuid(),
    category: "ai_assessment",
    label: "AI Threat Analyst raised the risk score",
    explanation: `The AI analyst independently assessed this conversation as ${insight.level.toUpperCase()} risk (${insight.score}/100) from real transcribed content the fixed keyword list didn't fully capture. ${insight.summary}`,
    matchedPhrase: insight.keyIndicators[0] ?? insight.summary.slice(0, 90),
    delta: effectiveScore - previousEffective,
    timestampMs: lastLine ? lastLine.timestampMs : Date.now() - live.startedAtMs,
    transcriptLineId: lastLine?.id ?? "",
  };
  live.aiReasons.push(reason);

  const update: ThreatUpdate = {
    caseId: live.caseId,
    score: effectiveScore,
    delta: reason.delta,
    level: newLevel,
    reason,
    reasons: [...live.ruleReasons, ...live.aiReasons],
  };
  broadcast("threat:update", update);
  log(
    "AI Threat Analyst",
    `Raised the combined threat score to ${effectiveScore}/100 (${newLevel.toUpperCase()}) based on independent analysis of real content.`,
    newLevel === "critical" ? "error" : "warning",
  );

  if (newLevel !== previousLevel) {
    const decision: DecisionRecommendation = buildDecision(live.caseId, newLevel, reason.timestampMs);
    broadcast("decision:update", decision);
    log("Decision Agent", decision.headline, newLevel === "critical" ? "error" : "info");

    if (newLevel === "critical" || newLevel === "high") {
      const notification: AppNotification = {
        id: uuid(),
        severity: newLevel === "critical" ? "danger" : "warning",
        title: `${newLevel.toUpperCase()} threat — AI analyst escalation`,
        message: decision.headline,
        caseId: live.caseId,
        timestampMs: Date.now(),
        read: false,
      };
      broadcast("notification:new", notification);
    }
  }
}

function requestLiveAiInsight(logLabel: string): void {
  if (!live) return;
  const context = { city: live.city, state: live.state, impersonatedAuthority: live.claimedAuthority };
  const caseId = live.caseId;
  const linesSoFar = [...live.transcript];
  const score = live.currentScore;
  const level = live.currentLevel;
  live.lastAiRequestAtMs = Date.now();

  analyzeTranscriptWithAI(caseId, context, linesSoFar, score, level)
    .then((insight) => {
      if (!insight || !live || live.caseId !== caseId) return;
      broadcast("ai:insight", insight);
      log(
        "AI Threat Analyst",
        `${logLabel} — OpenRouter (${insight.model}) assessed ${insight.score}/100 (${insight.level}) from real transcribed speech.`,
        insight.level === "critical" ? "error" : "info",
      );
      applyAiInsight(insight);
    })
    .catch(() => {
      // Best-effort enrichment; never affects the live session.
    });
}

export function submitLiveLine(text: string, speaker: SpeakerType): void {
  if (!live || !live.isRunning) return;
  const trimmed = text.trim();
  if (!trimmed) return;

  const line: TranscriptLine = {
    id: uuid(),
    caseId: live.caseId,
    sequence: live.transcript.length,
    speaker,
    text: trimmed,
    timestampMs: Date.now() - live.startedAtMs,
    keywords: [],
  };
  live.transcript.push(line);
  broadcast("transcript:line", line);
  log("Live Transcription", `Real speech captured (${speaker}): "${trimmed}"`);

  detectAuthority(trimmed);
  runEntityIntelChecks(extractNewEntities(trimmed));

  const { reasons, finalScore } = runThreatEngine(live.transcript);
  const newReasons = reasons.filter((r) => r.transcriptLineId === line.id);
  live.ruleScore = finalScore;
  live.ruleReasons = reasons;

  const effectiveScore = Math.max(live.ruleScore, live.aiScore);
  const level = scoreToLevel(effectiveScore);
  const levelChanged = level !== live.currentLevel;
  live.currentScore = effectiveScore;
  live.currentLevel = level;

  if (newReasons.length > 0) {
    const update: ThreatUpdate = {
      caseId: live.caseId,
      score: effectiveScore,
      delta: newReasons.reduce((sum, r) => sum + r.delta, 0),
      level,
      reason: newReasons[newReasons.length - 1] ?? null,
      reasons: [...live.ruleReasons, ...live.aiReasons],
    };
    broadcast("threat:update", update);
    log("Threat Detection Agent", `Score updated to ${effectiveScore} from real speech analysis.`, "warning");

    for (const reason of newReasons) {
      const event: TimelineEvent = {
        id: uuid(),
        caseId: live.caseId,
        type: "threat_change",
        title: reason.label,
        description: `"${reason.matchedPhrase}" — threat score +${reason.delta}`,
        timestampMs: line.timestampMs,
      };
      broadcast("timeline:event", event);
    }
  } else {
    log(
      "Threat Detection Agent",
      "No rule-engine keyword matched this line — real content may still be a scam in phrasing the fixed keyword list doesn't cover. The AI analyst below reviews independently of these keywords.",
    );
  }

  if (levelChanged) {
    const decision: DecisionRecommendation = buildDecision(live.caseId, level, line.timestampMs);
    broadcast("decision:update", decision);
    log("Decision Agent", decision.headline, level === "critical" ? "error" : "info");
    requestLiveAiInsight(`Threat escalated to ${level.toUpperCase()}`);

    if (level === "critical" || level === "high") {
      const notification: AppNotification = {
        id: uuid(),
        severity: level === "critical" ? "danger" : "warning",
        title: `${level.toUpperCase()} threat — live session`,
        message: decision.headline,
        caseId: live.caseId,
        timestampMs: Date.now(),
        read: false,
      };
      broadcast("notification:new", notification);
    }
  } else if (Date.now() - live.lastAiRequestAtMs >= MIN_AI_INTERVAL_MS) {
    // Independent periodic real-AI review — NOT gated behind the
    // deterministic engine's score ever changing, so a scam phrased outside
    // the keyword list still gets a genuine second opinion.
    requestLiveAiInsight("Periodic AI review");
  }
}

async function reverseGeocodeViaBigDataCloud(lat: number, lng: number): Promise<{ city: string; state: string } | null> {
  const response = await fetch(
    `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=en`,
  );
  if (!response.ok) return null;
  const data = (await response.json()) as { city?: string; locality?: string; principalSubdivision?: string };
  const city = data.city || data.locality;
  const state = data.principalSubdivision;
  return city && state ? { city, state } : null;
}

async function reverseGeocodeViaNominatim(lat: number, lng: number): Promise<{ city: string; state: string } | null> {
  const response = await fetch(
    `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=10`,
    { headers: { "User-Agent": "SentinelX-AI-Hackathon-Prototype/1.0 (contact: sentinelx-demo@example.com)" } },
  );
  if (!response.ok) return null;
  const data = (await response.json()) as { address?: Record<string, string> };
  const address = data.address ?? {};
  const city = address.city || address.town || address.county || address.state_district;
  const state = address.state;
  return city && state ? { city, state } : null;
}

export async function submitLiveLocation(lat: number, lng: number): Promise<void> {
  if (!live) return;
  const caseId = live.caseId;
  // Real GPS coordinates as a readable last-resort fallback — the
  // coordinates themselves are always genuinely real regardless of whether
  // either reverse-geocoding provider below is reachable.
  let city = `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
  let state = "GPS coordinates (place name lookup unavailable)";

  try {
    // BigDataCloud's reverse-geocode-client endpoint is free, keyless, and
    // (unlike Nominatim) does not block cloud/datacenter IPs, so it's tried
    // first. Nominatim is kept as a second, independent attempt.
    const resolved = (await reverseGeocodeViaBigDataCloud(lat, lng)) ?? (await reverseGeocodeViaNominatim(lat, lng));
    if (resolved) {
      city = resolved.city;
      state = resolved.state;
    } else {
      console.warn("[live-session] both reverse-geocode providers were unavailable; showing raw coordinates");
    }
  } catch (error) {
    console.warn("[live-session] reverse geocode failed:", error instanceof Error ? error.message : error);
  }

  if (!live || live.caseId !== caseId) return;
  live.city = city;
  live.state = state;

  const ping: MapPing = {
    caseId: live.caseId,
    hotspotId: `hotspot-${live.caseId}`,
    lat,
    lng,
    city: live.city,
    state: live.state,
    timestampMs: Date.now(),
  };
  broadcast("map:ping", ping);
  log("Live Session Engine", `Real device GPS location resolved to ${live.city}, ${live.state}.`);
}

export function submitLiveMediaCheck(mediaBase64: string, mediaType: "audio" | "image", fileName: string): void {
  if (!live) return;
  const caseId = live.caseId;

  checkMediaForDeepfake(caseId, mediaBase64, mediaType, fileName)
    .then((result: DeepfakeCheckResult | null) => {
      if (!result || !live || live.caseId !== caseId) return;
      broadcast("intel:deepfakeResult", result);
      log(
        "Reality Defender Scan",
        `${mediaType === "audio" ? "Audio" : "Video frame"} sample scanned — verdict: ${result.status} (score ${result.finalScore}).`,
        result.status === "FAKE" || result.status === "SUSPICIOUS" ? "error" : "info",
      );
    })
    .catch(() => {
      // Best-effort enrichment; never affects the live session.
    });
}

export function endLiveSession(): void {
  if (!live || !live.isRunning) return;

  const event: TimelineEvent = {
    id: uuid(),
    caseId: live.caseId,
    type: "case_resolved",
    title: "Live session ended",
    description: "Real-time analysis session concluded and archived for review.",
    timestampMs: Date.now() - live.startedAtMs,
  };
  broadcast("timeline:event", event);
  broadcast("case:end", {
    caseId: live.caseId,
    finalScore: live.currentScore,
    resolvedAt: new Date().toISOString(),
  });
  log("Live Session Engine", "Live session ended by user.");

  const notification: AppNotification = {
    id: uuid(),
    severity: live.currentLevel === "critical" ? "danger" : "success",
    title: "Live session ended",
    message: `Real-time analysis concluded with a final score of ${live.currentScore}.`,
    caseId: live.caseId,
    timestampMs: Date.now(),
    read: false,
  };
  broadcast("notification:new", notification);
  requestLiveAiInsight("Final live-session review");

  live.isRunning = false;
}

export function isLiveSessionRunning(): boolean {
  return live?.isRunning ?? false;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const RECORDING_LINE_DELAY_MS = 250;
const MAX_RECORDING_LINES = 200;

/** Splits a transcript with no segment timing into sentence-ish chunks as a fallback. */
function splitIntoLines(text: string): string[] {
  return text
    .split(/(?<=[.!?।])\s+|\n+/)
    .map((chunk) => chunk.trim())
    .filter(Boolean);
}

export interface RecordedCallAnalysisResult {
  caseId: string;
  lineCount: number;
  finalScore: number;
  finalLevel: ThreatLevel;
  language: string | null;
}

/**
 * Analyzes a previously RECORDED call: transcribes the uploaded audio via
 * Groq's free Whisper API, then feeds every transcribed line through the
 * exact same threat engine, decision engine, AI analyst, and entity intel
 * checks used by a live mic session — producing a real fraud verdict for a
 * call the citizen already recorded, not a live-only feature.
 *
 * Lines are submitted with a short pacing delay so the dashboard visibly
 * "replays" the analysis over Socket.IO, exactly like watching it happen
 * live, before this call resolves with the final score/verdict.
 */
export async function analyzeRecordedCall(
  victimAlias: string,
  audioBuffer: Buffer,
  mimeType: string,
  speaker: SpeakerType,
  language?: "en" | "hi",
): Promise<RecordedCallAnalysisResult | { error: string }> {
  if (!isGroqTranscriptionEnabled()) {
    return {
      error:
        "Recorded-call analysis needs a free Groq API key (GROQ_API_KEY) for transcription — see README for the free signup link.",
    };
  }
  if (isLiveSessionRunning()) {
    return { error: "A live or recorded-call session is already running. Stop it before analyzing another recording." };
  }

  const transcript = await transcribeRecordedAudio(audioBuffer, mimeType, language);
  if (!transcript) return { error: "Transcription failed — the audio file may be corrupt, too long, or an unsupported format." };

  const lines =
    transcript.segments.length > 0 ? transcript.segments.map((s) => s.text) : splitIntoLines(transcript.fullText);
  if (lines.length === 0) {
    return { error: "No speech was detected in this recording." };
  }

  const trimmedLines = lines.slice(0, MAX_RECORDING_LINES);
  // Classify who's actually speaking on EACH line (real per-line diarization
  // by content/turn-taking) instead of stamping the citizen's one manual
  // pick onto every single line of the call.
  const speakers = await inferLineSpeakers(trimmedLines, speaker);

  const caseId = startLiveSession(victimAlias, "recorded-upload");

  for (let i = 0; i < trimmedLines.length; i += 1) {
    if (!live || live.caseId !== caseId) break;
    submitLiveLine(trimmedLines[i], speakers[i] ?? speaker);
    await sleep(RECORDING_LINE_DELAY_MS);
  }

  const finalScore = live?.currentScore ?? 0;
  const finalLevel = live?.currentLevel ?? "low";
  endLiveSession();

  return { caseId, lineCount: lines.length, finalScore, finalLevel, language: transcript.language };
}

export interface TextConversationAnalysisResult {
  caseId: string;
  lineCount: number;
  finalScore: number;
  finalLevel: ThreatLevel;
}

/**
 * Analyzes a chat/DM conversation whose text was already extracted on the
 * client (via on-device OCR of a screenshot, e.g. an Instagram/WhatsApp
 * blackmail thread) — no audio, no transcription step. Each message is fed
 * through the exact same threat engine, decision engine, AI analyst, and
 * entity intel checks used by a live mic session, so sextortion/blackmail
 * chat scams get the same real fraud verdict as a phone call would.
 */
export async function analyzeTextConversation(
  victimAlias: string,
  lines: string[],
  speaker: SpeakerType,
): Promise<TextConversationAnalysisResult | { error: string }> {
  if (isLiveSessionRunning()) {
    return { error: "A live or recorded-call session is already running. Stop it before analyzing another item." };
  }

  const cleanedLines = lines.map((l) => l.trim()).filter(Boolean);
  if (cleanedLines.length === 0) {
    return { error: "No readable text was extracted from this image — try a clearer, less-cropped screenshot." };
  }

  const trimmedLines = cleanedLines.slice(0, MAX_RECORDING_LINES);
  const speakers = await inferLineSpeakers(trimmedLines, speaker);

  const caseId = startLiveSession(victimAlias, "screenshot-upload");

  for (let i = 0; i < trimmedLines.length; i += 1) {
    if (!live || live.caseId !== caseId) break;
    submitLiveLine(trimmedLines[i], speakers[i] ?? speaker);
    await sleep(RECORDING_LINE_DELAY_MS);
  }

  const finalScore = live?.currentScore ?? 0;
  const finalLevel = live?.currentLevel ?? "low";
  endLiveSession();

  return { caseId, lineCount: cleanedLines.length, finalScore, finalLevel };
}
