import { useEffect, useState } from "react";
import type { CaseDetail } from "@shared/types";
import { caseApi } from "@/services/caseApi";
import { useAuth } from "@/hooks/useAuth";

export function useCaseDetail(caseId: string | null) {
  const { token } = useAuth();
  const [caseDetail, setCaseDetail] = useState<CaseDetail | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!token || !caseId) {
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
  }, [token, caseId]);

  return { caseDetail, isLoading };
}
