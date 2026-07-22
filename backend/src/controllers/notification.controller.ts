import type { Request, Response } from "express";
import { listNotifications } from "../data/mockNotifications.js";

export function getNotifications(_req: Request, res: Response): void {
  res.json({ notifications: listNotifications() });
}
