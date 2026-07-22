import bcrypt from "bcryptjs";
import type { AuthUser, UserRole } from "@shared/types";

export interface MockUserRecord {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  organization: string;
  avatarColor: string;
}

const DEMO_PASSWORD = "Sentinel@123";
const passwordHash = bcrypt.hashSync(DEMO_PASSWORD, 10);

export const DEMO_ACCOUNT_PASSWORD = DEMO_PASSWORD;

export const mockUsers: MockUserRecord[] = [
  {
    id: "usr-citizen-01",
    name: "Ananya Iyer",
    email: "citizen@sentinelx.ai",
    passwordHash,
    role: "citizen",
    organization: "Public Reporting Portal",
    avatarColor: "#06b6d4",
  },
  {
    id: "usr-officer-01",
    name: "Insp. Rajeev Menon",
    email: "officer@sentinelx.ai",
    passwordHash,
    role: "officer",
    organization: "Cyber Crime Cell, Maharashtra",
    avatarColor: "#ef4444",
  },
  {
    id: "usr-investigator-01",
    name: "Priya Nair",
    email: "investigator@sentinelx.ai",
    passwordHash,
    role: "investigator",
    organization: "I4C National Investigation Unit",
    avatarColor: "#f59e0b",
  },
  {
    id: "usr-telecom-01",
    name: "Karan Shah",
    email: "telecom@sentinelx.ai",
    passwordHash,
    role: "telecom",
    organization: "Airtel Fraud Risk Desk",
    avatarColor: "#10b981",
  },
  {
    id: "usr-bank-01",
    name: "Meera Krishnan",
    email: "bank@sentinelx.ai",
    passwordHash,
    role: "bank",
    organization: "HDFC Bank Risk & Compliance",
    avatarColor: "#22d3ee",
  },
  {
    id: "usr-admin-01",
    name: "Vikram Chauhan",
    email: "admin@sentinelx.ai",
    passwordHash,
    role: "gov_admin",
    organization: "Ministry of Home Affairs",
    avatarColor: "#a78bfa",
  },
];

export function findUserByEmail(email: string): MockUserRecord | undefined {
  return mockUsers.find((user) => user.email.toLowerCase() === email.toLowerCase());
}

export function findUserById(id: string): MockUserRecord | undefined {
  return mockUsers.find((user) => user.id === id);
}

export function toPublicUser(user: MockUserRecord): AuthUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    organization: user.organization,
    avatarColor: user.avatarColor,
  };
}
