import type { Request, Response } from "express";
import { listHotspots } from "../data/indiaHotspots.js";

export function getHotspots(_req: Request, res: Response): void {
  res.json({ hotspots: listHotspots() });
}
