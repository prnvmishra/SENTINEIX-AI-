import { Router } from "express";
import { getCase, getCaseReport, listCases } from "../controllers/case.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";

export const caseRouter = Router();

caseRouter.use(requireAuth);
caseRouter.get("/", listCases);
caseRouter.get("/:id", getCase);
caseRouter.get("/:id/report", getCaseReport);
