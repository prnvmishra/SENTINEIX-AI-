import { Router } from "express";
import { checkPhoneNumber } from "../controllers/intel.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";

export const intelRouter = Router();

intelRouter.use(requireAuth);
intelRouter.get("/phone/:number", checkPhoneNumber);
