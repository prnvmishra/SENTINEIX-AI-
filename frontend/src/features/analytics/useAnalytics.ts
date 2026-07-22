import { useEffect, useState } from "react";
import type { AnalyticsOverview } from "@shared/types";
import { analyticsApi } from "@/services/analyticsApi";
import { useAuth } from "@/hooks/useAuth";

export function useAnalytics() {
  const { token } = useAuth();
  const [overview, setOverview] = useState<AnalyticsOverview | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    let isMounted = true;

    analyticsApi
      .overview(token)
      .then((response) => {
        if (isMounted) setOverview(response);
      })
      .catch(() => {
        if (isMounted) setOverview(null);
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [token]);

  return { overview, isLoading };
}
