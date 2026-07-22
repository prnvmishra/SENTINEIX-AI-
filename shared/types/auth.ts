import type { UserRole } from "./enums";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  organization: string;
  avatarColor: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: AuthUser;
}

export interface SessionResponse {
  user: AuthUser;
}
