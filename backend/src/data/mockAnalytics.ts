import type { AnalyticsOverview, DailyTrendPoint } from "@shared/types";
import { mockCaseDetails } from "./mockCases.js";

function buildTrend(): DailyTrendPoint[] {
  const points: DailyTrendPoint[] = [];
  const baseIncidents = [38, 42, 35, 51, 47, 60, 55, 63, 58, 71, 66, 74, 69, 80];

  for (let i = 0; i < baseIncidents.length; i += 1) {
    const date = new Date();
    date.setDate(date.getDate() - (baseIncidents.length - 1 - i));

    points.push({
      date: date.toISOString().slice(0, 10),
      incidents: baseIncidents[i] ?? 40,
      averageThreatScore: 48 + Math.round(Math.sin(i / 2) * 10) + i,
    });
  }

  return points;
}

export const mockAnalyticsOverview: AnalyticsOverview = {
  totalCases: 1284 + mockCaseDetails.length,
  activeCases: 6,
  criticalCases: mockCaseDetails.filter((c) => c.threatLevel === "critical").length + 9,
  totalAmountSavedLakhs: 412.6,
  detectionAccuracyPct: 94.6,
  trend: buildTrend(),
  byAuthority: [
    { authority: "CBI", count: 312 },
    { authority: "Customs", count: 248 },
    { authority: "RBI", count: 201 },
    { authority: "Income Tax / ED", count: 176 },
    { authority: "Police", count: 154 },
    { authority: "FedEx / Courier", count: 118 },
  ],
  byState: [
    { state: "Maharashtra", incidents: 298, amountAtRiskLakhs: 96.4 },
    { state: "Uttar Pradesh", incidents: 276, amountAtRiskLakhs: 84.1 },
    { state: "Karnataka", incidents: 233, amountAtRiskLakhs: 71.8 },
    { state: "Delhi", incidents: 210, amountAtRiskLakhs: 68.2 },
    { state: "Rajasthan", incidents: 154, amountAtRiskLakhs: 42.9 },
    { state: "West Bengal", incidents: 141, amountAtRiskLakhs: 38.6 },
  ],
  agencyPerformance: [
    { agency: "Cyber Crime Cell, Maharashtra", casesHandled: 214, resolutionRate: 0.81, avgResponseMinutes: 22 },
    { agency: "I4C National Unit", casesHandled: 187, resolutionRate: 0.88, avgResponseMinutes: 15 },
    { agency: "Cyber Crime Cell, UP", casesHandled: 176, resolutionRate: 0.74, avgResponseMinutes: 28 },
    { agency: "Cyber Crime Cell, Karnataka", casesHandled: 152, resolutionRate: 0.79, avgResponseMinutes: 24 },
    { agency: "Cyber Crime Cell, Rajasthan", casesHandled: 98, resolutionRate: 0.7, avgResponseMinutes: 31 },
  ],
};

export function getAnalyticsOverview(): AnalyticsOverview {
  return mockAnalyticsOverview;
}
