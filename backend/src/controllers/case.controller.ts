import type { Request, Response } from "express";
import { getCaseDetailById, listCaseSummaries } from "../data/mockCases.js";
import { buildInvestigationReport } from "../services/engines/reportEngine.js";
import { ApiError } from "../middleware/error.middleware.js";

export function listCases(_req: Request, res: Response): void {
  res.json({ cases: listCaseSummaries() });
}

export function getCase(req: Request<{ id: string }>, res: Response): void {
  const caseDetail = getCaseDetailById(req.params.id);

  if (!caseDetail) {
    throw new ApiError(404, `No case found with id "${req.params.id}"`);
  }

  res.json({ case: caseDetail });
}

export function getCaseReport(req: Request<{ id: string }>, res: Response): void {
  const caseDetail = getCaseDetailById(req.params.id);

  if (!caseDetail) {
    throw new ApiError(404, `No case found with id "${req.params.id}"`);
  }

  res.json({ report: buildInvestigationReport(caseDetail) });
}
