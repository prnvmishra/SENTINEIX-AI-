export interface DailyTrendPoint {
  date: string;
  incidents: number;
  averageThreatScore: number;
}

export interface AuthorityImpersonationStat {
  authority: string;
  count: number;
}

export interface StateStat {
  state: string;
  incidents: number;
  amountAtRiskLakhs: number;
}

export interface AgencyPerformanceStat {
  agency: string;
  casesHandled: number;
  resolutionRate: number;
  avgResponseMinutes: number;
}

export interface AnalyticsOverview {
  totalCases: number;
  activeCases: number;
  criticalCases: number;
  totalAmountSavedLakhs: number;
  detectionAccuracyPct: number;
  trend: DailyTrendPoint[];
  byAuthority: AuthorityImpersonationStat[];
  byState: StateStat[];
  agencyPerformance: AgencyPerformanceStat[];
}
