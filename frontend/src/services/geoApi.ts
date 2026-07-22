import type { MapHotspot } from "@shared/types";
import { apiRequest } from "@/services/apiClient";

export const geoApi = {
  hotspots(token: string) {
    return apiRequest<{ hotspots: MapHotspot[] }>("/geo/hotspots", { token });
  },
};
