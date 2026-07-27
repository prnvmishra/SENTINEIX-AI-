import { createContext } from "react";
import type {
  AiInsight,
  AppNotification,
  CaseSummary,
  DecisionRecommendation,
  DeepfakeCheckResult,
  EntityIntelResult,
  GraphUpdate,
  MapPing,
  SpeakerType,
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
  entityIntel: EntityIntelResult[];
  deepfakeResults: DeepfakeCheckResult[];
  isRunning: boolean;
}

export interface LiveCaseContextValue extends LiveCaseState {
  startSimulation: (scenarioId?: string) => void;
  stopSimulation: () => void;
  pauseSimulation: () => void;
  resumeSimulation: () => void;
  startLiveSession: () => void;
  submitLiveLine: (text: string, speaker: SpeakerType) => void;
  submitLiveLocation: (lat: number, lng: number) => void;
  submitLiveMediaCheck: (mediaBase64: string, mediaType: "audio" | "image", fileName: string) => void;
  endLiveSession: () => void;
  /** Whether the NEXT genuine session (live mic / recorded / screenshot) started will be saved to the real case registry (Firebase) — shown in Analytics/Historical Cases. Default true. */
  caseRegistrationEnabled: boolean;
  setCaseRegistrationEnabled: (enabled: boolean) => void;
  /** Set the instant a genuine session that WAS registered transitions to "completed" in Firebase — lets the UI show an explicit confirmation instead of it happening silently. */
  lastCompletedRegisteredCaseId: string | null;
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
  entityIntel: [],
  deepfakeResults: [],
  isRunning: false,
};

export const LiveCaseContext = createContext<LiveCaseContextValue | undefined>(undefined);

export function isLiveMicSession(activeCase: CaseSummary | null): boolean {
  return Boolean(activeCase?.id.startsWith("live-"));
}
