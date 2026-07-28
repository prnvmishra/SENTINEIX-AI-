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
  MapPing,
  SpeakerType,
  SystemLogEntry,
  ThreatUpdate,
  TimelineEvent,
  TranscriptLine,
} from "@shared/types";
import { useSocket } from "@/hooks/useSocket";
import { useAuth } from "@/hooks/useAuth";
import { LiveCaseContext, initialLiveCaseState, isLiveMicSession } from "@/context/liveCaseContextInstance";
import type { LiveCaseState } from "@/context/liveCaseContextInstance";
import { registerCase, updateRegisteredCase } from "@/services/caseRegistry";
import { buildCaseDetailFromLiveState } from "@/utils/buildCaseDetailFromLiveState";
import { resolveCaseDetailDurationMs } from "@/utils/caseDuration";

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
      return {
        ...state,
        aiInsights: [...state.aiInsights, action.payload].slice(-10),
        // Keep the main gauge in sync with AI raises even if threat:update is delayed.
        threatScore: Math.max(state.threatScore, action.payload.score),
        threatLevel:
          action.payload.score > state.threatScore ? action.payload.level : state.threatLevel,
      };
    case "intel:entityResult":
      return { ...state, entityIntel: [...state.entityIntel, action.payload].slice(-20) };
    case "intel:deepfakeResult":
      return { ...state, deepfakeResults: [...state.deepfakeResults, action.payload].slice(-10) };
    case "case:end":
      return {
        ...state,
        isRunning: false,
        activeCase: state.activeCase
          ? { ...state.activeCase, status: "live", finalScore: action.payload.finalScore }
          : null,
      };
    default:
      return state;
  }
}

function buildCaseDetailFromState(state: LiveCaseState): CaseDetail | null {
  return buildCaseDetailFromLiveState(state);
}

