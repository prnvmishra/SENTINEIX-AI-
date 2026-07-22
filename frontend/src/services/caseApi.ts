import type { CaseDetail, CaseSummary } from "@shared/types";
import { apiRequest } from "@/services/apiClient";

export const caseApi = {
  list(token: string) {
    return apiRequest<{ cases: CaseSummary[] }>("/cases", { token });
  },
  get(token: string, id: string) {
    return apiRequest<{ case: CaseDetail }>(`/cases/${id}`, { token });
  },
};
