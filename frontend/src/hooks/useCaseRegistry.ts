import { useEffect, useState } from "react";
import type { CaseDetail } from "@shared/types";
import { subscribeToCaseRegistry } from "@/services/caseRegistry";

/**
 * Live subscription to the real case registry (Firebase Realtime Database)
 * — every genuine Live Mic Session, recorded-call upload, and chat
 * screenshot analysis this device has ever run, updating in real time as
 * new ones start ("ongoing") and finish ("completed"). This is the single
 * source of truth for real stats, replacing hardcoded mock numbers.
 */
export function useCaseRegistry() {
  const [cases, setCases] = useState<CaseDetail[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = subscribeToCaseRegistry((registryCases) => {
      setCases(registryCases);
      setIsLoading(false);
    });
    return unsubscribe;
  }, []);

  return { cases, isLoading };
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
  const ongoing = cases.filter((c) => c.status === "live").length;
  const completed = cases.filter((c) => c.status === "resolved").length;
  const highOrCritical = cases.filter((c) => c.threatLevel === "high" || c.threatLevel === "critical").length;
  const averageScore = total === 0 ? 0 : Math.round(cases.reduce((sum, c) => sum + c.finalScore, 0) / total);
  const bySource: Record<string, number> = {};
  for (const c of cases) {
    const key = c.source ?? "live-mic";
    bySource[key] = (bySource[key] ?? 0) + 1;
  }
  return { total, ongoing, completed, highOrCritical, averageScore, bySource };
}