export function LiveCaseProvider({ children }: { children: ReactNode }) {
  const { socket } = useSocket();
  const { user } = useAuth();
  const [state, dispatch] = useReducer(reducer, initialLiveCaseState);
  const wasRunningRef = useRef(false);
  const stateRef = useRef(state);
  stateRef.current = state;

  const [pendingRegistration, setPendingRegistration] = useState<CaseDetail | null>(null);
  const pendingRegistrationRef = useRef<CaseDetail | null>(null);
  pendingRegistrationRef.current = pendingRegistration;
  const [lastRegisteredCaseId, setLastRegisteredCaseId] = useState<string | null>(null);
  const lastRegisteredCaseIdRef = useRef<string | null>(null);
  const [caseRegistryError, setCaseRegistryError] = useState<string | null>(null);
  const pendingEvidenceRef = useRef<
    Record<string, { recordingUrl?: string; evidenceImageUrl?: string; durationMs?: number }>
  >({});

  // Analysis finished → hold a local draft ONLY. Never auto-write to Firebase.
  // The citizen/officer must click "Register this case" (sometimes there is no
  // threat and the analysis is just a check).
  useEffect(() => {
    const wasRunning = wasRunningRef.current;
    wasRunningRef.current = state.isRunning;

    if (!state.activeCase || !isLiveMicSession(state.activeCase)) return;

    if (!state.isRunning && wasRunning) {
      const detail = buildCaseDetailFromState(state);
      if (detail) {
        const earlyEvidence = pendingEvidenceRef.current[detail.id];
        if (earlyEvidence) delete pendingEvidenceRef.current[detail.id];
        setPendingRegistration({
          ...detail,
          status: "live",
          ...(earlyEvidence?.recordingUrl ? { recordingUrl: earlyEvidence.recordingUrl } : {}),
          ...(earlyEvidence?.evidenceImageUrl ? { evidenceImageUrl: earlyEvidence.evidenceImageUrl } : {}),
          ...(earlyEvidence?.durationMs && earlyEvidence.durationMs > 0
            ? { durationMs: earlyEvidence.durationMs }
            : {}),
        });
        setCaseRegistryError(null);
        setLastRegisteredCaseId(null);
      }
    }
  }, [state]);

  // Late AI raises (after session end) must update the register panel score —
  // otherwise the gauge can show 98 while "Register" still shows 71.
  useEffect(() => {
    if (!pendingRegistration) return;
    if (state.threatScore <= pendingRegistration.finalScore) return;

    setPendingRegistration((previous) => {
      if (!previous || state.threatScore <= previous.finalScore) return previous;
      return {
        ...previous,
        finalScore: state.threatScore,
        threatLevel: state.threatLevel,
        reasons: state.threatReasons.length > 0 ? state.threatReasons : previous.reasons,
        timeline: state.timeline.length > previous.timeline.length ? state.timeline : previous.timeline,
      };
    });
  }, [
    state.threatScore,
    state.threatLevel,
    state.threatReasons,
    state.timeline,
    pendingRegistration,
  ]);

  const attachPendingEvidence = useCallback(
    (
      evidence: { recordingUrl?: string; evidenceImageUrl?: string; durationMs?: number },
      forCaseId?: string,
    ) => {
      const caseId =
        forCaseId ?? pendingRegistrationRef.current?.id ?? stateRef.current.activeCase?.id;
      const registeredId = lastRegisteredCaseIdRef.current;

      if (caseId) {
        pendingEvidenceRef.current[caseId] = {
          ...pendingEvidenceRef.current[caseId],
          ...evidence,
        };
      }

      setPendingRegistration((previous) => {
        if (!previous) return previous;
        if (forCaseId && previous.id !== forCaseId) return previous;
        return {
          ...previous,
          status: "live",
          ...(evidence.recordingUrl ? { recordingUrl: evidence.recordingUrl } : {}),
          ...(evidence.evidenceImageUrl ? { evidenceImageUrl: evidence.evidenceImageUrl } : {}),
          ...(evidence.durationMs && evidence.durationMs > 0 ? { durationMs: evidence.durationMs } : {}),
        };
      });

      // Evidence upload can finish after the user already registered — patch Firebase.
      if (caseId && registeredId === caseId) {
        void updateRegisteredCase(caseId, evidence);
      }
    },
    [],
  );

  const registerPendingCase = useCallback(async (): Promise<string | null> => {
    const draft = pendingRegistration;
    if (!draft) return "Nothing to register — run an analysis first.";
    if (!user) return "You must be signed in to register a case.";

    const live = stateRef.current;
    const finalScore = Math.max(draft.finalScore, live.threatScore);
    const threatLevel = live.threatScore >= draft.finalScore ? live.threatLevel : draft.threatLevel;

    // blob: URLs die on refresh — never write them into Firebase.
    const recordingUrl =
      draft.recordingUrl && !draft.recordingUrl.startsWith("blob:") ? draft.recordingUrl : undefined;
    const evidenceImageUrl =
      draft.evidenceImageUrl && !draft.evidenceImageUrl.startsWith("blob:")
        ? draft.evidenceImageUrl
        : undefined;

    if (draft.recordingUrl?.startsWith("blob:") && !recordingUrl) {
      setCaseRegistryError(
        "Voice is only a temporary browser preview (blob URL). Wait for the green Voice evidence badge (Storage/inline save), then register again.",
      );
      return "Voice evidence not persisted yet.";
    }

    setCaseRegistryError(null);
    const durationMs = resolveCaseDetailDurationMs(draft);
    const error = await registerCase({
      ...draft,
      recordingUrl,
      evidenceImageUrl,
      finalScore,
      threatLevel,
      reasons: live.threatReasons.length > 0 ? live.threatReasons : draft.reasons,
      durationMs,
      status: "live",
      resolution: undefined,
      registeredByUid: user.id,
      registeredByName: user.name,
    });
    if (error) {
      setCaseRegistryError(error);
      return error;
    }
    setLastRegisteredCaseId(draft.id);
    lastRegisteredCaseIdRef.current = draft.id;
    setPendingRegistration(null);
    return null;
  }, [pendingRegistration, user]);

  const discardPendingRegistration = useCallback(() => {
    setPendingRegistration(null);
    setCaseRegistryError(null);
  }, []);

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
    (lat: number, lng: number, accuracyMeters?: number) =>
      socket?.emit("live:location", { lat, lng, accuracyMeters }),
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
      pendingRegistration,
      attachPendingEvidence,
      registerPendingCase,
      discardPendingRegistration,
      lastRegisteredCaseId,
      caseRegistryError,
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
      pendingRegistration,
      attachPendingEvidence,
      registerPendingCase,
      discardPendingRegistration,
      lastRegisteredCaseId,
      caseRegistryError,
    ],
  );

  return <LiveCaseContext.Provider value={value}>{children}</LiveCaseContext.Provider>;
}
