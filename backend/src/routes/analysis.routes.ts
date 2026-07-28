import { Router } from "express";
import { advisorChat, analyzeChatScreenshot, analyzeRecording, getAiStatus } from "../controllers/analysis.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";

export const analysisRouter = Router();

analysisRouter.use(requireAuth);
analysisRouter.get("/ai-status", getAiStatus);
analysisRouter.post("/advisor-chat", advisorChat);
analysisRouter.post("/recording", analyzeRecording);
analysisRouter.post("/text", analyzeChatScreenshot);
