import type { AnalyticsOverview } from "@shared/types";
import { apiRequest } from "@/services/apiClient";

export const analyticsApi = {
  overview(token: string) {
    return apiRequest<AnalyticsOverview>("/analytics/overview", { token });
  },
};
