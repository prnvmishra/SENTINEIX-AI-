import { v4 as uuid } from "uuid";
import type { AppNotification } from "@shared/types";
import { mockCaseDetails } from "./mockCases.js";

const severityByLevel = {
  critical: "danger",
  high: "warning",
  elevated: "warning",
  low: "info",
} as const;

const caseNotifications: AppNotification[] = mockCaseDetails.map((caseDetail, index) => ({
  id: uuid(),
  severity: severityByLevel[caseDetail.threatLevel],
  title: `${caseDetail.threatLevel.toUpperCase()} threat resolved — ${caseDetail.city}`,
  message: `${caseDetail.title} reached a final score of ${caseDetail.finalScore} and was escalated for review.`,
  caseId: caseDetail.id,
  timestampMs: Date.now() - index * 3_600_000,
  read: index > 1,
}));

const systemNotifications: AppNotification[] = [
  {
    id: uuid(),
    severity: "success",
    title: "Mock Intelligence Engine online",
    message: "Transcript, Threat, Graph, Timeline and Decision agents initialized successfully.",
    caseId: null,
    timestampMs: Date.now() - 7_200_000,
    read: true,
  },
  {
    id: uuid(),
    severity: "info",
    title: "Weekly intelligence digest ready",
    message: "27 agencies received this week's regional fraud pattern summary.",
    caseId: null,
    timestampMs: Date.now() - 14_400_000,
    read: true,
  },
];

export const mockNotifications: AppNotification[] = [...caseNotifications, ...systemNotifications].sort(
  (a, b) => b.timestampMs - a.timestampMs,
);

export function listNotifications(): AppNotification[] {
  return mockNotifications;
}
