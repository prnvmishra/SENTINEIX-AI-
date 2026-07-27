import { useEffect, useState } from "react";
import type { CaseDetail } from "@shared/types";
import { caseApi } from "@/services/caseApi";
import { useAuth } from "@/hooks/useAuth";

/**
 * Real cases (Live Mic Session, recorded-call upload, chat screenshot) live
 * entirely in the Firebase case registry — they were never mock scenarios
 * the backend API knows about — so `registryCases` is checked first. Only
 * scripted demo case ids fall through to the mock `GET /api/cases/:id` call.
 */
export function useCaseDetail(caseId: string | null, registryCases: CaseDetail[] = []) {
  const { token } = useAuth();
  const [caseDetail, setCaseDetail] = useState<CaseDetail | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!caseId) {
      setCaseDetail(null);
      return;
    }

    const fromRegistry = registryCases.find((c) => c.id === caseId);
    if (fromRegistry) {
      setCaseDetail(fromRegistry);
      setIsLoading(false);
      return;
    }

    if (!token) {
      setCaseDetail(null);
      return;
    }

    let isMounted = true;
    setIsLoading(true);

    caseApi
      .get(token, caseId)
      .then((response) => {
        if (isMounted) setCaseDetail(response.case);
      })
      .catch(() => {
        if (isMounted) setCaseDetail(null);
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [token, caseId, registryCases]);

  return { caseDetail, isLoading };
}
