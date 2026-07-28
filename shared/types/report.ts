import type { ThreatLevel } from "./enums";
import type { ThreatReason } from "./threat";
import type { TimelineEvent } from "./timeline";

export interface InvestigationReport {
  caseId: string;
  generatedAt: string;
  title: string;
  incidentSummary: string;
  impersonatedAuthority: string;
  victimAlias: string;
  city: string;
  state: string;
  finalScore: number;
  threatLevel: ThreatLevel;
  timeline: TimelineEvent[];
  evidence: string[];
  /** Original chat screenshot (data URL or download URL) embedded in the PDF when present */
  evidenceImageUrl?: string;
  indicators: ThreatReason[];
  recommendations: string[];
  disclaimer: string;
}
