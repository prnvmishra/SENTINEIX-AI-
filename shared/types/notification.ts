import type { NotificationSeverity } from "./enums";

export interface AppNotification {
  id: string;
  severity: NotificationSeverity;
  title: string;
  message: string;
  caseId: string | null;
  timestampMs: number;
  read: boolean;
}
