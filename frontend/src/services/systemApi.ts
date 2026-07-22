import { apiRequest } from "@/services/apiClient";

export interface SystemHealth {
  status: string;
  service: string;
  timestamp: string;
  firebaseEnabled: boolean;
  aiAnalystEnabled: boolean;
}

export const systemApi = {
  health() {
    return apiRequest<SystemHealth>("/health");
  },
};
