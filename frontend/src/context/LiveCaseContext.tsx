import { useCallback, useEffect, useMemo, useReducer } from "react";
import type { ReactNode } from "react";
import type {
  AiInsight,
  AppNotification,
  CaseEndPayload,
  CaseStartPayload,
  DecisionRecommendation,
  GraphUpdate,
  MapPing,
  SystemLogEntry,
  ThreatUpdate,
  TimelineEvent,
  TranscriptLine,
} from "@shared/types";
import { useSocket } from "@/hooks/useSocket";
import { LiveCaseContext, initialLiveCaseState } from "@/context/liveCaseContextInstance";
import type { LiveCaseState } from "@/context/liveCaseContextInstance";

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

export function LiveCaseProvider({ children }: { children: ReactNode }) {
  const { socket } = useSocket();
  const [state, dispatch] = useReducer(reducer, initialLiveCaseState);

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
      socket.off("case:end", onCaseEnd);
    };
  }, [socket]);

  const startSimulation = useCallback((scenarioId?: string) => socket?.emit("simulation:start", { scenarioId }), [socket]);
  const stopSimulation = useCallback(() => socket?.emit("simulation:stop"), [socket]);
  const pauseSimulation = useCallback(() => socket?.emit("simulation:pause"), [socket]);
  const resumeSimulation = useCallback(() => socket?.emit("simulation:resume"), [socket]);

  const value = useMemo(
    () => ({ ...state, startSimulation, stopSimulation, pauseSimulation, resumeSimulation }),
    [state, startSimulation, stopSimulation, pauseSimulation, resumeSimulation],
  );

  return <LiveCaseContext.Provider value={value}>{children}</LiveCaseContext.Provider>;
}
