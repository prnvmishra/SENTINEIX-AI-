import { useEffect, useState } from "react";
import type { CaseSummary } from "@shared/types";
import { caseApi } from "@/services/caseApi";
import { useAuth } from "@/hooks/useAuth";

export function useCaseHistory() {
  const { token } = useAuth();
  const [cases, setCases] = useState<CaseSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    let isMounted = true;

    caseApi
      .list(token)
      .then((response) => {
        if (isMounted) setCases(response.cases);
      })
      .catch(() => {
        if (isMounted) setCases([]);
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [token]);

  return { cases, isLoading };
}
