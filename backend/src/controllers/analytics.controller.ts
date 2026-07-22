import type { Request, Response } from "express";
import { getAnalyticsOverview } from "../data/mockAnalytics.js";

export function getOverview(_req: Request, res: Response): void {
  res.json(getAnalyticsOverview());
}
