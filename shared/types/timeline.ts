export type TimelineEventType =
  | "case_started"
  | "transcript"
  | "threat_change"
  | "graph_update"
  | "decision"
  | "case_resolved";

export interface TimelineEvent {
  id: string;
  caseId: string;
  type: TimelineEventType;
  title: string;
  description: string;
  timestampMs: number;
}

export interface SystemLogEntry {
  id: string;
  level: "info" | "warning" | "error";
  source: string;
  message: string;
  timestampMs: number;
}
