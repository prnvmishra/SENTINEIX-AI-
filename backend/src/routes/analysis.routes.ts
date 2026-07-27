import { Router } from "express";
import { analyzeChatScreenshot, analyzeRecording } from "../controllers/analysis.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";

export const analysisRouter = Router();

analysisRouter.use(requireAuth);
analysisRouter.post("/recording", analyzeRecording);
analysisRouter.post("/text", analyzeChatScreenshot);
