export type UserRole =
  | "citizen"
  | "officer"
  | "investigator"
  | "telecom"
  | "bank"
  | "gov_admin";

export type ThreatLevel = "low" | "elevated" | "high" | "critical";

export type SpeakerType = "scammer" | "victim" | "system";

export type ThreatSignalCategory =
  | "authority_impersonation"
  | "isolation_request"
  | "urgency_pressure"
  | "money_transfer"
  | "safe_account"
  | "skype_verification"
  | "escalation_bonus";

export type GraphNodeType = "victim" | "scammer" | "mule_account" | "campaign";

export type CaseStatus = "live" | "resolved" | "escalated" | "archived";

export type NotificationSeverity = "info" | "success" | "warning" | "danger";
