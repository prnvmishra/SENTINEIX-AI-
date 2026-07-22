import type { CaseStatus, ThreatLevel } from "./enums";
import type { TranscriptLine } from "./transcript";
import type { ThreatReason } from "./threat";
import type { FraudGraphEdge, FraudGraphNode } from "./graph";
import type { TimelineEvent } from "./timeline";
import type { MapHotspot } from "./geo";

export interface CaseSummary {
  id: string;
  title: string;
  impersonatedAuthority: string;
  status: CaseStatus;
  threatLevel: ThreatLevel;
  finalScore: number;
  city: string;
  state: string;
  startedAt: string;
  durationMs: number;
  victimAlias: string;
}

export interface CaseDetail extends CaseSummary {
  transcript: TranscriptLine[];
  reasons: ThreatReason[];
  nodes: FraudGraphNode[];
  edges: FraudGraphEdge[];
  timeline: TimelineEvent[];
  hotspot: MapHotspot;
}
