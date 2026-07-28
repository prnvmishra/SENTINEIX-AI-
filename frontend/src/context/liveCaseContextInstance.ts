import { createContext } from "react";
import type {
  AiInsight,
  AppNotification,
  CaseDetail,
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
  submitLiveLocation: (lat: number, lng: number, accuracyMeters?: number) => void;
  submitLiveMediaCheck: (mediaBase64: string, mediaType: "audio" | "image", fileName: string) => void;
  endLiveSession: () => void;
  /**
   * Snapshot of the last finished analysis (live mic / recorded / screenshot)
   * that has NOT been written to Firebase yet. Null when nothing is waiting
   * for an explicit "Register this case" click — analysis alone never saves.
   */
  pendingRegistration: CaseDetail | null;
  /** Attach evidence URLs onto the pending snapshot before registering. Pass caseId when known. */
  attachPendingEvidence: (
    evidence: {
      recordingUrl?: string;
      evidenceImageUrl?: string;
      durationMs?: number;
    },
    forCaseId?: string,
  ) => void;
  /** Writes pendingRegistration to Firebase as ONGOING. Returns null on success, error string on failure. */
  registerPendingCase: () => Promise<string | null>;
  /** Drops the pending snapshot without saving (throwaway / no-threat analysis). */
  discardPendingRegistration: () => void;
  /** Last case id successfully registered as ONGOING (for confirmation banner). */
  lastRegisteredCaseId: string | null;
  caseRegistryError: string | null;
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
