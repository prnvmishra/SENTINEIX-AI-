import { useEffect, useState } from "react";
import { analysisApi } from "@/services/analysisApi";
import { useAuth } from "@/hooks/useAuth";

const POLL_INTERVAL_MS = 20_000;

/**
 * Polls whether the free OpenRouter daily quota is currently exhausted, so
 * the UI can say "AI is temporarily unavailable (free daily limit reached)"
 * instead of a perpetual "Standby" that looks identical to "hasn't run yet"
 * — the two are very different situations for a citizen trying to understand
 * why a score/speaker label came from the rule engine instead of the AI.
 */
export function useAiStatus() {
  const { token } = useAuth();
  const [quotaExhausted, setQuotaExhausted] = useState(false);

  useEffect(() => {
    if (!token) return;
    let isMounted = true;

    const poll = () => {
      analysisApi
        .getAiStatus(token)
        .then((status) => {
          if (isMounted) setQuotaExhausted(status.quotaExhausted);
        })
        .catch(() => undefined);
    };

    poll();
    const interval = setInterval(poll, POLL_INTERVAL_MS);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [token]);

  return { quotaExhausted };
}
