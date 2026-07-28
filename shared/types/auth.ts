import type { UserRole } from "./enums";

/**
 * Fine-grained permissions stored per-user in Firebase at `/users/{uid}/permissions`.
 *
 * Case delete is reserved for `gov_admin` (see `caseAccess.ts`) — the
 * `canDeleteCases` flag mirrors that for Admin UI / legacy reads.
 * Mark-complete is ownership-based (who registered the case), not this flag.
 */
export interface UserPermissions {
  canMarkCasesSolved: boolean;
  canDeleteCases: boolean;
  canManageOfficers: boolean;
}

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  organization: string;
  avatarColor: string;
  permissions: UserPermissions;
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
