import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import type { ReactNode } from "react";
import type {
  AiInsight,
  AppNotification,
  CaseDetail,
  CaseEndPayload,
  CaseStartPayload,
  DecisionRecommendation,
  DeepfakeCheckResult,
  EntityIntelResult,
  GraphUpdate,
  MapHotspot,
  MapPing,
  SpeakerType,
  SystemLogEntry,
  ThreatUpdate,
  TimelineEvent,
  TranscriptLine,
} from "@shared/types";
import { useSocket } from "@/hooks/useSocket";
import { LiveCaseContext, initialLiveCaseState, isLiveMicSession } from "@/context/liveCaseContextInstance";
import type { LiveCaseState } from "@/context/liveCaseContextInstance";
import { registerCase, updateRegisteredCase } from "@/services/caseRegistry";

type LiveCaseAction =
  | { type: "case:start"; payload: CaseStartPayload }
  | { type: "transcript:line"; payload: TranscriptLine }
  | { type: "threat:update"; payload: ThreatUpdate }
  | { type: "graph:update"; payload: GraphUpdate }
  | { type: "map:ping"; payload: MapPing }
  | { type: "timeline:event"; payload: TimelineEvent }
  | { type: "decision:update"; payload: DecisionRecommendation }
  | { type: "log:entry"; payload: SystemLogEntry }
  | { type: "notification:new"; payload: AppNotification }
  | { type: "ai:insight"; payload: AiInsight }
  | { type: "intel:entityResult"; payload: EntityIntelResult }
  | { type: "intel:deepfakeResult"; payload: DeepfakeCheckResult }
  | { type: "case:end"; payload: CaseEndPayload };

function reducer(state: LiveCaseState, action: LiveCaseAction): LiveCaseState {
  switch (action.type) {
    case "case:start":
      return {
        ...initialLiveCaseState,
        liveNotifications: state.liveNotifications,
        activeCase: action.payload.case,
        isRunning: true,
      };
    case "transcript:line":
      return { ...state, transcript: [...state.transcript, action.payload] };
    case "threat:update":
      return {
        ...state,
        threatScore: action.payload.score,
        threatLevel: action.payload.level,
        threatReasons: action.payload.reasons,
      };
    case "graph:update":
      return { ...state, graph: action.payload };
    case "map:ping":
      return { ...state, mapPings: [...state.mapPings, action.payload] };
    case "timeline:event":
      return { ...state, timeline: [...state.timeline, action.payload] };
    case "decision:update":
      return { ...state, decision: action.payload };
    case "log:entry":
      return { ...state, logs: [action.payload, ...state.logs].slice(0, 100) };
    case "notification:new":
      return { ...state, liveNotifications: [action.payload, ...state.liveNotifications].slice(0, 50) };
    case "ai:insight":
      return { ...state, aiInsights: [...state.aiInsights, action.payload].slice(-10) };
    case "intel:entityResult":
      return { ...state, entityIntel: [...state.entityIntel, action.payload].slice(-20) };
    case "intel:deepfakeResult":
      return { ...state, deepfakeResults: [...state.deepfakeResults, action.payload].slice(-10) };
    case "case:end":
      return {
        ...state,
        isRunning: false,
        activeCase: state.activeCase
          ? { ...state.activeCase, status: "resolved", finalScore: action.payload.finalScore }
          : null,
      };
    default:
      return state;
  }
}

function severityForLevel(level: LiveCaseState["threatLevel"]): MapHotspot["severity"] {
  if (level === "critical" || level === "high") return "high";
  if (level === "elevated") return "medium";
  return "low";
}

/**
 * Assembles a full CaseDetail snapshot from the current live-case state —
 * used to write/refresh the real case registry (Firebase). Only ever called
 * for genuine sessions (live mic, recorded upload, chat screenshot), never
 * for the scripted demo, so Analytics/Historical Cases stay real.
 */
