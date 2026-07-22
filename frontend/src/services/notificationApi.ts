import type { AppNotification } from "@shared/types";
import { apiRequest } from "@/services/apiClient";

export const notificationApi = {
  list(token: string) {
    return apiRequest<{ notifications: AppNotification[] }>("/notifications", { token });
  },
};
