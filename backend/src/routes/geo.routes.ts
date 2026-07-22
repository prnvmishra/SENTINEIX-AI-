import { Router } from "express";
import { getHotspots } from "../controllers/geo.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";

export const geoRouter = Router();

geoRouter.use(requireAuth);
geoRouter.get("/hotspots", getHotspots);
