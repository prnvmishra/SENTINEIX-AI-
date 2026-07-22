import { createContext } from "react";
import type {
  AiInsight,
  AppNotification,
  CaseSummary,
  DecisionRecommendation,
  GraphUpdate,
  MapPing,
  SystemLogEntry,
  ThreatLevel,
  ThreatReason,
  TimelineEvent,
  TranscriptLine,
} from "@shared/types";

export interface LiveCaseState {
  activeCase: CaseSummary | null;
  transcript: TranscriptLine[];
  threatScore: number;
  threatLevel: ThreatLevel;
  threatReasons: ThreatReason[];
  graph: GraphUpdate | null;
  mapPings: MapPing[];
  timeline: TimelineEvent[];
  decision: DecisionRecommendation | null;
  logs: SystemLogEntry[];
  liveNotifications: AppNotification[];
  aiInsights: AiInsight[];
  isRunning: boolean;
}

export interface LiveCaseContextValue extends LiveCaseState {
  startSimulation: (scenarioId?: string) => void;
  stopSimulation: () => void;
  pauseSimulation: () => void;
  resumeSimulation: () => void;
}

export const initialLiveCaseState: LiveCaseState = {
  activeCase: null,
  transcript: [],
  threatScore: 0,
  threatLevel: "low",
  threatReasons: [],
  graph: null,
  mapPings: [],
  timeline: [],
  decision: null,
  logs: [],
  liveNotifications: [],
  aiInsights: [],
  isRunning: false,
};

export const LiveCaseContext = createContext<LiveCaseContextValue | undefined>(undefined);
