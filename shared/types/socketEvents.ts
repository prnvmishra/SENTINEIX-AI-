import type { TranscriptLine } from "./transcript";
import type { ThreatUpdate, DecisionRecommendation } from "./threat";
import type { GraphUpdate } from "./graph";
import type { MapPing } from "./geo";
import type { TimelineEvent, SystemLogEntry } from "./timeline";
import type { AppNotification } from "./notification";
import type { CaseSummary } from "./case";
import type { AiInsight } from "./ai";

export interface CaseStartPayload {
  case: CaseSummary;
}

export interface CaseEndPayload {
  caseId: string;
  finalScore: number;
  resolvedAt: string;
}

export interface ServerToClientEvents {
  "case:start": (payload: CaseStartPayload) => void;
  "transcript:line": (payload: TranscriptLine) => void;
  "threat:update": (payload: ThreatUpdate) => void;
  "graph:update": (payload: GraphUpdate) => void;
  "map:ping": (payload: MapPing) => void;
  "timeline:event": (payload: TimelineEvent) => void;
  "decision:update": (payload: DecisionRecommendation) => void;
  "log:entry": (payload: SystemLogEntry) => void;
  "notification:new": (payload: AppNotification) => void;
  "ai:insight": (payload: AiInsight) => void;
  "case:end": (payload: CaseEndPayload) => void;
}

export interface ClientToServerEvents {
  "simulation:start": (payload: { scenarioId?: string }) => void;
  "simulation:stop": () => void;
  "simulation:pause": () => void;
  "simulation:resume": () => void;
}

export type ServerToClientEventName = keyof ServerToClientEvents;
export type ClientToServerEventName = keyof ClientToServerEvents;
