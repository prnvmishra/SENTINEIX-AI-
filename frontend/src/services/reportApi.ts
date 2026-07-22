import type { InvestigationReport } from "@shared/types";
import { apiRequest } from "@/services/apiClient";

export const reportApi = {
  get(token: string, caseId: string) {
    return apiRequest<{ report: InvestigationReport }>(`/cases/${caseId}/report`, { token });
  },
};
