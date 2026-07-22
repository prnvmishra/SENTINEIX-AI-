import { useEffect, useState } from "react";
import { systemApi } from "@/services/systemApi";
import type { SystemHealth } from "@/services/systemApi";

const FALLBACK: SystemHealth = {
  status: "unknown",
  service: "sentinelx-backend",
  timestamp: "",
  firebaseEnabled: false,
  aiAnalystEnabled: false,
};

export function useSystemHealth() {
  const [health, setHealth] = useState<SystemHealth>(FALLBACK);

  useEffect(() => {
    let isMounted = true;

    systemApi
      .health()
      .then((response) => {
        if (isMounted) setHealth(response);
      })
      .catch(() => {
        if (isMounted) setHealth(FALLBACK);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  return health;
}
