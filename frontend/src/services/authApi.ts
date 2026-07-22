import type { LoginRequest, LoginResponse, SessionResponse } from "@shared/types";
import { apiRequest } from "@/services/apiClient";

export const authApi = {
  login(payload: LoginRequest) {
    return apiRequest<LoginResponse>("/auth/login", { method: "POST", body: payload });
  },
  me(token: string) {
    return apiRequest<SessionResponse>("/auth/me", { token });
  },
};
