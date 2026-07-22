import { useEffect, useState } from "react";
import type { MapHotspot } from "@shared/types";
import { geoApi } from "@/services/geoApi";
import { useAuth } from "@/hooks/useAuth";

export function useHotspots() {
  const { token } = useAuth();
  const [hotspots, setHotspots] = useState<MapHotspot[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!token) return;

    let isMounted = true;

    geoApi
      .hotspots(token)
      .then((response) => {
        if (isMounted) setHotspots(response.hotspots);
      })
      .catch(() => {
        if (isMounted) setHotspots([]);
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [token]);

  return { hotspots, isLoading };
}
