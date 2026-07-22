import type { CaseDetail, CaseSummary } from "@shared/types";
import { scenarios } from "./scenarios/index.js";
import { buildCaseDetail } from "../services/caseBuilder.js";

export const mockCaseDetails: CaseDetail[] = scenarios.map(buildCaseDetail);

export function toSummary(caseDetail: CaseDetail): CaseSummary {
  return {
    id: caseDetail.id,
    title: caseDetail.title,
    impersonatedAuthority: caseDetail.impersonatedAuthority,
    status: caseDetail.status,
    threatLevel: caseDetail.threatLevel,
    finalScore: caseDetail.finalScore,
    city: caseDetail.city,
    state: caseDetail.state,
    startedAt: caseDetail.startedAt,
    durationMs: caseDetail.durationMs,
    victimAlias: caseDetail.victimAlias,
  };
}

export const mockCaseSummaries: CaseSummary[] = mockCaseDetails.map(toSummary);

export function listCaseSummaries(): CaseSummary[] {
  return mockCaseSummaries;
}

export function getCaseDetailById(id: string): CaseDetail | undefined {
  return mockCaseDetails.find((caseDetail) => caseDetail.id === id);
}
