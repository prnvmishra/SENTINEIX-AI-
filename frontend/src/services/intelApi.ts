import type { EntityIntelResult } from "@shared/types";
import { apiRequest } from "@/services/apiClient";

export const intelApi = {
  checkPhone(token: string, number: string) {
    return apiRequest<{ results: EntityIntelResult[]; fraudIntelEnabled: boolean }>(
      `/intel/phone/${encodeURIComponent(number)}`,
      { token },
    );
  },
};
