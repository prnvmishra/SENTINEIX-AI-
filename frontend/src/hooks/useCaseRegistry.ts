import { useEffect, useState } from "react";
import type { CaseDetail } from "@shared/types";
import { subscribeToCaseRegistry } from "@/services/caseRegistry";

/**
 * Live subscription to explicitly registered real cases in Firebase.
 * Analysis alone never appears here — only after "Register this case".
 */
export function useCaseRegistry() {
  const [cases, setCases] = useState<CaseDetail[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = subscribeToCaseRegistry(
      (registryCases) => {
        setCases(registryCases);
        setIsLoading(false);
        setError(null);
      },
      (message) => {
        setError(message);
        setIsLoading(false);
      },
    );
    return unsubscribe;
  }, []);

  return { cases, isLoading, error };
}

export interface CaseRegistryStats {
  total: number;
  ongoing: number;
  completed: number;
  highOrCritical: number;
  averageScore: number;
  bySource: Record<string, number>;
}

export function computeCaseRegistryStats(cases: CaseDetail[]): CaseRegistryStats {
  const total = cases.length;
  // Old builds wrote status "resolved" without an officer resolution — count those as ongoing.
  const ongoing = cases.filter((c) => c.status === "live" || (c.status === "resolved" && !c.resolution)).length;
  const completed = cases.filter((c) => c.status === "resolved" && Boolean(c.resolution)).length;
  const highOrCritical = cases.filter((c) => c.threatLevel === "high" || c.threatLevel === "critical").length;
  const averageScore = total === 0 ? 0 : Math.round(cases.reduce((sum, c) => sum + c.finalScore, 0) / total);
  const bySource: Record<string, number> = {};
  for (const c of cases) {
    const key = c.source ?? "live-mic";
    bySource[key] = (bySource[key] ?? 0) + 1;
  }
  return { total, ongoing, completed, highOrCritical, averageScore, bySource };
}

export interface RealCityStat {
  city: string;
  state: string;
  incidents: number;
}

export interface RealAuthorityStat {
  authority: string;
  count: number;
}

export interface RealTrendPoint {
  date: string;
  incidents: number;
  averageThreatScore: number;
}

export function computeRealAnalyticsBreakdowns(cases: CaseDetail[]) {
  const cityMap = new Map<string, RealCityStat>();
  const authorityMap = new Map<string, number>();
  const dayMap = new Map<string, { incidents: number; scoreSum: number }>();

  for (const c of cases) {
    const cityKey = `${c.city}||${c.state}`;
    const cityEntry = cityMap.get(cityKey) ?? { city: c.city, state: c.state, incidents: 0 };
    cityEntry.incidents += 1;
    cityMap.set(cityKey, cityEntry);

    const authority = c.impersonatedAuthority || "Unknown";
    authorityMap.set(authority, (authorityMap.get(authority) ?? 0) + 1);

    const day = new Date(c.startedAt).toISOString().slice(0, 10);
    const dayEntry = dayMap.get(day) ?? { incidents: 0, scoreSum: 0 };
    dayEntry.incidents += 1;
    dayEntry.scoreSum += c.finalScore;
    dayMap.set(day, dayEntry);
  }

  const byCity: RealCityStat[] = Array.from(cityMap.values()).sort((a, b) => b.incidents - a.incidents);
  const byAuthority: RealAuthorityStat[] = Array.from(authorityMap.entries())
    .map(([authority, count]) => ({ authority, count }))
    .sort((a, b) => b.count - a.count);
  const trend: RealTrendPoint[] = Array.from(dayMap.entries())
    .map(([date, { incidents, scoreSum }]) => ({ date, incidents, averageThreatScore: Math.round(scoreSum / incidents) }))
    .sort((a, b) => a.date.localeCompare(b.date));

  return { byCity, byAuthority, trend };
}
