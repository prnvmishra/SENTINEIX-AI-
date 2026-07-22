import type { UserRole } from "@shared/types";

export interface RoleOption {
  role: UserRole;
  label: string;
  organizationPlaceholder: string;
}

export const roleOptions: RoleOption[] = [
  { role: "officer", label: "Cyber Crime Officer", organizationPlaceholder: "Cyber Crime Cell, Maharashtra" },
  { role: "investigator", label: "Investigator", organizationPlaceholder: "I4C National Investigation Unit" },
  { role: "bank", label: "Bank Risk Team", organizationPlaceholder: "HDFC Bank Risk & Compliance" },
  { role: "telecom", label: "Telecom Operator", organizationPlaceholder: "Airtel Fraud Risk Desk" },
  { role: "gov_admin", label: "Government Administrator", organizationPlaceholder: "Ministry of Home Affairs" },
  { role: "citizen", label: "Citizen", organizationPlaceholder: "Public Reporting Portal" },
];

export const roleLabels: Record<UserRole, string> = {
  citizen: "Citizen",
  officer: "Cyber Crime Officer",
  investigator: "Investigator",
  telecom: "Telecom Operator",
  bank: "Bank Risk Team",
  gov_admin: "Government Administrator",
};
