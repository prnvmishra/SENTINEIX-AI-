import { Router } from "express";
import { getOverview } from "../controllers/analytics.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";

export const analyticsRouter = Router();

analyticsRouter.use(requireAuth);
analyticsRouter.get("/overview", getOverview);
