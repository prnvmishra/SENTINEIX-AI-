import type { CaseStatus, ThreatLevel } from "./enums";
import type { TranscriptLine } from "./transcript";
import type { ThreatReason } from "./threat";
import type { FraudGraphEdge, FraudGraphNode } from "./graph";
import type { TimelineEvent } from "./timeline";
import type { MapHotspot } from "./geo";

/**
 * Filled in only when a real case is explicitly closed by an officer via
 * "Mark Case as Solved" — ending a live session / finishing an upload NEVER
 * sets this on its own. A case stays "ongoing" (status "live") after the
 * call/recording/screenshot has been analyzed, exactly like a real cybercrime
 * complaint stays open until investigators actually trace and act on it.
 */
export interface CaseResolution {
  /** Display name of the officer/account that closed the case. */
  resolvedByName: string;
  /** Optional — name of the criminal/suspect identified, if any. */
  criminalName?: string;
  /** Required free-text explanation of how the case was resolved. */
  notes: string;
  /** ISO timestamp of when the case was marked solved. */
  resolvedAt: string;
}

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
  /** How this case's transcript was produced — distinguishes real, user-run cases from the scripted demo. */
  source?: "live-mic" | "recorded-upload" | "screenshot-upload" | "manual";
  /** Free-text investigator notes (manual cases, or notes added at registration). */
  notes?: string;
  /** Present only once an officer has explicitly closed this case. */
  resolution?: CaseResolution;
  /** Firebase Auth uid of the account that clicked Register — only they may Mark Complete. */
  registeredByUid?: string;
  /** Display name of the registering account (audit trail). */
  registeredByName?: string;
  /** Playable URL of the real recorded audio for this case (Firebase Storage), when captured. */
  recordingUrl?: string;
  /** Original chat-screenshot image URL (Firebase Storage), for screenshot-analysis cases. */
  evidenceImageUrl?: string;
}

export interface CaseDetail extends CaseSummary {
  transcript: TranscriptLine[];
  reasons: ThreatReason[];
  nodes: FraudGraphNode[];
  edges: FraudGraphEdge[];
  timeline: TimelineEvent[];
  hotspot: MapHotspot;
}
