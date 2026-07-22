import type { UserRole } from "@shared/types";

export interface DemoAccount {
  role: UserRole;
  label: string;
  email: string;
  organization: string;
}

export const DEMO_PASSWORD = "Sentinel@123";

export const demoAccounts: DemoAccount[] = [
  { role: "officer", label: "Cyber Crime Officer", email: "officer@sentinelx.ai", organization: "Cyber Crime Cell, Maharashtra" },
  { role: "investigator", label: "Investigator", email: "investigator@sentinelx.ai", organization: "I4C National Investigation Unit" },
  { role: "bank", label: "Bank Risk Team", email: "bank@sentinelx.ai", organization: "HDFC Bank Risk & Compliance" },
  { role: "telecom", label: "Telecom Operator", email: "telecom@sentinelx.ai", organization: "Airtel Fraud Risk Desk" },
  { role: "gov_admin", label: "Government Administrator", email: "admin@sentinelx.ai", organization: "Ministry of Home Affairs" },
  { role: "citizen", label: "Citizen", email: "citizen@sentinelx.ai", organization: "Public Reporting Portal" },
];