function buildCaseDetailFromState(state: LiveCaseState): CaseDetail | null {
  if (!state.activeCase) return null;
  const lastPing = state.mapPings[state.mapPings.length - 1];

  const hotspot: MapHotspot = lastPing
    ? {
        id: lastPing.hotspotId,
        city: lastPing.city,
        state: lastPing.state,
        lat: lastPing.lat,
        lng: lastPing.lng,
        incidentCount: 1,
        severity: severityForLevel(state.threatLevel),
      }
    : {
        id: `hotspot-${state.activeCase.id}`,
        city: state.activeCase.city,
        state: state.activeCase.state,
        lat: 20.5937,
        lng: 78.9629,
        incidentCount: 1,
        severity: severityForLevel(state.threatLevel),
      };

  return {
    ...state.activeCase,
    threatLevel: state.threatLevel,
    finalScore: state.threatScore,
    transcript: state.transcript,
    reasons: state.threatReasons,
    nodes: state.graph?.nodes ?? [],
    edges: state.graph?.edges ?? [],
    timeline: state.timeline,
    hotspot,
  };
}

export function LiveCaseProvider({ children }: { children: ReactNode }) {
  const { socket } = useSocket();
  const [state, dispatch] = useReducer(reducer, initialLiveCaseState);
  const wasRunningRef = useRef(false);

  // The citizen gets an explicit choice, made BEFORE starting a session,
  // over whether it gets saved to the real case registry (Firebase) and
  // shown in Analytics/Historical Cases. Kept as a ref (read at the moment a
  // session starts) + mirrored state (for the checkbox UI) so a mid-session
  // toggle flip can never desync "started ongoing" from "ended completed".
  const [caseRegistrationEnabled, setCaseRegistrationEnabledState] = useState(true);
  const registrationEnabledRef = useRef(true);
  const registeredCaseIdRef = useRef<string | null>(null);
  const [lastCompletedRegisteredCaseId, setLastCompletedRegisteredCaseId] = useState<string | null>(null);
  const setCaseRegistrationEnabled = useCallback((enabled: boolean) => {
    registrationEnabledRef.current = enabled;
    setCaseRegistrationEnabledState(enabled);
  }, []);

  // Real-case lifecycle -> Firebase registry: register as "ongoing" the
  // instant a genuine session starts (only if the citizen opted in), and
  // refresh it as "completed" (with the final transcript/score/graph/
  // timeline) the instant it ends. The scripted demo never touches this —
  // isLiveMicSession() gates on the `live-` case-id prefix that only
  // live/recorded/screenshot sessions get.
  useEffect(() => {
    const wasRunning = wasRunningRef.current;
    wasRunningRef.current = state.isRunning;

    if (!state.activeCase || !isLiveMicSession(state.activeCase)) return;

    if (state.isRunning && !wasRunning) {
      if (registrationEnabledRef.current) {
        const detail = buildCaseDetailFromState(state);
        if (detail) {
          registerCase(detail);
          registeredCaseIdRef.current = detail.id;
        }
      } else {
        registeredCaseIdRef.current = null;
      }
    } else if (!state.isRunning && wasRunning) {
      if (registeredCaseIdRef.current === state.activeCase.id) {
        const detail = buildCaseDetailFromState(state);
        if (detail) {
          updateRegisteredCase(detail.id, detail);
          setLastCompletedRegisteredCaseId(detail.id);
        }
      }
    }
  }, [state]);

  useEffect(() => {
    if (!socket) return;

    const onCaseStart = (payload: CaseStartPayload) => dispatch({ type: "case:start", payload });
    const onTranscriptLine = (payload: TranscriptLine) => dispatch({ type: "transcript:line", payload });
    const onThreatUpdate = (payload: ThreatUpdate) => dispatch({ type: "threat:update", payload });
    const onGraphUpdate = (payload: GraphUpdate) => dispatch({ type: "graph:update", payload });
    const onMapPing = (payload: MapPing) => dispatch({ type: "map:ping", payload });
    const onTimelineEvent = (payload: TimelineEvent) => dispatch({ type: "timeline:event", payload });
    const onDecisionUpdate = (payload: DecisionRecommendation) => dispatch({ type: "decision:update", payload });
    const onLogEntry = (payload: SystemLogEntry) => dispatch({ type: "log:entry", payload });
    const onNotificationNew = (payload: AppNotification) => dispatch({ type: "notification:new", payload });
    const onAiInsight = (payload: AiInsight) => dispatch({ type: "ai:insight", payload });
    const onEntityResult = (payload: EntityIntelResult) => dispatch({ type: "intel:entityResult", payload });
    const onDeepfakeResult = (payload: DeepfakeCheckResult) => dispatch({ type: "intel:deepfakeResult", payload });
    const onCaseEnd = (payload: CaseEndPayload) => dispatch({ type: "case:end", payload });

    socket.on("case:start", onCaseStart);
    socket.on("transcript:line", onTranscriptLine);
    socket.on("threat:update", onThreatUpdate);
    socket.on("graph:update", onGraphUpdate);
    socket.on("map:ping", onMapPing);
    socket.on("timeline:event", onTimelineEvent);
    socket.on("decision:update", onDecisionUpdate);
    socket.on("log:entry", onLogEntry);
    socket.on("notification:new", onNotificationNew);
    socket.on("ai:insight", onAiInsight);
    socket.on("intel:entityResult", onEntityResult);
    socket.on("intel:deepfakeResult", onDeepfakeResult);
    socket.on("case:end", onCaseEnd);

    return () => {
      socket.off("case:start", onCaseStart);
      socket.off("transcript:line", onTranscriptLine);
      socket.off("threat:update", onThreatUpdate);
      socket.off("graph:update", onGraphUpdate);
      socket.off("map:ping", onMapPing);
      socket.off("timeline:event", onTimelineEvent);
      socket.off("decision:update", onDecisionUpdate);
      socket.off("log:entry", onLogEntry);
      socket.off("notification:new", onNotificationNew);
      socket.off("ai:insight", onAiInsight);
      socket.off("intel:entityResult", onEntityResult);
      socket.off("intel:deepfakeResult", onDeepfakeResult);
      socket.off("case:end", onCaseEnd);
    };
  }, [socket]);

  const startSimulation = useCallback((scenarioId?: string) => socket?.emit("simulation:start", { scenarioId }), [socket]);
  const stopSimulation = useCallback(() => socket?.emit("simulation:stop"), [socket]);
  const pauseSimulation = useCallback(() => socket?.emit("simulation:pause"), [socket]);
  const resumeSimulation = useCallback(() => socket?.emit("simulation:resume"), [socket]);

  const startLiveSession = useCallback(() => socket?.emit("live:start"), [socket]);
  const submitLiveLine = useCallback(
    (text: string, speaker: SpeakerType) => socket?.emit("live:line", { text, speaker }),
    [socket],
  );
  const submitLiveLocation = useCallback(
    (lat: number, lng: number) => socket?.emit("live:location", { lat, lng }),
    [socket],
  );
  const submitLiveMediaCheck = useCallback(
    (mediaBase64: string, mediaType: "audio" | "image", fileName: string) =>
      socket?.emit("live:mediaCheck", { mediaBase64, mediaType, fileName }),
    [socket],
  );
  const endLiveSession = useCallback(() => socket?.emit("live:end"), [socket]);

  const value = useMemo(
    () => ({
      ...state,
      startSimulation,
      stopSimulation,
      pauseSimulation,
      resumeSimulation,
      startLiveSession,
      submitLiveLine,
      submitLiveLocation,
      submitLiveMediaCheck,
      endLiveSession,
      caseRegistrationEnabled,
      setCaseRegistrationEnabled,
      lastCompletedRegisteredCaseId,
    }),
    [
      state,
      startSimulation,
      stopSimulation,
      pauseSimulation,
      resumeSimulation,
      startLiveSession,
      submitLiveLine,
      submitLiveLocation,
      submitLiveMediaCheck,
      endLiveSession,
      caseRegistrationEnabled,
      setCaseRegistrationEnabled,
      lastCompletedRegisteredCaseId,
    ],
  );

  return <LiveCaseContext.Provider value={value}>{children}</LiveCaseContext.Provider>;
}
